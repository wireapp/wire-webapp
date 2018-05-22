/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use strict';

window.z = window.z || {};
window.z.calling = z.calling || {};
window.z.calling.entities = z.calling.entities || {};

z.calling.entities.FlowEntity = class FlowEntity {
  static get CONFIG() {
    return {
      DATA_CHANNEL_LABEL: 'calling-3.0',
      NEGOTIATION_FAILED_TIMEOUT: 30 * 1000 + 500,
      NEGOTIATION_RESTART_TIMEOUT: 2500,
      SDP_SEND_TIMEOUT: 5 * 1000,
      SDP_SEND_TIMEOUT_RESET: 1000,
    };
  }

  /**
   * Construct a new flow entity.
   *
   * @class z.calling.entities.FlowEntity
   * @param {z.calling.entities.CallEntity} callEntity - Call entity that the flow belongs to
   * @param {z.calling.entities.ParticipantEntity} participantEntity - Participant entity that the flow belongs to
   * @param {CallSetupTimings} timings - Timing statistics of call setup steps
   */
  constructor(callEntity, participantEntity, timings) {
    this.callingRepository = callEntity.callingRepository;

    this.callEntity = callEntity;
    this.participantEntity = participantEntity;

    this.id = this.participantEntity.id;
    this.conversationId = this.callEntity.id;
    this.messageLog = this.participantEntity.messageLog;

    const callLoggerName = `z.calling.entities.FlowEntity (${this.id})`;
    this.callLogger = new z.telemetry.calling.CallLogger(callLoggerName, z.config.LOGGER.OPTIONS, this.messageLog);

    // States
    this.isAnswer = ko.observable(false);
    this.selfState = this.callEntity.selfState;

    // Audio
    this.audio = new z.calling.entities.FlowAudioEntity(this, this.callingRepository.mediaRepository);

    // Users
    this.remoteClientId = undefined;
    this.remoteUser = this.participantEntity.user;
    this.remoteUserId = this.remoteUser.id;
    this.selfUser = this.callEntity.selfUser;
    this.selfUserId = this.selfUser.id;

    // Telemetry
    this.telemetry = new z.telemetry.calling.FlowTelemetry(this.id, this.remoteUserId, this.callEntity, timings);

    //##############################################################################
    // PeerConnection
    //##############################################################################

    this.peerConnection = undefined;
    this.pcInitialized = ko.observable(false);

    this.mediaStream = this.callEntity.localMediaStream;
    this.dataChannel = undefined;
    this.dataChannelOpened = false;

    this.connectionState = ko.observable(z.calling.rtc.ICE_CONNECTION_STATE.NEW);
    this.gatheringState = ko.observable(z.calling.rtc.ICE_GATHERING_STATE.NEW);
    this.signalingState = ko.observable(z.calling.rtc.SIGNALING_STATE.NEW);

    this.connectionState.subscribe(iceConnectionState => {
      switch (iceConnectionState) {
        case z.calling.rtc.ICE_CONNECTION_STATE.COMPLETED:
        case z.calling.rtc.ICE_CONNECTION_STATE.CONNECTED: {
          this._clearNegotiationTimeout();
          this.negotiationMode(z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT);
          this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.ICE_CONNECTION_CONNECTED);

          this.callEntity.isConnected(true);
          this.participantEntity.isConnected(true);

          this.callEntity.interruptedParticipants.remove(this.participantEntity);
          this.callEntity.state(z.calling.enum.CALL_STATE.ONGOING);
          this.callEntity.terminationReason = undefined;
          break;
        }

        case z.calling.rtc.ICE_CONNECTION_STATE.CLOSED: {
          this.participantEntity.isConnected(false);

          if (this.callEntity.selfClientJoined()) {
            this.callEntity.deleteParticipant(this.participantEntity.id, this.remoteClientId);
          }
          break;
        }

        case z.calling.rtc.ICE_CONNECTION_STATE.DISCONNECTED: {
          this._setNegotiationRestartTimeout();
          break;
        }

        case z.calling.rtc.ICE_CONNECTION_STATE.FAILED: {
          if (this.callEntity.selfClientJoined()) {
            this._removeParticipant();
          }
          break;
        }

        case z.calling.rtc.ICE_CONNECTION_STATE.CHECKING:
        default: {
          break;
        }
      }
    });

    this.signalingState.subscribe(signalingState => {
      switch (signalingState) {
        case z.calling.rtc.SIGNALING_STATE.CLOSED: {
          const logMessage = {
            data: {
              default: [this.remoteUser.name()],
              obfuscated: [this.callLogger.obfuscate(this.remoteUser.id)],
            },
            message: `PeerConnection with '{0}' was closed`,
          };
          this.callLogger.info(logMessage);

          this.callEntity.deleteParticipant(this.participantEntity.id, this.remoteClientId);
          break;
        }

        case z.calling.rtc.SIGNALING_STATE.STABLE: {
          this._clearNegotiationTimeout();
          break;
        }

        default: {
          break;
        }
      }
    });

    this.negotiationMode = ko.observable(z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT);
    this.negotiationNeeded = ko.observable(false);
    this.negotiationTimeout = undefined;

    this.sdpStateChanging = ko.observable(false);

    //##############################################################################
    // Local SDP
    //##############################################################################

    this.localSdpType = ko.observable(undefined);
    this.localSdp = ko.observable(undefined);
    this.localSdp.subscribe((sdp = {}) => {
      this.localSdpType(sdp.type);

      if (sdp.type) {
        if (!this.shouldSendLocalSdp()) {
          this.shouldSendLocalSdp(true);
          this.shouldSetLocalSdp(true);
        }
      }
    });

    this.shouldSendLocalSdp = ko.observable(false);
    this.shouldSetLocalSdp = ko.observable(false);

    this.sendSdpTimeout = undefined;

    this.properLocalSdpState = ko.pureComputed(() => {
      const isAnswer = this.localSdpType() === z.calling.rtc.SDP_TYPE.ANSWER;
      const isOffer = this.localSdpType() === z.calling.rtc.SDP_TYPE.OFFER;
      const inRemoteOfferState = this.signalingState() === z.calling.rtc.SIGNALING_STATE.REMOTE_OFFER;
      const inStableState = this.signalingState() === z.calling.rtc.SIGNALING_STATE.STABLE;

      const isProperAnswerState = isAnswer && inRemoteOfferState;
      const isProperOfferState = isOffer && inStableState;
      return isProperOfferState || isProperAnswerState;
    });

    this.canSetLocalSdp = ko.pureComputed(() => {
      const inConnectionProgress = this.connectionState() === z.calling.rtc.ICE_CONNECTION_STATE.CHECKING;
      const progressGatheringStates = [
        z.calling.rtc.ICE_GATHERING_STATE.COMPLETE,
        z.calling.rtc.ICE_GATHERING_STATE.GATHERING,
      ];
      const inProgress = inConnectionProgress && progressGatheringStates.includes(this.gatheringState());

      const isProperState = this.localSdp() && this.shouldSetLocalSdp() && this.properLocalSdpState();
      const changeInProgress = inProgress || this.sdpStateChanging();
      return isProperState && !changeInProgress;
    });

    this.canSetLocalSdp.subscribe(canSet => {
      if (canSet) {
        this._setLocalSdp();
      }
    });

    //##############################################################################
    // Remote SDP
    //##############################################################################

    this.remoteSdpType = ko.observable(undefined);
    this.remoteSdp = ko.observable(undefined);
    this.remoteSdp.subscribe((sdp = {}) => {
      this.remoteSdpType(sdp.type);

      if (sdp.type) {
        this.shouldSetRemoteSdp(true);
      }
    });

    this.shouldSetRemoteSdp = ko.observable(false);

    this.properRemoteSdpState = ko.pureComputed(() => {
      const isAnswer = this.remoteSdpType() === z.calling.rtc.SDP_TYPE.ANSWER;
      const isOffer = this.remoteSdpType() === z.calling.rtc.SDP_TYPE.OFFER;
      const inLocalOfferState = this.signalingState() === z.calling.rtc.SIGNALING_STATE.LOCAL_OFFER;
      const inStableState = this.signalingState() === z.calling.rtc.SIGNALING_STATE.STABLE;

      const isProperAnswerState = isAnswer && inLocalOfferState;
      const isProperOfferState = isOffer && inStableState;
      return isProperOfferState || isProperAnswerState;
    });

    this.canSetRemoteSdp = ko.pureComputed(() => {
      const isProperState = this.pcInitialized() && this.shouldSetRemoteSdp() && this.properRemoteSdpState();
      return isProperState && !this.sdpStateChanging();
    });

    this.canSetRemoteSdp.subscribe(canSet => {
      if (canSet) {
        this._setRemoteSdp();
      }
    });

    //##############################################################################
    // Gates
    //##############################################################################

    this.canCreateSdp = ko.pureComputed(() => {
      const isConnectionClosed = this.signalingState() === z.calling.rtc.SIGNALING_STATE.CLOSED;
      const inStateForCreation = this.negotiationNeeded() && !isConnectionClosed;
      return this.pcInitialized() && inStateForCreation;
    });

    this.canCreateSdpAnswer = ko.pureComputed(() => {
      const answerState = this.isAnswer() && this.signalingState() === z.calling.rtc.SIGNALING_STATE.REMOTE_OFFER;
      return this.canCreateSdp() && answerState;
    });

    this.canCreateSdpAnswer.subscribe(canCreate => {
      if (canCreate) {
        this._createSdpAnswer();
      }
    });

    this.canCreateSdpOffer = ko.pureComputed(() => {
      const offerState = !this.isAnswer() && this.signalingState() === z.calling.rtc.SIGNALING_STATE.STABLE;
      return this.canCreateSdp() && offerState;
    });

    this.canCreateSdpOffer.subscribe(canCreate => {
      if (canCreate) {
        this._createSdpOffer();
      }
    });
  }

  /**
   * Restart the peer connection negotiation.
   *
   * @param {z.calling.enum.SDP_NEGOTIATION_MODE} negotiationMode - Mode for renegotiation
   * @param {boolean} isAnswer - Flow is answer
   * @param {MediaStream} [mediaStream] - Local media stream
   * @returns {undefined} No return value
   */
  restartNegotiation(negotiationMode, isAnswer, mediaStream) {
    this.callLogger.info(`Negotiation restart triggered by '${negotiationMode}'`);

    this.clearTimeouts();
    this._closePeerConnection();
    this._closeDataChannel();
    this._resetSignalingStates();
    this.isAnswer(isAnswer);
    this._resetSdp();

    const isModeStateCollision = negotiationMode === z.calling.enum.SDP_NEGOTIATION_MODE.STATE_COLLISION;
    if (!isModeStateCollision) {
      this.startNegotiation(negotiationMode, mediaStream);
    }
  }

  /**
   * Set the remote client ID.
   * @param {string} clientId - Remote client ID
   * @returns {Undefined} No return value
   */
  setRemoteClientId(clientId) {
    if (!this.remoteClientId) {
      this.remoteClientId = clientId;
      const logMessage = {
        data: {
          default: [clientId],
          obfuscated: [this.callLogger.obfuscate(clientId)],
        },
        message: `Identified remote client as '{0}'`,
      };
      this.callLogger.info(logMessage);
    }
  }

  /**
   * Start the peer connection negotiation.
   *
   * @param {z.calling.enum.SDP_NEGOTIATION_MODE} [negotiationMode=z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT] - Mode for renegotiation
   * @param {MediaStream} [mediaStream=this.mediaStream()] - Local media stream
   * @returns {undefined} No return value
   */
  startNegotiation(negotiationMode = z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT, mediaStream = this.mediaStream()) {
    const logMessage = {
      data: {
        default: [this.remoteUser.name(), negotiationMode],
        obfuscated: [this.callLogger.obfuscate(this.remoteUser.id), negotiationMode],
      },
      message: `Start negotiating PeerConnection with '{0}' triggered by '{1}'`,
    };
    this.callLogger.info(logMessage);

    this._createPeerConnection().then(() => {
      this._addMediaStream(mediaStream);
      this.audio.hookup(true);
      this._setSdpStates();
      this.negotiationMode(negotiationMode);
      this.negotiationNeeded(true);
      this.pcInitialized(true);
      this._setNegotiationFailedTimeout();
    });
  }

  /**
   * Remove the participant from the call
   *
   * @private
   * @param {z.calling.enum.TERMINATION_REASON} [terminationReason] - Reason for termination
   * @returns {undefined} No return value
   */
  _removeParticipant(terminationReason) {
    this.participantEntity.isConnected(false);

    this.callEntity
      .deleteParticipant(
        this.participantEntity.id,
        this.remoteClientId,
        z.calling.enum.TERMINATION_REASON.CONNECTION_DROP
      )
      .then(() => {
        if (!this.callEntity.participants().length) {
          if (!terminationReason) {
            terminationReason = this.callEntity.isConnected()
              ? z.calling.enum.TERMINATION_REASON.CONNECTION_DROP
              : z.calling.enum.TERMINATION_REASON.CONNECTION_FAILED;
          }
          amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, this.callEntity.id, terminationReason);
        }
      });
  }

  /**
   * Set SDP gate states.
   * @private
   * @returns {undefined} No return value
   */
  _setSdpStates() {
    this.shouldSetRemoteSdp(true);
    this.shouldSetLocalSdp(true);
    this.shouldSendLocalSdp(true);
  }

  //##############################################################################
  // PeerConnection handling
  //##############################################################################

  /**
   * Close the PeerConnection.
   * @private
   * @returns {undefined} No return value
   */
  _closePeerConnection() {
    const peerConnection = this.peerConnection;
    if (!this.peerConnection) {
      return;
    }

    peerConnection.oniceconnectionstatechange = () => {
      this.callLogger.log(this.callLogger.levels.OFF, 'State change ignored - ICE connection');
    };

    peerConnection.onsignalingstatechange = () => {
      const logMessage = `State change ignored - signaling state: ${this.peerConnection.signalingState}`;
      this.callLogger.log(this.callLogger.levels.OFF, logMessage);
    };

    const isStateClosed = peerConnection.signalingState === z.calling.rtc.SIGNALING_STATE.CLOSED;
    if (!isStateClosed) {
      amplify.publish(z.event.WebApp.CALL.MEDIA.REMOVE_STREAM, peerConnection.getRemoteStreams());
      peerConnection.close();

      const logMessage = {
        data: {
          default: [this.remoteUser.name()],
          obfuscated: [this.callLogger.obfuscate(this.remoteUser.id)],
        },
        message: `Closing PeerConnection '{0}' successful`,
      };
      this.callLogger.info(logMessage);
    }
  }

  /**
   * Create the PeerConnection configuration.
   * @private
   * @returns {Promise} Resolves with the configuration object to initialize PeerConnection
   */
  _createPeerConnectionConfiguration() {
    return this.callingRepository.getConfig().then(({ice_servers}) => {
      return {
        bundlePolicy: 'max-bundle',
        iceServers: ice_servers,
        rtcpMuxPolicy: 'require', // @deprecated Default value beginning Chrome 57
      };
    });
  }

  /**
   * Initialize the PeerConnection for the flow.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCConfiguration
   * @private
   * @returns {Promise} Resolves when the PeerConnection was created
   */
  _createPeerConnection() {
    return this._createPeerConnectionConfiguration().then(pcConfiguration => {
      this.peerConnection = new window.RTCPeerConnection(pcConfiguration);
      this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.PEER_CONNECTION_CREATED);
      this.signalingState(this.peerConnection.signalingState);

      this.callLogger.debug(
        {
          data: {
            default: [this.remoteUser.name(), this.isAnswer()],
            obfuscated: [this.callLogger.obfuscate(this.remoteUser.id), this.isAnswer()],
          },
          message: `PeerConnection with '{0}' created - isAnswer '{1}'`,
        },
        pcConfiguration
      );

      this.peerConnection.onaddstream = this._onAddStream.bind(this);
      this.peerConnection.ontrack = this._onTrack.bind(this);
      this.peerConnection.ondatachannel = this._onDataChannel.bind(this);
      this.peerConnection.onicecandidate = this._onIceCandidate.bind(this);
      this.peerConnection.oniceconnectionstatechange = this._onIceConnectionStateChange.bind(this);
      this.peerConnection.onremovestream = this._onRemoveStream.bind(this);
      this.peerConnection.onsignalingstatechange = this._onSignalingStateChange.bind(this);

      this.telemetry.set_peer_connection(this.peerConnection);
    });
  }

  /**
   * A MediaStream was added to the PeerConnection.
   *
   * @deprecated
   * @private
   * @param {MediaStream} mediaStream - MediaStream from event
   * @returns {undefined} No return value
   */
  _onAddStream({stream: mediaStream}) {
    this.callLogger.info('Remote MediaStream added to PeerConnection', {
      audioTracks: mediaStream.getAudioTracks(),
      stream: mediaStream,
      videoTracks: mediaStream.getVideoTracks(),
    });

    mediaStream = z.media.MediaStreamHandler.detect_media_stream_type(mediaStream);
    const isTypeAudio = mediaStream.type === z.media.MediaType.AUDIO;
    if (isTypeAudio) {
      mediaStream = this.audio.wrapAudioOutputStream(mediaStream);
    }

    const mediaStreamInfo = new z.media.MediaStreamInfo(
      z.media.MediaStreamSource.REMOTE,
      this.remoteUser.id,
      mediaStream,
      this.callEntity
    );
    amplify.publish(z.event.WebApp.CALL.MEDIA.ADD_STREAM, mediaStreamInfo);
  }

  /**
   * A local ICE candidates is available.
   *
   * @private
   * @param {RTCIceCandidate} iceCandidate - RTCIceCandidate from event
   * @returns {undefined} No return value
   */
  _onIceCandidate({candidate: iceCandidate}) {
    if (!iceCandidate) {
      if (this.shouldSendLocalSdp()) {
        this.callLogger.info('Generation of ICE candidates completed - sending SDP');
        this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.ICE_GATHERING_COMPLETED);
        this.sendLocalSdp();
      }
    }
  }

  /**
   * ICE connection state has changed.
   *
   * @private
   * @param {Object} event - State change event
   * @returns {undefined} No return value
   */
  _onIceConnectionStateChange(event) {
    const endingCallStates = [z.calling.enum.CALL_STATE.DISCONNECTING, z.calling.enum.CALL_STATE.ENDED];
    const isEndingCall = endingCallStates.includes(this.callEntity.state());

    if (this.peerConnection || !isEndingCall) {
      this.callLogger.info('State changed - ICE connection', event);
      const connectionMessage = `ICE connection state: ${this.peerConnection.iceConnectionState}`;
      this.callLogger.log(this.callLogger.levels.LEVEL_1, connectionMessage);
      const gatheringMessage = `ICE gathering state: ${this.peerConnection.iceGatheringState}`;
      this.callLogger.log(this.callLogger.levels.LEVEL_1, gatheringMessage);

      this.gatheringState(this.peerConnection.iceGatheringState);
      this.connectionState(this.peerConnection.iceConnectionState);
    }
  }

  /**
   * A MediaStream was removed from the PeerConnection.
   *
   * @private
   * @param {MediaStreamEvent} event - Event that a MediaStream has been removed
   * @returns {undefined} No return value
   */
  _onRemoveStream(event) {
    this.callLogger.info('Remote MediaStream removed from PeerConnection', event);
  }

  /**
   * Signaling state has changed.
   *
   * @private
   * @param {Object} event - State change event
   * @returns {undefined} No return value
   */
  _onSignalingStateChange(event) {
    this.callLogger.info(`State changed - signaling state: ${this.peerConnection.signalingState}`, event);
    this.signalingState(this.peerConnection.signalingState);
  }

  /**
   * A MediaStreamTrack was added to the PeerConnection.
   *
   * @private
   * @param {RTCTrackEvent} event - Event that contains the newly added MediaStreamTrack
   * @returns {undefined} No return value
   */
  _onTrack(event) {
    this.callLogger.info('Remote MediaStreamTrack added to PeerConnection', event);
  }

  //##############################################################################
  // Data channel handling
  //##############################################################################

  /**
   * Send a call message through the data channel.
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to be send
   * @returns {undefined} No return value
   */
  sendMessage(callMessageEntity) {
    const {conversationId, response, type} = callMessageEntity;

    if (this.dataChannel && this.dataChannelOpened) {
      try {
        this.dataChannel.send(callMessageEntity.toContentString());

        const logMessage = {
          data: {
            default: [type, conversationId],
            obfuscated: [type, this.callLogger.obfuscate(conversationId)],
          },
          message: `Sending '{0}' message to conversation '{1}' via data channel`,
        };
        this.callLogger.info(logMessage, callMessageEntity.toJSON());
        return;
      } catch (error) {
        if (!response) {
          this.callLogger.warn(`Failed to send calling message via data channel: ${error.name}`, error);
          throw new z.calling.CallError(z.calling.CallError.TYPE.NO_DATA_CHANNEL);
        }
      }
    }

    throw new z.calling.CallError(z.calling.CallError.TYPE.NO_DATA_CHANNEL);
  }

  /**
   * Close the data channel.
   * @private
   * @returns {undefined} No return value
   */
  _closeDataChannel() {
    if (this.dataChannel) {
      const isReadyStateOpen = this.dataChannel.readyState === z.calling.rtc.DATA_CHANNEL_STATE.OPEN;
      if (isReadyStateOpen) {
        this.dataChannel.close();
      }
      delete this.dataChannel;
    }
    this.dataChannelOpened = false;
  }

  /**
   * Initialize the data channel.
   * @private
   * @returns {undefined} No return value
   */
  _initializeDataChannel() {
    if (this.peerConnection.createDataChannel && !this.dataChannel) {
      const label = FlowEntity.CONFIG.DATA_CHANNEL_LABEL;
      this._setupDataChannel(this.peerConnection.createDataChannel(label, {ordered: true}));
    }
  }

  /**
   * Set up the data channel.
   *
   * @private
   * @param {RTCDataChannel} dataChannel - Data channel object
   * @returns {undefined} No return value
   */
  _setupDataChannel(dataChannel) {
    this.dataChannel = dataChannel;
    dataChannel.onclose = this._onClose.bind(this);
    dataChannel.onerror = this._onError.bind(this);
    dataChannel.onmessage = this._onMessage.bind(this);
    dataChannel.onopen = this._onOpen.bind(this);
  }

  /**
   * A data channel was received on the PeerConnection.
   *
   * @private
   * @param {RTCDataChannel} dataChannel - Data channel from event
   * @returns {undefined} No return value
   */
  _onDataChannel({channel: dataChannel}) {
    this._setupDataChannel(dataChannel);
  }

  /**
   * Data channel was closed.
   *
   * @private
   * @param {RTCDataChannel} dataChannel - Data channel that was closed
   * @returns {undefined} No return value
   */
  _onClose({target: dataChannel}) {
    this.callLogger.info(`Data channel '${dataChannel.label}' was closed`, dataChannel);

    if (this.dataChannel && this.dataChannel.readyState === z.calling.rtc.DATA_CHANNEL_STATE.CLOSED) {
      delete this.dataChannel;
      this.dataChannelOpened = false;
    }
  }

  /**
   * An error was caught on the data channel.
   *
   * @private
   * @param {Error} error - Error thrown
   * @returns {undefined} No return value
   */
  _onError(error) {
    throw error;
  }

  /**
   * New incoming message on the data channel.
   *
   * @private
   * @param {string} message - Incoming message
   * @returns {undefined} No return value
   */
  _onMessage({data: message}) {
    const callMessage = JSON.parse(message);
    const {resp: response, type} = callMessage;
    const {conversationEntity} = this.callEntity;

    const logMessage = response
      ? `Received confirmation for '${type}' message via data channel`
      : `Received '${type}' (response: ${response}) message via data channel`;
    this.callLogger.debug(logMessage, callMessage);

    const callEvent = z.conversation.EventBuilder.buildCalling(
      conversationEntity,
      callMessage,
      this.remoteUserId,
      this.remoteClientId
    );
    amplify.publish(z.event.WebApp.CALL.EVENT_FROM_BACKEND, callEvent, z.event.EventRepository.SOURCE.WEB_SOCKET);
  }

  /**
   * Data channel was successfully opened.
   *
   * @private
   * @param {RTCDataChannel} dataChannel - Opened data channel
   * @returns {undefined} No return value
   */
  _onOpen({target: dataChannel}) {
    this.callLogger.info(`Data channel '${dataChannel.label}' was opened and can be used`, dataChannel);
    this.dataChannelOpened = true;
  }

  //##############################################################################
  // SDP handling
  //##############################################################################

  /**
   * Save the remote SDP received via a call message within the flow.
   *
   * @note The resolving value indicates whether negotiation should be skipped for the current state.
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @returns {Promise} Resolves when the remote SDP was saved
   */
  saveRemoteSdp(callMessageEntity) {
    let skipNegotiation = false;

    return z.calling.SDPMapper.mapCallMessageToObject(callMessageEntity)
      .then(rtcSdp => z.calling.SDPMapper.rewriteSdp(rtcSdp, z.calling.enum.SDP_SOURCE.REMOTE, this))
      .then(({sdp: remoteSdp}) => {
        const isRemoteOffer = remoteSdp.type === z.calling.rtc.SDP_TYPE.OFFER;
        if (isRemoteOffer) {
          switch (this.signalingState()) {
            case z.calling.rtc.SIGNALING_STATE.LOCAL_OFFER: {
              if (this._solveCollidingStates()) {
                return true;
              }
              break;
            }

            case z.calling.rtc.SIGNALING_STATE.NEW:
            case z.calling.rtc.SIGNALING_STATE.STABLE: {
              const isUpdate = callMessageEntity.type === z.calling.enum.CALL_MESSAGE_TYPE.UPDATE;

              if (isUpdate) {
                this.restartNegotiation(z.calling.enum.SDP_NEGOTIATION_MODE.STREAM_CHANGE, true);
                skipNegotiation = true;
              }

              this.isAnswer(true);
              break;
            }

            default: {
              break;
            }
          }
        }

        this.remoteSdp(remoteSdp);
        this.callLogger.debug(`Saved remote '${remoteSdp.type}' SDP`, this.remoteSdp());
        return skipNegotiation;
      });
  }

  /**
   * Initiates sending the local RTCSessionDescriptionProtocol to the remote user.
   * @param {boolean} [sendingOnTimeout=false] - SDP sending on timeout
   * @returns {undefined} No return value
   */
  sendLocalSdp(sendingOnTimeout = false) {
    this._clearSendSdpTimeout();

    z.calling.SDPMapper.rewriteSdp(this.peerConnection.localDescription, z.calling.enum.SDP_SOURCE.LOCAL, this)
      .then(({iceCandidates, sdp: localSdp}) => {
        this.localSdp(localSdp);

        const isModeDefault = this.negotiationMode() === z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT;
        if (isModeDefault && sendingOnTimeout) {
          if (!this._containsRelayCandidate(iceCandidates)) {
            const logMessage = `No relay ICE candidates in local SDP. Timeout reset\n${iceCandidates}`;
            this.callLogger.warn(logMessage, iceCandidates);
            return this._setSendSdpTimeout(false);
          }
        }

        const logMessage = {
          data: {
            default: [localSdp.type, iceCandidates.length, this.remoteUser.name(), this.localSdp().sdp],
            obfuscated: [
              localSdp.type,
              iceCandidates.length,
              this.callLogger.obfuscate(this.remoteUser.id),
              this.callLogger.obfuscateSdp(this.localSdp().sdp),
            ],
          },
          message: `Sending local '{0}' SDP containing '{1}' ICE candidates for flow with '{2}'\n{3}`,
        };
        this.callLogger.debug(logMessage);

        this.shouldSendLocalSdp(false);

        const response = localSdp.type === z.calling.rtc.SDP_TYPE.ANSWER;
        let callMessageEntity;

        const additionalPayload = this._createAdditionalPayload();
        const sessionId = this.callEntity.sessionId;
        const inDefaultMode = this.negotiationMode() === z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT;
        if (inDefaultMode) {
          callMessageEntity = this.callEntity.isGroup
            ? z.calling.CallMessageBuilder.buildGroupSetup(response, sessionId, additionalPayload)
            : z.calling.CallMessageBuilder.buildSetup(response, sessionId, additionalPayload);
        } else {
          callMessageEntity = z.calling.CallMessageBuilder.buildUpdate(response, sessionId, additionalPayload);
        }

        return this.callEntity.sendCallMessage(callMessageEntity).then(() => {
          this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SEND);
          this.callLogger.debug(`Sending local '${localSdp.type}' SDP successful`, this.localSdp());
        });
      })
      .catch(error => {
        this.shouldSendLocalSdp(true);
        throw error;
      });
  }

  /**
   * Clear the negotiation timeout.
   * @private
   * @returns {undefined} No return value
   */
  _clearNegotiationTimeout() {
    if (this.negotiationTimeout) {
      window.clearTimeout(this.negotiationTimeout);
      this.negotiationTimeout = undefined;
    }
  }

  /**
   * Clear the SDP send timeout.
   * @private
   * @returns {undefined} No return value
   */
  _clearSendSdpTimeout() {
    if (this.sendSdpTimeout) {
      window.clearTimeout(this.sendSdpTimeout);
      this.sendSdpTimeout = undefined;
    }
  }

  /**
   * Check for relay candidate among given ICE candidates
   *
   * @private
   * @param {Array<string>} iceCandidates - ICE candidate strings from SDP
   * @returns {boolean} True if relay candidate found
   */
  _containsRelayCandidate(iceCandidates) {
    for (const iceCandidate of iceCandidates) {
      if (iceCandidate.toLowerCase().includes('relay')) {
        return true;
      }
    }
  }

  /**
   * Create a local SDP of type 'answer'.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createAnswer
   * @private
   * @returns {undefined} No return value
   */
  _createSdpAnswer() {
    this.negotiationNeeded(false);

    const logMessage = {
      data: {
        default: [z.calling.rtc.SDP_TYPE.ANSWER, this.remoteUser.name()],
        obfuscated: [z.calling.rtc.SDP_TYPE.ANSWER, this.callLogger.obfuscate(this.remoteUser.id)],
      },
      message: `Creating '{0}' for flow with '{1}'`,
    };
    this.callLogger.debug(logMessage);

    this.peerConnection
      .createAnswer()
      .then(rtcSdp => this._createSdpSuccess(rtcSdp))
      .catch(error => this._createSdpFailure(error, z.calling.rtc.SDP_TYPE.ANSWER));
  }

  /**
   * Failed to create local SDP
   *
   * @private
   * @param {Error} error - Error that was thrown
   * @param {z.calling.rtc.SDP_TYPE} sdpType - Type of SDP
   * @returns {undefined} No return value
   */
  _createSdpFailure(error, sdpType) {
    const {message, name} = error;
    this.callLogger.error(`Creating '${sdpType}' failed: ${name} - ${message}`, error);

    const attributes = {cause: name, step: 'create_sdp', type: sdpType};
    this.callEntity.telemetry.track_event(z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes);

    amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, this.callEntity.id, z.calling.enum.TERMINATION_REASON.SDP_FAILED);
  }

  /**
   * Creating local SDP succeeded.
   *
   * @private
   * @param {RTCSessionDescription} rctSdp - New local SDP
   * @returns {undefined} No return value
   */
  _createSdpSuccess(rctSdp) {
    this.callLogger.info(`Creating '${rctSdp.type}' successful`, rctSdp);

    z.calling.SDPMapper.rewriteSdp(rctSdp, z.calling.enum.SDP_SOURCE.LOCAL, this).then(({sdp: localSdp}) => {
      this.localSdp(localSdp);
    });
  }

  /**
   * Create a local SDP of type 'offer'.
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createOffer
   * @private
   * @param {boolean} iceRestart - Is ICE restart negotiation
   * @returns {undefined} No return value
   */
  _createSdpOffer(iceRestart) {
    this.negotiationNeeded(false);
    this._initializeDataChannel();

    /*
     * https://www.w3.org/TR/webrtc/#offer-answer-options
     * https://www.w3.org/TR/webrtc/#configuration-data-extensions
     *
     * Set offerToReceiveVideo to true on audio calls. Else it should be undefined for Firefox compatibility reasons.
     */
    const offerOptions = {iceRestart, voiceActivityDetection: true};

    const logMessage = {
      data: {
        default: [z.calling.rtc.SDP_TYPE.OFFER, this.remoteUser.name()],
        obfuscated: [z.calling.rtc.SDP_TYPE.OFFER, this.callLogger.obfuscate(this.remoteUser.id)],
      },
      message: `Creating '{0}' for flow with '{1}'`,
    };
    this.callLogger.debug(logMessage);

    this.peerConnection
      .createOffer(offerOptions)
      .then(rtcSdp => this._createSdpSuccess(rtcSdp))
      .catch(error => this._createSdpFailure(error, z.calling.rtc.SDP_TYPE.OFFER));
  }

  /**
   * Create the additional payload.
   * @private
   * @returns {Object} Additional payload
   */
  _createAdditionalPayload() {
    const payload = z.calling.CallMessageBuilder.createPayload(
      this.conversationId,
      this.selfUserId,
      this.remoteUserId,
      this.remoteClientId
    );
    const additionalPayload = Object.assign({remoteUser: this.remoteUser, sdp: this.localSdp().sdp}, payload);

    return z.calling.CallMessageBuilder.createPropSync(
      this.callEntity.selfState,
      this.callEntity.selfState.videoSend(),
      false,
      additionalPayload
    );
  }

  /**
   * Sets the local Session Description Protocol on the PeerConnection.
   * @private
   * @returns {undefined} No return value
   */
  _setLocalSdp() {
    this.sdpStateChanging(true);
    const localSdp = this.localSdp();
    this.callLogger.debug(`Setting local '${localSdp.type}' SDP`, localSdp);

    this.peerConnection
      .setLocalDescription(localSdp)
      .then(() => {
        this.callLogger.info(`Setting local '${localSdp.type}' SDP successful`, this.peerConnection.localDescription);
        this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.LOCAL_SDP_SET);

        this.shouldSetLocalSdp(false);
        this.sdpStateChanging(false);
        this._setSendSdpTimeout();
      })
      .catch(error => this._setSdpFailure(error, z.calling.enum.SDP_SOURCE.LOCAL, localSdp.type));
  }

  /**
   * Sets the remote Session Description Protocol on the PeerConnection.
   * @private
   * @returns {undefined} No return value
   */
  _setRemoteSdp() {
    this.sdpStateChanging(false);
    const remoteSdp = this.remoteSdp();
    this.callLogger.debug(`Setting remote '${remoteSdp.type}' SDP\n${remoteSdp.sdp}`, remoteSdp);

    this.peerConnection
      .setRemoteDescription(remoteSdp)
      .then(() => {
        const logMessage = `Setting remote '${remoteSdp.type}' SDP successful`;
        this.callLogger.info(logMessage, this.peerConnection.remoteDescription);
        this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.REMOTE_SDP_SET);

        this.shouldSetRemoteSdp(false);
        this.sdpStateChanging(false);
      })
      .catch(error => this._setSdpFailure(error, z.calling.enum.SDP_SOURCE.REMOTE, remoteSdp.type));
  }

  /**
   * Failed to set SDP.
   *
   * @private
   * @param {Error} error - Error that was thrown
   * @param {z.calling.enum.SDP_SOURCE} sdpSource - Source of SDP
   * @param {z.calling.rtc.SDP_TYPE} sdpType - SDP type
   * @returns {undefined} No return value
   */
  _setSdpFailure(error, sdpSource, sdpType) {
    const {message, name} = error;

    const failedLocalSdp = sdpSource === z.calling.enum.SDP_SOURCE.LOCAL && !this.properLocalSdpState();
    const failedRemoteSdp = sdpSource === z.calling.enum.SDP_SOURCE.REMOTE && !this.properRemoteSdpState();

    const shouldSolveCollision = failedLocalSdp || failedRemoteSdp;
    if (shouldSolveCollision) {
      this._solveCollidingSdps(failedLocalSdp);
      return this.sdpStateChanging(false);
    }

    this.callLogger.error(`Setting ${sdpSource} '${sdpType}' SDP failed: ${name} - ${message}`, error);

    const attributes = {cause: name, location: sdpSource, step: 'set_sdp', type: sdpType};
    this.callEntity.telemetry.track_event(z.tracking.EventName.CALLING.FAILED_RTC, undefined, attributes);

    this._removeParticipant(z.calling.enum.TERMINATION_REASON.SDP_FAILED);
  }

  /**
   * Set the negotiation failed timeout.
   * @private
   * @returns {undefined} No return value
   */
  _setNegotiationFailedTimeout() {
    this.negotiationTimeout = window.setTimeout(() => {
      this.callLogger.info('Removing call participant on negotiation timeout');
      this._removeParticipant(z.calling.enum.TERMINATION_REASON.RENEGOTIATION);
    }, FlowEntity.CONFIG.NEGOTIATION_FAILED_TIMEOUT);
  }

  /**
   * Set the negotiation restart timeout.
   * @private
   * @returns {undefined} No return value
   */
  _setNegotiationRestartTimeout() {
    this.negotiationTimeout = window.setTimeout(() => {
      this.callEntity.terminationReason = z.calling.enum.TERMINATION_REASON.CONNECTION_DROP;
      this.participantEntity.isConnected(false);

      this.callEntity.interruptedParticipants.push(this.participantEntity);
      const isModeDefault = this.negotiationMode() === z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT;
      if (isModeDefault) {
        this.restartNegotiation(z.calling.enum.SDP_NEGOTIATION_MODE.ICE_RESTART, false);
      }
    }, FlowEntity.CONFIG.NEGOTIATION_RESTART_TIMEOUT);
  }

  /**
   * Set the SDP send timeout.
   * @private
   * @param {boolean} [initialTimeout=true] - Choose initial timeout length
   * @returns {undefined} No return value
   */
  _setSendSdpTimeout(initialTimeout = true) {
    const timeout = initialTimeout ? FlowEntity.CONFIG.SDP_SEND_TIMEOUT : FlowEntity.CONFIG.SDP_SEND_TIMEOUT_RESET;
    this.sendSdpTimeout = window.setTimeout(() => {
      this.callLogger.info('Sending local SDP on timeout');
      this.sendLocalSdp(true);
    }, timeout);
  }

  //##############################################################################
  // SDP state collision handling
  //##############################################################################

  /**
   * Solve colliding SDP states.
   *
   * @note If we receive a remote offer while we have a local offer, we need to check who needs to switch his SDP type.
   * @private
   * @param {boolean} [forceRenegotiation=false] - Force local renegotiation to switch to
   * @returns {boolean} False if we locally needed to switch sides
   */
  _solveCollidingStates(forceRenegotiation = false) {
    const logMessage = {
      data: {
        default: [this.selfUserId, this.remoteUserId, forceRenegotiation],
        obfuscated: [
          this.callLogger.obfuscate(this.selfUserId),
          this.callLogger.obfuscate(this.remoteUserId),
          forceRenegotiation,
        ],
      },
      message: `Solving state collision: Self user ID '{0}', remote user ID '{1}', forceRenegotiation '{2}'`,
    };
    this.callLogger.debug(logMessage);

    const selfUserIdLooses = this.selfUserId < this.remoteUserId;
    const shouldRenegotiate = selfUserIdLooses || forceRenegotiation;
    if (shouldRenegotiate) {
      const log = {
        data: {
          default: [this.remoteUser.name()],
          obfuscated: [this.callLogger.obfuscate(this.remoteUser.id)],
        },
        message: `We need to switch SDP state of flow with '{0}' to answer.`,
      };
      this.callLogger.warn(log);

      this.restartNegotiation(z.calling.enum.SDP_NEGOTIATION_MODE.STATE_COLLISION, true);
      return forceRenegotiation || false;
    }

    const log = {
      data: {
        default: [this.remoteUser.name()],
        obfuscated: [this.callLogger.obfuscate(this.remoteUser.id)],
      },
      message: `Remote side '{0}' needs to switch SDP state flow to answer.`,
    };
    this.callLogger.warn(log);

    return true;
  }

  /**
   * Solve colliding SDP states when setting SDP failed.
   * @private
   * @param {boolean} failedLocalSdp - Failed to set local SDP
   * @returns {undefined} No return value
   */
  _solveCollidingSdps(failedLocalSdp) {
    const remoteSdp = this.remoteSdp();

    if (!this._solveCollidingStates(failedLocalSdp)) {
      this.remoteSdp(remoteSdp);
    }
  }

  //##############################################################################
  // Media stream handling
  //##############################################################################

  /**
   * Update the local MediaStream.
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - Object containing the required MediaStream information
   * @returns {Promise} Resolves when the updated MediaStream is used
   */
  updateMediaStream(mediaStreamInfo) {
    return this._replaceMediaTrack(mediaStreamInfo).catch(error => {
      const {message, type} = error;
      const expectedErrorTypes = [
        z.calling.CallError.TYPE.NO_REPLACEABLE_TRACK,
        z.calling.CallError.TYPE.RTP_SENDER_NOT_SUPPORTED,
      ];

      const isExpectedError = expectedErrorTypes.includes(type);
      if (isExpectedError) {
        this.callLogger.debug(`Replacement of MediaStream and renegotiation necessary: ${message}`, error);
        return this._replaceMediaStream(mediaStreamInfo);
      }
      throw error;
    });
  }

  /**
   * Adds a local MediaStream to the PeerConnection.
   *
   * @private
   * @param {MediaStream} mediaStream - MediaStream to add to the PeerConnection
   * @returns {undefined} No return value
   */
  _addMediaStream(mediaStream) {
    if (mediaStream) {
      const isTypeAudio = mediaStream.type === z.media.MediaType.AUDIO;
      if (isTypeAudio) {
        mediaStream = this.audio.wrapAudioInputStream(mediaStream);
      }

      if (this.peerConnection.addTrack) {
        mediaStream.getTracks().forEach(mediaStreamTrack => {
          this.peerConnection.addTrack(mediaStreamTrack, mediaStream);

          this.callLogger.debug(`Added local '${mediaStreamTrack.kind}' MediaStreamTrack to PeerConnection`, {
            audioTracks: mediaStream.getAudioTracks(),
            stream: mediaStream,
            videoTracks: mediaStream.getVideoTracks(),
          });
        });
      } else {
        this.peerConnection.addStream(mediaStream);
        this.callLogger.debug(`Added local '${mediaStream.type}' MediaStream to PeerConnection`, {
          audioTracks: mediaStream.getAudioTracks(),
          stream: mediaStream,
          videoTracks: mediaStream.getVideoTracks(),
        });
      }
    } else {
      throw new Error('Failed to add MediaStream: Provided MediaStream undefined');
    }
  }

  /**
   * Get RTC Sender of matching type.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Requested MediaType
   * @returns {RTCRtpSender} Matching RTC Rtp Sender
   */
  _getRtcSender(mediaType) {
    for (const rtpSender of this.peerConnection.getSenders()) {
      const {track: mediaStreamTrack} = rtpSender;

      const isExpectedType = mediaStreamTrack && mediaStreamTrack.kind === mediaType;
      if (isExpectedType) {
        const supportsReplaceTrack = typeof rtpSender.replaceTrack === 'function';
        if (supportsReplaceTrack) {
          return rtpSender;
        }

        throw new z.calling.CallError(z.calling.CallError.TYPE.RTP_SENDER_NOT_SUPPORTED);
      }
    }

    throw new z.calling.CallError(z.calling.CallError.TYPE.NO_REPLACEABLE_TRACK);
  }

  /**
   * Replace the MediaStream attached to the PeerConnection.
   *
   * @private
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - Object containing the required MediaStream information
   * @returns {Promise} Resolves when MediaStream has been replaced
   */
  _replaceMediaStream(mediaStreamInfo) {
    const mediaType = mediaStreamInfo.type;

    return Promise.resolve()
      .then(() => this._removeMediaStream(this.mediaStream()))
      .then(() => this._upgradeMediaStream(mediaStreamInfo))
      .then(upgradedMediaStreamInfo => {
        const {stream: mediaStream} = upgradedMediaStreamInfo;
        upgradedMediaStreamInfo.replaced = true;

        this.callLogger.info(`Upgraded the MediaStream to update '${mediaType}'`, mediaStream);
        this.restartNegotiation(z.calling.enum.SDP_NEGOTIATION_MODE.STREAM_CHANGE, false, mediaStream);
        return upgradedMediaStreamInfo;
      })
      .catch(error => {
        this.callLogger.error(`Failed to replace local MediaStream: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Replace the a MediaStreamTrack attached to the MediaStream of the PeerConnection.
   *
   * @private
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - Object containing the required MediaStream information
   * @returns {Promise} Resolves when a MediaStreamTrack has been replaced
   */
  _replaceMediaTrack(mediaStreamInfo) {
    const {stream: mediaStream, type: mediaType} = mediaStreamInfo;

    return Promise.resolve()
      .then(() => {
        const supportsGetSenders = typeof this.peerConnection.getSenders === 'function';
        if (supportsGetSenders) {
          return this._getRtcSender(mediaType);
        }

        throw new z.calling.CallError(z.calling.CallError.TYPE.RTP_SENDER_NOT_SUPPORTED);
      })
      .then(rtpSender => {
        const [mediaStreamTrack] = mediaStream.getTracks();

        rtpSender.replaceTrack(mediaStreamTrack);
      })
      .then(() => {
        this.callLogger.debug(`Replaced the '${mediaType}' track`);
        return mediaStreamInfo;
      })
      .catch(error => {
        const {message, name, type} = error;

        const expectedErrorTypes = [
          z.calling.CallError.TYPE.NO_REPLACEABLE_TRACK,
          z.calling.CallError.TYPE.RTP_SENDER_NOT_SUPPORTED,
        ];

        const isExpectedError = expectedErrorTypes.includes(type);
        if (!isExpectedError) {
          this.callLogger.error(`Failed to replace the '${mediaType}' track: ${name} - ${message}`, error);
        }
        throw error;
      });
  }

  /**
   * Removes a MediaStreamTrack from the PeerConnection.
   *
   * @private
   * @param {string} trackId - ID of MediaStreamTrack
   * @param {z.media.MediaType} mediaType - MediaType of MediaStreamTrack
   * @returns {undefined} No return value
   */
  _removeMediaStreamTrack(trackId, mediaType) {
    for (const rtpSender of this.peerConnection.getSenders()) {
      const {track: mediaStreamTrack} = rtpSender;

      const isExpectedId = mediaStreamTrack && mediaStreamTrack.id === trackId;
      if (isExpectedId) {
        this.peerConnection.removeTrack(rtpSender);
        this.callLogger.debug(`Removed local '${mediaType}' MediaStreamTrack from PeerConnection`);
        break;
      }
    }
  }

  /**
   * Remove all MediaStreamTracks of a MediaStream from the PeerConnection.
   *
   * @private
   * @param {MediaStream} mediaStream - Local MediaStream to remove from the PeerConnection
   * @returns {undefined} No return value
   */
  _removeMediaStreamTracks(mediaStream) {
    mediaStream
      .getTracks()
      .forEach(({id: trackId, kind: mediaType}) => this._removeMediaStreamTrack(trackId, mediaType));
  }

  /**
   * Remove the MediaStream.
   *
   * @private
   * @param {MediaStream} mediaStream - Local MediaStream to stop
   * @returns {undefined} No return value
   */
  _removeMediaStream(mediaStream) {
    if (this.peerConnection) {
      const signalingStateStable = this.peerConnection.signalingState === z.calling.rtc.SIGNALING_STATE.STABLE;
      const supportsRemoveTrack = typeof this.peerConnection.removeTrack === 'function';
      if (signalingStateStable && supportsRemoveTrack) {
        return this._removeMediaStreamTracks(mediaStream);
      }

      const signalingStateNotClosed = this.peerConnection.signalingState !== z.calling.rtc.SIGNALING_STATE.CLOSED;
      const supportsRemoveStream = typeof this.peerConnection.removeStream === 'function';
      if (signalingStateNotClosed && supportsRemoveStream) {
        this.peerConnection.removeStream(mediaStream);
        this.callLogger.debug(`Removed local '${mediaStream.type}' MediaStream from PeerConnection`, {
          audioTracks: mediaStream.getAudioTracks(),
          stream: mediaStream,
          videoTracks: mediaStream.getVideoTracks(),
        });
      }
    }
  }

  /**
   * Upgrade the local MediaStream with new MediaStreamTracks
   *
   * @private
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - MediaStreamInfo containing new MediaStreamTracks
   * @returns {z.media.MediaStreamInfo} New MediaStream to be used
   */
  _upgradeMediaStream(mediaStreamInfo) {
    if (this.mediaStream()) {
      const {stream: newMediaStream, type: mediaType} = mediaStreamInfo;

      z.media.MediaStreamHandler.get_media_tracks(this.mediaStream(), mediaType).forEach(mediaStreamTrack => {
        this.mediaStream().removeTrack(mediaStreamTrack);
        mediaStreamTrack.stop();
        const mediaKind = mediaStreamTrack.kind;
        this.callLogger.debug(`Stopping MediaStreamTrack of kind '${mediaKind}' successful`, mediaStreamTrack);
      });

      const mediaStream = this.mediaStream().clone();

      z.media.MediaStreamHandler.get_media_tracks(newMediaStream, mediaType).forEach(mediaStreamTrack => {
        mediaStream.addTrack(mediaStreamTrack);
      });

      return new z.media.MediaStreamInfo(z.media.MediaStreamSource.LOCAL, 'self', mediaStream);
    }

    return mediaStreamInfo;
  }

  //##############################################################################
  // Reset
  //##############################################################################

  /**
   * Clear the timeouts.
   * @returns {undefined} No return value
   */
  clearTimeouts() {
    this._clearNegotiationTimeout();
    this._clearSendSdpTimeout();
  }

  /**
   * Reset the flow.
   * @returns {undefined} No return value
   */
  resetFlow() {
    if (this.mediaStream()) {
      this._removeMediaStream(this.mediaStream());
    }

    if (this.pcInitialized()) {
      const logMessage = {
        data: {
          default: [this.remoteUser.id],
          obfuscated: [this.callLogger.obfuscate(this.remoteUser.id)],
        },
        message: `Resetting flow with user '{0}'`,
      };
      this.callLogger.debug(logMessage);

      this.remoteClientId = undefined;
      this.telemetry.disconnected();

      this.clearTimeouts();
      this._closeDataChannel();
      this._closePeerConnection();
      this._resetSignalingStates();
      this._resetSdp();
      this.pcInitialized(false);
    }
  }

  /**
   * Reset the SDP.
   * @private
   * @returns {undefined} No return value
   */
  _resetSdp() {
    this.localSdp(undefined);
    this.remoteSdp(undefined);
  }

  /**
   * Reset the signaling states.
   * @private
   * @returns {undefined} No return value
   */
  _resetSignalingStates() {
    this.connectionState(z.calling.rtc.ICE_CONNECTION_STATE.NEW);
    this.gatheringState(z.calling.rtc.ICE_GATHERING_STATE.NEW);
    this.signalingState(z.calling.rtc.SIGNALING_STATE.NEW);
  }

  //##############################################################################
  // Logging
  //##############################################################################

  /**
   * Get full telemetry report for automation.
   * @returns {Object} Automation report
   */
  getTelemetry() {
    return this.telemetry.get_automation_report();
  }

  /**
   * Log flow status to console.
   * @returns {undefined} No return value
   */
  logStatus() {
    this.telemetry.log_status(this.participantEntity);
  }

  /**
   * Log flow setup step timings to console.
   * @returns {undefined} No return value
   */
  logTimings() {
    this.telemetry.log_timings();
  }

  /**
   * Report flow status to Raygun.
   * @returns {undefined} No return value
   */
  reportStatus() {
    this.telemetry.report_status();
  }

  /**
   * Report flow setup step timings to Raygun.
   * @returns {undefined} No return value
   */
  reportTimings() {
    this.telemetry.report_timings();
  }
};
