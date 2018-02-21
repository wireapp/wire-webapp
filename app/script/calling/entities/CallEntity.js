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

z.calling.entities.CallEntity = class CallEntity {
  static get CONFIG() {
    return {
      GROUP_CHECK_ACTIVITY_TIMEOUT: 2 * 60,
      GROUP_CHECK_MAXIMUM_TIMEOUT: 90,
      GROUP_CHECK_MINIMUM_TIMEOUT: 60,
      STATE_TIMEOUT: 30 * 1000,
      TIMER_UPDATE_INTERVAL: 1000,
      TIMER_UPDATE_START: 100,
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

    const {id: conversationId, is_group} = conversationEntity;
    const {mediaStreamHandler, mediaRepository, selfState, telemetry, userRepository} = this.callingRepository;

    this.logger = new z.util.Logger(`z.calling.entities.CallEntity (${conversationId})`, z.config.LOGGER.OPTIONS);

    // IDs and references
    this.id = conversationId;
    this.timings = undefined;

    this.mediaRepository = mediaRepository;
    this.userRepository = userRepository;
    this.selfUser = this.userRepository.self();
    this.selfState = selfState;
    this.telemetry = telemetry;

    // States
    this.callTimerInterval = undefined;
    this.timerStart = undefined;
    this.direction = undefined;
    this.durationTime = ko.observable(0);
    this.groupCheckTimeoutId = undefined;
    this.terminationReason = undefined;

    this.isConnected = ko.observable(false);
    this.isGroup = is_group();

    this.selfClientJoined = ko.observable(false);
    this.selfUserJoined = ko.observable(false);
    this.state = ko.observable(z.calling.enum.CALL_STATE.UNKNOWN);
    this.previousState = undefined;

    this.participants = ko.observableArray([]);
    this.maxNumberOfParticipants = 0;
    this.interruptedParticipants = ko.observableArray([]);

    // Media
    this.localMediaStream = mediaStreamHandler.local_media_stream;
    this.localMediaType = mediaStreamHandler.local_media_type;
    this.remoteMediaType = ko.observable(z.media.MediaType.NONE);

    // Statistics
    this._resetTimer();

    // Computed values
    this.isDeclined = ko.pureComputed(() => this.state() === z.calling.enum.CALL_STATE.REJECTED);

    this.isOngoingOnAnotherClient = ko.pureComputed(() => this.selfUserJoined() && !this.selfClientJoined());
    this.isRemoteScreenSend = ko.pureComputed(() => this.remoteMediaType() === z.media.MediaType.SCREEN);
    this.isRemoteVideoSend = ko.pureComputed(() => this.remoteMediaType() === z.media.MediaType.VIDEO);

    this.networkInterruption = ko.pureComputed(() => {
      if (this.isConnected() && !this.isGroup) {
        return this.interruptedParticipants().length > 0;
      }

      return false;
    });

    this.participantsCount = ko.pureComputed(() => this.getNumberOfParticipants(this.selfUserJoined()));

    // Observable subscriptions
    this.wasConnected = false;
    this.isConnected.subscribe(isConnected => {
      if (isConnected) {
        this.wasConnected = true;
        if (this.isGroup) {
          this.scheduleGroupCheck();
        }

        const attributes = {direction: this.direction};
        this.telemetry.track_event(z.tracking.EventName.CALLING.ESTABLISHED_CALL, this, attributes);
        this.timerStart = Date.now() - CallEntity.CONFIG.TIMER_UPDATE_START;

        this.callTimerInterval = window.setInterval(() => {
          const durationInSeconds = Math.floor((Date.now() - this.timerStart) / 1000);
          this.durationTime(durationInSeconds);
        }, CallEntity.CONFIG.TIMER_UPDATE_INTERVAL);
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

    this.participantsCount.subscribe(usersInCall => {
      this.maxNumberOfParticipants = Math.max(usersInCall, this.maxNumberOfParticipants);
    });

    this.selfClientJoined.subscribe(isJoined => {
      if (!isJoined) {
        this.isConnected(false);

        if (z.calling.enum.CALL_STATE_GROUP.IS_ENDING.includes(this.state())) {
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
      this.logger.info(`Call state '${this.id}' changed to '${state}'`);

      this._clearStateTimeout();

      if (z.calling.enum.CALL_STATE_GROUP.STOP_RINGING.includes(state)) {
        this._onStateStopRinging();
      } else if (z.calling.enum.CALL_STATE_GROUP.IS_RINGING.includes(state)) {
        const isIncomingCall = state === z.calling.enum.CALL_STATE.INCOMING;
        this._onStateStartRinging(isIncomingCall);
      }

      const isConnectingCall = state === z.calling.enum.CALL_STATE.CONNECTING;
      if (isConnectingCall) {
        const attributes = {direction: this.direction};
        this.telemetry.track_event(z.tracking.EventName.CALLING.JOINED_CALL, this, attributes);
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
   * @param {z.calling.enum.TERMINATION_REASON} [terminationReason=z.calling.enum.TERMINATION_REASON.SELF_USER] - Call termination reason
   * @returns {undefined} No return value
   */
  deactivateCall(callMessageEntity, terminationReason = z.calling.enum.TERMINATION_REASON.SELF_USER) {
    const everyoneLeft = this.participants().length <= 1;
    const onGroupCheck = terminationReason === z.calling.enum.TERMINATION_REASON.GROUP_CHECK;

    this._clearTimeouts();

    if (everyoneLeft || onGroupCheck) {
      const reason = !this.wasConnected
        ? z.calling.enum.TERMINATION_REASON.MISSED
        : z.calling.enum.TERMINATION_REASON.COMPLETED;

      if (onGroupCheck && !everyoneLeft) {
        const userIds = this.participants().map(participantEntity => participantEntity.id);
        this.logger.warn(`Deactivation on group check with remaining users '${userIds.join(', ')}' on group check`);
      }

      this.terminationReason = terminationReason;
      callMessageEntity.userId = this.creatingUser.id;
      this.callingRepository.injectDeactivateEvent(
        callMessageEntity,
        z.event.EventRepository.SOURCE.WEB_SOCKET,
        reason
      );

      return this.callingRepository.deleteCall(this.id);
    }

    if (this.isGroup) {
      this.scheduleGroupCheck();
    }

    this.callingRepository.mediaStreamHandler.reset_media_stream();
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
   * @returns {undefined} No return value
   */
  joinCall() {
    if (z.calling.enum.CALL_STATE_GROUP.CAN_CONNECT.includes(this.state())) {
      this.state(z.calling.enum.CALL_STATE.CONNECTING);
    }
    this.setSelfState(true);

    if (this.isGroup) {
      const response = this.state() !== z.calling.enum.CALL_STATE.OUTGOING;
      const additionalPayload = z.calling.CallMessageBuilder.createPayload(this.id, this.selfUser.id);
      const propSyncPayload = z.calling.CallMessageBuilder.createPayloadPropSync(
        this.selfState,
        z.media.MediaType.AUDIO,
        false,
        additionalPayload
      );

      const callMessageEntity = z.calling.CallMessageBuilder.buildGroupStart(response, this.sessionId, propSyncPayload);
      this.sendCallMessage(callMessageEntity);
    } else {
      const [remoteUserId] = this.conversationEntity.participating_user_ids();
      this.addOrUpdateParticipant(remoteUserId, true);
    }
  }

  /**
   * Leave the call.
   * @param {z.calling.enum.TERMINATION_REASON} terminationReason - Call termination reason
   * @returns {undefined} No return value
   */
  leaveCall(terminationReason) {
    const isOngoingCall = this.state() === z.calling.enum.CALL_STATE.ONGOING;
    if (isOngoingCall && !this.isGroup) {
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
        this.deactivateCall(callMessageEntity, terminationReason);
      });
  }

  /**
   * Check if group call should continue after participant left.
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Last member leaving call
   * @param {z.calling.enum.TERMINATION_REASON} terminationReason - Reason for call participant to leave
   * @returns {undefined} No return value
   */
  participantLeft(callMessageEntity, terminationReason) {
    if (!this.participants().length) {
      if (this.selfClientJoined()) {
        return this.leaveCall(terminationReason);
      }

      this.deactivateCall(callMessageEntity, terminationReason);
    }
  }

  /**
   * Reject the call.
   * @returns {undefined} No return value
   */
  rejectCall() {
    const additionalPayload = z.calling.CallMessageBuilder.createPayload(this.id, this.selfUser.id);

    this.state(z.calling.enum.CALL_STATE.REJECTED);

    if (this.isRemoteVideoSend()) {
      this.callingRepository.mediaStreamHandler.reset_media_stream();
    }

    const callMessageEntity = z.calling.CallMessageBuilder.buildReject(false, this.sessionId, additionalPayload);
    this.sendCallMessage(callMessageEntity);
  }

  /**
   * Schedule the check for group activity.
   * @returns {undefined} No return value
   */
  scheduleGroupCheck() {
    this._clearGroupCheckTimeout();

    if (this.isConnected()) {
      this._setSendGroupCheckTimeout();
    } else {
      this._setVerifyGroupCheckTimeout();
    }
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
    const callEventPromises = this.getFlows().map(({remoteClientId, remoteUserId}) => {
      const additionalPayload = z.calling.CallMessageBuilder.createPayload(
        this.id,
        this.selfUser.id,
        remoteUserId,
        remoteClientId
      );
      const propSyncPayload = z.calling.CallMessageBuilder.createPayloadPropSync(
        this.selfState,
        mediaType,
        true,
        additionalPayload
      );

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
      this.logger.debug(`Clear group check timeout with ID '${this.groupCheckTimeoutId}'`);
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
      this.logger.info(`Sending group check after timeout of '${timeout}s' (ID: ${this.groupCheckTimeoutId})`);
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
    this.logger.info(`Removing on group check timeout (ID: ${this.groupCheckTimeoutId})`);
    const additionalPayload = z.calling.CallMessageBuilder.createPayload(
      this.id,
      this.selfUser.id,
      this.creatingUser.id
    );
    const callMessageEntity = z.calling.CallMessageBuilder.buildGroupLeave(false, this.sessionId, additionalPayload);

    this.deactivateCall(callMessageEntity, z.calling.enum.TERMINATION_REASON.GROUP_CHECK);
  }

  /**
   * Set the outgoing group check timeout.
   * @private
   * @returns {undefined} No return value
   */
  _setSendGroupCheckTimeout() {
    const maximumTimeout = CallEntity.CONFIG.GROUP_CHECK_MAXIMUM_TIMEOUT;
    const minimumTimeout = CallEntity.CONFIG.GROUP_CHECK_MINIMUM_TIMEOUT;
    const timeoutInSeconds = z.util.NumberUtil.get_random_number(minimumTimeout, maximumTimeout);

    const timeout = timeoutInSeconds * 1000;
    this.groupCheckTimeoutId = window.setTimeout(() => this._onSendGroupCheckTimeout(timeoutInSeconds), timeout);

    const timeoutId = this.groupCheckTimeoutId;
    this.logger.debug(`Set sending group check after timeout of '${timeoutInSeconds}s' (ID: ${timeoutId})`);
  }

  /**
   * Set the incoming group check timeout.
   * @private
   * @returns {undefined} No return value
   */
  _setVerifyGroupCheckTimeout() {
    const timeoutInSeconds = CallEntity.CONFIG.GROUP_CHECK_ACTIVITY_TIMEOUT;

    this.groupCheckTimeoutId = window.setTimeout(() => this._onVerifyGroupCheckTimeout(), timeoutInSeconds * 1000);
    this.logger.debug(`Set verifying group check after '${timeoutInSeconds}s' (ID: ${this.groupCheckTimeoutId})`);
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
    const additionalPayload = z.calling.CallMessageBuilder.createPayload(this.id, this.selfUser.id, userId, clientId);

    let callMessageEntity;
    switch (type) {
      case z.calling.enum.CALL_MESSAGE_TYPE.HANGUP: {
        callMessageEntity = z.calling.CallMessageBuilder.buildHangup(true, this.sessionId, additionalPayload);
        break;
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC: {
        const propSyncPayload = z.calling.CallMessageBuilder.createPayloadPropSync(
          this.selfState,
          z.media.MediaType.VIDEO,
          false,
          additionalPayload
        );

        callMessageEntity = z.calling.CallMessageBuilder.buildPropSync(true, this.sessionId, propSyncPayload);
        break;
      }

      default: {
        this.logger.error(`Tried to confirm call event of wrong type '${type}'`, callMessageEntity);
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
    const {sdp: rtcSdp} = callMessageEntity;

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
    if (z.calling.enum.CALL_STATE_GROUP.IS_RINGING.includes(this.previousState)) {
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
        return this.isGroup
          ? this.state(z.calling.enum.CALL_STATE.REJECTED)
          : amplify.publish(z.event.WebApp.CALL.STATE.DELETE, this.id);
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

    this.participants().forEach(({state}) => {
      if (state.screenSend()) {
        this.remoteMediaType(z.media.MediaType.SCREEN);
        mediaTypeChanged = true;
      } else if (state.videoSend()) {
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
      .then(() => this._updateParticipant(userId, negotiate, callMessageEntity))
      .catch(error => {
        const isNotFound = error.type === z.calling.CallError.TYPE.NOT_FOUND;
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
        this.callingRepository.mediaElementHandler.remove_media_element(userId);

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

        this.logger.info(`Removed call participant '${participantEntity.user.name()}'`);
        return this;
      })
      .catch(error => {
        const isNotFound = error.type === z.calling.CallError.TYPE.NOT_FOUND;
        if (isNotFound) {
          return this;
        }

        throw error;
      });
  }

  /**
   * Get the number of participants in the call.
   * @param {boolean} [countSelfUser=false] - Add self user to count
   * @returns {number} Number of participants in call
   */
  getNumberOfParticipants(countSelfUser = false) {
    const additionalCount = countSelfUser ? 1 : 0;
    return this.participants().length + additionalCount;
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

    const error = new z.calling.CallError(z.calling.CallError.TYPE.NOT_FOUND, 'No participant found for user ID');
    return Promise.reject(error);
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
      this.callingRepository.mediaElementHandler.remove_media_element(userId);
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

      throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER, 'Session IDs not matching');
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
    return this.getParticipantById(userId).catch(error => {
      const isNotFound = error.type === z.calling.CallError.TYPE.NOT_FOUND;
      if (!isNotFound) {
        throw error;
      }

      return this.userRepository.get_user_by_id(userId).then(userEntity => {
        const participantEntity = new z.calling.entities.ParticipantEntity(this, userEntity, this.timings);

        this.participants.push(participantEntity);

        this.logger.info(`Adding call participant '${userEntity.name()}'`, participantEntity);
        return this._updateParticipantState(participantEntity, negotiate, callMessageEntity);
      });
    });
  }

  /**
   * Update call participant with call message.
   *
   * @param {string} userId - User ID to be updated in the call
   * @param {boolean} negotiate - Should negotiation be started
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to update user with
   * @returns {Promise} Resolves with the updated participant
   */
  _updateParticipant(userId, negotiate, callMessageEntity) {
    return this.getParticipantById(userId).then(participantEntity => {
      if (callMessageEntity && callMessageEntity.clientId) {
        participantEntity.verifyClientId(callMessageEntity.clientId);
      }

      this.logger.info(`Updating call participant '${participantEntity.user.name()}'`, callMessageEntity);
      return this._updateParticipantState(participantEntity, negotiate, callMessageEntity);
    });
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
   * @param {z.media.MediaType} [mediaType=z.media.MediaType.AUDIO] - Media type for this call
   * @returns {undefined} No return value
   */
  initiateTelemetry(mediaType = z.media.MediaType.AUDIO) {
    this.telemetry.set_media_type(mediaType);
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
    const delta = -2.0 * position / (numberOfParticipants - 1.0);

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
        .sort((participantA, participantB) => participantA.user.joaat_hash - participantB.user.joaat_hash)
        .forEach((participantEntity, index) => {
          const panning = this._calculatePanning(index, this.participants().length);

          this.logger.debug(`Panning for '${participantEntity.user.name()}' recalculated to '${panning}'`);
          participantEntity.panning(panning);
        });

      const panningOrder = this.participants()
        .map(({user}) => user.name())
        .join(', ');

      this.logger.info(`New panning order: ${panningOrder}`);
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
