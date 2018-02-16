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

z.calling.CallingRepository = class CallingRepository {
  static get CONFIG() {
    return {
      DATA_CHANNEL_MESSAGE_TYPES: [z.calling.enum.CALL_MESSAGE_TYPE.HANGUP, z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC],
      DEFAULT_CONFIG_TTL: 60 * 60, // 60 minutes in seconds
      MESSAGE_LOG_LENGTH: 250,
      PROTOCOL_VERSION: '3.0',
    };
  }

  /**
   * Extended check for calling support of browser.
   * @returns {boolean} True if calling is supported
   */
  static get supportsCalling() {
    return z.util.Environment.browser.supports.calling;
  }

  /**
   * Extended check for screen sharing support of browser.
   * @returns {boolean} True if screen sharing is supported
   */
  static get supportsScreenSharing() {
    return z.util.Environment.browser.supports.screenSharing;
  }

  /**
   * Construct a new Calling repository.
   *
   * @param {CallingService} callingService -  Backend REST API calling service implementation
   * @param {ClientRepository} clientRepository - Repository for client interactions
   * @param {ConversationRepository} conversationRepository -  Repository for conversation interactions
   * @param {MediaRepository} mediaRepository -  Repository for media interactions
   * @param {UserRepository} userRepository -  Repository for all user and connection interactions
   */
  constructor(callingService, clientRepository, conversationRepository, mediaRepository, userRepository) {
    this.getConfig = this.getConfig.bind(this);

    this.callingService = callingService;
    this.clientRepository = clientRepository;
    this.conversationRepository = conversationRepository;
    this.mediaRepository = mediaRepository;
    this.userRepository = userRepository;
    this.logger = new z.util.Logger('z.calling.CallingRepository', z.config.LOGGER.OPTIONS);

    this.selfUserId = ko.pureComputed(() => {
      if (this.userRepository.self()) {
        return this.userRepository.self().id;
      }
    });

    this.timeOffset = 0;

    this.callingConfig = undefined;
    this.callingConfigTimeout = undefined;

    // Telemetry
    this.telemetry = new z.telemetry.calling.CallTelemetry();
    this.messageLog = [];

    // Media Handler
    this.mediaDevicesHandler = this.mediaRepository.devices_handler;
    this.mediaStreamHandler = this.mediaRepository.stream_handler;
    this.mediaElementHandler = this.mediaRepository.element_handler;
    this.remote_media_streams = this.mediaRepository.stream_handler.remote_media_streams;
    this.selfStreamState = this.mediaRepository.stream_handler.self_stream_state;

    this.selfState = this.mediaStreamHandler.self_stream_state;

    this.calls = ko.observableArray([]);
    this.joined_call = ko.pureComputed(() => {
      for (const callEntity of this.calls()) {
        if (callEntity.selfClientJoined()) {
          return callEntity;
        }
      }
    });

    this.flowStatus = undefined;
    this.debugEnabled = false;

    this.shareCallStates();
    this.subscribeToEvents();
  }
  /**
   * Share call states with MediaRepository.
   * @returns {undefined} No return value
   */
  shareCallStates() {
    this.mediaRepository.stream_handler.calls = this.calls;
    this.mediaRepository.stream_handler.joined_call = this.joined_call;
  }

  /**
   * Subscribe to amplify topics.
   * @returns {undefined} No return value
   */
  subscribeToEvents() {
    amplify.subscribe(z.event.WebApp.CALL.EVENT_FROM_BACKEND, this.onCallEvent.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.MEDIA.TOGGLE, this.toggleMedia.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.DELETE, this.deleteCall.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.JOIN, this.joinCall.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.LEAVE, this.leaveCall.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.REJECT, this.rejectCall.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.PARTICIPANT_LEFT, this.participantLeft.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.TOGGLE, this.toggleState.bind(this));
    amplify.subscribe(z.event.WebApp.DEBUG.UPDATE_LAST_CALL_STATUS, this.storeFlowStatus.bind(this));
    amplify.subscribe(z.event.WebApp.EVENT.UPDATE_TIME_OFFSET, this.updateTimeOffset.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.LOADED, this.getConfig);
    amplify.subscribe(z.util.Logger.prototype.LOG_ON_DEBUG, this.setDebugState.bind(this));
  }

  //##############################################################################
  // Inbound call events
  //##############################################################################

  /**
   * Handle incoming calling events from backend.
   *
   * @param {Object} event - Event payload
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  onCallEvent(event, source) {
    const {content: eventContent, time: eventDate, type: eventType} = event;
    const isCall = eventType === z.event.Client.CALL.E_CALL;

    const logObject = {eventJson: JSON.stringify(event), eventObject: event};
    this.logger.info(`»» Call Event: '${eventType}' (Source: ${source})`, logObject);

    if (isCall) {
      const isSupportedVersion = eventContent.version === z.calling.entities.CallMessage.CONFIG.VERSION;
      if (!isSupportedVersion) {
        throw new z.calling.CallError(z.calling.CallError.TYPE.UNSUPPORTED_VERSION);
      }

      const callMessageEntity = z.calling.CallMessageMapper.mapEvent(event);
      this._logMessage(false, callMessageEntity, eventDate);

      this._validateMessageType(callMessageEntity)
        .then(conversationEntity => {
          const isBackendTimestamp = source !== z.event.EventRepository.SOURCE.INJECTED;
          conversationEntity.updateTimestampServer(callMessageEntity.time, isBackendTimestamp);
        })
        .then(() => {
          if (z.calling.CallingRepository.supportsCalling) {
            return this._onCallEventInSupportedBrowsers(callMessageEntity, source);
          }
          this._onCallEventInUnsupportedBrowsers(callMessageEntity, source);
        });
    }
  }

  /**
   * Call event handling for browsers supporting calling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - Mapped incoming call message entity
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onCallEventInSupportedBrowsers(callMessageEntity, source) {
    const messageType = callMessageEntity.type;

    switch (messageType) {
      case z.calling.enum.CALL_MESSAGE_TYPE.CANCEL:
        this._onCancel(callMessageEntity, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK:
        this._onGroupCheck(callMessageEntity, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE:
        this._onGroupLeave(callMessageEntity);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP:
        this._onGroupSetup(callMessageEntity);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START:
        this._onGroupStart(callMessageEntity, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.HANGUP:
        this._onHangup(callMessageEntity);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC:
        this._onPropSync(callMessageEntity);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.REJECT:
        this._onReject(callMessageEntity);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.SETUP:
        this._onSetup(callMessageEntity, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.UPDATE:
        this._onUpdate(callMessageEntity);
        break;
      default:
        this.logger.warn(`Call event of unknown type '${messageType}' was ignored`, callMessageEntity);
    }
  }

  /**
   * Call event handling for browsers not supporting calling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - Mapped incoming call message entity
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onCallEventInUnsupportedBrowsers(callMessageEntity, source) {
    const {conversationId, response, type, userId} = callMessageEntity;

    if (!response) {
      switch (type) {
        case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
          this.injectActivateEvent(callMessageEntity, source);
          this.userRepository.getUserById(userId).then(userEntity => {
            amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL, {
              callId: conversationId,
              firstName: userEntity.name(),
            });
          });
          break;
        }

        case z.calling.enum.CALL_MESSAGE_TYPE.CANCEL: {
          amplify.publish(z.event.WebApp.WARNING.DISMISS, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL);
          break;
        }

        default: {
          break;
        }
      }
    }
  }

  /**
   * Call cancel message handling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.CANCEL
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onCancel(callMessageEntity, source) {
    const {clientId, conversationId, response, userId} = callMessageEntity;

    if (!response) {
      this.getCallById(conversationId)
        .then(callEntity => callEntity.verifySessionId(callMessageEntity))
        .then(callEntity =>
          callEntity.deleteParticipant(userId, clientId, z.calling.enum.TERMINATION_REASON.OTHER_USER)
        )
        .then(callEntity => callEntity.deactivateCall(callMessageEntity, z.calling.enum.TERMINATION_REASON.OTHER_USER))
        .catch(error => {
          if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
            this.injectDeactivateEvent(callMessageEntity, source);
            throw error;
          }
        });
    }
  }

  /**
   * call group check message handling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onGroupCheck(callMessageEntity, source) {
    this.getCallById(callMessageEntity.conversationId)
      .then(callEntity => callEntity.scheduleGroupCheck())
      .catch(error => this._validateIncomingCall(callMessageEntity, source, error));
  }

  /**
   * call group leave message handling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE
   * @param {z.calling.enum.TERMINATION_REASON} [terminationReason=z.calling.enum.TERMINATION_REASON.OTHER_USER] - Reason for participant to leave
   * @returns {undefined} No return value
   */
  _onGroupLeave(callMessageEntity, terminationReason = z.calling.enum.TERMINATION_REASON.OTHER_USER) {
    const {conversationId, clientId, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => {
        const isOutgoing = callEntity.state() === z.calling.enum.CALL_STATE.OUTGOING;
        if (isOutgoing) {
          throw new z.calling.CallError(
            z.calling.CallError.TYPE.WRONG_SENDER,
            'Remote user tried to leave outgoing call'
          );
        }

        const isSelfUser = userId === this.selfUserId();
        if (isSelfUser) {
          callEntity.selfUserJoined(false);
          return callEntity;
        }

        return callEntity.deleteParticipant(userId, clientId, terminationReason);
      })
      .then(callEntity => callEntity.participantLeft(callMessageEntity, terminationReason))
      .catch(this._throwMessageError);
  }

  /**
   * call group setup message handling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP
   * @returns {undefined} No return value
   */
  _onGroupSetup(callMessageEntity) {
    const {conversationId, response, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => {
        // @todo Grant message for ongoing call

        this._validateMessageDestination(callEntity, callMessageEntity);
        callEntity.setRemoteVersion(callMessageEntity);
        callEntity.addOrUpdateParticipant(userId, response !== true, callMessageEntity);
      })
      .catch(this._throwMessageError);
  }

  /**
   * call group start message handling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onGroupStart(callMessageEntity, source) {
    const {conversationId, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => {
        // @todo Grant message for ongoing call

        const isSelfUser = userId === this.selfUserId();
        if (isSelfUser && !callEntity.selfClientJoined()) {
          callEntity.selfUserJoined(true);
          callEntity.wasConnected = true;
          return callEntity.state(z.calling.enum.CALL_STATE.REJECTED);
        }

        if (callEntity.state() === z.calling.enum.CALL_STATE.OUTGOING) {
          callEntity.state(z.calling.enum.CALL_STATE.CONNECTING);
        }

        // Add the correct participant, start negotiating
        callEntity.addOrUpdateParticipant(userId, callEntity.selfClientJoined(), callMessageEntity);
      })
      .catch(error => this._validateIncomingCall(callMessageEntity, source, error));
  }

  /**
   * call hangup message handling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.HANGUP
   * @param {z.calling.enum.TERMINATION_REASON} terminationReason - Reason for the participant to hangup
   * @returns {undefined} No return value
   */
  _onHangup(callMessageEntity, terminationReason = z.calling.enum.TERMINATION_REASON.OTHER_USER) {
    const {conversationId, clientId, response, userId} = callMessageEntity;

    if (!response) {
      this.getCallById(conversationId)
        .then(callEntity => callEntity.verifySessionId(callMessageEntity))
        .then(callEntity => this._confirmCallMessage(callEntity, callMessageEntity))
        .then(callEntity => callEntity.deleteParticipant(userId, clientId, terminationReason))
        .then(callEntity => {
          if (!callEntity.isGroup) {
            callEntity.deactivateCall(callMessageEntity, terminationReason);
          }
        })
        .catch(this._throwMessageError);
    }
  }

  /**
   * call prop-sync message handling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @returns {undefined} No return value
   */
  _onPropSync(callMessageEntity) {
    const {conversationId, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => callEntity.verifySessionId(callMessageEntity))
      .then(callEntity => this._confirmCallMessage(callEntity, callMessageEntity))
      .then(callEntity => callEntity.addOrUpdateParticipant(userId, false, callMessageEntity))
      .catch(this._throwMessageError);
  }

  /**
   * call reject message handling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.REJECT
   * @returns {undefined} No return value
   */
  _onReject(callMessageEntity) {
    const {conversationId, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => {
        const isSelfUser = userId !== this.selfUserId();
        if (!isSelfUser) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER, 'Call rejected by wrong user');
        }

        if (!callEntity.selfClientJoined()) {
          this.logger.info(`Rejecting call in conversation '${conversationId}'`, callEntity);
          callEntity.state(z.calling.enum.CALL_STATE.REJECTED);
          this.mediaStreamHandler.resetMediaStream();
        }
      })
      .catch(this._throwMessageError);
  }

  /**
   * call setup message handling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onSetup(callMessageEntity, source) {
    const {conversationId, response, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => {
        callEntity.setRemoteVersion(callMessageEntity);

        if (response && userId === this.selfUserId()) {
          const conversationName = callEntity.conversationEntity.displayName();
          this.logger.info(`Incoming call in conversation '${conversationName}' accepted on other device`);
          return this.deleteCall(conversationId);
        }

        return callEntity.addOrUpdateParticipant(userId, response !== true, callMessageEntity).then(() => {
          if (response) {
            callEntity.state(z.calling.enum.CALL_STATE.CONNECTING);
          }
        });
      })
      .catch(error => this._validateIncomingCall(callMessageEntity, source, error));
  }

  /**
   * call setup message handling.
   *
   * @private
   * @param {CallMessage} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @returns {undefined} No return value
   */
  _onUpdate(callMessageEntity) {
    const {conversationId, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => {
        this._validateMessageDestination(callEntity, callMessageEntity);
        return callEntity.verifySessionId(callMessageEntity);
      })
      .then(callEntity => callEntity.addOrUpdateParticipant(userId, false, callMessageEntity))
      .catch(this._throwMessageError);
  }

  /**
   * Throw error is not expected types.
   *
   * @private
   * @param {z.calling.CallError|Error} error - Error thrown during call message handling
   * @returns {undefined} No return value
   */
  _throwMessageError(error) {
    const expectedErrorTypes = [z.calling.CallError.TYPE.MISTARGETED_MESSAGE, z.calling.CallError.TYPE.NOT_FOUND];

    if (!expectedErrorTypes.includes(error.type)) {
      throw error;
    }
  }

  /**
   * Verify validity of incoming call.
   *
   * @param {CallMessage} callMessageEntity - call message to validate
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {z.calling.CallError|Error} error - Error thrown during call message handling
   * @returns {undefined} No return value
   */
  _validateIncomingCall(callMessageEntity, source, error) {
    this._throwMessageError(error);

    const {conversationId, response, type, userId} = callMessageEntity;

    const isGroupCheck = type === z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK;
    const isSelfUser = userId === this.selfUserId();
    const validMessage = response === isGroupCheck;

    if (!isSelfUser && validMessage) {
      const eventFromStream = source === z.event.EventRepository.SOURCE.STREAM;
      const silentCall = isGroupCheck || eventFromStream;
      const promises = [this._createIncomingCall(callMessageEntity, source, silentCall)];

      if (!eventFromStream) {
        promises.push(
          this.conversationRepository.grantMessage(conversationId, z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL, [
            userId,
          ])
        );
      }

      Promise.all(promises)
        .then(([callEntity, grantedCall]) => {
          if (grantedCall) {
            const mediaType = callEntity.isRemoteVideoSend() ? z.media.MediaType.AUDIO_VIDEO : z.media.MediaType.AUDIO;
            this.joinCall(conversationId, mediaType);
          }
        })
        .catch(_error => {
          if (_error.type !== z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
            throw _error;
          }

          this.rejectCall(conversationId);
        });
    }
  }

  /**
   * Validate that content of call message is targeted at local client.
   * @param {Call} callEntity - Call the message belongs to
   * @param {CallMessage} callMessageEntity - call message to validate
   * @returns {undefined} Resolves if the message is valid
   */
  _validateMessageDestination(callEntity, callMessageEntity) {
    if (callEntity.isGroup) {
      const {dest_clientId, destUserId, type} = callMessageEntity;

      if (destUserId !== this.selfUserId() || dest_clientId !== this.clientRepository.currentClient().id) {
        this.logger.log(`Ignored '${type}' call message for client '${dest_clientId}' of user '${destUserId}'`);
        throw new z.calling.CallError(z.calling.CallError.TYPE.MISTARGETED_MESSAGE);
      }
    }
  }

  /**
   * Validate that type of call message matches conversation type.
   * @param {CallMessage} callMessageEntity - call message to validate
   * @returns {Promise} Resolves if the message is valid
   */
  _validateMessageType(callMessageEntity) {
    const {conversationId, type} = callMessageEntity;

    return this.conversationRepository.getConversationById(conversationId).then(conversationEntity => {
      if (conversationEntity.is_one2one()) {
        const group_messageTypes = [
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK,
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE,
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP,
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START,
        ];

        if (group_messageTypes.includes(type)) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_CONVERSATION_TYPE);
        }
      } else if (conversationEntity.isGroup()) {
        const one2oneMessageTypes = [z.calling.enum.CALL_MESSAGE_TYPE.SETUP];

        if (one2oneMessageTypes.includes(type)) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_CONVERSATION_TYPE);
        }
      } else {
        throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_CONVERSATION_TYPE);
      }

      return conversationEntity;
    });
  }

  //##############################################################################
  // Outbound call events
  //##############################################################################

  /**
   * Send an call event.
   *
   * @param {z.entity.Conversation} conversationEntity - Conversation to send message in
   * @param {CallMessage} callMessageEntity - call message entity
   * @returns {Promise} Resolves when the event has been sent
   */
  sendCallMessage(conversationEntity, callMessageEntity) {
    if (!_.isObject(callMessageEntity)) {
      throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_PAYLOAD_FORMAT);
    }

    const {conversationId, remoteUserId, type} = callMessageEntity;

    return this.getCallById(conversationId || conversationEntity.id)
      .then(callEntity => {
        if (!CallingRepository.CONFIG.DATA_CHANNEL_MESSAGE_TYPES.includes(type)) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.NO_DATA_CHANNEL);
        }

        return callEntity.getParticipantById(remoteUserId);
      })
      .then(({flowEntity}) => flowEntity.sendMessage(callMessageEntity))
      .catch(error => {
        const expectedErrorTypes = [z.calling.CallError.TYPE.NO_DATA_CHANNEL, z.calling.CallError.TYPE.NOT_FOUND];

        if (!expectedErrorTypes.includes(error.type)) {
          throw error;
        }

        return this._limitMessageRecipients(callMessageEntity).then(({preconditionOption, recipients}) => {
          if (type === z.calling.enum.CALL_MESSAGE_TYPE.HANGUP) {
            callMessageEntity.type = z.calling.enum.CALL_MESSAGE_TYPE.CANCEL;
          }

          return this.conversationRepository.sendECall(
            conversationEntity,
            callMessageEntity,
            recipients,
            preconditionOption
          );
        });
      })
      .then(() => this._logMessage(true, callMessageEntity));
  }

  /**
   *
   * @private
   * @param {Call} callEntity - Call entity
   * @param {CallMessage} incomingCallMessageEntity - Incoming call message
   * @returns {Promise} Resolves with the call
   */
  _confirmCallMessage(callEntity, incomingCallMessageEntity) {
    const {response} = incomingCallMessageEntity;

    if (response || !callEntity.selfClientJoined()) {
      return Promise.resolve(callEntity);
    }

    return callEntity.confirmMessage(incomingCallMessageEntity).then(() => callEntity);
  }

  /**
   * Limit the message recipients for a call message.
   *
   * @private
   * @param {CallMessage} callMessageEntity - Call message to target at clients
   * @returns {Promise} Resolves with the client user map and precondition option
   */
  _limitMessageRecipients(callMessageEntity) {
    const {remoteClientId, remoteUser, remoteUserId, response, type} = callMessageEntity;
    let recipientsPromise;

    if (type === z.calling.enum.CALL_MESSAGE_TYPE.REJECT) {
      recipientsPromise = Promise.resolve({selfUserEntity: this.userRepository.self()});
    } else if (remoteUser) {
      recipientsPromise = Promise.resolve({remoteUserEntity: remoteUser, selfUserEntity: this.userRepository.self()});
    } else {
      recipientsPromise = this.userRepository
        .getUserById(remoteUserId)
        .then(remoteUserEntity => ({remoteUserEntity: remoteUserEntity, selfUserEntity: this.userRepository.self()}));
    }

    return recipientsPromise.then(({remoteUserEntity, selfUserEntity}) => {
      let preconditionOption;
      let recipients;

      switch (type) {
        case z.calling.enum.CALL_MESSAGE_TYPE.CANCEL: {
          if (response) {
            // Send to remote client that initiated call
            preconditionOption = true;
            recipients = {
              [remoteUserEntity.id]: [`${remoteClientId}`],
            };
          } else {
            // Send to all clients of remote user
            preconditionOption = [remoteUserEntity.id];
            recipients = {
              [remoteUserEntity.id]: remoteUserEntity.devices().map(device => device.id),
            };
          }
          break;
        }

        case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP:
        case z.calling.enum.CALL_MESSAGE_TYPE.HANGUP:
        case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC:
        case z.calling.enum.CALL_MESSAGE_TYPE.UPDATE: {
          // Send to remote client that call is connected with
          if (remoteClientId) {
            preconditionOption = true;
            recipients = {
              [remoteUserEntity.id]: [`${remoteClientId}`],
            };
          }
          break;
        }

        case z.calling.enum.CALL_MESSAGE_TYPE.REJECT: {
          // Send to all clients of self user
          preconditionOption = [selfUserEntity.id];
          recipients = {
            [selfUserEntity.id]: selfUserEntity.devices().map(device => device.id),
          };
          break;
        }

        case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
          if (response) {
            // Send to remote client that initiated call and all clients of self user
            preconditionOption = [selfUserEntity.id];
            recipients = {
              [remoteUserEntity.id]: [`${remoteClientId}`],
              [selfUserEntity.id]: selfUserEntity.devices().map(device => device.id),
            };
          } else {
            // Send to all clients of remote user
            preconditionOption = [remoteUserEntity.id];
            recipients = {
              [remoteUserEntity.id]: remoteUserEntity.devices().map(device => device.id),
            };
          }
          break;
        }

        default: {
          break;
        }
      }

      return {preconditionOption: preconditionOption, recipients: recipients};
    });
  }

  //##############################################################################
  // Call actions
  //##############################################################################

  /**
   * Delete an call.
   * @param {string} conversationId - ID of conversation to delete call from
   * @returns {undefined} No return value
   */
  deleteCall(conversationId) {
    this.getCallById(conversationId)
      .then(callEntity => {
        this.logger.info(`Deleting call in conversation '${conversationId}'`, callEntity);

        callEntity.deleteCall();
        this.calls.remove(call => call.id === conversationId);
        this.mediaStreamHandler.resetMediaStream();
      })
      .catch(error => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Join a call.
   *
   * @param {string} conversationId - ID of conversation to join call in
   * @param {z.media.MediaType} mediaType - Media type for this call
   * @returns {undefined} No return value
   */
  joinCall(conversationId, mediaType) {
    this.getCallById(conversationId)
      .then(callEntity => ({callEntity: callEntity, callState: callEntity.state()}))
      .catch(error => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        return {callState: z.calling.enum.CALL_STATE.OUTGOING};
      })
      .then(({callEntity, callState}) => {
        return this._checkCallingSupport(conversationId, callState)
          .then(() => this._checkConcurrentJoinedCall(conversationId, callState))
          .then(() => {
            if (callEntity) {
              return callEntity;
            }

            const videoSend = mediaType === z.media.MediaType.AUDIO_VIDEO;
            const propSyncPayload = z.calling.CallMessageBuilder.createPayloadPropSync(
              this.selfState,
              videoSend,
              false,
              {conversationId: conversationId}
            );
            return this._createOutgoingCall(
              z.calling.CallMessageBuilder.buildPropSync(false, undefined, propSyncPayload)
            );
          });
      })
      .then(callEntity => {
        this.logger.info(`Joining call in conversation '${conversationId}'`, callEntity);

        callEntity.initiateTelemetry(mediaType);
        if (this.mediaStreamHandler.localMediaStream()) {
          return callEntity;
        }

        return this.mediaStreamHandler.initiateMediaStream(conversationId, mediaType).then(() => callEntity);
      })
      .then(callEntity => {
        callEntity.timings.timeStep(z.telemetry.calling.CallSetupSteps.STREAM_RECEIVED);
        callEntity.joinCall();
      })
      .catch(error => {
        if (error.type !== z.calling.CallError.TYPE.NOT_SUPPORTED) {
          this.deleteCall(conversationId);
          if (!(error instanceof z.media.MediaError)) {
            throw error;
          }
        }
      });
  }

  /**
   * User action to leave an call.
   *
   * @param {string} conversationId - ID of conversation to leave call in
   * @param {z.calling.enum.TERMINATION_REASON} terminationReason - Reason for call termination
   * @returns {undefined} No return value
   */
  leaveCall(conversationId, terminationReason) {
    this.getCallById(conversationId)
      .then(callEntity => {
        this.logger.info(
          `Leaving call in conversation '${conversationId}' triggered by '${terminationReason}'`,
          callEntity
        );

        if (callEntity.state() !== z.calling.enum.CALL_STATE.ONGOING) {
          terminationReason = undefined;
        }

        this.mediaStreamHandler.releaseMediaStream();
        callEntity.leaveCall(terminationReason);
      })
      .catch(error => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Remove a participant from an call if he was removed from the group.
   *
   * @param {string} conversationId - ID of conversation for which the user should be removed from the call
   * @param {string} userId - ID of user to be removed
   * @returns {undefined} No return value
   */
  participantLeft(conversationId, userId) {
    const additionalPayload = z.calling.CallMessageBuilder.createPayload(conversationId, this.selfUserId(), userId);
    const callMessageEntity = z.calling.CallMessageBuilder.buildGroupLeave(false, this.sessionId, additionalPayload);

    this._onGroupLeave(callMessageEntity, z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE);
  }

  /**
   * User action to reject incoming call.
   * @param {string} conversationId - ID of conversation to ignore call in
   * @returns {undefined} No return value
   */
  rejectCall(conversationId) {
    this.getCallById(conversationId)
      .then(callEntity => {
        this.logger.info(`Rejecting call in conversation '${conversationId}'`, callEntity);

        callEntity.rejectCall();
      })
      .catch(error => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * User action to toggle one of the media stats of an call.
   *
   * @param {string} conversationId - ID of conversation with call
   * @param {z.media.MediaType} mediaType - MediaType of requested change
   * @returns {undefined} No return value
   */
  toggleMedia(conversationId, mediaType) {
    this.getCallById(conversationId)
      .then(callEntity => callEntity.toggleMedia(mediaType))
      .then(() => {
        switch (mediaType) {
          case z.media.MediaType.AUDIO:
            return this.mediaStreamHandler.toggle_audio_send();
          case z.media.MediaType.SCREEN:
            return this.mediaStreamHandler.toggle_screen_send();
          case z.media.MediaType.VIDEO:
            return this.mediaStreamHandler.toggle_videoSend();
          default:
            throw new z.media.MediaError(z.media.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
        }
      })
      .catch(error => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * User action to toggle the call state.
   *
   * @param {z.media.MediaType} mediaType - Media type of call
   * @param {Conversation} [conversationEntity=this.conversationRepository.activeConversation()] - Conversation for which state will be toggled
   * @returns {undefined} No return value
   */
  toggleState(mediaType, conversationEntity = this.conversationRepository.activeConversation()) {
    if (conversationEntity) {
      if (conversationEntity.id === this._selfClientOnACall()) {
        return this.leaveCall(conversationEntity.id);
      }

      const isVideoCall = mediaType === z.media.MediaType.AUDIO_VIDEO;
      if (conversationEntity.isGroup() && isVideoCall) {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_NO_VIDEO_IN_GROUP);
      } else {
        this.joinCall(conversationEntity.id, mediaType);
      }
    }
  }

  /**
   * Check whether conversation supports calling.
   * @param {string} conversationId - ID of conversation to join call in
   * @param {z.calling.enum.CALL_STATE} callState - Current state of call
   * @returns {Promise} Resolves when conversation supports calling
   */
  _checkCallingSupport(conversationId, callState) {
    return this.conversationRepository.getConversationById(conversationId).then(({participatingUserIds}) => {
      if (!participatingUserIds().length) {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_EMPTY_CONVERSATION);
        throw new z.calling.CallError(z.calling.CallError.TYPE.NOT_SUPPORTED);
      }

      const isOutgoingCall = callState === z.calling.enum.CALL_STATE.OUTGOING;
      if (isOutgoingCall && !z.calling.CallingRepository.supportsCalling) {
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_OUTGOING_CALL);
        throw new z.calling.CallError(z.calling.CallError.TYPE.NOT_SUPPORTED);
      }
    });
  }

  /**
   * Check whether we are actively participating in a call.
   *
   * @private
   * @param {string} newCallId - Conversation ID of call about to be joined
   * @param {z.calling.enum.CALL_STATE} callState - Call state of new call
   * @returns {Promise} Resolves when the new call was joined
   */
  _checkConcurrentJoinedCall(newCallId, callState) {
    return new Promise(resolve => {
      const ongoingCallId = this._selfParticipantOnACall();

      if (ongoingCallId) {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_START_ANOTHER, {
          action() {
            amplify.publish(
              z.event.WebApp.CALL.STATE.LEAVE,
              ongoingCallId,
              z.calling.enum.TERMINATION_REASON.CONCURRENT_CALL
            );
            window.setTimeout(resolve, 1000);
          },
          close() {
            if (callState === z.calling.enum.CALL_STATE.INCOMING) {
              amplify.publish(z.event.WebApp.CALL.STATE.REJECT, newCallId);
            }
          },
          data: callState,
        });
        this.logger.warn(`You cannot join a second call while calling in conversation '${ongoingCallId}'.`);
      } else {
        resolve();
      }
    });
  }

  //##############################################################################
  // call entity creation
  //##############################################################################

  /**
   * Constructs a call entity.
   *
   * @private
   * @param {CallMessage} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.entity.User} creatingUserEntity - User that created call
   * @returns {Promise} Resolves with the new call entity
   */
  _createCall(callMessageEntity, creatingUserEntity) {
    const {conversationId, sessionId} = callMessageEntity;

    return this.getCallById(conversationId).catch(() => {
      return this.conversationRepository.getConversationById(conversationId).then(conversationEntity => {
        const callEntity = new z.calling.entities.Call(conversationEntity, creatingUserEntity, sessionId, this);

        this.calls.push(callEntity);
        return callEntity;
      });
    });
  }

  /**
   * Constructs an incoming call entity.
   *
   * @private
   * @param {CallMessage} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {boolean} [silent=false] - Start call in rejected mode
   * @returns {Promise} Resolves with the new call entity
   */
  _createIncomingCall(callMessageEntity, source, silent = false) {
    const {conversationId, props, userId} = callMessageEntity;

    return this.userRepository
      .getUserById(userId)
      .then(remoteUserEntity => this._createCall(callMessageEntity, remoteUserEntity))
      .then(callEntity => {
        const mediaType = this._getMediaTypeFromProperties(props);
        const conversationName = callEntity.conversationEntity.displayName();
        this.logger.info(`Incoming '${mediaType}' call in conversation '${conversationName}'`, callEntity);

        callEntity.direction = z.calling.enum.CALL_STATE.INCOMING;
        callEntity.setRemoteVersion(callMessageEntity);
        callEntity.state(silent ? z.calling.enum.CALL_STATE.REJECTED : z.calling.enum.CALL_STATE.INCOMING);

        return callEntity.addOrUpdateParticipant(userId, false, callMessageEntity).then(() => {
          this.telemetry.setMediaType(mediaType);
          this.telemetry.trackEvent(z.tracking.EventName.CALLING.RECEIVED_CALL, callEntity);
          this.injectActivateEvent(callMessageEntity, source);

          const eventFromWebSocket = source === z.event.EventRepository.SOURCE.WEB_SOCKET;
          if (eventFromWebSocket && callEntity.isRemoteVideoSend()) {
            this.mediaStreamHandler.initiateMediaStream(callEntity.id, z.media.MediaType.AUDIO_VIDEO);
          }

          return callEntity;
        });
      })
      .catch(error => {
        this.deleteCall(conversationId);

        if (!(error instanceof z.media.MediaError)) {
          throw error;
        }
      });
  }

  /**
   * Constructs an outgoing call entity.
   *
   * @private
   * @param {CallMessage} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC
   * @returns {Promise} Resolves with the new call entity
   */
  _createOutgoingCall(callMessageEntity) {
    const {props} = callMessageEntity;

    return this._createCall(callMessageEntity, this.userRepository.self()).then(callEntity => {
      const mediaType = this._getMediaTypeFromProperties(props);
      const conversationName = callEntity.conversationEntity.displayName();
      this.logger.info(`Outgoing '${mediaType}' call in conversation '${conversationName}'`, callEntity);

      callEntity.direction = z.calling.enum.CALL_STATE.OUTGOING;
      callEntity.state(z.calling.enum.CALL_STATE.OUTGOING);

      this.telemetry.setMediaType(mediaType);
      this.telemetry.trackEvent(z.tracking.EventName.CALLING.INITIATED_CALL, callEntity);
      return callEntity;
    });
  }

  //##############################################################################
  // Notifications
  //##############################################################################

  /**
   * Inject a call activate event.
   * @param {CallMessage} callMessageEntity - call message to create event from
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  injectActivateEvent(callMessageEntity, source) {
    const activateEvent = z.conversation.EventBuilder.buildVoiceChannelActivate(callMessageEntity);
    amplify.publish(z.event.WebApp.EVENT.INJECT, activateEvent, source);
  }

  /**
   * Inject a call deactivate event.
   * @param {CallMessage} callMessageEntity - Call message to create event from
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {z.calling.enum.TERMINATION_REASON} [reason] - Reason for call to end
   * @returns {undefined} No return value
   */
  injectDeactivateEvent(callMessageEntity, source, reason) {
    const deactivateEvent = z.conversation.EventBuilder.buildVoiceChannelDeactivate(
      callMessageEntity,
      reason,
      this.timeOffset
    );
    amplify.publish(z.event.WebApp.EVENT.INJECT, deactivateEvent, source);
  }

  /**
   * Update time offset.
   * @param {number} timeOffset - Approximate time different to backend in milliseconds
   * @returns {undefined} No return value
   */
  updateTimeOffset(timeOffset) {
    this.timeOffset = timeOffset;
  }

  //##############################################################################
  // Helper functions
  //##############################################################################

  /**
   * Get an call entity for a given conversation ID.
   * @param {string} conversationId - ID of Conversation of requested call
   * @returns {Promise} Resolves with the call entity for conversation ID
   */
  getCallById(conversationId) {
    if (conversationId) {
      for (const callEntity of this.calls()) {
        if (callEntity.id === conversationId) {
          return Promise.resolve(callEntity);
        }
      }

      return Promise.reject(new z.calling.CallError(z.calling.CallError.TYPE.NOT_FOUND));
    }

    return Promise.reject(new z.calling.CallError(z.calling.CallError.TYPE.NO_CONVERSATION_ID));
  }

  /**
   * Leave a call we are joined immediately in case the browser window is closed.
   * @note Should only used by "window.onbeforeunload".
   * @returns {undefined} No return value
   */
  leaveCallOnUnload() {
    const conversationId = this._selfClientOnACall();

    if (conversationId) {
      this.leaveCall(conversationId);
    }
  }

  /**
   * Get the MediaType from given call event properties.
   * @param {Object} properties - call event properties
   * @returns {z.media.MediaType} MediaType of call
   */
  _getMediaTypeFromProperties(properties) {
    if (properties && properties.videosend === z.calling.enum.PROPERTY_STATE.TRUE) {
      return z.media.MediaType.VIDEO;
    }

    return z.media.MediaType.AUDIO;
  }

  /**
   * Check if self client is participating in a call.
   * @private
   * @returns {string|boolean} Conversation ID of call or false
   */
  _selfClientOnACall() {
    for (const callEntity of this.calls()) {
      if (callEntity.selfClientJoined()) {
        return callEntity.id;
      }
    }

    return false;
  }

  /**
   * Check if self participant is participating in a call.
   * @private
   * @returns {string|boolean} Conversation ID of call or false
   */
  _selfParticipantOnACall() {
    for (const callEntity of this.calls()) {
      if (callEntity.selfUserJoined()) {
        return callEntity.id;
      }
    }

    return false;
  }

  //##############################################################################
  // Calling config
  //##############################################################################

  /**
   * Get the current calling config.
   * @returns {Promise} Resolves with calling config
   */
  getConfig() {
    if (this.callingConfig) {
      const isExpiredConfig = this.callingConfig.expiration.getTime() < Date.now();

      if (!isExpiredConfig) {
        this.logger.debug('Returning local calling configuration. No update needed.', this.callingConfig);
        return Promise.resolve(this.callingConfig);
      }

      this._clearConfig();
    }

    return this._getConfigFromBackend();
  }

  _clearConfig() {
    if (this.callingConfig) {
      const expirationDate = this.callingConfig.expiration.toISOString();
      this.logger.debug(`Removing calling configuration with expiration of '${expirationDate}'`);
      this.callingConfig = undefined;
    }
  }

  _clearConfigTimeout() {
    if (this.callingConfigTimeout) {
      window.clearTimeout(this.callingConfigTimeout);
      this.callingConfigTimeout = undefined;
    }
  }

  /**
   * Get the calling config from the backend and store it.
   *
   * @private
   * @returns {Promise} Resolves with the updated calling config
   */
  _getConfigFromBackend() {
    return this.callingService.getConfig().then(callingConfig => {
      if (callingConfig) {
        this._clearConfigTimeout();

        const ttl = callingConfig.ttl * 0.9 || CallingRepository.CONFIG.DEFAULT_CONFIG_TTL;
        const timeout = Math.min(ttl, CallingRepository.CONFIG.DEFAULT_CONFIG_TTL) * 1000;
        const expirationDate = new Date(Date.now() + timeout);
        callingConfig.expiration = expirationDate;

        this.logger.info(`Updated calling configuration expires on '${expirationDate.toISOString()}'`, callingConfig);
        this.callingConfig = callingConfig;

        this.callingConfigTimeout = window.setTimeout(() => {
          this._clearConfig();
          this.getConfig();
        }, timeout);

        return this.callingConfig;
      }
    });
  }

  //##############################################################################
  // Logging
  //##############################################################################

  /**
   * Print the call message log.
   * @returns {undefined} No return value
   */
  printLog() {
    this.logger.force_log(`Call message log contains '${this.messageLog.length}' events`, this.messageLog);
    this.messageLog.forEach(({date, log, message}) => {
      this.logger.force_log(`${date} - ${log}`, message);
    });
  }

  /**
   * Report a call for call analysis.
   * @param {string} conversationId - ID of conversation
   * @returns {undefined} No return value
   */
  reportCall(conversationId) {
    this.getCallById(conversationId)
      .catch(() => {
        for (const callEntity of this.calls()) {
          if (!z.calling.enum.CALL_STATE_GROUP.IS_ENDED.includes(callEntity.state())) {
            return callEntity;
          }
        }
      })
      .then(callEntity => {
        if (callEntity) {
          return this._sendReport(callEntity.getFlows().map(flowEntity => flowEntity.reportStatus()));
        }

        if (this.flowStatus) {
          return this._sendReport(this.flowStatus);
        }

        this.logger.warn('Could not find flows to report for call analysis');
      });
  }

  /**
   * Set logging on adapter.js.
   * @param {boolean} isDebuggingEnabled - Updated debug state
   * @returns {undefined} No return value
   */
  setDebugState(isDebuggingEnabled) {
    if (this.debugEnabled !== isDebuggingEnabled) {
      this.debugEnabled = isDebuggingEnabled;
      this.logger.debug(`Debugging enabled state set to '${isDebuggingEnabled}'`);
      if (!isDebuggingEnabled) {
        this.messageLog.length = 0;
      }
    }

    if (adapter) {
      this.logger.debug(`Set logging for WebRTC Adapter: ${isDebuggingEnabled}`);
      adapter.disableLog = !isDebuggingEnabled;
    }
  }

  /**
   * Store last flow status.
   * @param {Object} flowStatus - Status to store
   * @returns {undefined} No return value
   */
  storeFlowStatus(flowStatus) {
    if (flowStatus) {
      this.flowStatus = flowStatus;
    }
  }

  /**
   * Log call messages for debugging.
   *
   * @private
   * @param {boolean} isOutgoing - Is message outgoing
   * @param {CallMessage} callMessageEntity - Call message to be logged in the sequence
   * @param {string} [date] - Date of message as ISO string
   * @returns {undefined} No return value
   */
  _logMessage(isOutgoing, callMessageEntity, date = new Date().toISOString()) {
    while (this.messageLog.length >= CallingRepository.CONFIG.MESSAGE_LOG_LENGTH) {
      this.messageLog.shift();
    }

    const {conversationId, destUserId, remoteUserId, response, type, userId} = callMessageEntity;

    let logMessage;
    if (isOutgoing) {
      if (remoteUserId) {
        logMessage = `Sending '${type}' message (response: ${response}) to user '${remoteUserId}' in conversation '${conversationId}'`;
      } else {
        logMessage = `Sending '${type}' message (response: ${response}) to conversation '${conversationId}'`;
      }
    } else {
      if (destUserId && destUserId !== this.selfUserId()) {
        return;
      }

      logMessage = `Received '${type}' message (response: ${response}) from user '${userId}' in conversation '${conversationId}'`;
    }

    this.logger.info(logMessage, callMessageEntity);

    if (this.debugEnabled) {
      const logEntry = {
        date: date,
        log: logMessage,
        message: callMessageEntity,
      };

      this.messageLog.push(logEntry);
    }
  }

  /**
   * Send Raygun report.
   *
   * @private
   * @param {Object} customData - Information to add to the call report
   * @returns {undefined} No return value
   */
  _sendReport(customData) {
    Raygun.send(new Error('Call failure report'), customData);
    this.logger.debug(`Reported status of flow id '${customData.meta.flowId}' for call analysis`, customData);
  }
};
