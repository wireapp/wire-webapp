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

import adapter from 'webrtc-adapter';

window.z = window.z || {};
window.z.calling = z.calling || {};

z.calling.CallingRepository = class CallingRepository {
  static get CONFIG() {
    return {
      DATA_CHANNEL_MESSAGE_TYPES: [z.calling.enum.CALL_MESSAGE_TYPE.HANGUP, z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC],
      DEFAULT_CONFIG_TTL: 60 * 60, // 60 minutes in seconds
      MAX_FIREFOX_TURN_COUNT: 3,
      MAX_VIDEO_PARTICIPANTS: 4,
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
   * @param {EventRepository} eventRepository -  Repository that handles events
   * @param {MediaRepository} mediaRepository -  Repository for media interactions
   * @param {z.time.ServerTimeRepository} serverTimeRepository - Handles time shift between server and client
   * @param {UserRepository} userRepository -  Repository for all user interactions
   */
  constructor(
    callingService,
    clientRepository,
    conversationRepository,
    eventRepository,
    mediaRepository,
    serverTimeRepository,
    userRepository
  ) {
    this.getConfig = this.getConfig.bind(this);

    this.callingService = callingService;
    this.clientRepository = clientRepository;
    this.conversationRepository = conversationRepository;
    this.eventRepository = eventRepository;
    this.mediaRepository = mediaRepository;
    this.serverTimeRepository = serverTimeRepository;
    this.userRepository = userRepository;

    this.messageLog = [];
    const loggerName = 'z.calling.CallingRepository';
    this.callLogger = new z.telemetry.calling.CallLogger(loggerName, null, z.config.LOGGER.OPTIONS, this.messageLog);

    this.selfUserId = ko.pureComputed(() => {
      if (this.userRepository.self()) {
        return this.userRepository.self().id;
      }
    });

    this.callingConfig = undefined;
    this.callingConfigTimeout = undefined;

    // Telemetry
    this.telemetry = new z.telemetry.calling.CallTelemetry();

    // Media Handler
    this.mediaDevicesHandler = this.mediaRepository.devicesHandler;
    this.mediaStreamHandler = this.mediaRepository.streamHandler;
    this.mediaElementHandler = this.mediaRepository.elementHandler;

    this.selfStreamState = this.mediaStreamHandler.selfStreamState;

    this.calls = ko.observableArray([]);
    this.joinedCall = ko.pureComputed(() => {
      for (const callEntity of this.calls()) {
        if (callEntity.selfClientJoined()) {
          return callEntity;
        }
      }
    });

    this.flowStatus = undefined;

    this.shareCallStates();
    this.subscribeToEvents();
    this._enableDebugging();
  }

  /**
   * Share call states with MediaRepository.
   * @returns {undefined} No return value
   */
  shareCallStates() {
    this.calls.subscribe(callEntities => this.mediaStreamHandler.updateCurrentCalls(callEntities));
    this.joinedCall.subscribe(joinedCallEntity => this.mediaStreamHandler.setJoinedCall(joinedCallEntity));
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
    amplify.subscribe(z.event.WebApp.CALL.STATE.REMOVE_PARTICIPANT, this.removeParticipant.bind(this));
    amplify.subscribe(z.event.WebApp.CALL.STATE.TOGGLE, this.toggleState.bind(this));
    amplify.subscribe(z.event.WebApp.DEBUG.UPDATE_LAST_CALL_STATUS, this.storeFlowStatus.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.LOADED, this.getConfig);
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
    this.callLogger.info(`»» Call Event: '${eventType}' (Source: ${source})`, logObject);

    if (isCall) {
      const isSupportedVersion = eventContent.version === z.calling.entities.CallMessageEntity.CONFIG.VERSION;
      if (!isSupportedVersion) {
        throw new z.error.CallError(z.error.CallError.TYPE.UNSUPPORTED_VERSION);
      }

      const callMessageEntity = z.calling.CallMessageMapper.mapEvent(event);
      this._logMessage(false, callMessageEntity, eventDate);

      this._validateMessageType(callMessageEntity)
        .then(conversationEntity => {
          const isBackendTimestamp = source !== z.event.EventRepository.SOURCE.INJECTED;
          conversationEntity.update_timestamp_server(callMessageEntity.time, isBackendTimestamp);
        })
        .then(() => {
          return z.calling.CallingRepository.supportsCalling
            ? this._onCallEventInSupportedBrowsers(callMessageEntity, source)
            : this._onCallEventInUnsupportedBrowsers(callMessageEntity, source);
        });
    }
  }

  /**
   * Call event handling for browsers supporting calling.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Mapped incoming call message entity
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onCallEventInSupportedBrowsers(callMessageEntity, source) {
    const messageType = callMessageEntity.type;

    switch (messageType) {
      case z.calling.enum.CALL_MESSAGE_TYPE.CANCEL: {
        return this._onCancel(callMessageEntity, source);
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK: {
        return this._onGroupCheck(callMessageEntity, source);
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE: {
        return this._onGroupLeave(callMessageEntity);
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP: {
        return this._onGroupSetup(callMessageEntity);
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START: {
        return this._onGroupStart(callMessageEntity, source);
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.HANGUP: {
        return this._onHangup(callMessageEntity);
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC: {
        return this._onPropSync(callMessageEntity);
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.REJECT: {
        return this._onReject(callMessageEntity);
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
        return this._onSetup(callMessageEntity, source);
      }

      case z.calling.enum.CALL_MESSAGE_TYPE.UPDATE: {
        return this._onUpdate(callMessageEntity);
      }

      default: {
        this.callLogger.warn(`Call event of unknown type '${messageType}' was ignored`, callMessageEntity);
      }
    }
  }

  /**
   * Call event handling for browsers not supporting calling.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Mapped incoming call message entity
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onCallEventInUnsupportedBrowsers(callMessageEntity, source) {
    const {response, type, userId} = callMessageEntity;

    if (!response) {
      switch (type) {
        case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
          this.injectActivateEvent(callMessageEntity, source);
          this.userRepository.get_user_by_id(userId).then(userEntity => {
            const warningOptions = {name: userEntity.name()};
            const warningType = z.viewModel.WarningsViewModel.TYPE.UNSUPPORTED_INCOMING_CALL;

            amplify.publish(z.event.WebApp.WARNING.SHOW, warningType, warningOptions);
          });
          break;
        }

        case z.calling.enum.CALL_MESSAGE_TYPE.CANCEL: {
          amplify.publish(z.event.WebApp.WARNING.DISMISS, z.viewModel.WarningsViewModel.TYPE.UNSUPPORTED_INCOMING_CALL);
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
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.CANCEL
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onCancel(callMessageEntity, source) {
    const {clientId, conversationId, response, userId} = callMessageEntity;

    if (!response) {
      const terminationReason = z.calling.enum.TERMINATION_REASON.OTHER_USER;
      this.getCallById(conversationId)
        .then(callEntity => callEntity.verifySessionId(callMessageEntity))
        .then(callEntity => callEntity.deleteParticipant(userId, clientId, terminationReason))
        .then(callEntity => {
          const fromSelf = userId === this.selfUserId();
          return callEntity.deactivateCall(callMessageEntity, fromSelf, terminationReason).then(wasDeleted => {
            if (!wasDeleted && fromSelf) {
              callEntity.state(z.calling.enum.CALL_STATE.REJECTED);
            }
          });
        })
        .catch(error => {
          const isNotFound = error.type === z.error.CallError.TYPE.NOT_FOUND;
          if (!isNotFound) {
            throw error;
          }
        });
    }
  }

  /**
   * Call group check message handling.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onGroupCheck(callMessageEntity, source) {
    this.getCallById(callMessageEntity.conversationId)
      .then(callEntity => callEntity.scheduleGroupCheck())
      .catch(error => this._validateIncomingCall(callMessageEntity, source, error));
  }

  /**
   * Call group leave message handling.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE
   * @param {z.calling.enum.TERMINATION_REASON} [terminationReason=z.calling.enum.TERMINATION_REASON.OTHER_USER] - Reason for participant to leave
   * @returns {undefined} No return value
   */
  _onGroupLeave(callMessageEntity, terminationReason = z.calling.enum.TERMINATION_REASON.OTHER_USER) {
    const {conversationId, clientId, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => {
        if (callEntity.isOutgoing()) {
          throw new z.error.CallError(z.error.CallError.TYPE.WRONG_SENDER, 'Remote user leaving outgoing call');
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
   * Call group setup message handling.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP
   * @returns {undefined} No return value
   */
  _onGroupSetup(callMessageEntity) {
    const {conversationId, response, userId} = callMessageEntity;

    // @todo Grant message for ongoing call
    this.getCallById(conversationId)
      .then(callEntity => this._validateMessageDestination(callEntity, callMessageEntity))
      .then(callEntity => {
        callEntity.setRemoteVersion(callMessageEntity);
        const shouldNegotiate = response !== true;
        return callEntity.addOrUpdateParticipant(userId, shouldNegotiate, callMessageEntity);
      })
      .catch(this._throwMessageError);
  }

  /**
   * Call group start message handling.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onGroupStart(callMessageEntity, source) {
    const {conversationId, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => {
        // @todo Grant message for ongoing call

        const isSelfUser = userId === this.selfUserId();
        if (isSelfUser) {
          return this._remoteSelfJoin(callEntity, callMessageEntity);
        }

        if (callEntity.isOutgoing()) {
          callEntity.state(z.calling.enum.CALL_STATE.CONNECTING);
        }

        // Add the correct participant, start negotiating
        const shouldNegotiate = callEntity.selfClientJoined();
        return callEntity.addOrUpdateParticipant(userId, shouldNegotiate, callMessageEntity);
      })
      .catch(error => this._validateIncomingCall(callMessageEntity, source, error));
  }

  /**
   * Call hangup message handling.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.HANGUP
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
        .then(callEntity => callEntity.participantLeft(callMessageEntity, terminationReason))
        .catch(this._throwMessageError);
    }
  }

  /**
   * Call prop-sync message handling.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
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
   * Call reject message handling.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.REJECT
   * @returns {undefined} No return value
   */
  _onReject(callMessageEntity) {
    const {conversationId, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => {
        const isSelfUser = userId !== this.selfUserId();
        if (!isSelfUser) {
          throw new z.error.CallError(z.error.CallError.TYPE.WRONG_SENDER, 'Call rejected by wrong user');
        }

        if (!callEntity.selfClientJoined()) {
          this.callLogger.info(`Rejecting call in conversation '${conversationId}'`, callEntity);
          callEntity.rejectCall(false);
        }
      })
      .catch(this._throwMessageError);
  }

  /**
   * Call setup message handling.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onSetup(callMessageEntity, source) {
    const {conversationId, response, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => {
        callEntity.setRemoteVersion(callMessageEntity);

        const isSelfUser = userId === this.selfUserId();
        if (isSelfUser) {
          return this._remoteSelfJoin(callEntity, callMessageEntity);
        }

        const shouldNegotiate = response !== true;
        return callEntity.addOrUpdateParticipant(userId, shouldNegotiate, callMessageEntity).then(() => {
          if (response) {
            callEntity.state(z.calling.enum.CALL_STATE.CONNECTING);
          }
        });
      })
      .catch(error => this._validateIncomingCall(callMessageEntity, source, error));
  }

  /**
   * Call setup message handling.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @returns {undefined} No return value
   */
  _onUpdate(callMessageEntity) {
    const {conversationId, userId} = callMessageEntity;

    this.getCallById(conversationId)
      .then(callEntity => this._validateMessageDestination(callEntity, callMessageEntity))
      .then(callEntity => callEntity.verifySessionId(callMessageEntity))
      .then(callEntity => callEntity.addOrUpdateParticipant(userId, false, callMessageEntity))
      .catch(this._throwMessageError);
  }

  /**
   * Handle remote self join message.
   *
   * @private
   * @param {z.calling.entities.CallEntity} callEntity - Call entity
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity from remote self client
   * @returns {Promise} Resolves when self join was handled
   */
  _remoteSelfJoin(callEntity, callMessageEntity) {
    const conversationEntity = callEntity.conversationEntity;

    if (callEntity.selfClientJoined()) {
      const logMessage = {
        data: {
          default: [conversationEntity.display_name()],
          obfuscated: [this.callLogger.obfuscate(conversationEntity.id)],
        },
        message: `Attempt to join ongoing call in conversation '{0}' from other device`,
      };

      this.callLogger.warn(logMessage, callEntity);
    } else {
      const logMessage = {
        data: {
          default: [conversationEntity.display_name()],
          obfuscated: [this.callLogger.obfuscate(conversationEntity.id)],
        },
        message: `Call in conversation '{0}' accepted on other device`,
      };
      this.callLogger.info(logMessage, callEntity);

      if (callEntity.isGroup) {
        callEntity.selfUserJoined(true);
        callEntity.wasConnected = true;
        return callEntity.rejectCall(false);
      }

      return this.deleteCall(conversationEntity.id);
    }
  }

  /**
   * Throw error is not expected types.
   *
   * @private
   * @param {z.error.CallError|Error} error - Error thrown during call message handling
   * @returns {undefined} No return value
   */
  _throwMessageError(error) {
    const expectedErrorTypes = [z.error.CallError.TYPE.MISTARGETED_MESSAGE, z.error.CallError.TYPE.NOT_FOUND];
    const isExpectedError = expectedErrorTypes.includes(error.type);

    if (!isExpectedError) {
      throw error;
    }
  }

  /**
   * Verify validity of incoming call.
   *
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to validate
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {z.error.CallError|Error} error - Error thrown during call message handling
   * @returns {undefined} No return value
   */
  _validateIncomingCall(callMessageEntity, source, error) {
    this._throwMessageError(error);

    const {conversationId, response, type, userId} = callMessageEntity;

    const isTypeGroupCheck = type === z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK;
    const isSelfUser = userId === this.selfUserId();
    const validMessage = response === isTypeGroupCheck;

    if (!isSelfUser && validMessage) {
      const eventFromStream = source === z.event.EventRepository.SOURCE.STREAM;
      const silentCall = isTypeGroupCheck || eventFromStream;
      const promises = [this._createIncomingCall(callMessageEntity, source, silentCall)];

      if (!eventFromStream) {
        const eventInfoEntity = new z.conversation.EventInfoEntity(undefined, conversationId, {recipients: [userId]});
        eventInfoEntity.setType(z.cryptography.GENERIC_MESSAGE_TYPE.CALLING);
        const consentType = z.conversation.ConversationRepository.CONSENT_TYPE.INCOMING_CALL;
        const grantPromise = this.conversationRepository.grantMessage(eventInfoEntity, consentType);

        promises.push(grantPromise);
      }

      Promise.all(promises)
        .then(([callEntity, grantedCall]) => {
          if (grantedCall) {
            const mediaType = callEntity.isRemoteVideoCall() ? z.media.MediaType.AUDIO_VIDEO : z.media.MediaType.AUDIO;
            this.joinCall(conversationId, mediaType);
          }
        })
        .catch(_error => {
          const isDegraded = _error.type === z.error.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION;
          if (!isDegraded) {
            throw _error;
          }

          this.rejectCall(conversationId);
        });
    }
  }

  /**
   * Validate that content of call message is targeted at local client.
   * @param {z.calling.entities.CallEntity} callEntity - Call the message belongs to
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to validate
   * @returns {CallEntity} Call entity if message is valid
   */
  _validateMessageDestination(callEntity, callMessageEntity) {
    if (callEntity.isGroup) {
      const {destinationClientId: clientId, destinationUserId: userId, type} = callMessageEntity;

      const isSelfUser = userId === this.selfUserId();
      const isCurrentClient = clientId === this.clientRepository.currentClient().id;
      const mistargetedMessage = !isSelfUser || !isCurrentClient;
      if (mistargetedMessage) {
        this.callLogger.log(`Ignored '${type}' call message for targeted at client '${clientId}' of user '${userId}'`);
        throw new z.error.CallError(z.error.CallError.TYPE.MISTARGETED_MESSAGE);
      }
    }

    return callEntity;
  }

  /**
   * Validate that type of call message matches conversation type.
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to validate
   * @returns {Promise} Resolves if the message is valid
   */
  _validateMessageType(callMessageEntity) {
    const {conversationId, type} = callMessageEntity;

    return this.conversationRepository.get_conversation_by_id(conversationId).then(conversationEntity => {
      if (conversationEntity.is1to1()) {
        const groupMessageTypes = [
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK,
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE,
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP,
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START,
        ];

        if (groupMessageTypes.includes(type)) {
          throw new z.error.CallError(z.error.CallError.TYPE.WRONG_CONVERSATION_TYPE);
        }
      } else if (conversationEntity.isGroup()) {
        const one2oneMessageTypes = [z.calling.enum.CALL_MESSAGE_TYPE.SETUP];

        if (one2oneMessageTypes.includes(type)) {
          throw new z.error.CallError(z.error.CallError.TYPE.WRONG_CONVERSATION_TYPE);
        }
      } else {
        throw new z.error.CallError(z.error.CallError.TYPE.WRONG_CONVERSATION_TYPE);
      }

      return conversationEntity;
    });
  }

  //##############################################################################
  // Outbound call events
  //##############################################################################

  /**
   * Send a call event.
   *
   * @param {z.entity.Conversation} conversationEntity - Conversation to send message in
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity
   * @returns {Promise} Resolves when the event has been sent
   */
  sendCallMessage(conversationEntity, callMessageEntity) {
    if (!_.isObject(callMessageEntity)) {
      throw new z.error.CallError(z.error.CallError.TYPE.WRONG_PAYLOAD_FORMAT);
    }

    const {conversationId, remoteUserId, response, type} = callMessageEntity;

    return this.getCallById(conversationId || conversationEntity.id)
      .then(callEntity => {
        if (!CallingRepository.CONFIG.DATA_CHANNEL_MESSAGE_TYPES.includes(type)) {
          throw new z.error.CallError(z.error.CallError.TYPE.NO_DATA_CHANNEL);
        }

        return callEntity.getParticipantById(remoteUserId);
      })
      .then(({flowEntity}) => flowEntity.sendMessage(callMessageEntity))
      .catch(error => {
        const expectedErrorTypes = [z.error.CallError.TYPE.NO_DATA_CHANNEL, z.error.CallError.TYPE.NOT_FOUND];
        const isExpectedError = expectedErrorTypes.includes(error.type);

        if (!isExpectedError) {
          throw error;
        }

        return this._limitMessageRecipients(callMessageEntity).then(({precondition, recipients}) => {
          const isTypeHangup = type === z.calling.enum.CALL_MESSAGE_TYPE.HANGUP;
          if (isTypeHangup) {
            if (response) {
              throw error;
            }

            callMessageEntity.type = z.calling.enum.CALL_MESSAGE_TYPE.CANCEL;
          }

          this._logMessage(true, callMessageEntity);

          const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
          const protoCalling = new z.proto.Calling(callMessageEntity.toContentString());
          genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.CALLING, protoCalling);

          const options = {precondition, recipients};
          const eventInfoEntity = new z.conversation.EventInfoEntity(genericMessage, conversationEntity.id, options);

          return this.conversationRepository.sendCallingMessage(eventInfoEntity, conversationEntity, callMessageEntity);
        });
      });
  }

  /**
   *
   * @private
   * @param {z.calling.entities.CallEntity} callEntity - Call entity
   * @param {z.calling.entities.CallMessageEntity} incomingCallMessageEntity - Incoming call message
   * @returns {Promise} Resolves with the call
   */
  _confirmCallMessage(callEntity, incomingCallMessageEntity) {
    const response = incomingCallMessageEntity.response;

    const skipConfirmation = response || !callEntity.selfClientJoined();
    return skipConfirmation
      ? Promise.resolve(callEntity)
      : callEntity
          .confirmMessage(incomingCallMessageEntity)
          .catch(error => {
            const isNotDataChannel = error.type === z.error.CallError.TYPE.NO_DATA_CHANNEL;
            if (!isNotDataChannel) {
              throw error;
            }
          })
          .then(() => callEntity);
  }

  /**
   * Limit the message recipients for a call message.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to target at clients
   * @returns {Promise} Resolves with the client user map and precondition option
   */
  _limitMessageRecipients(callMessageEntity) {
    const {remoteClientId, remoteUser, remoteUserId, response, type} = callMessageEntity;
    const recipientsPromise = remoteUserId
      ? this.userRepository.get_user_by_id(remoteUserId)
      : Promise.resolve(remoteUser);

    return recipientsPromise.then(remoteUserEntity => {
      const selfUserEntity = this.userRepository.self();
      let precondition;
      let recipients;

      switch (type) {
        case z.calling.enum.CALL_MESSAGE_TYPE.CANCEL: {
          if (response) {
            // Send to remote client that initiated call
            precondition = true;
            recipients = {
              [remoteUserEntity.id]: [`${remoteClientId}`],
            };
          } else {
            // Send to all clients of remote user
            precondition = [remoteUserEntity.id];
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
            precondition = true;
            recipients = {
              [remoteUserEntity.id]: [`${remoteClientId}`],
            };
          }
          break;
        }

        case z.calling.enum.CALL_MESSAGE_TYPE.REJECT: {
          // Send to all clients of self user
          precondition = [selfUserEntity.id];
          recipients = {
            [selfUserEntity.id]: selfUserEntity.devices().map(device => device.id),
          };
          break;
        }

        case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
          if (response) {
            // Send to remote client that initiated call and all clients of self user
            precondition = [selfUserEntity.id];
            recipients = {
              [remoteUserEntity.id]: [`${remoteClientId}`],
              [selfUserEntity.id]: selfUserEntity.devices().map(device => device.id),
            };
          } else {
            // Send to all clients of remote user
            precondition = [remoteUserEntity.id];
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

      return {precondition, recipients};
    });
  }

  //##############################################################################
  // Call actions
  //##############################################################################

  /**
   * Delete a call.
   * @param {string} conversationId - ID of conversation to delete call from
   * @returns {undefined} No return value
   */
  deleteCall(conversationId) {
    this.getCallById(conversationId)
      .then(callEntity => this._deleteCall(callEntity))
      .catch(error => this._handleNotFoundError(error));
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
      .then(callEntity => ({callEntity, callState: callEntity.state()}))
      .catch(error => {
        this._handleNotFoundError(error);
        return {callState: z.calling.enum.CALL_STATE.OUTGOING};
      })
      .then(({callEntity, callState}) => this._joinCall(conversationId, mediaType, callState, callEntity))
      .catch(error => this._handleJoinCallError(error, conversationId));
  }

  /**
   * User action to leave a call.
   *
   * @param {string} conversationId - ID of conversation to leave call in
   * @param {z.calling.enum.TERMINATION_REASON} terminationReason - Reason for call termination
   * @returns {undefined} No return value
   */
  leaveCall(conversationId, terminationReason) {
    this.getCallById(conversationId)
      .then(callEntity => {
        const leftConversation = terminationReason === z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE;
        return leftConversation ? this._deleteCall(callEntity) : this._leaveCall(callEntity, terminationReason);
      })
      .catch(error => this._handleNotFoundError(error));
  }

  /**
   * Remove a participant from a call if he was removed from the group.
   *
   * @param {string} conversationId - ID of conversation
   * @param {string} userId - ID of user to be removed
   * @returns {undefined} No return value
   */
  removeParticipant(conversationId, userId) {
    this.getCallById(conversationId)
      .then(callEntity => this._removeParticipant(callEntity, userId))
      .catch(error => this._handleNotFoundError(error));
  }

  /**
   * User action to reject incoming call.
   * @param {string} conversationId - ID of conversation to ignore call in
   * @param {boolean} shareRejection - Send rejection to other clients
   * @returns {undefined} No return value
   */
  rejectCall(conversationId, shareRejection = true) {
    this.getCallById(conversationId)
      .then(callEntity => this._rejectCall(callEntity, shareRejection))
      .catch(error => this._handleNotFoundError(error));
  }

  /**
   * User action to toggle one of the media states of a call.
   *
   * @param {string} conversationId - ID of conversation with call
   * @param {z.media.MediaType} mediaType - MediaType of requested change
   * @returns {undefined} No return value
   */
  toggleMedia(conversationId, mediaType) {
    return this.getCallById(conversationId)
      .then(callEntity => this._toggleMediaState(mediaType).then(() => callEntity))
      .then(callEntity => callEntity.toggleMedia(mediaType))
      .catch(error => {
        const isNotFound = error.type === z.error.CallError.TYPE.NOT_FOUND;
        if (!isNotFound) {
          if (mediaType === z.media.MediaType.VIDEO || mediaType === z.media.MediaType.AUDIO_VIDEO) {
            this.mediaRepository.showNoCameraModal();
          }
          this.callLogger.error(`Failed to toggle media of type '${mediaType}'`, error);
        }
      });
  }

  /**
   * User action to toggle the call state.
   *
   * @param {z.media.MediaType} mediaType - Media type of call
   * @param {Conversation} [conversationEntity=this.conversationRepository.active_conversation()] - Conversation for which state will be toggled
   * @returns {undefined} No return value
   */
  toggleState(mediaType, conversationEntity = this.conversationRepository.active_conversation()) {
    if (conversationEntity) {
      const isActiveCall = conversationEntity.id === this._selfClientOnACall();
      return isActiveCall
        ? this.leaveCall(conversationEntity.id, z.calling.enum.TERMINATION_REASON.SELF_USER)
        : this.joinCall(conversationEntity.id, mediaType);
    }
  }

  /**
   * Check whether conversation supports calling.
   *
   * @private
   * @param {string} conversationId - ID of conversation to join call in
   * @param {z.media.MediaType} mediaType - Media type for this call
   * @param {z.calling.enum.CALL_STATE} callState - Current state of call
   * @returns {Promise} Resolves when conversation supports calling
   */
  _checkCallingSupport(conversationId, mediaType, callState) {
    return this.conversationRepository.get_conversation_by_id(conversationId).then(conversationEntity => {
      const noConversationParticipants = !conversationEntity.participating_user_ids().length;
      if (noConversationParticipants) {
        this._showModal(z.string.modalCallEmptyConversationHeadline, z.string.modalCallEmptyConversationMessage);
        throw new z.error.CallError(z.error.CallError.TYPE.NOT_SUPPORTED);
      }

      const isOutgoingCall = callState === z.calling.enum.CALL_STATE.OUTGOING;
      if (isOutgoingCall && !z.calling.CallingRepository.supportsCalling) {
        amplify.publish(z.event.WebApp.WARNING.SHOW, z.viewModel.WarningsViewModel.TYPE.UNSUPPORTED_OUTGOING_CALL);
        throw new z.error.CallError(z.error.CallError.TYPE.NOT_SUPPORTED);
      }

      const isVideoCall = mediaType === z.media.MediaType.AUDIO_VIDEO;
      if (isVideoCall && !conversationEntity.supportsVideoCall(isOutgoingCall)) {
        this._showModal(z.string.modalCallNoGroupVideoHeadline, z.string.modalCallNoGroupVideoMessage);
        throw new z.error.CallError(z.error.CallError.TYPE.NOT_SUPPORTED);
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

      if (!ongoingCallId) {
        resolve();
      } else {
        let actionStringId;
        let messageStringId;
        let titleStringId;

        switch (callState) {
          case z.calling.enum.CALL_STATE.INCOMING:
          case z.calling.enum.CALL_STATE.REJECTED: {
            actionStringId = z.string.modalCallSecondIncomingAction;
            messageStringId = z.string.modalCallSecondIncomingMessage;
            titleStringId = z.string.modalCallSecondIncomingHeadline;
            break;
          }

          case z.calling.enum.CALL_STATE.ONGOING: {
            actionStringId = z.string.modalCallSecondOngoingAction;
            messageStringId = z.string.modalCallSecondOngoingMessage;
            titleStringId = z.string.modalCallSecondOngoingHeadline;
            break;
          }

          case z.calling.enum.CALL_STATE.OUTGOING: {
            actionStringId = z.string.modalCallSecondOutgoingAction;
            messageStringId = z.string.modalCallSecondOutgoingMessage;
            titleStringId = z.string.modalCallSecondOutgoingHeadline;
            break;
          }

          default: {
            this.callLogger.error(`Tried to join second call in unexpected state '${callState}'`);
            throw new z.error.CallError(z.error.CallError.TYPE.WRONG_STATE);
          }
        }

        amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
          action: () => {
            const terminationReason = z.calling.enum.TERMINATION_REASON.CONCURRENT_CALL;
            amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, ongoingCallId, terminationReason);
            window.setTimeout(resolve, z.util.TimeUtil.UNITS_IN_MILLIS.SECOND);
          },
          close: () => {
            const isIncomingCall = callState === z.calling.enum.CALL_STATE.INCOMING;
            if (isIncomingCall) {
              amplify.publish(z.event.WebApp.CALL.STATE.REJECT, newCallId);
            }
          },
          text: {
            action: z.l10n.text(actionStringId),
            message: z.l10n.text(messageStringId),
            title: z.l10n.text(titleStringId),
          },
        });
        this.callLogger.warn(`You cannot join a second call while calling in conversation '${ongoingCallId}'.`);
      }
    });
  }

  /**
   * Delete a call.
   *
   * @private
   * @param {CallEntity} callEntity - Call to delete
   * @returns {undefined} No return value
   */
  _deleteCall(callEntity) {
    const conversationId = callEntity.id;
    this.callLogger.info(`Deleting call in conversation '${conversationId}'`, callEntity);

    callEntity.deleteCall();
    this.calls.remove(call => call.id === conversationId);
    this.mediaStreamHandler.resetMediaStream();
  }

  /**
   * Handle join call errors.
   *
   * @private
   * @param {Error} error - Error to handle
   * @param {string} conversationId - Id of conversation
   * @returns {undefined} No return value
   */
  _handleJoinCallError(error, conversationId) {
    const isNotSupported = error.type === z.error.CallError.TYPE.NOT_SUPPORTED;
    if (!isNotSupported) {
      this.deleteCall(conversationId);
      const isMediaError = error instanceof z.error.MediaError;
      if (!isMediaError) {
        throw error;
      }
    }
  }

  /**
   * Handle not found error.
   *
   * @private
   * @param {Error} error - Error to handle
   * @returns {undefined} No return value
   */
  _handleNotFoundError(error) {
    const isNotFound = error.type === z.error.CallError.TYPE.NOT_FOUND;
    if (!isNotFound) {
      throw error;
    }
  }

  /**
   * Handle error when joining a call.
   *
   * @private
   * @param {string} conversationId - ID of call where joining failed
   * @param {boolean} isOutgoingCall - Was outgoing call
   * @param {Error} joinError - Error that occured
   * @returns {undefined} No return value
   */
  _handleJoinError(conversationId, isOutgoingCall, joinError) {
    this.getCallById(conversationId)
      .then(callEntity => {
        callEntity.setSelfState(false);

        const logMessage = `Failed to join call in '${callEntity.state()}' conversation '${conversationId}'`;
        this.callLogger.warn(logMessage, joinError);

        const accessErrors = [
          z.error.MediaError.TYPE.MEDIA_STREAM_DEVICE,
          z.error.MediaError.TYPE.MEDIA_STREAM_PERMISSION,
        ];
        const isAccessError = accessErrors.includes(joinError.type);
        if (isAccessError) {
          this.mediaRepository.showNoCameraModal();
        }

        return isOutgoingCall ? this._deleteCall(callEntity) : this._rejectCall(callEntity, true);
      })
      .catch(error => this._handleNotFoundError(error));
  }

  /**
   * Actively join a call.
   *
   * @private
   * @param {CallEntity} callEntity - Call to be joined
   * @param {z.media.MediaType} mediaType - Media type of the call
   * @returns {undefined} No return value
   */
  _initiateJoinCall(callEntity, mediaType) {
    callEntity.timings.time_step(z.telemetry.calling.CallSetupSteps.STREAM_RECEIVED);
    callEntity.joinCall(mediaType);
  }

  /**
   * Initiate an outgoing call.
   *
   * @private
   * @param {string} conversationId - ID of conversation to join call in
   * @param {z.media.MediaType} mediaType - Media type for this call
   * @param {z.calling.enum.CALL_STATE} callState - State of call
   * @returns {Promise} Resolves with a call entity
   */
  _initiateOutgoingCall(conversationId, mediaType, callState) {
    const videoSend = mediaType === z.media.MediaType.AUDIO_VIDEO;
    const payload = {conversationId};
    const messagePayload = z.calling.CallMessageBuilder.createPropSync(this.selfStreamState, payload, videoSend);
    const callMessageEntity = z.calling.CallMessageBuilder.buildPropSync(false, undefined, messagePayload);
    return this._createOutgoingCall(callMessageEntity);
  }

  /**
   * Prepare to join a call.
   *
   * @private
   * @param {CallEntity} callEntity - Call to be joined
   * @returns {undefined} No return value
   */
  _initiatePreJoinCall(callEntity) {
    this.callLogger.info(`Joining call in conversation '${callEntity.id}'`, callEntity);
    callEntity.setSelfState(true);
    return callEntity;
  }

  /**
   * Initiate media stream for call.
   *
   * @private
   * @param {CallEntity} callEntity - Call to be joined
   * @param {z.media.MediaType} mediaType - Media type for this call
   * @returns {Promise} Resolves with the call entity
   */
  _initiateMediaStream(callEntity, mediaType) {
    return this.mediaStreamHandler.localMediaStream()
      ? Promise.resolve(callEntity)
      : this.mediaStreamHandler
          .initiateMediaStream(callEntity.id, mediaType, callEntity.isGroup)
          .then(() => callEntity);
  }

  /**
   * Join a call.
   *
   * @private
   * @param {string} conversationId - ID of conversation to join call in
   * @param {z.media.MediaType} mediaType - Media type of the call
   * @param {z.calling.enum.CALL_STATE} callState - State of call
   * @param {CallEntity} [callEntity] - Retrieved call entity
   * @returns {undefined} No return value
   */
  _joinCall(conversationId, mediaType, callState, callEntity) {
    this._checkCallingSupport(conversationId, mediaType, callState)
      .then(() => this._checkConcurrentJoinedCall(conversationId, callState))
      .then(() => callEntity || this._initiateOutgoingCall(conversationId, mediaType, callState))
      .then(callEntityToJoin => this._initiatePreJoinCall(callEntityToJoin))
      .then(callEntityToJoin => this._initiateMediaStream(callEntityToJoin, mediaType))
      .then(callEntityToJoin => this._initiateJoinCall(callEntityToJoin, mediaType))
      .catch(error => this._handleJoinError(conversationId, !callEntity, error));
  }

  /**
   * Leave a call.
   *
   * @private
   * @param {CallEntity} callEntity - Call to leave
   * @param {z.calling.enum.TERMINATION_REASON} terminationReason - Reason for call termination
   * @returns {undefined} No return value
   */
  _leaveCall(callEntity, terminationReason) {
    const conversationId = callEntity.id;
    const logMessage = `Leaving call in conversation '${conversationId}' triggered by '${terminationReason}'`;
    this.callLogger.info(logMessage, callEntity);

    if (!callEntity.isOngoing()) {
      terminationReason = undefined;
    }

    this.mediaStreamHandler.releaseMediaStream();
    callEntity.leaveCall(terminationReason);
  }

  /**
   * Reject a call.
   *
   * @private
   * @param {CallEntity} callEntity - Call entity to ignore
   * @param {boolean} shareRejection - Share rejection with other clients
   * @returns {undefined} No return value
   */
  _rejectCall(callEntity, shareRejection) {
    this.callLogger.info(`Rejecting call in conversation '${callEntity.id}'`, callEntity);
    callEntity.rejectCall(shareRejection);
  }

  /**
   * Remove a participant from a call.
   *
   * @private
   * @param {CallEntity} callEntity - Call entity
   * @param {string} userId - ID of user to be removed
   * @returns {Promise} Resolves when the participant was found
   */
  _removeParticipant(callEntity, userId) {
    return callEntity.getParticipantById(userId).then(() => {
      const {id, sessionId} = callEntity;
      const additionalPayload = z.calling.CallMessageBuilder.createPayload(id, this.selfUserId(), userId);
      const callMessageEntity = z.calling.CallMessageBuilder.buildGroupLeave(false, sessionId, additionalPayload);

      this._onGroupLeave(callMessageEntity, z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE);
    });
  }

  /**
   * Show acknowledgement warning modal.
   *
   * @private
   * @param {string} titleStringId - String ID for modal title
   * @param {string} messageStringId - String ID for modal message
   * @returns {undefined} No return value
   */
  _showModal(titleStringId, messageStringId) {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        message: z.l10n.text(messageStringId),
        title: z.l10n.text(titleStringId),
      },
    });
  }

  /**
   * Toggle media state of a call.
   *
   * @param {z.media.MediaType} mediaType - MediaType of requested change
   * @returns {undefined} No return value
   */
  _toggleMediaState(mediaType) {
    switch (mediaType) {
      case z.media.MediaType.AUDIO: {
        return this.mediaStreamHandler.toggleAudioSend();
      }

      case z.media.MediaType.SCREEN: {
        return this.mediaStreamHandler.toggleScreenSend();
      }

      case z.media.MediaType.VIDEO: {
        return this.mediaStreamHandler.toggleVideoSend();
      }

      default: {
        throw new z.error.MediaError(z.error.MediaError.TYPE.UNHANDLED_MEDIA_TYPE);
      }
    }
  }

  //##############################################################################
  // call entity creation
  //##############################################################################

  /**
   * Constructs a call entity.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.entity.User} creatingUserEntity - User that created call
   * @param {z.calling.enum.CALL_STATE} direction - direction of the call (outgoing or incoming)
   * @returns {Promise} Resolves with the new call entity
   */
  _createCall(callMessageEntity, creatingUserEntity, direction) {
    const {conversationId, sessionId, properties} = callMessageEntity;
    const mediaType = this._getMediaTypeFromProperties(properties);

    return this.getCallById(conversationId).catch(() => {
      return this.conversationRepository.get_conversation_by_id(conversationId).then(conversationEntity => {
        const callEntity = new z.calling.entities.CallEntity(conversationEntity, creatingUserEntity, sessionId, this);

        callEntity.initiateTelemetry(direction, mediaType);
        this.calls.push(callEntity);
        return callEntity;
      });
    });
  }

  /**
   * Constructs an incoming call entity.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {boolean} [silent=false] - Start call in rejected mode
   * @returns {Promise} Resolves with the new call entity
   */
  _createIncomingCall(callMessageEntity, source, silent = false) {
    const {conversationId, properties, userId} = callMessageEntity;

    return this.userRepository
      .get_user_by_id(userId)
      .then(remoteUserEntity => {
        return this._createCall(callMessageEntity, remoteUserEntity, z.calling.enum.CALL_STATE.INCOMING);
      })
      .then(callEntity => {
        const mediaType = this._getMediaTypeFromProperties(properties);
        const conversationName = callEntity.conversationEntity.display_name();

        const logMessage = {
          data: {
            default: [mediaType, conversationName],
            obfuscated: [mediaType, this.callLogger.obfuscate(conversationId)],
          },
          message: `Incoming '{0}' call in conversation '{1}'`,
        };
        this.callLogger.info(logMessage, callEntity);

        callEntity.setRemoteVersion(callMessageEntity);

        if (!callEntity.conversationEntity.showNotificationsEverything()) {
          silent = true;
        }

        const callState = silent ? z.calling.enum.CALL_STATE.REJECTED : z.calling.enum.CALL_STATE.INCOMING;
        callEntity.state(callState);

        return callEntity.addOrUpdateParticipant(userId, false, callMessageEntity).then(() => {
          this.telemetry.track_event(z.tracking.EventName.CALLING.RECEIVED_CALL, callEntity);
          this.injectActivateEvent(callMessageEntity, source);

          const eventFromWebSocket = source === z.event.EventRepository.SOURCE.WEB_SOCKET;
          const hasOtherCalls = this.calls().some(call => call.id !== callEntity.id);
          const hasCallWithoutVideo = hasOtherCalls && !this.mediaStreamHandler.selfStreamState.videoSend();

          if (eventFromWebSocket && callEntity.isRemoteVideoSend() && !hasCallWithoutVideo) {
            const mediaStreamType = z.media.MediaType.AUDIO_VIDEO;
            this.mediaStreamHandler.initiateMediaStream(callEntity.id, mediaStreamType, callEntity.isGroup);
          }

          return callEntity;
        });
      })
      .catch(error => {
        this.deleteCall(conversationId);

        const isMediaError = error instanceof z.error.MediaError;
        if (!isMediaError) {
          throw error;
        }
      });
  }

  /**
   * Constructs an outgoing call entity.
   *
   * @private
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC
   * @returns {Promise} Resolves with the new call entity
   */
  _createOutgoingCall(callMessageEntity) {
    const properties = callMessageEntity.properties;

    const direction = z.calling.enum.CALL_STATE.OUTGOING;
    return this._createCall(callMessageEntity, this.userRepository.self(), direction).then(callEntity => {
      const mediaType = this._getMediaTypeFromProperties(properties);
      const conversationName = callEntity.conversationEntity.display_name();
      const conversationId = callEntity.conversationEntity.id;

      const logMessage = {
        data: {
          default: [mediaType, conversationName],
          obfuscated: [mediaType, this.callLogger.obfuscate(conversationId)],
        },
        message: `Outgoing '{0}' call in conversation '{1}'`,
      };
      this.callLogger.info(logMessage, callEntity);

      callEntity.state(z.calling.enum.CALL_STATE.OUTGOING);

      this.telemetry.track_event(z.tracking.EventName.CALLING.INITIATED_CALL, callEntity);
      return callEntity;
    });
  }

  //##############################################################################
  // Notifications
  //##############################################################################

  /**
   * Inject a call activate event.
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to create event from
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  injectActivateEvent(callMessageEntity, source) {
    const event = z.conversation.EventBuilder.buildVoiceChannelActivate(callMessageEntity);
    this.eventRepository.injectEvent(event, source);
  }

  /**
   * Inject a call deactivate event.
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to create event from
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {z.calling.enum.TERMINATION_REASON} [reason] - Reason for call to end
   * @returns {undefined} No return value
   */
  injectDeactivateEvent(callMessageEntity, source, reason) {
    const currentTimestamp = this.serverTimeRepository.toServerTimestamp();
    const event = z.conversation.EventBuilder.buildVoiceChannelDeactivate(callMessageEntity, reason, currentTimestamp);
    this.eventRepository.injectEvent(event, source);
  }

  //##############################################################################
  // Helper functions
  //##############################################################################

  /**
   * Get a call entity for a given conversation ID.
   * @param {string} conversationId - ID of Conversation of requested call
   * @returns {Promise} Resolves with the call entity for conversation ID
   */
  getCallById(conversationId) {
    if (!conversationId) {
      return Promise.reject(new z.error.CallError(z.error.CallError.TYPE.NO_CONVERSATION_ID));
    }

    for (const callEntity of this.calls()) {
      const isExpectedId = callEntity.id === conversationId;
      if (isExpectedId) {
        return Promise.resolve(callEntity);
      }
    }

    return Promise.reject(new z.error.CallError(z.error.CallError.TYPE.NOT_FOUND));
  }

  /**
   * Leave a call we are joined immediately in case the browser window is closed.
   * @note Should only used by "window.onbeforeunload".
   * @returns {undefined} No return value
   */
  leaveCallOnUnload() {
    const conversationId = this._selfClientOnACall();

    if (conversationId) {
      this.leaveCall(conversationId, z.calling.enum.TERMINATION_REASON.PAGE_NAVIGATION);
    }
  }

  /**
   * Get the MediaType from given call event properties.
   * @param {Object} properties - call event properties
   * @returns {z.media.MediaType} MediaType of call
   */
  _getMediaTypeFromProperties(properties) {
    const isVideoSend = properties && properties.videosend === z.calling.enum.PROPERTY_STATE.TRUE;
    const isScreenSend = properties && properties.screensend === z.calling.enum.PROPERTY_STATE.TRUE;
    const isTypeVideo = isVideoSend || isScreenSend;
    return isTypeVideo ? z.media.MediaType.VIDEO : z.media.MediaType.AUDIO;
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
        this.callLogger.debug('Returning local calling configuration. No update needed.', this.callingConfig);
        return Promise.resolve(this.callingConfig);
      }

      this._clearConfig();
    }

    return this._getConfigFromBackend();
  }

  _clearConfig() {
    if (this.callingConfig) {
      const expirationDate = this.callingConfig.expiration.toISOString();
      this.callLogger.debug(`Removing calling configuration with expiration of '${expirationDate}'`);
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
    const limit = z.util.Environment.browser.firefox ? CallingRepository.CONFIG.MAX_FIREFOX_TURN_COUNT : undefined;

    return this.callingService.getConfig(limit).then(callingConfig => {
      if (callingConfig) {
        this._clearConfigTimeout();

        const DEFAULT_CONFIG_TTL = CallingRepository.CONFIG.DEFAULT_CONFIG_TTL;
        const ttl = callingConfig.ttl * 0.9 || DEFAULT_CONFIG_TTL;
        const timeout = Math.min(ttl, DEFAULT_CONFIG_TTL) * z.util.TimeUtil.UNITS_IN_MILLIS.SECOND;
        const expirationDate = new Date(Date.now() + timeout);
        callingConfig.expiration = expirationDate;

        const turnServersConfig = (callingConfig.ice_servers || []).map(server => server.urls.join('\n')).join('\n');
        const logMessage = `Updated calling configuration expires on '${expirationDate.toISOString()}' with servers:
${turnServersConfig}`;
        this.callLogger.info(logMessage);
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
    this.callLogger.force_log(`Call message log contains '${this.messageLog.length}' events`, this.messageLog);
    this.messageLog.forEach(logMessage => this.callLogger.force_log(logMessage));
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
          if (!callEntity.isEndedState()) {
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

        this.callLogger.warn('Could not find flows to report for call analysis');
      });
  }

  /**
   * Set logging on adapter.js.
   * @returns {undefined} No return value
   */
  _enableDebugging() {
    adapter.disableLog = false;
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
   * @param {z.calling.entities.CallMessageEntity} callMessageEntity - Call message to be logged in the sequence
   * @param {string} [date] - Date of message as ISO string
   * @returns {undefined} No return value
   */
  _logMessage(isOutgoing, callMessageEntity, date = new Date().toISOString()) {
    const {conversationId, destinationUserId, remoteUserId, response, type, userId} = callMessageEntity;

    let log;
    const target = `conversation '${conversationId}'`;
    if (isOutgoing) {
      const additionalMessage = remoteUserId ? `user '${remoteUserId}' in ${target}` : `${target}`;
      log = `Sending '${type}' message (response: ${response}) to ${additionalMessage}`;
    } else {
      const isSelfUser = destinationUserId === this.selfUserId();
      if (destinationUserId && !isSelfUser) {
        return;
      }

      log = `Received '${type}' message (response: ${response}) from user '${userId}' in ${target}`;
    }

    if (callMessageEntity.properties) {
      log = log.concat(`: ${JSON.stringify(callMessageEntity.properties)}`);
    }

    this.callLogger.info(log, callMessageEntity);
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
    this.callLogger.debug(`Reported status of flow id '${customData.meta.flowId}' for call analysis`, customData);
  }
};
