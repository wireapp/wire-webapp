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

window.z = window.z || {};
window.z.calling = z.calling || {};
window.z.calling.entities = z.calling.entities || {};

z.calling.entities.FlowEntity = class FlowEntity {
  static get CONFIG() {
    return {
      DATA_CHANNEL_LABEL: 'calling-3.0',
      MAX_ICE_CANDIDATE_GATHERING_ATTEMPTS: 5,
      NEGOTIATION_THRESHOLD: 0.5 * z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
      RECONNECTION_TIMEOUT: 2.5 * z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
      RENEGOTIATION_TIMEOUT: 30 * z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
      SDP_SEND_TIMEOUT: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
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

    const loggerName = 'z.calling.entities.FlowEntity';
    this.callLogger = new z.telemetry.calling.CallLogger(loggerName, this.id, z.config.LOGGER.OPTIONS, this.messageLog);

    // States
    this.isAnswer = ko.observable(false);
    this.selfState = this.callEntity.selfState;

    // Users
    this.remoteClientId = undefined;
    this.remoteUser = this.participantEntity.user;
    this.remoteUserId = this.remoteUser.id;
    this.selfUser = this.callEntity.selfUser;
    this.selfUserId = this.selfUser.id;

    // Audio
    this.audio = new z.calling.entities.FlowAudioEntity(this, this.callingRepository.mediaRepository);

    // Telemetry
    this.telemetry = new z.telemetry.calling.FlowTelemetry(this.id, this.remoteUserId, this.callEntity, timings);

    this.callLogger.info({
      data: {
        default: [this.remoteUser.name()],
        obfuscated: [this.callLogger.obfuscate(this.remoteUser.id)],
      },
      message: `Created new flow entity for user {0}`,
    });

    //##############################################################################
    // PeerConnection
    //##############################################################################

    this.peerConnection = undefined;
    /*
      Because Chrome seems to not have the `getConfiguration` method on the peerConnection object when connection is not established,
      we also need to keep track of the configuration we feed the peerConnection.
      It might need reconsideration when Chrome 70 is out https://www.chromestatus.com/feature/5271355306016768
    */
    this.peerConnectionConfiguration = undefined;
    this.iceCandidatesGatheringAttempts = 1;
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
            this._removeDroppedParticipant();
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
        this._setLocalSdp(this.localSdp());
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

    const hadMediaStream = !!mediaStream;
    this._createPeerConnection().then(() => {
      if (!mediaStream) {
        // @todo Remove report after debugging purpose achieved
        const customData = {
          hadMediaStream,
          hasMediaStream: !!mediaStream,
          isAnswer: this.isAnswer(),
          isGroup: this.callEntity.isGroup,
          selfClientJoined: this.callEntity.selfClientJoined(),
          state: this.callEntity.state(),
        };
        Raygun.send(new Error('Media Stream missing when negotiation call'), customData);

        throw new z.error.MediaError(z.error.MediaError.TYPE.STREAM_NOT_FOUND);
      }

      this._addMediaStream(mediaStream);
      this.audio.hookup(true);
      this._setSdpStates();
      this.negotiationMode(negotiationMode);
      this.negotiationNeeded(true);
      this.pcInitialized(true);

      const isDefaultNegotiationMode = negotiationMode === z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT;
      this._setNegotiationFailedTimeout(isDefaultNegotiationMode);
    });
  }

  /**
   * Remove the participant from the call
   *
   * @private
   * @param {z.calling.enum.TERMINATION_REASON} [terminationReason] - Reason for termination
   * @returns {undefined} No return value
   */
  _removeDroppedParticipant(terminationReason) {
    this.participantEntity.isConnected(false);

    const deletionTerminationReason = z.calling.enum.TERMINATION_REASON.CONNECTION_DROP;
    this.callEntity
      .deleteParticipant(this.participantEntity.id, this.remoteClientId, deletionTerminationReason)
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
    const peerConnectionInActiveState =
      this.peerConnection && this.peerConnection.signalingState !== z.calling.rtc.SIGNALING_STATE.CLOSED;

    if (!peerConnectionInActiveState) {
      const logMessage = {
        data: {
          default: [this.remoteUser.name()],
          obfuscated: [this.callLogger.obfuscate(this.remoteUser.id)],
        },
        message: `PeerConnection with '{0}' was previously closed`,
      };
      this.callLogger.info(logMessage);
      return;
    }

    this.peerConnection.oniceconnectionstatechange = () => {
      this.callLogger.log(this.callLogger.levels.OFF, 'State change ignored - ICE connection');
    };

    this.peerConnection.onsignalingstatechange = event => {
      const peerConnection = event.target;
      const logMessage = `State change ignored - signaling state: ${peerConnection.signalingState}`;
      this.callLogger.log(this.callLogger.levels.OFF, logMessage);
    };

    const connectionMediaStreamTracks = this.peerConnection.getReceivers
      ? this.peerConnection.getReceivers().map(receiver => receiver.track)
      : this.peerConnection.getRemoteStreams().reduce((tracks, stream) => tracks.concat(stream.getTracks()), []);

    amplify.publish(z.event.WebApp.CALL.MEDIA.CONNECTION_CLOSED, connectionMediaStreamTracks);
    this.peerConnection.close();
    this.peerConnection = undefined;

    const logMessage = {
      data: {
        default: [this.remoteUser.name()],
        obfuscated: [this.callLogger.obfuscate(this.remoteUser.id)],
      },
      message: `Closing PeerConnection with '{0}' successful`,
    };
    this.callLogger.info(logMessage);
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
      this.peerConnectionConfiguration = pcConfiguration;
      this.telemetry.time_step(z.telemetry.calling.CallSetupSteps.PEER_CONNECTION_CREATED);
      this.signalingState(this.peerConnection.signalingState);

      const logMessage = {
        data: {
          default: [this.remoteUser.name(), this.isAnswer()],
          obfuscated: [this.callLogger.obfuscate(this.remoteUser.id), this.isAnswer()],
        },
        message: `PeerConnection with '{0}' created - isAnswer '{1}'`,
      };
      this.callLogger.debug(logMessage, pcConfiguration);

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

    const mediaType = z.media.MediaStreamHandler.detectMediaStreamType(mediaStream);
    const isTypeAudio = mediaType === z.media.MediaType.AUDIO;
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
        this.callLogger.info('Generation of ICE candidates completed');
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
    if (this.callEntity.isActiveState()) {
      const peerConnection = event.target;

      this.callLogger.info('State changed - ICE connection', event);
      const connectionMessage = `ICE connection state: ${peerConnection.iceConnectionState}`;
      this.callLogger.log(this.callLogger.levels.LEVEL_1, connectionMessage);
      const gatheringMessage = `ICE gathering state: ${peerConnection.iceGatheringState}`;
      this.callLogger.log(this.callLogger.levels.LEVEL_1, gatheringMessage);

      this.gatheringState(peerConnection.iceGatheringState);
      this.connectionState(peerConnection.iceConnectionState);
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
    const peerConnection = event.target;
    this.callLogger.info(`State changed - signaling state: ${peerConnection.signalingState}`, event);
    this.signalingState(peerConnection.signalingState);
  }

  /**
   * A MediaStreamTrack was added to the PeerConnection.
   *
   * @private
   * @param {RTCTrackEvent} event - Event that contains the newly added MediaStreamTrack
   * @returns {undefined} No return value
   */
  _onTrack(event) {
    const mediaStreamTrack = event.track;
    this.callLogger.info(`Remote '${mediaStreamTrack.kind}' MediaStreamTrack added to PeerConnection`, event);
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
          throw new z.error.CallError(z.error.CallError.TYPE.NO_DATA_CHANNEL);
        }
      }
    }

    throw new z.error.CallError(z.error.CallError.TYPE.NO_DATA_CHANNEL);
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
    const conversationEntity = this.callEntity.conversationEntity;

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
    this.callLogger.info(`Sending local SDP${sendingOnTimeout ? ' on timeout' : ''}`);
    this._clearSendSdpTimeout();

    if (!this.peerConnection) {
      this.callLogger.warn('Cannot send local SDP without existing PeerConnection');
      return;
    }

    const rawSdp = this.peerConnection.localDescription;

    const mappedSdp = z.calling.SDPMapper.rewriteSdp(rawSdp, z.calling.enum.SDP_SOURCE.LOCAL, this);

    Promise.resolve(mappedSdp)
      .then(({iceCandidates, sdp: transformedSdp}) => {
        this.localSdp(rawSdp);

        const isModeDefault = this.negotiationMode() === z.calling.enum.SDP_NEGOTIATION_MODE.DEFAULT;
        if (isModeDefault && sendingOnTimeout) {
          const connectionConfig =
            (this.peerConnection.getConfiguration && this.peerConnection.getConfiguration()) ||
            this.peerConnectionConfiguration;
          const isValidGathering = z.util.PeerConnectionUtil.isValidIceCandidatesGathering(
            connectionConfig,
            iceCandidates
          );
          const attempts = this.iceCandidatesGatheringAttempts;
          const hasReachMaxGatheringAttempts = attempts >= FlowEntity.CONFIG.MAX_ICE_CANDIDATE_GATHERING_ATTEMPTS;
          if (!hasReachMaxGatheringAttempts && !isValidGathering) {
            const logMessage = `Not enough ICE candidates gathered (attempt '${attempts}'). Restarting timeout\n${iceCandidates}`;
            this.iceCandidatesGatheringAttempts++;
            this.callLogger.warn(logMessage);
            return this._setSendSdpTimeout();
          }
        }

        const iceCandidateTypes = z.util.PeerConnectionUtil.getIceCandidatesTypes(iceCandidates);

        const iceCandidateTypesLog = Object.keys(iceCandidateTypes)
          .map(candidateType => `${iceCandidateTypes[candidateType]} ${candidateType}`)
          .join(', ');

        const logMessage = {
          data: {
            default: [
              transformedSdp.type,
              iceCandidates.length,
              iceCandidateTypesLog,
              this.remoteUser.name(),
              transformedSdp.sdp,
            ],
            obfuscated: [
              transformedSdp.type,
              iceCandidates.length,
              this.callLogger.obfuscate(this.remoteUser.id),
              this.callLogger.obfuscateSdp(transformedSdp.sdp),
            ],
          },
          message: `Sending local '{0}' SDP containing '{1}' ICE candidates ({2}) for flow with '{3}'\n{4}`,
        };
        this.callLogger.debug(logMessage);

        this.shouldSendLocalSdp(false);

        const response = transformedSdp.type === z.calling.rtc.SDP_TYPE.ANSWER;
        let callMessageEntity;

        const additionalPayload = this._createAdditionalPayload(transformedSdp);
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
          this.callLogger.debug(`Sending local '${transformedSdp.type}' SDP successful`, transformedSdp.sdp);
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
   * Build RTCOfferAnswerOptions for SDP creation
   *
   * @see https://www.w3.org/TR/webrtc/#offer/answer-options
   *
   * @private
   * @param {boolean} iceRestart - Is ICE restart
   * @returns {RTCOfferAnswerOptions} Object containing the RTCOfferAnswerOptions
   */
  _createOfferAnswerOptions(iceRestart) {
    return {iceRestart, voiceActivityDetection: true};
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
      .createAnswer(this._createOfferAnswerOptions())
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
   * @param {RTCSessionDescription} rtcSdp - New local SDP
   * @returns {undefined} No return value
   */
  _createSdpSuccess(rtcSdp) {
    this.callLogger.info(`Creating '${rtcSdp.type}' successful`, rtcSdp);
    this.localSdp(rtcSdp);
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

    const logMessage = {
      data: {
        default: [z.calling.rtc.SDP_TYPE.OFFER, this.remoteUser.name()],
        obfuscated: [z.calling.rtc.SDP_TYPE.OFFER, this.callLogger.obfuscate(this.remoteUser.id)],
      },
      message: `Creating '{0}' for flow with '{1}'`,
    };
    this.callLogger.debug(logMessage);

    this.peerConnection
      .createOffer(this._createOfferAnswerOptions(iceRestart))
      .then(rtcSdp => this._createSdpSuccess(rtcSdp))
      .catch(error => this._createSdpFailure(error, z.calling.rtc.SDP_TYPE.OFFER));
  }

  /**
   * Create the additional payload.
   * @private
   * @param {RTCSessionDescription} localSdp - local sdp to send
   * @returns {Object} Additional payload
   */
  _createAdditionalPayload(localSdp) {
    const payload = z.calling.CallMessageBuilder.createPayload(
      this.conversationId,
      this.selfUserId,
      this.remoteUserId,
      this.remoteClientId
    );
    const additionalPayload = Object.assign({remoteUser: this.remoteUser, sdp: localSdp.sdp}, payload);

    const selfState = this.callEntity.selfState;
    return z.calling.CallMessageBuilder.createPropSync(selfState, additionalPayload);
  }

  /**
   * Sets the local Session Description Protocol on the PeerConnection.
   * @private
   * @param {RTCSessionDescription} localSdp - local sdp to set
   * @returns {undefined} No return value
   */
  _setLocalSdp(localSdp) {
    this.sdpStateChanging(true);
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

    this._removeDroppedParticipant(z.calling.enum.TERMINATION_REASON.SDP_FAILED);
  }

  /**
   * Set the negotiation failed timeout.
   *
   * @private
   * @param {boolean} isInitialNegotiation - Is negotiation during initial call setup
   * @returns {undefined} No return value
   */
  _setNegotiationFailedTimeout(isInitialNegotiation) {
    const timeout = isInitialNegotiation
      ? z.calling.entities.CallEntity.CONFIG.STATE_TIMEOUT
      : FlowEntity.CONFIG.RENEGOTIATION_TIMEOUT;

    this.negotiationTimeout = window.setTimeout(() => {
      this.callLogger.info('Removing call participant on negotiation timeout');
      this._removeDroppedParticipant(z.calling.enum.TERMINATION_REASON.RENEGOTIATION);
    }, timeout + FlowEntity.CONFIG.NEGOTIATION_THRESHOLD);
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
    }, FlowEntity.CONFIG.RECONNECTION_TIMEOUT);
  }

  /**
   * Set the SDP send timeout.
   * @private
   * @returns {undefined} No return value
   */
  _setSendSdpTimeout() {
    this.sendSdpTimeout = window.setTimeout(() => this.sendLocalSdp(true), FlowEntity.CONFIG.SDP_SEND_TIMEOUT);
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
   * Replace the MediaStream attached to the PeerConnection.
   *
   * @private
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - Object containing the required MediaStream information
   * @param {MediaStream} outdatedMediaStream - Previous MediaStream
   * @returns {Promise} Resolves when negotiation has been restarted
   */
  replaceMediaStream(mediaStreamInfo, outdatedMediaStream) {
    const mediaStream = mediaStreamInfo.stream;
    const mediaType = mediaStreamInfo.getType();
    const negotiationMode = z.calling.enum.SDP_NEGOTIATION_MODE.STREAM_CHANGE;

    return Promise.resolve()
      .then(() => this._removeMediaStream(outdatedMediaStream))
      .then(() => this.restartNegotiation(negotiationMode, false, mediaStream))
      .then(() => this.callLogger.debug(`Replaced the '${mediaType}' track`))
      .catch(error => {
        this.callLogger.error(`Failed to replace local MediaStream: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Replace the MediaStreamTrack attached to the MediaStream of the PeerConnection.
   *
   * @private
   * @param {z.media.MediaStreamInfo} mediaStreamInfo - Object containing the required MediaStream information
   * @returns {Promise} Resolves when a MediaStreamTrack has been replaced
   */
  replaceMediaTrack(mediaStreamInfo) {
    const mediaStream = mediaStreamInfo.stream;
    const mediaType = mediaStreamInfo.getType();
    const [mediaStreamTrack] = mediaStream.getTracks();

    return Promise.resolve()
      .then(() => this._getRtcSender(mediaType))
      .then(rtpSender => rtpSender.replaceTrack(mediaStreamTrack))
      .then(() => this.callLogger.debug(`Replaced the MediaStream containing '${mediaType}'`))
      .catch(error => {
        this.callLogger.error(`Failed to replace local MediaStreamTrack: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Check for support of MediaStreamTrack replacement.
   *
   * @private
   * @param {z.media.MediaType} mediaType - Type to check replacement capability for
   * @returns {Promise<boolean>} Resolves when the replacement capability has been checked
   */
  supportsTrackReplacement(mediaType) {
    return Promise.resolve()
      .then(() => {
        const supportsGetSenders = typeof this.peerConnection.getSenders === 'function';
        return supportsGetSenders ? this._getRtcSender(mediaType) : false;
      })
      .then(rtpSender => !!rtpSender)
      .catch(() => false);
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
      const mediaType = z.media.MediaStreamHandler.detectMediaStreamType(mediaStream);
      const containsAudio = z.media.MediaStreamHandler.CONFIG.MEDIA_TYPE.CONTAINS_AUDIO.includes(mediaType);
      if (containsAudio) {
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
      const mediaStreamTrack = rtpSender.track;

      const isExpectedType = mediaStreamTrack && mediaStreamTrack.kind === mediaType;
      if (isExpectedType) {
        const supportsReplaceTrack = typeof rtpSender.replaceTrack === 'function';
        if (supportsReplaceTrack) {
          return rtpSender;
        }

        throw new z.error.CallError(z.error.CallError.TYPE.RTP_SENDER_NOT_SUPPORTED);
      }
    }

    throw new z.error.CallError(z.error.CallError.TYPE.NO_REPLACEABLE_TRACK);
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
      const mediaStreamTrack = rtpSender.track;

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

      const isSignalingStateClosed = this.peerConnection.signalingState === z.calling.rtc.SIGNALING_STATE.CLOSED;
      const supportsRemoveStream = typeof this.peerConnection.removeStream === 'function';
      if (!isSignalingStateClosed && supportsRemoveStream) {
        this.peerConnection.removeStream(mediaStream);
        const mediaType = z.media.MediaStreamHandler.detectMediaStreamType(mediaStream);
        this.callLogger.debug(`Removed local '${mediaType}' MediaStream from PeerConnection`, {
          audioTracks: mediaStream.getAudioTracks(),
          stream: mediaStream,
          videoTracks: mediaStream.getVideoTracks(),
        });
      }
    }
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
      this.iceCandidatesGatheringAttempts = 1;
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
