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

z.calling.entities.CallEntity = class CallEntity {
  static get CONFIG() {
    return {
      GROUP_CHECK: {
        ACTIVITY_TIMEOUT: 2 * 60,
        MAXIMUM_TIMEOUT: 90,
        MINIMUM_TIMEOUT: 60,
      },
      STATE_TIMEOUT: 60 * z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
      TIMER: {
        INIT_THRESHOLD: 100,
        UPDATE_INTERVAL: z.util.TimeUtil.UNITS_IN_MILLIS.SECOND,
      },
    };
  }

  /**
   * Construct a new call entity.
   *
   * @class z.calling.entities.Call
   * @param {z.entity.Conversation} conversationEntity - Conversation the call takes place in
   * @param {z.entity.User} creatingUser - Entity of user starting the call
   * @param {string} sessionId - Session ID to identify call
   * @param {z.calling.CallingRepository} callingRepository - Calling Repository
   */
  constructor(conversationEntity, creatingUser, sessionId, callingRepository) {
    this.conversationEntity = conversationEntity;
    this.creatingUser = creatingUser;
    this.sessionId = sessionId;
    this.callingRepository = callingRepository;

    const {id: conversationId, isGroup} = conversationEntity;
    const {mediaStreamHandler, mediaRepository, selfStreamState, telemetry, userRepository} = this.callingRepository;
    this.messageLog = this.callingRepository.messageLog;

    this.id = conversationId;

    const loggerName = 'z.calling.entities.CallEntity';
    this.callLogger = new z.telemetry.calling.CallLogger(loggerName, this.id, z.config.LOGGER.OPTIONS, this.messageLog);

    this.callLogger.info(`Created new call entity in conversation ${this.id}`);

    // IDs and references
    this.timings = undefined;

    this.mediaRepository = mediaRepository;
    this.userRepository = userRepository;
    this.selfUser = this.userRepository.self();
    this.selfState = selfStreamState;
    this.telemetry = telemetry;

    // States
    this.callTimerInterval = undefined;
    this.timerStart = undefined;
    this.durationTime = ko.observable(0);
    this.groupCheckTimeoutId = undefined;
    this.terminationReason = undefined;

    this.isConnected = ko.observable(false);
    this.isGroup = isGroup();

    this.selfClientJoined = ko.observable(false);
    this.selfUserJoined = ko.observable(false);
    this.state = ko.observable(z.calling.enum.CALL_STATE.UNKNOWN);
    this.previousState = undefined;

    this.participants = ko.observableArray([]);
    this.interruptedParticipants = ko.observableArray([]);

    // Media
    this.localMediaStream = mediaStreamHandler.localMediaStream;
    this.localMediaType = mediaStreamHandler.localMediaType;
    this.remoteMediaType = ko.observable(z.media.MediaType.NONE);

    // Statistics
    this._resetTimer();

    // Computed values
    this.isConnecting = ko.pureComputed(() => this.state() === z.calling.enum.CALL_STATE.CONNECTING);
    this.isDeclined = ko.pureComputed(() => this.state() === z.calling.enum.CALL_STATE.REJECTED);
    this.isDisconnecting = ko.pureComputed(() => this.state() === z.calling.enum.CALL_STATE.DISCONNECTING);
    this.isIncoming = ko.pureComputed(() => this.state() === z.calling.enum.CALL_STATE.INCOMING);
    this.isOngoing = ko.pureComputed(() => this.state() === z.calling.enum.CALL_STATE.ONGOING);
    this.isOutgoing = ko.pureComputed(() => this.state() === z.calling.enum.CALL_STATE.OUTGOING);

    this.canConnectState = ko.pureComputed(() => z.calling.enum.CALL_STATE_GROUP.CAN_CONNECT.includes(this.state()));
    this.canJoinState = ko.pureComputed(() => z.calling.enum.CALL_STATE_GROUP.CAN_JOIN.includes(this.state()));
    this.isActiveState = ko.pureComputed(() => z.calling.enum.CALL_STATE_GROUP.IS_ACTIVE.includes(this.state()));
    this.isEndedState = ko.pureComputed(() => z.calling.enum.CALL_STATE_GROUP.IS_ENDED.includes(this.state()));

    this.isOngoingOnAnotherClient = ko.pureComputed(() => this.selfUserJoined() && !this.selfClientJoined());
    this.isRemoteScreenSend = ko.pureComputed(() => this.remoteMediaType() === z.media.MediaType.SCREEN);
    this.isRemoteVideoSend = ko.pureComputed(() => this.remoteMediaType() === z.media.MediaType.VIDEO);

    this.isLocalVideoCall = ko.pureComputed(() => this.selfState.screenSend() || this.selfState.videoSend());
    this.isRemoteVideoCall = ko.pureComputed(() => this.isRemoteScreenSend() || this.isRemoteVideoSend());

    this.networkInterruption = ko.pureComputed(() => {
      if (this.isConnected() && !this.isGroup) {
        return this.interruptedParticipants().length > 0;
      }

      return false;
    });

    ko.pureComputed(() => {
      const additionalCount = this.selfClientJoined() ? 1 : 0;
      return this.participants().length + additionalCount;
    }).subscribe(numberOfParticipants => {
      this.telemetry.numberOfParticipantsChanged(numberOfParticipants);
    });

    // Observable subscriptions
    this.wasConnected = false;
    this.isConnected.subscribe(isConnected => {
      if (isConnected) {
        this.wasConnected = true;
        if (this.isGroup) {
          this.scheduleGroupCheck();
        }

        this.telemetry.track_event(z.tracking.EventName.CALLING.ESTABLISHED_CALL, this);
        this.timerStart = Date.now() - CallEntity.CONFIG.TIMER.INIT_THRESHOLD;

        this.callTimerInterval = window.setInterval(() => {
          const durationInSeconds = Math.floor((Date.now() - this.timerStart) / z.util.TimeUtil.UNITS_IN_MILLIS.SECOND);
          this.durationTime(durationInSeconds);
        }, CallEntity.CONFIG.TIMER.UPDATE_INTERVAL);
      }
    });

    this.isDeclined.subscribe(isDeclined => {
      if (isDeclined) {
        this._stopRingTone(true);
      }
    });

    this.networkInterruption.subscribe(isInterrupted => {
      if (isInterrupted) {
        return amplify.publish(z.event.WebApp.AUDIO.PLAY_IN_LOOP, z.audio.AudioType.NETWORK_INTERRUPTION);
      }
      amplify.publish(z.event.WebApp.AUDIO.STOP, z.audio.AudioType.NETWORK_INTERRUPTION);
    });

    this.selfClientJoined.subscribe(isJoined => {
      if (!isJoined) {
        this.isConnected(false);

        if (this.isOngoing() || this.isDisconnecting()) {
          amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.TALK_LATER);
        }

        if (this.terminationReason) {
          this.telemetry.track_duration(this);
        }

        this._resetTimer();
        this._resetFlows();
      }
    });

    this.state.subscribe(state => {
      const logMessage = {
        data: {
          default: [this.id, state],
          obfuscated: [this.callLogger.obfuscate(this.id), state],
        },
        message: `Call state '{0}' changed to '{1}'`,
      };
      this.callLogger.info(logMessage);

      this._clearStateTimeout();

      const hasState = state !== z.calling.enum.CALL_STATE.UNKNOWN;
      if (hasState) {
        const isUnansweredState = z.calling.enum.CALL_STATE_GROUP.UNANSWERED.includes(state);
        if (isUnansweredState) {
          const isIncomingCall = state === z.calling.enum.CALL_STATE.INCOMING;
          this._onStateStartRinging(isIncomingCall);
        } else {
          this._onStateStopRinging();
        }
      }

      const isConnectingCall = state === z.calling.enum.CALL_STATE.CONNECTING;
      if (isConnectingCall) {
        this.telemetry.track_event(z.tracking.EventName.CALLING.JOINED_CALL, this);
      }

      this.previousState = state;
    });

    if (this.isGroup) {
      this.scheduleGroupCheck();
    }

    this.conversationEntity.call(this);
  }

  //##############################################################################
  // Call states
  //##############################################################################

  /**
   * Deactivate the call.
   *
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message for deactivation
   * @param {boolean} fromSelf - Deactivation triggered by self user change
   * @param {z.calling.enum.TERMINATION_REASON} [terminationReason=z.calling.enum.TERMINATION_REASON.SELF_USER] - Call termination reason
   * @returns {Promise<boolean>} Resolves with a boolean whether the call was deleted
   */
  deactivateCall(callMessageEntity, fromSelf, terminationReason = z.calling.enum.TERMINATION_REASON.SELF_USER) {
    this._clearTimeouts();

    const everyoneLeft = this.participants().length <= 0 + fromSelf ? 1 : 0;
    const onGroupCheck = terminationReason === z.calling.enum.TERMINATION_REASON.GROUP_CHECK;

    const shouldDeleteCall = everyoneLeft || onGroupCheck;
    if (shouldDeleteCall) {
      this.terminationReason = terminationReason;
      this._deleteCall(callMessageEntity, everyoneLeft, onGroupCheck);
      return Promise.resolve(true);
    }

    if (this.isGroup) {
      this.scheduleGroupCheck();
    }

    this.callingRepository.mediaStreamHandler.resetMediaStream();
    return Promise.resolve(false);
  }

  _deleteCall(callMessageEntity, everyoneLeft, onGroupCheck) {
    const reason = !this.wasConnected
      ? z.calling.enum.TERMINATION_REASON.MISSED
      : z.calling.enum.TERMINATION_REASON.COMPLETED;

    if (onGroupCheck && !everyoneLeft) {
      const userIds = this.participants().map(participantEntity => participantEntity.id);
      this.callLogger.warn(`Deactivation on group check with remaining users '${userIds.join(', ')}' on group check`);
    }

    const eventSource = onGroupCheck
      ? z.event.EventRepository.SOURCE.INJECTED
      : z.event.EventRepository.SOURCE.WEB_SOCKET;

    callMessageEntity.userId = this.creatingUser.id;
    this.callingRepository.injectDeactivateEvent(callMessageEntity, eventSource, reason);

    return this.callingRepository.deleteCall(this.id);
  }

  /**
   * Delete the call.
   * @returns {undefined} No return value
   */
  deleteCall() {
    this.state(z.calling.enum.CALL_STATE.ENDED);
    this._resetCall();
  }

  /**
   * Join the call.
   * @param {z.media.MediaType} [mediaType] - Media type of the call
   * @returns {void} No return value
   */
  joinCall(mediaType) {
    if (this.canConnectState()) {
      this.state(z.calling.enum.CALL_STATE.CONNECTING);
    }

    return this.isGroup ? this._joinGroupCall(mediaType) : this._join1to1Call();
  }

  /**
   * Join the 1:1 call.
   * @private
   * @returns {void} No return value
   */
  _join1to1Call() {
    const [remoteUserId] = this.conversationEntity.participating_user_ids();
    this.addOrUpdateParticipant(remoteUserId, true);
  }

  /**
   * Join group call.
   *
   * @private
   * @param {z.media.MediaType} [mediaType=z.media.MediaType.AUDIO] - Media type of the call
   * @returns {void} No return value
   */
  _joinGroupCall(mediaType = z.media.MediaType.AUDIO) {
    const additionalPayload = z.calling.CallMessageBuilder.createPayload(this.id, this.selfUser.id);
    const videoSend = mediaType === z.media.MediaType.AUDIO_VIDEO;

    const response = !this.isOutgoing();
    const propSync = z.calling.CallMessageBuilder.createPropSync(this.selfState, additionalPayload, videoSend);

    const callMessageEntity = z.calling.CallMessageBuilder.buildGroupStart(response, this.sessionId, propSync);
    this.sendCallMessage(callMessageEntity);
  }

  /**
   * Leave the call.
   * @param {z.calling.enum.TERMINATION_REASON} terminationReason - Call termination reason
   * @returns {undefined} No return value
   */
  leaveCall(terminationReason) {
    if (this.isOngoing() && !this.isGroup) {
      this.state(z.calling.enum.CALL_STATE.DISCONNECTING);
    }

    let callMessageEntity = this.isConnected()
      ? z.calling.CallMessageBuilder.buildHangup(false, this.sessionId)
      : z.calling.CallMessageBuilder.buildCancel(false, this.sessionId);

    const eventPromises = this.getFlows().map(({remoteClientId, remoteUserId}) => {
      const payload = z.calling.CallMessageBuilder.createPayload(
        this.id,
        this.selfUser.id,
        remoteUserId,
        remoteClientId
      );
      callMessageEntity.addProperties(payload);
      return this.sendCallMessage(callMessageEntity);
    });

    Promise.all(eventPromises)
      .then(() => Promise.all(this.participants().map(({id}) => this.resetParticipant(id))))
      .then(() => {
        const additionalPayload = z.calling.CallMessageBuilder.createPayload(this.id, this.selfUser.id);

        if (this.isGroup) {
          callMessageEntity = z.calling.CallMessageBuilder.buildGroupLeave(false, this.sessionId, additionalPayload);
          this.sendCallMessage(callMessageEntity);
        } else {
          callMessageEntity.addProperties(additionalPayload);
        }

        this.setSelfState(false, terminationReason);
        return this.deactivateCall(callMessageEntity, true, terminationReason);
      })
      .then(wasDeleted => {
        if (!wasDeleted) {
          this.state(z.calling.enum.CALL_STATE.REJECTED);
        }
      });
  }

  /**
   * Check if group call should continue after participant left.
   *
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Last member leaving call
   * @param {z.calling.enum.TERMINATION_REASON} terminationReason - Reason for call participant to leave
   * @returns {undefined} No return value
   */
  participantLeft(callMessageEntity, terminationReason) {
    if (!this.participants().length) {
      return this.selfClientJoined()
        ? this.leaveCall(terminationReason)
        : this.deactivateCall(callMessageEntity, false, terminationReason);
    }
  }

  /**
   * Reject the call.
   * @param {boolean} [shareRejection=false] - Send rejection message to other clients
   * @returns {undefined} No return value
   */
  rejectCall(shareRejection = false) {
    this.state(z.calling.enum.CALL_STATE.REJECTED);
    if (this.isRemoteVideoCall()) {
      this.callingRepository.mediaStreamHandler.resetMediaStream();
    }

    if (shareRejection) {
      const additionalPayload = z.calling.CallMessageBuilder.createPayload(this.id, this.selfUser.id);
      const callMessageEntity = z.calling.CallMessageBuilder.buildReject(false, this.sessionId, additionalPayload);
      this.sendCallMessage(callMessageEntity);
    }
  }

  /**
   * Schedule the check for group activity.
   * @returns {undefined} No return value
   */
  scheduleGroupCheck() {
    this._clearGroupCheckTimeout();
    return this.isConnected() ? this._setSendGroupCheckTimeout() : this._setVerifyGroupCheckTimeout();
  }

  /**
   * Set the self state.
   * @param {boolean} joinedState - Self joined state
   * @param {z.calling.enum.TERMINATION_REASON} [terminationReason] - Call termination reason
   * @returns {undefined} No return value
   */
  setSelfState(joinedState, terminationReason) {
    if (terminationReason && !this.terminationReason) {
      this.terminationReason = terminationReason;
    }
    this.selfClientJoined(joinedState);
    this.selfUserJoined(joinedState);
  }

  /**
   * Toggle media of this call.
   * @param {z.media.MediaType} mediaType - MediaType to toggle
   * @returns {Promise} Resolves when state has been toggled
   */
  toggleMedia(mediaType) {
    const toggledVideo = mediaType === z.media.MediaType.SCREEN && !this.selfState.videoSend();
    const toggledScreen = mediaType === z.media.MediaType.VIDEO && !this.selfState.screenSend();
    if (toggledVideo || toggledScreen) {
      this.telemetry.setAVToggled();
    }

    const callEventPromises = this.getFlows().map(({remoteClientId, remoteUserId}) => {
      const payload = z.calling.CallMessageBuilder.createPayload(
        this.id,
        this.selfUser.id,
        remoteUserId,
        remoteClientId
      );
      const propSyncPayload = z.calling.CallMessageBuilder.createPropSync(this.selfState, payload);

      const callMessageEntity = z.calling.CallMessageBuilder.buildPropSync(false, this.sessionId, propSyncPayload);
      return this.sendCallMessage(callMessageEntity);
    });

    return Promise.all(callEventPromises);
  }

  /**
   * Clear the group check timeout.
   * @private
   * @returns {undefined} No return value
   */
  _clearGroupCheckTimeout() {
    if (this.groupCheckTimeoutId) {
      this.callLogger.debug(`Clear group check timeout with ID '${this.groupCheckTimeoutId}'`);
      window.clearTimeout(this.groupCheckTimeoutId);
      this.groupCheckTimeoutId = undefined;
    }
  }

  /**
   * Clear all timeouts.
   * @private
   * @returns {undefined} No return value
   */
  _clearTimeouts() {
    this.getFlows().map(flowEntity => flowEntity.clearTimeouts());
    this._clearGroupCheckTimeout();
    this._clearStateTimeout();
  }

  /**
   * Leave group call or schedule sending new group check after timeout.
   *
   * @private
   * @param {number} timeout - Random timeout in seconds
   * @returns {undefined} No return value
   */
  _onSendGroupCheckTimeout(timeout) {
    if (this.participants().length) {
      this.callLogger.info(`Sending group check after timeout of '${timeout}s' (ID: ${this.groupCheckTimeoutId})`);
      const additionalPayload = z.calling.CallMessageBuilder.createPayload(this.id, this.selfUser.id);
      const callMessageEntity = z.calling.CallMessageBuilder.buildGroupCheck(true, this.sessionId, additionalPayload);

      this.sendCallMessage(callMessageEntity);
      return this.scheduleGroupCheck();
    }

    this.leaveCall(z.calling.enum.TERMINATION_REASON.OTHER_USER);
  }

  /**
   * Remove group call after timeout.
   * @private
   * @returns {undefined} No return value
   */
  _onVerifyGroupCheckTimeout() {
    this.callLogger.info(`Removing on group check timeout (ID: ${this.groupCheckTimeoutId})`);
    const additionalPayload = z.calling.CallMessageBuilder.createPayload(
      this.id,
      this.selfUser.id,
      this.creatingUser.id
    );
    const callMessageEntity = z.calling.CallMessageBuilder.buildGroupLeave(false, this.sessionId, additionalPayload);

    this.deactivateCall(callMessageEntity, false, z.calling.enum.TERMINATION_REASON.GROUP_CHECK);
  }

  /**
   * Set the outgoing group check timeout.
   * @private
   * @returns {undefined} No return value
   */
  _setSendGroupCheckTimeout() {
    const {MAXIMUM_TIMEOUT, MINIMUM_TIMEOUT} = CallEntity.CONFIG.GROUP_CHECK;
    const timeoutInSeconds = z.util.NumberUtil.getRandomNumber(MINIMUM_TIMEOUT, MAXIMUM_TIMEOUT);

    const timeout = timeoutInSeconds * z.util.TimeUtil.UNITS_IN_MILLIS.SECOND;
    this.groupCheckTimeoutId = window.setTimeout(() => this._onSendGroupCheckTimeout(timeoutInSeconds), timeout);

    const timeoutId = this.groupCheckTimeoutId;
    this.callLogger.debug(`Set sending group check after timeout of '${timeoutInSeconds}s' (ID: ${timeoutId})`);
  }

  /**
   * Set the incoming group check timeout.
   * @private
   * @returns {undefined} No return value
   */
  _setVerifyGroupCheckTimeout() {
    const ACTIVITY_TIMEOUT = CallEntity.CONFIG.GROUP_CHECK.ACTIVITY_TIMEOUT;
    const timeout = ACTIVITY_TIMEOUT * z.util.TimeUtil.UNITS_IN_MILLIS.SECOND;

    this.groupCheckTimeoutId = window.setTimeout(() => this._onVerifyGroupCheckTimeout(), timeout);
    this.callLogger.debug(`Set verifying group check after '${ACTIVITY_TIMEOUT}s' (ID: ${this.groupCheckTimeoutId})`);
  }

  //##############################################################################
  // Call states
  //##############################################################################

  /**
   * Confirm an incoming message.
   * @param {z.calling.entities.CallMessageEntity} incomingCallMessageEntity - Incoming call message to be confirmed
   * @returns {Promise} Resolves when message was confirmed
   */
  confirmMessage(incomingCallMessageEntity) {
    const {clientId, type, userId} = incomingCallMessageEntity;
    const payload = z.calling.CallMessageBuilder.createPayload(this.id, this.selfUser.id, userId, clientId);

    let callMessageEntity;
    switch (type) {
      case z.calling.enum.CALL_MESSAGE_TYPE.HANGUP: {
        callMessageEntity = z.calling.CallMessageBuilder.buildHangup(true, this.sessionId, payload);
        break;
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC: {
        const propSyncPayload = z.calling.CallMessageBuilder.createPropSync(this.selfState, payload);

        callMessageEntity = z.calling.CallMessageBuilder.buildPropSync(true, this.sessionId, propSyncPayload);
        break;
      }

      default: {
        this.callLogger.error(`Tried to confirm call event of wrong type '${type}'`, callMessageEntity);
        return Promise.resolve();
      }
    }

    return this.sendCallMessage(callMessageEntity);
  }

  /**
   * Send call message.
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to be send
   * @returns {Promise} Resolves when the event has been send
   */
  sendCallMessage(callMessageEntity) {
    return this.callingRepository.sendCallMessage(this.conversationEntity, callMessageEntity);
  }

  /**
   * Set remote version of call
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to get remote version from
   * @returns {undefined} No return value
   */
  setRemoteVersion(callMessageEntity) {
    const rtcSdp = callMessageEntity.sdp;

    if (rtcSdp) {
      this.telemetry.set_remote_version(z.calling.SDPMapper.getToolVersion(rtcSdp));
    }
  }

  /**
   * Clear the state timeout.
   * @private
   * @returns {undefined} No return value
   */
  _clearStateTimeout() {
    if (this.stateTimeout) {
      window.clearTimeout(this.stateTimeout);
      this.stateTimeout = undefined;
    }
  }

  /**
   * Start ringing sound.
   *
   * @private
   * @param {boolean} isIncoming - Call is incoming
   * @returns {undefined} No return value
   */
  _onStateStartRinging(isIncoming) {
    this._playRingTone(isIncoming);
    this._setStateTimeout(isIncoming);
  }

  /**
   * Stop ringing sound.
   * @private
   * @returns {undefined} No return value
   */
  _onStateStopRinging() {
    const wasUnanswered = z.calling.enum.CALL_STATE_GROUP.UNANSWERED.includes(this.previousState);
    if (wasUnanswered) {
      const wasIncomingCall = this.previousState === z.calling.enum.CALL_STATE.INCOMING;
      this._stopRingTone(wasIncomingCall);
    }
  }

  /**
   * Play the ring tone.
   *
   * @private
   * @param {boolean} isIncoming - Call is incoming
   * @returns {undefined} No return value
   */
  _playRingTone(isIncoming) {
    const audioId = isIncoming ? z.audio.AudioType.INCOMING_CALL : z.audio.AudioType.OUTGOING_CALL;
    amplify.publish(z.event.WebApp.AUDIO.PLAY_IN_LOOP, audioId);
  }

  /**
   * Set the state timeout.
   *
   * @private
   * @param {boolean} isIncoming - Call is incoming
   * @returns {undefined} No return value
   */
  _setStateTimeout(isIncoming) {
    this.stateTimeout = window.setTimeout(() => {
      this._stopRingTone(isIncoming);

      if (isIncoming) {
        return this.isGroup ? this.rejectCall(false) : amplify.publish(z.event.WebApp.CALL.STATE.DELETE, this.id);
      }

      amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, this.id, z.calling.enum.TERMINATION_REASON.TIMEOUT);
    }, CallEntity.CONFIG.STATE_TIMEOUT);
  }

  /**
   * Stop the ring tone.
   *
   * @private
   * @param {boolean} isIncoming - Call is incoming
   * @returns {undefined} No return value
   */
  _stopRingTone(isIncoming) {
    const audioId = isIncoming ? z.audio.AudioType.INCOMING_CALL : z.audio.AudioType.OUTGOING_CALL;
    amplify.publish(z.event.WebApp.AUDIO.STOP, audioId);
  }

  /**
   * Update the remote participant state.
   * @private
   * @returns {undefined} No return value
   */
  _updateRemoteState() {
    let mediaTypeChanged = false;

    this.participants().forEach(({activeState}) => {
      if (activeState.screenSend()) {
        this.remoteMediaType(z.media.MediaType.SCREEN);
        mediaTypeChanged = true;
      } else if (activeState.videoSend()) {
        this.remoteMediaType(z.media.MediaType.VIDEO);
        mediaTypeChanged = true;
      }
    });

    if (!mediaTypeChanged) {
      this.remoteMediaType(z.media.MediaType.AUDIO);
    }
  }

  //##############################################################################
  // Participants
  //##############################################################################

  /**
   * Add or update a participant of the call.
   *
   * @param {string} userId - User ID of the call participant
   * @param {boolean} negotiate - Should negotiation be started immediately
   * @param {z.calling.entities.CallMessageEntity} [callMessageEntity] - Call message for participant change
   * @returns {Promise} Resolves with participant entity
   */
  addOrUpdateParticipant(userId, negotiate, callMessageEntity) {
    return this.getParticipantById(userId)
      .then(participantEntity => this._updateParticipant(participantEntity, negotiate, callMessageEntity))
      .catch(error => {
        const isNotFound = error.type === z.error.CallError.TYPE.NOT_FOUND;
        if (isNotFound) {
          return this._addParticipant(userId, negotiate, callMessageEntity);
        }

        throw error;
      });
  }

  /**
   * Remove an participant from the call.
   *
   * @param {string} userId - ID of user to be removed from the call
   * @param {string} clientId - ID of client that requested the removal from the call
   * @param {z.calling.enum.TERMINATION_REASON} terminationReason - Call termination reason
   * @returns {Promise} Resolves with the call entity
   */
  deleteParticipant(userId, clientId, terminationReason) {
    return this.getParticipantById(userId)
      .then(participantEntity => {
        if (clientId) {
          participantEntity.verifyClientId(clientId);
        }

        participantEntity.resetParticipant();
        this.interruptedParticipants.remove(participantEntity);
        this.participants.remove(participantEntity);

        this._updateRemoteState();
        this.callingRepository.mediaElementHandler.removeMediaElement(userId);

        if (this.selfClientJoined()) {
          switch (terminationReason) {
            case z.calling.enum.TERMINATION_REASON.OTHER_USER: {
              amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.TALK_LATER);
              break;
            }

            case z.calling.enum.TERMINATION_REASON.CONNECTION_DROP:
            case z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE: {
              amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.CALL_DROP);
              break;
            }

            default: {
              break;
            }
          }
        }

        const logMessage = {
          data: {
            default: [participantEntity.user.name()],
            obfuscated: [this.callLogger.obfuscate(participantEntity.user.id)],
          },
          message: `Removed call participant '{0}'`,
        };
        this.callLogger.info(logMessage);
        return this;
      })
      .catch(error => {
        const isNotFound = error.type === z.error.CallError.TYPE.NOT_FOUND;
        if (isNotFound) {
          return this;
        }

        throw error;
      });
  }

  /**
   * Get a call participant by his id.
   * @param {string} userId - User ID of participant to be returned
   * @returns {Promise} Resolves with the call participant that matches given user ID
   */
  getParticipantById(userId) {
    for (const participantEntity of this.participants()) {
      const isExpectedId = participantEntity.id === userId;
      if (isExpectedId) {
        return Promise.resolve(participantEntity);
      }
    }

    return Promise.reject(new z.error.CallError(z.error.CallError.TYPE.NOT_FOUND, 'No participant found for user ID'));
  }

  /**
   * Remove an participant from the call.
   * @param {string} userId - ID of user to be removed from the call
   * @returns {Promise} Resolves with the call entity
   */
  resetParticipant(userId) {
    return this.getParticipantById(userId).then(participantEntity => {
      participantEntity.resetParticipant();
      this.interruptedParticipants.remove(participantEntity);

      this._updateRemoteState();
      this.callingRepository.mediaElementHandler.removeMediaElement(userId);
    });
  }

  /**
   * Verify call message belongs to call by session id.
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity
   * @returns {Promise} Resolves with the Call entity if verification passed
   */
  verifySessionId(callMessageEntity) {
    const {userId, sessionId} = callMessageEntity;

    const isExpectedSessionId = sessionId === this.sessionId;
    if (isExpectedSessionId) {
      return Promise.resolve(this);
    }

    return this.getParticipantById(userId).then(({sessionId: participantSessionId}) => {
      const isExpectedParticipantSessionId = sessionId === participantSessionId;
      if (isExpectedParticipantSessionId) {
        return this;
      }

      throw new z.error.CallError(z.error.CallError.TYPE.WRONG_SENDER, 'Session IDs not matching');
    });
  }

  /**
   * Add an participant to the call.
   *
   * @param {string} userId - User ID to be added to the call
   * @param {boolean} negotiate - Should negotiation be started immediately
   * @param {z.calling.entities.CallMessageEntity} [callMessageEntity] - Call message entity for participant change
   * @returns {Promise} Resolves with the added participant
   */
  _addParticipant(userId, negotiate, callMessageEntity) {
    const isSelfUser = userId === this.selfUser.id;
    if (isSelfUser) {
      const errorMessage = 'Self user should not be added as call participant';
      return Promise.reject(new z.error.CallError(z.error.CallError.TYPE.WRONG_STATE, errorMessage));
    }

    return this.userRepository.get_user_by_id(userId).then(userEntity => {
      const participantEntity = new z.calling.entities.ParticipantEntity(this, userEntity, this.timings);

      this.participants.push(participantEntity);

      const logMessage = {
        data: {
          default: [userEntity.name()],
          obfuscated: [this.callLogger.obfuscate(userEntity.id)],
        },
        message: `Adding call participant '{0}'`,
      };
      this.callLogger.info(logMessage, participantEntity);

      return this._updateParticipantState(participantEntity, negotiate, callMessageEntity);
    });
  }

  /**
   * Update call participant with call message.
   *
   * @param {z.calling.entities.ParticipantEntity} participantEntity - Participant entity to be updated in the call
   * @param {boolean} negotiate - Should negotiation be started
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to update user with
   * @returns {Promise} Resolves with the updated participant
   */
  _updateParticipant(participantEntity, negotiate, callMessageEntity) {
    if (callMessageEntity && callMessageEntity.clientId) {
      participantEntity.verifyClientId(callMessageEntity.clientId);
    }

    const logMessage = {
      data: {
        default: [participantEntity.user.name()],
        obfuscated: [this.callLogger.obfuscate(participantEntity.user.id)],
      },
      message: `Updating call participant '{0}'`,
    };
    this.callLogger.info(logMessage, callMessageEntity);

    return this._updateParticipantState(participantEntity, negotiate, callMessageEntity);
  }

  /**
   * Update call participant state.
   *
   * @param {z.calling.entities.ParticipantEntity} participantEntity - User ID to be added to the call
   * @param {boolean} negotiate - Should negotiation be started
   * @param {z.calling.entities.CallMessageEntity} [callMessageEntity] - Call message to update user with
   * @returns {Promise} Resolves with the updated participant
   */
  _updateParticipantState(participantEntity, negotiate, callMessageEntity) {
    const updatePromise = callMessageEntity ? participantEntity.updateState(callMessageEntity) : Promise.resolve(false);

    return updatePromise.then(skipNegotiation => {
      if (skipNegotiation) {
        negotiate = false;
      }

      this._updateRemoteState();

      if (negotiate) {
        participantEntity.startNegotiation();
      }

      return participantEntity;
    });
  }

  //##############################################################################
  // Misc
  //##############################################################################

  /**
   * Get all flows of the call.
   * @returns {Array<z.calling.entities.FlowEntity>} Array of flows
   */
  getFlows() {
    return this.participants()
      .filter(participantEntity => participantEntity.flowEntity)
      .map(participantEntity => participantEntity.flowEntity);
  }

  /**
   * Get full flow telemetry report of the call.
   * @returns {Array<Object>} Array of flow telemetry reports for calling service automation
   */
  getFlowTelemetry() {
    return this.getFlows().map(flowEntity => flowEntity.getTelemetry());
  }

  /**
   * Initiate the call telemetry.
   * @param {z.calling.enum.CALL_STATE} direction - direction of the call (outgoing or incoming)
   * @param {z.media.MediaType} [mediaType=z.media.MediaType.AUDIO] - Media type for this call
   * @returns {undefined} No return value
   */
  initiateTelemetry(direction, mediaType = z.media.MediaType.AUDIO) {
    this.telemetry.initiateNewCall(direction, mediaType);
    this.timings = new z.telemetry.calling.CallSetupTimings(this.id);
  }

  /**
   * Calculates the panning (from left to right) to position a user in a group call.
   *
   * @private
   * @param {number} index - Index of a user in a sorted array
   * @param {number} numberOfParticipants - Number of participants
   * @returns {number} Panning in the range of -1 to 1 with -1 on the left
   */
  _calculatePanning(index, numberOfParticipants) {
    const isSingleUser = numberOfParticipants === 1;
    if (isSingleUser) {
      return 0.0;
    }

    const position = -(numberOfParticipants - 1.0) / (numberOfParticipants + 1.0);
    const delta = (-2.0 * position) / (numberOfParticipants - 1.0);

    return position + delta * index;
  }

  /**
   * Sort the call participants by their audio panning.
   *
   * @note The idea is to calculate Jenkins' one-at-a-time hash (JOAAT) for each participant and then
   *  sort all participants in an array by their JOAAT hash. After that the array index of each user
   *  is used to allocate the position with the return value of this function.
   *
   * @returns {undefined} No return value
   */
  _sortParticipantsByPanning() {
    const twoOrMoreParticipants = this.participants().length >= 2;
    if (twoOrMoreParticipants) {
      this.participants()
        .sort((participantA, participantB) => participantA.user.joaatHash - participantB.user.joaatHash)
        .forEach((participantEntity, index) => {
          const panning = this._calculatePanning(index, this.participants().length);

          this.callLogger.debug({
            data: {
              default: [participantEntity.user.name(), panning],
              obfuscated: [this.callLogger.obfuscate(participantEntity.user.id), panning],
            },
            message: `Panning for '{0}' recalculated to '{1}'`,
          });

          participantEntity.panning(panning);
        });

      const panningOrder = this.participants()
        .map(({user}) => user.name())
        .join(', ');

      this.callLogger.info(`New panning order: ${panningOrder}`);
    }
  }

  //##############################################################################
  // Reset
  //##############################################################################

  /**
   * Reset the call states.
   * @private
   * @returns {undefined} No return value
   */
  _resetCall() {
    this.setSelfState(false);
    this.isConnected(false);
    this.sessionId = undefined;
    this.terminationReason = undefined;
    amplify.publish(z.event.WebApp.AUDIO.STOP, z.audio.AudioType.NETWORK_INTERRUPTION);
  }

  /**
   * Reset the call timers.
   * @private
   * @returns {undefined} No return value
   */
  _resetTimer() {
    if (this.callTimerInterval) {
      window.clearInterval(this.callTimerInterval);
      this.timerStart = undefined;
    }
    this.durationTime(0);
  }

  /**
   * Reset all flows of the call.
   * @private
   * @returns {undefined} No return value
   */
  _resetFlows() {
    this.getFlows().forEach(flowEntity => flowEntity.resetFlow());
  }

  needsMediaStream() {
    const hasPreJoinVideo = this.isIncoming() && this.isRemoteVideoCall();
    const hasActiveCall = hasPreJoinVideo || this.selfClientJoined();
    return hasActiveCall && !this.isOngoingOnAnotherClient();
  }

  //##############################################################################
  // Logging
  //##############################################################################

  /**
   * Log flow status to console.
   * @returns {undefined} No return value
   */
  logStatus() {
    this.getFlows().forEach(flowEntity => flowEntity.logStatus());
  }

  /**
   * Log flow setup step timings to console.
   * @returns {undefined} No return value
   */
  logTimings() {
    this.getFlows().forEach(flowEntity => flowEntity.logTimings());
  }
};
