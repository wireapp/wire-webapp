/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
    this.mediaDevicesHandler = this.mediaRepository.devicesHandler;
    this.mediaStreamHandler = this.mediaRepository.streamHandler;
    this.mediaElementHandler = this.mediaRepository.element_handler;
    this.remoteMediaStreams = this.mediaRepository.streamHandler.remoteMediaStreams;
    this.selfStreamState = this.mediaRepository.streamHandler.selfStreamState;

    this.selfState = this.mediaStreamHandler.selfStreamState;

    this.calls = ko.observableArray([]);
    this.joinedCall = ko.pureComputed(() => {
      for (const callEt of this.calls()) {
        if (callEt.selfClientJoined()) {
          return callEt;
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
    this.mediaRepository.streamHandler.calls = this.calls;
    this.mediaRepository.streamHandler.joinedCall = this.joinedCall;
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

    this.logger.info(`»» Call Event: '${eventType}' (Source: ${source})`, {
      eventJson: JSON.stringify(event),
      eventObject: event,
    });

    if (isCall) {
      const isSupportedVersion = eventContent.version === z.calling.entities.CallMessage.CONFIG.VERSION;
      if (!isSupportedVersion) {
        throw new z.calling.CallError(z.calling.CallError.TYPE.UNSUPPORTED_VERSION);
      }

      const callMessageEt = z.calling.CallMessageMapper.mapEvent(event);
      this.logMessage(false, callMessageEt, eventDate);

      this.validateMessageType(callMessageEt)
        .then(conversationEt => {
          const isBackendTimestamp = source !== z.event.EventRepository.SOURCE.INJECTED;
          conversationEt.updateTimestampServer(callMessageEt.time, isBackendTimestamp);
        })
        .then(() => {
          if (z.calling.CallingRepository.supportsCalling) {
            return this.onCallEventInSupportedBrowsers(callMessageEt, source);
          }
          this.onCallEventInUnsupportedBrowsers(callMessageEt, source);
        });
    }
  }

  /**
   * Call event handling for browsers supporting calling.
   *
   * @private
   * @param {CallMessage} callMessageEt - Mapped incoming call message entity
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  onCallEventInSupportedBrowsers(callMessageEt, source) {
    const messageType = callMessageEt.type;

    switch (messageType) {
      case z.calling.enum.CALL_MESSAGE_TYPE.CANCEL:
        this.onCancel(callMessageEt, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK:
        this.onGroupCheck(callMessageEt, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE:
        this.onGroupLeave(callMessageEt);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP:
        this.onGroupSetup(callMessageEt);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START:
        this.onGroupStart(callMessageEt, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.HANGUP:
        this.onHangup(callMessageEt);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC:
        this.onPropSync(callMessageEt);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.REJECT:
        this.onReject(callMessageEt);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.SETUP:
        this.onSetup(callMessageEt, source);
        break;
      case z.calling.enum.CALL_MESSAGE_TYPE.UPDATE:
        this.onUpdate(callMessageEt);
        break;
      default:
        this.logger.warn(`Call event of unknown type '${messageType}' was ignored`, callMessageEt);
    }
  }

  /**
   * Call event handling for browsers not supporting calling.
   *
   * @private
   * @param {CallMessage} callMessageEt - Mapped incoming call message entity
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  onCallEventInUnsupportedBrowsers(callMessageEt, source) {
    const {conversationId, response, type, userId} = callMessageEt;

    if (!response) {
      switch (type) {
        case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
          this.injectActivateEvent(callMessageEt, source);
          this.userRepository.getUserById(userId).then(userEt => {
            amplify.publish(z.event.WebApp.WARNING.SHOW, z.ViewModel.WarningType.UNSUPPORTED_INCOMING_CALL, {
              callId: conversationId,
              firstName: userEt.name(),
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
   * @param {CallMessage} callMessageEt - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.CANCEL
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  onCancel(callMessageEt, source) {
    const {clientId, conversationId, response, userId} = callMessageEt;

    if (!response) {
      this.getCallById(conversationId)
        .then(callEt => callEt.verifySessionId(callMessageEt))
        .then(callEt => callEt.deleteParticipant(userId, clientId, z.calling.enum.TERMINATION_REASON.OTHER_USER))
        .then(callEt => callEt.deactivateCall(callMessageEt, z.calling.enum.TERMINATION_REASON.OTHER_USER))
        .catch(error => {
          if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
            this.injectDeactivateEvent(callMessageEt, source);
            throw error;
          }
        });
    }
  }

  /**
   * call group check message handling.
   *
   * @private
   * @param {CallMessage} callMessageEt - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  onGroupCheck(callMessageEt, source) {
    this.getCallById(callMessageEt.conversationId)
      .then(callEt => callEt.scheduleGroupCheck())
      .catch(error => this.validateIncomingCall(callMessageEt, source, error));
  }

  /**
   * call group leave message handling.
   *
   * @private
   * @param {CallMessage} callMessageEt - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE
   * @param {z.calling.enum.TERMINATION_REASON} [terminationReason=z.calling.enum.TERMINATION_REASON.OTHER_USER] - Reason for participant to leave
   * @returns {undefined} No return value
   */
  onGroupLeave(callMessageEt, terminationReason = z.calling.enum.TERMINATION_REASON.OTHER_USER) {
    const {conversationId, clientId, userId} = callMessageEt;

    this.getCallById(conversationId)
      .then(callEt => {
        const isOutgoing = callEt.state() === z.calling.enum.CALL_STATE.OUTGOING;
        if (isOutgoing) {
          throw new z.calling.CallError(
            z.calling.CallError.TYPE.WRONG_SENDER,
            'Remote user tried to leave outgoing call'
          );
        }

        const isSelfUser = userId === this.selfUserId();
        if (isSelfUser) {
          callEt.selfUserJoined(false);
          return callEt;
        }

        return callEt.deleteParticipant(userId, clientId, terminationReason);
      })
      .then(callEt => callEt.participantLeft(callMessageEt, terminationReason))
      .catch(this.throwMessageError);
  }

  /**
   * call group setup message handling.
   *
   * @private
   * @param {CallMessage} callMessageEt - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP
   * @returns {undefined} No return value
   */
  onGroupSetup(callMessageEt) {
    const {conversationId, response, userId} = callMessageEt;

    this.getCallById(conversationId)
      .then(callEt => {
        // @todo Grant message for ongoing call

        this.validateMessageDestination(callEt, callMessageEt);
        callEt.setRemoteVersion(callMessageEt);
        callEt.addOrUpdateParticipant(userId, response !== true, callMessageEt);
      })
      .catch(this.throwMessageError);
  }

  /**
   * call group start message handling.
   *
   * @private
   * @param {CallMessage} callMessageEt - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  onGroupStart(callMessageEt, source) {
    const {conversationId, userId} = callMessageEt;

    this.getCallById(conversationId)
      .then(callEt => {
        // @todo Grant message for ongoing call

        const isSelfUser = userId === this.selfUserId();
        if (isSelfUser && !callEt.selfClientJoined()) {
          callEt.selfUserJoined(true);
          callEt.wasConnected = true;
          return callEt.state(z.calling.enum.CALL_STATE.REJECTED);
        }

        if (callEt.state() === z.calling.enum.CALL_STATE.OUTGOING) {
          callEt.state(z.calling.enum.CALL_STATE.CONNECTING);
        }

        // Add the correct participant, start negotiating
        callEt.addOrUpdateParticipant(userId, callEt.selfClientJoined(), callMessageEt);
      })
      .catch(error => this.validateIncomingCall(callMessageEt, source, error));
  }

  /**
   * call hangup message handling.
   *
   * @private
   * @param {CallMessage} callMessageEt - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.HANGUP
   * @param {z.calling.enum.TERMINATION_REASON} terminationReason - Reason for the participant to hangup
   * @returns {undefined} No return value
   */
  onHangup(callMessageEt, terminationReason = z.calling.enum.TERMINATION_REASON.OTHER_USER) {
    const {conversationId, clientId, response, userId} = callMessageEt;

    if (!response) {
      this.getCallById(conversationId)
        .then(callEt => callEt.verifySessionId(callMessageEt))
        .then(callEt => this.confirmCallMessage(callEt, callMessageEt))
        .then(callEt => callEt.deleteParticipant(userId, clientId, terminationReason))
        .then(callEt => {
          if (!callEt.isGroup) {
            callEt.deactivateCall(callMessageEt, terminationReason);
          }
        })
        .catch(this.throwMessageError);
    }
  }

  /**
   * call prop-sync message handling.
   *
   * @private
   * @param {CallMessage} callMessageEt - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @returns {undefined} No return value
   */
  onPropSync(callMessageEt) {
    const {conversationId, userId} = callMessageEt;

    this.getCallById(conversationId)
      .then(callEt => callEt.verifySessionId(callMessageEt))
      .then(callEt => this.confirmCallMessage(callEt, callMessageEt))
      .then(callEt => callEt.addOrUpdateParticipant(userId, false, callMessageEt))
      .catch(this.throwMessageError);
  }

  /**
   * call reject message handling.
   *
   * @private
   * @param {CallMessage} callMessageEt - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.REJECT
   * @returns {undefined} No return value
   */
  onReject(callMessageEt) {
    const {conversationId, userId} = callMessageEt;

    this.getCallById(conversationId)
      .then(callEt => {
        const isSelfUser = userId !== this.selfUserId();
        if (!isSelfUser) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_SENDER, 'Call rejected by wrong user');
        }

        if (!callEt.selfClientJoined()) {
          this.logger.info(`Rejecting call in conversation '${conversationId}'`, callEt);
          callEt.state(z.calling.enum.CALL_STATE.REJECTED);
          this.mediaStreamHandler.resetMediaStream();
        }
      })
      .catch(this.throwMessageError);
  }

  /**
   * call setup message handling.
   *
   * @private
   * @param {CallMessage} callMessageEt - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  onSetup(callMessageEt, source) {
    const {conversationId, response, userId} = callMessageEt;

    this.getCallById(conversationId)
      .then(callEt => {
        callEt.setRemoteVersion(callMessageEt);

        if (response && userId === this.selfUserId()) {
          const conversationName = callEt.conversationEt.displayName();
          this.logger.info(`Incoming call in conversation '${conversationName}' accepted on other device`);
          return this.deleteCall(conversationId);
        }

        return callEt.addOrUpdateParticipant(userId, response !== true, callMessageEt).then(() => {
          if (response) {
            callEt.state(z.calling.enum.CALL_STATE.CONNECTING);
          }
        });
      })
      .catch(error => this.validateIncomingCall(callMessageEt, source, error));
  }

  /**
   * call setup message handling.
   *
   * @private
   * @param {CallMessage} callMessageEt - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @returns {undefined} No return value
   */
  onUpdate(callMessageEt) {
    const {conversationId, userId} = callMessageEt;

    this.getCallById(conversationId)
      .then(callEt => {
        this.validateMessageDestination(callEt, callMessageEt);
        return callEt.verifySessionId(callMessageEt);
      })
      .then(callEt => callEt.addOrUpdateParticipant(userId, false, callMessageEt))
      .catch(this.throwMessageError);
  }

  /**
   * Throw error is not expected types.
   *
   * @private
   * @param {z.calling.CallError|Error} error - Error thrown during call message handling
   * @returns {undefined} No return value
   */
  throwMessageError(error) {
    const expectedErrorTypes = [z.calling.CallError.TYPE.MISTARGETED_MESSAGE, z.calling.CallError.TYPE.NOT_FOUND];

    if (!expectedErrorTypes.includes(error.type)) {
      throw error;
    }
  }

  /**
   * Verify validity of incoming call.
   *
   * @param {CallMessage} callMessageEt - call message to validate
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {z.calling.CallError|Error} error - Error thrown during call message handling
   * @returns {undefined} No return value
   */
  validateIncomingCall(callMessageEt, source, error) {
    this.throwMessageError(error);

    const {conversationId, response, type, userId} = callMessageEt;

    const isGroupCheck = type === z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK;
    const isSelfUser = userId === this.selfUserId();
    const validMessage = response === isGroupCheck;

    if (!isSelfUser && validMessage) {
      const eventFromStream = source === z.event.EventRepository.SOURCE.STREAM;
      const silentCall = isGroupCheck || eventFromStream;
      const promises = [this.createIncomingCall(callMessageEt, source, silentCall)];

      if (!eventFromStream) {
        promises.push(
          this.conversationRepository.grantMessage(conversationId, z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL, [
            userId,
          ])
        );
      }

      Promise.all(promises)
        .then(([callEt, grantedCall]) => {
          if (grantedCall) {
            const mediaType = callEt.isRemoteVideoSend() ? z.media.MediaType.AUDIO_VIDEO : z.media.MediaType.AUDIO;
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
   * @param {Call} callEt - Call the message belongs to
   * @param {CallMessage} callMessageEt - call message to validate
   * @returns {undefined} Resolves if the message is valid
   */
  validateMessageDestination(callEt, callMessageEt) {
    if (callEt.isGroup) {
      const {dest_clientId, destUserId, type} = callMessageEt;

      if (destUserId !== this.selfUserId() || dest_clientId !== this.clientRepository.currentClient().id) {
        this.logger.log(`Ignored '${type}' call message for client '${dest_clientId}' of user '${destUserId}'`);
        throw new z.calling.CallError(z.calling.CallError.TYPE.MISTARGETED_MESSAGE);
      }
    }
  }

  /**
   * Validate that type of call message matches conversation type.
   * @param {CallMessage} callMessageEt - call message to validate
   * @returns {Promise} Resolves if the message is valid
   */
  validateMessageType(callMessageEt) {
    const {conversationId, type} = callMessageEt;

    return this.conversationRepository.getConversationById(conversationId).then(conversationEt => {
      if (conversationEt.is_one2one()) {
        const group_messageTypes = [
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_CHECK,
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_LEAVE,
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_SETUP,
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START,
        ];

        if (group_messageTypes.includes(type)) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_CONVERSATION_TYPE);
        }
      } else if (conversationEt.isGroup()) {
        const one2oneMessageTypes = [z.calling.enum.CALL_MESSAGE_TYPE.SETUP];

        if (one2oneMessageTypes.includes(type)) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_CONVERSATION_TYPE);
        }
      } else {
        throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_CONVERSATION_TYPE);
      }

      return conversationEt;
    });
  }

  //##############################################################################
  // Outbound call events
  //##############################################################################

  /**
   * Send an call event.
   *
   * @param {z.entity.Conversation} conversationEt - Conversation to send message in
   * @param {CallMessage} callMessageEt - call message entity
   * @returns {Promise} Resolves when the event has been sent
   */
  sendCallMessage(conversationEt, callMessageEt) {
    if (!_.isObject(callMessageEt)) {
      throw new z.calling.CallError(z.calling.CallError.TYPE.WRONG_PAYLOAD_FORMAT);
    }

    const {conversationId, remoteUserId, type} = callMessageEt;

    return this.getCallById(conversationId || conversationEt.id)
      .then(callEt => {
        if (!CallingRepository.CONFIG.DATA_CHANNEL_MESSAGE_TYPES.includes(type)) {
          throw new z.calling.CallError(z.calling.CallError.TYPE.NO_DATA_CHANNEL);
        }

        return callEt.getParticipantById(remoteUserId);
      })
      .then(({flowEt}) => flowEt.sendMessage(callMessageEt))
      .catch(error => {
        const expectedErrorTypes = [z.calling.CallError.TYPE.NO_DATA_CHANNEL, z.calling.CallError.TYPE.NOT_FOUND];

        if (!expectedErrorTypes.includes(error.type)) {
          throw error;
        }

        return this.limitMessageRecipients(callMessageEt).then(({preconditionOption, recipients}) => {
          if (type === z.calling.enum.CALL_MESSAGE_TYPE.HANGUP) {
            callMessageEt.type = z.calling.enum.CALL_MESSAGE_TYPE.CANCEL;
          }

          return this.conversationRepository.sendECall(conversationEt, callMessageEt, recipients, preconditionOption);
        });
      })
      .then(() => this.logMessage(true, callMessageEt));
  }

  /**
   *
   * @private
   * @param {Call} callEt - Call entity
   * @param {CallMessage} incomingCallMessageEt - Incoming call message
   * @returns {Promise} Resolves with the call
   */
  confirmCallMessage(callEt, incomingCallMessageEt) {
    const {response} = incomingCallMessageEt;

    if (response || !callEt.selfClientJoined()) {
      return Promise.resolve(callEt);
    }

    return callEt.confirmMessage(incomingCallMessageEt).then(() => callEt);
  }

  /**
   * Limit the message recipients for a call message.
   *
   * @private
   * @param {CallMessage} callMessageEt - Call message to target at clients
   * @returns {Promise} Resolves with the client user map and precondition option
   */
  limitMessageRecipients(callMessageEt) {
    const {remoteClientId, remoteUser, remoteUserId, response, type} = callMessageEt;
    let recipientsPromise;

    if (type === z.calling.enum.CALL_MESSAGE_TYPE.REJECT) {
      recipientsPromise = Promise.resolve({selfUserEt: this.userRepository.self()});
    } else if (remoteUser) {
      recipientsPromise = Promise.resolve({remoteUserEt: remoteUser, selfUserEt: this.userRepository.self()});
    } else {
      recipientsPromise = this.userRepository
        .getUserById(remoteUserId)
        .then(remoteUserEt => ({remoteUserEt: remoteUserEt, selfUserEt: this.userRepository.self()}));
    }

    return recipientsPromise.then(({remoteUserEt, selfUserEt}) => {
      let preconditionOption;
      let recipients;

      switch (type) {
        case z.calling.enum.CALL_MESSAGE_TYPE.CANCEL: {
          if (response) {
            // Send to remote client that initiated call
            preconditionOption = true;
            recipients = {
              [remoteUserEt.id]: [`${remoteClientId}`],
            };
          } else {
            // Send to all clients of remote user
            preconditionOption = [remoteUserEt.id];
            recipients = {
              [remoteUserEt.id]: remoteUserEt.devices().map(device => device.id),
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
              [remoteUserEt.id]: [`${remoteClientId}`],
            };
          }
          break;
        }

        case z.calling.enum.CALL_MESSAGE_TYPE.REJECT: {
          // Send to all clients of self user
          preconditionOption = [selfUserEt.id];
          recipients = {
            [selfUserEt.id]: selfUserEt.devices().map(device => device.id),
          };
          break;
        }

        case z.calling.enum.CALL_MESSAGE_TYPE.SETUP: {
          if (response) {
            // Send to remote client that initiated call and all clients of self user
            preconditionOption = [selfUserEt.id];
            recipients = {
              [remoteUserEt.id]: [`${remoteClientId}`],
              [selfUserEt.id]: selfUserEt.devices().map(device => device.id),
            };
          } else {
            // Send to all clients of remote user
            preconditionOption = [remoteUserEt.id];
            recipients = {
              [remoteUserEt.id]: remoteUserEt.devices().map(device => device.id),
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
      .then(callEt => {
        this.logger.info(`Deleting call in conversation '${conversationId}'`, callEt);

        callEt.deleteCall();
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
      .then(callEt => ({callEt: callEt, callState: callEt.state()}))
      .catch(error => {
        if (error.type !== z.calling.CallError.TYPE.NOT_FOUND) {
          throw error;
        }

        return {callState: z.calling.enum.CALL_STATE.OUTGOING};
      })
      .then(({callEt, callState}) => {
        return this.checkCallingSupport(conversationId, callState)
          .then(() => this.checkConcurrentJoinedCall(conversationId, callState))
          .then(() => {
            if (callEt) {
              return callEt;
            }

            const videoSend = mediaType === z.media.MediaType.AUDIO_VIDEO;
            const propSyncPayload = z.calling.CallMessageBuilder.createPayloadPropSync(
              this.selfState,
              videoSend,
              false,
              {conversationId: conversationId}
            );
            return this.createOutgoingCall(
              z.calling.CallMessageBuilder.buildPropSync(false, undefined, propSyncPayload)
            );
          });
      })
      .then(callEt => {
        this.logger.info(`Joining call in conversation '${conversationId}'`, callEt);

        callEt.initiateTelemetry(mediaType);
        if (this.mediaStreamHandler.localMediaStream()) {
          return callEt;
        }

        return this.mediaStreamHandler.initiateMediaStream(conversationId, mediaType).then(() => callEt);
      })
      .then(callEt => {
        callEt.timings.timeStep(z.telemetry.calling.CallSetupSteps.STREAM_RECEIVED);
        callEt.joinCall();
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
      .then(callEt => {
        this.logger.info(
          `Leaving call in conversation '${conversationId}' triggered by '${terminationReason}'`,
          callEt
        );

        if (callEt.state() !== z.calling.enum.CALL_STATE.ONGOING) {
          terminationReason = undefined;
        }

        this.mediaStreamHandler.releaseMediaStream();
        callEt.leaveCall(terminationReason);
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
    const callMessageEt = z.calling.CallMessageBuilder.buildGroupLeave(false, this.sessionId, additionalPayload);

    this.onGroupLeave(callMessageEt, z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE);
  }

  /**
   * User action to reject incoming call.
   * @param {string} conversationId - ID of conversation to ignore call in
   * @returns {undefined} No return value
   */
  rejectCall(conversationId) {
    this.getCallById(conversationId)
      .then(callEt => {
        this.logger.info(`Rejecting call in conversation '${conversationId}'`, callEt);

        callEt.rejectCall();
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
      .then(callEt => callEt.toggleMedia(mediaType))
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
   * @param {Conversation} [conversationEt=this.conversationRepository.activeConversation()] - Conversation for which state will be toggled
   * @returns {undefined} No return value
   */
  toggleState(mediaType, conversationEt = this.conversationRepository.activeConversation()) {
    if (conversationEt) {
      if (conversationEt.id === this.selfClientOnACall()) {
        return this.leaveCall(conversationEt.id);
      }

      const isVideoCall = mediaType === z.media.MediaType.AUDIO_VIDEO;
      if (conversationEt.isGroup() && isVideoCall) {
        amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CALL_NO_VIDEO_IN_GROUP);
      } else {
        this.joinCall(conversationEt.id, mediaType);
      }
    }
  }

  /**
   * Check whether conversation supports calling.
   * @param {string} conversationId - ID of conversation to join call in
   * @param {z.calling.enum.CALL_STATE} callState - Current state of call
   * @returns {Promise} Resolves when conversation supports calling
   */
  checkCallingSupport(conversationId, callState) {
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
  checkConcurrentJoinedCall(newCallId, callState) {
    return new Promise(resolve => {
      const ongoingCallId = this.selfParticipantOnACall();

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
   * @param {CallMessage} callMessageEt - Call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.entity.User} creatingUserEt - User that created call
   * @returns {Promise} Resolves with the new call entity
   */
  createCall(callMessageEt, creatingUserEt) {
    const {conversationId, sessionId} = callMessageEt;

    return this.getCallById(conversationId).catch(() => {
      return this.conversationRepository.getConversationById(conversationId).then(conversationEt => {
        const callEt = new z.calling.entities.Call(conversationEt, creatingUserEt, sessionId, this);

        this.calls.push(callEt);
        return callEt;
      });
    });
  }

  /**
   * Constructs an incoming call entity.
   *
   * @private
   * @param {CallMessage} callMessageEt - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.SETUP
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {boolean} [silent=false] - Start call in rejected mode
   * @returns {Promise} Resolves with the new call entity
   */
  createIncomingCall(callMessageEt, source, silent = false) {
    const {conversationId, props, userId} = callMessageEt;

    return this.userRepository
      .getUserById(userId)
      .then(remoteUserEt => this.createCall(callMessageEt, remoteUserEt))
      .then(callEt => {
        const mediaType = this.getMediaTypeFromProperties(props);
        const conversationName = callEt.conversationEt.displayName();
        this.logger.info(`Incoming '${mediaType}' call in conversation '${conversationName}'`, callEt);

        callEt.direction = z.calling.enum.CALL_STATE.INCOMING;
        callEt.setRemoteVersion(callMessageEt);
        callEt.state(silent ? z.calling.enum.CALL_STATE.REJECTED : z.calling.enum.CALL_STATE.INCOMING);

        return callEt.addOrUpdateParticipant(userId, false, callMessageEt).then(() => {
          this.telemetry.setMediaType(mediaType);
          this.telemetry.trackEvent(z.tracking.EventName.CALLING.RECEIVED_CALL, callEt);
          this.injectActivateEvent(callMessageEt, source);

          const eventFromWebSocket = source === z.event.EventRepository.SOURCE.WEB_SOCKET;
          if (eventFromWebSocket && callEt.isRemoteVideoSend()) {
            this.mediaStreamHandler.initiateMediaStream(callEt.id, z.media.MediaType.AUDIO_VIDEO);
          }

          return callEt;
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
   * @param {CallMessage} callMessageEt - call message entity of type z.calling.enum.CALL_MESSAGE_TYPE.PROP_SYNC
   * @returns {Promise} Resolves with the new call entity
   */
  createOutgoingCall(callMessageEt) {
    const {props} = callMessageEt;

    return this.createCall(callMessageEt, this.userRepository.self()).then(callEt => {
      const mediaType = this.getMediaTypeFromProperties(props);
      const conversationName = callEt.conversationEt.displayName();
      this.logger.info(`Outgoing '${mediaType}' call in conversation '${conversationName}'`, callEt);

      callEt.direction = z.calling.enum.CALL_STATE.OUTGOING;
      callEt.state(z.calling.enum.CALL_STATE.OUTGOING);

      this.telemetry.setMediaType(mediaType);
      this.telemetry.trackEvent(z.tracking.EventName.CALLING.INITIATED_CALL, callEt);
      return callEt;
    });
  }

  //##############################################################################
  // Notifications
  //##############################################################################

  /**
   * Inject a call activate event.
   * @param {CallMessage} callMessageEt - call message to create event from
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  injectActivateEvent(callMessageEt, source) {
    const activateEvent = z.conversation.EventBuilder.buildVoiceChannelActivate(callMessageEt);
    amplify.publish(z.event.WebApp.EVENT.INJECT, activateEvent, source);
  }

  /**
   * Inject a call deactivate event.
   * @param {CallMessage} callMessageEt - Call message to create event from
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @param {z.calling.enum.TERMINATION_REASON} [reason] - Reason for call to end
   * @returns {undefined} No return value
   */
  injectDeactivateEvent(callMessageEt, source, reason) {
    const deactivateEvent = z.conversation.EventBuilder.buildVoiceChannelDeactivate(
      callMessageEt,
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
      for (const callEt of this.calls()) {
        if (callEt.id === conversationId) {
          return Promise.resolve(callEt);
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
    const conversationId = this.selfClientOnACall();

    if (conversationId) {
      this.leaveCall(conversationId);
    }
  }

  /**
   * Get the MediaType from given call event properties.
   * @param {Object} properties - call event properties
   * @returns {z.media.MediaType} MediaType of call
   */
  getMediaTypeFromProperties(properties) {
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
  selfClientOnACall() {
    for (const callEt of this.calls()) {
      if (callEt.selfClientJoined()) {
        return callEt.id;
      }
    }

    return false;
  }

  /**
   * Check if self participant is participating in a call.
   * @private
   * @returns {string|boolean} Conversation ID of call or false
   */
  selfParticipantOnACall() {
    for (const callEt of this.calls()) {
      if (callEt.selfUserJoined()) {
        return callEt.id;
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

      this.clearConfig();
    }

    return this.getConfigFromBackend();
  }

  clearConfig() {
    if (this.callingConfig) {
      const expirationDate = this.callingConfig.expiration.toISOString();
      this.logger.debug(`Removing calling configuration with expiration of '${expirationDate}'`);
      this.callingConfig = undefined;
    }
  }

  clearConfigTimeout() {
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
  getConfigFromBackend() {
    return this.callingService.getConfig().then(callingConfig => {
      if (callingConfig) {
        this.clearConfigTimeout();

        const ttl = callingConfig.ttl * 0.9 || CallingRepository.CONFIG.DEFAULT_CONFIG_TTL;
        const timeout = Math.min(ttl, CallingRepository.CONFIG.DEFAULT_CONFIG_TTL) * 1000;
        const expirationDate = new Date(Date.now() + timeout);
        callingConfig.expiration = expirationDate;

        this.logger.info(`Updated calling configuration expires on '${expirationDate.toISOString()}'`, callingConfig);
        this.callingConfig = callingConfig;

        this.callingConfigTimeout = window.setTimeout(() => {
          this.clearConfig();
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
        for (const callEt of this.calls()) {
          if (!z.calling.enum.CALL_STATE_GROUP.IS_ENDED.includes(callEt.state())) {
            return callEt;
          }
        }
      })
      .then(callEt => {
        if (callEt) {
          return this.sendReport(callEt.getFlows().map(flowEt => flowEt.reportStatus()));
        }

        if (this.flowStatus) {
          return this.sendReport(this.flowStatus);
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
   * @param {CallMessage} callMessageEt - Call message to be logged in the sequence
   * @param {string} [date] - Date of message as ISO string
   * @returns {undefined} No return value
   */
  logMessage(isOutgoing, callMessageEt, date = new Date().toISOString()) {
    while (this.messageLog.length >= CallingRepository.CONFIG.MESSAGE_LOG_LENGTH) {
      this.messageLog.shift();
    }

    const {conversationId, destUserId, remoteUserId, response, type, userId} = callMessageEt;

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

    this.logger.info(logMessage, callMessageEt);

    if (this.debugEnabled) {
      const logEntry = {
        date: date,
        log: logMessage,
        message: callMessageEt,
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
  sendReport(customData) {
    Raygun.send(new Error('Call failure report'), customData);
    this.logger.debug(`Reported status of flow id '${customData.meta.flowId}' for call analysis`, customData);
  }
};
