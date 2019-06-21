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
import {Calling, GenericMessage} from '@wireapp/protocol-messaging';
import {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';

import {t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {createRandomUuid} from 'Util/util';
import {Environment} from 'Util/Environment';

import {CallLogger} from '../telemetry/calling/CallLogger';
import {CallSetupSteps} from '../telemetry/calling/CallSetupSteps';
import {CallTelemetry} from '../telemetry/calling/CallTelemetry';

import {CallMessageBuilder} from './CallMessageBuilder';
import {CallEntity} from './entities/CallEntity';
import {CallMessageEntity} from './entities/CallMessageEntity';

import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';
import {PROPERTY_STATE} from './enum/PropertyState';
import {CALL_STATE} from './enum/CallState';
import {TERMINATION_REASON} from './enum/TerminationReason';

import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {WarningsViewModel} from '../view_model/WarningsViewModel';
import {CallMessageMapper} from './CallMessageMapper';

import {EventInfoEntity} from '../conversation/EventInfoEntity';
import {MediaType} from '../media/MediaType';

import {ClientEvent} from '../event/Client';
import {WebAppEvents} from '../event/WebApp';
import {EventRepository} from '../event/EventRepository';
import {EventName} from '../tracking/EventName';

import {ConversationRepository} from '../conversation/ConversationRepository';

export class CallingRepository {
  static get CONFIG() {
    return {
      DATA_CHANNEL_MESSAGE_TYPES: [CALL_MESSAGE_TYPE.HANGUP, CALL_MESSAGE_TYPE.PROP_SYNC],
      DEFAULT_CONFIG_TTL: 60 * 60, // 60 minutes in seconds
      MAX_FIREFOX_TURN_COUNT: 3,
    };
  }

  /**
   * Construct a new Calling repository.
   *
   * @param {CallingService} callingService -  Backend REST API calling service implementation
   * @param {ClientRepository} clientRepository - Repository for client interactions
   * @param {ConversationRepository} conversationRepository -  Repository for conversation interactions
   * @param {EventRepository} eventRepository -  Repository that handles events
   * @param {MediaRepository} mediaRepository -  Repository for media interactions
   * @param {serverTimeHandler} serverTimeHandler - Handles time shift between server and client
   * @param {UserRepository} userRepository -  Repository for all user interactions
   */
  constructor(
    callingService,
    clientRepository,
    conversationRepository,
    eventRepository,
    mediaRepository,
    serverTimeHandler,
    userRepository
  ) {
    this.getConfig = this.getConfig.bind(this);

    this.callingService = callingService;
    this.clientRepository = clientRepository;
    this.conversationRepository = conversationRepository;
    this.eventRepository = eventRepository;
    this.mediaRepository = mediaRepository;
    this.serverTimeHandler = serverTimeHandler;
    this.userRepository = userRepository;

    this.messageLog = [];
    this.callLogger = new CallLogger('CallingRepository', null, this.messageLog);

    this.selfUserId = ko.pureComputed(() => {
      if (this.userRepository.self()) {
        return this.userRepository.self().id;
      }
    });

    this.callingConfig = undefined;
    this.callingConfigTimeout = undefined;

    // Telemetry
    this.telemetry = new CallTelemetry();

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
   * Extended check for calling support of browser.
   * @returns {boolean} True if calling is supported
   */
  get supportsCalling() {
    return Environment.browser.supports.calling;
  }

  /**
   * Extended check for screen sharing support of browser.
   * @returns {boolean} True if screen sharing is supported
   */
  get supportsScreenSharing() {
    return Environment.browser.supports.screenSharing;
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
    amplify.subscribe(WebAppEvents.CALL.EVENT_FROM_BACKEND, this.onCallEvent.bind(this));
    amplify.subscribe(WebAppEvents.CALL.MEDIA.TOGGLE, this.toggleMedia.bind(this));
    amplify.subscribe(WebAppEvents.CALL.STATE.DELETE, this.deleteCall.bind(this));
    amplify.subscribe(WebAppEvents.CALL.STATE.LEAVE, this.leaveCall.bind(this));
    amplify.subscribe(WebAppEvents.CALL.STATE.REJECT, this.rejectCall.bind(this));
    amplify.subscribe(WebAppEvents.CALL.STATE.REMOVE_PARTICIPANT, this.removeParticipant.bind(this));
    amplify.subscribe(WebAppEvents.CALL.STATE.TOGGLE, this.toggleState.bind(this)); // This event needs to be kept, it is sent by the wrapper
    amplify.subscribe(WebAppEvents.DEBUG.UPDATE_LAST_CALL_STATUS, this.storeFlowStatus.bind(this));
    amplify.subscribe(WebAppEvents.LIFECYCLE.LOADED, this.getConfig);
  }

  //##############################################################################
  // Inbound call events
  //##############################################################################

  /**
   * Handle incoming calling events from backend.
   *
   * @param {Object} event - Event payload
   * @param {EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  onCallEvent(event, source) {
    const {content: eventContent, time: eventDate, type: eventType} = event;
    const isCall = eventType === ClientEvent.CALL.E_CALL;

    const logObject = {eventJson: JSON.stringify(event), eventObject: event};
    this.callLogger.info(`»» Call Event: '${eventType}' (Source: ${source})`, logObject);

    if (isCall) {
      const isSupportedVersion = eventContent.version === CallMessageEntity.CONFIG.VERSION;
      if (!isSupportedVersion) {
        throw new z.error.CallError(z.error.CallError.TYPE.UNSUPPORTED_VERSION);
      }

      const callMessageEntity = CallMessageMapper.mapEvent(event);
      this._logMessage(false, callMessageEntity, eventDate);

      this._validateMessageType(callMessageEntity)
        .then(conversationEntity => {
          const isBackendTimestamp = source !== EventRepository.SOURCE.INJECTED;
          conversationEntity.update_timestamp_server(callMessageEntity.time, isBackendTimestamp);
        })
        .then(() => {
          return this.supportsCalling
            ? this._onCallEventInSupportedBrowsers(callMessageEntity, source)
            : this._onCallEventInUnsupportedBrowsers(callMessageEntity, source);
        });
    }
  }

  /**
   * Call event handling for browsers supporting calling.
   *
   * @private
   * @param {CallMessageEntity} callMessageEntity - Mapped incoming call message entity
   * @param {EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onCallEventInSupportedBrowsers(callMessageEntity, source) {
    const messageType = callMessageEntity.type;

    switch (messageType) {
      case CALL_MESSAGE_TYPE.CANCEL: {
        return this._onCancel(callMessageEntity, source);
      }

      case CALL_MESSAGE_TYPE.GROUP_CHECK: {
        return this._onGroupCheck(callMessageEntity, source);
      }

      case CALL_MESSAGE_TYPE.GROUP_LEAVE: {
        return this._onGroupLeave(callMessageEntity);
      }

      case CALL_MESSAGE_TYPE.GROUP_SETUP: {
        return this._onGroupSetup(callMessageEntity);
      }

      case CALL_MESSAGE_TYPE.GROUP_START: {
        return this._onGroupStart(callMessageEntity, source);
      }

      case CALL_MESSAGE_TYPE.HANGUP: {
        return this._onHangup(callMessageEntity);
      }

      case CALL_MESSAGE_TYPE.PROP_SYNC: {
        return this._onPropSync(callMessageEntity);
      }

      case CALL_MESSAGE_TYPE.REJECT: {
        return this._onReject(callMessageEntity);
      }

      case CALL_MESSAGE_TYPE.SETUP: {
        return this._onSetup(callMessageEntity, source);
      }

      case CALL_MESSAGE_TYPE.UPDATE: {
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
   * @param {CallMessageEntity} callMessageEntity - Mapped incoming call message entity
   * @param {EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _onCallEventInUnsupportedBrowsers(callMessageEntity, source) {
    const {response, type, userId} = callMessageEntity;

    if (!response) {
      switch (type) {
        case CALL_MESSAGE_TYPE.SETUP: {
          this.injectActivateEvent(callMessageEntity, source);
          this.userRepository.get_user_by_id(userId).then(userEntity => {
            const warningOptions = {name: userEntity.name()};
            const warningType = WarningsViewModel.TYPE.UNSUPPORTED_INCOMING_CALL;

            amplify.publish(WebAppEvents.WARNING.SHOW, warningType, warningOptions);
          });
          break;
        }

        case CALL_MESSAGE_TYPE.CANCEL: {
          amplify.publish(WebAppEvents.WARNING.DISMISS, WarningsViewModel.TYPE.UNSUPPORTED_INCOMING_CALL);
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
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.CANCEL
   * @returns {undefined} No return value
   */
  _onCancel(callMessageEntity) {
    const {clientId, conversationId, response, userId} = callMessageEntity;

    if (!response) {
      const terminationReason = TERMINATION_REASON.OTHER_USER;
      this.getCallById(conversationId)
        .then(callEntity => callEntity.verifySessionId(callMessageEntity))
        .then(callEntity => callEntity.deleteParticipant(userId, clientId, terminationReason))
        .then(callEntity => {
          const fromSelf = userId === this.selfUserId();
          return callEntity.deactivateCall(callMessageEntity, fromSelf, terminationReason).then(wasDeleted => {
            if (!wasDeleted && fromSelf) {
              callEntity.state(CALL_STATE.REJECTED);
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
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.GROUP_CHECK
   * @param {EventRepository.SOURCE} source - Source of event
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
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.GROUP_LEAVE
   * @param {TERMINATION_REASON} [terminationReason=TERMINATION_REASON.OTHER_USER] - Reason for participant to leave
   * @returns {undefined} No return value
   */
  _onGroupLeave(callMessageEntity, terminationReason = TERMINATION_REASON.OTHER_USER) {
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
   * @param {CallMessageEntity} callMessageEntity - call message entity of type CALL_MESSAGE_TYPE.GROUP_SETUP
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
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.GROUP_START
   * @param {EventRepository.SOURCE} source - Source of event
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
          callEntity.state(CALL_STATE.CONNECTING);
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
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.HANGUP
   * @param {TERMINATION_REASON} terminationReason - Reason for the participant to hangup
   * @returns {undefined} No return value
   */
  _onHangup(callMessageEntity, terminationReason = TERMINATION_REASON.OTHER_USER) {
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
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.SETUP
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
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.REJECT
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
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.SETUP
   * @param {EventRepository.SOURCE} source - Source of event
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
            callEntity.state(CALL_STATE.CONNECTING);
          }
        });
      })
      .catch(error => this._validateIncomingCall(callMessageEntity, source, error));
  }

  /**
   * Call setup message handling.
   *
   * @private
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.SETUP
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
   * @param {CallEntity} callEntity - Call entity
   * @returns {Promise} Resolves when self join was handled
   */
  _remoteSelfJoin(callEntity) {
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
   * @param {CallMessageEntity} callMessageEntity - Call message to validate
   * @param {EventRepository.SOURCE} source - Source of event
   * @param {z.error.CallError|Error} error - Error thrown during call message handling
   * @returns {undefined} No return value
   */
  _validateIncomingCall(callMessageEntity, source, error) {
    this._throwMessageError(error);

    const {conversationId, response, type, userId} = callMessageEntity;

    const isTypeGroupCheck = type === CALL_MESSAGE_TYPE.GROUP_CHECK;
    const isSelfUser = userId === this.selfUserId();
    const validMessage = response === isTypeGroupCheck;

    if (!isSelfUser && validMessage) {
      const eventFromStream = source === EventRepository.SOURCE.STREAM;
      const silentCall = isTypeGroupCheck || eventFromStream;
      const promises = [this._createIncomingCall(callMessageEntity, source, silentCall)];

      if (!eventFromStream) {
        const eventInfoEntity = new EventInfoEntity(undefined, conversationId, {recipients: [userId]});
        eventInfoEntity.setType(GENERIC_MESSAGE_TYPE.CALLING);
        const consentType = ConversationRepository.CONSENT_TYPE.INCOMING_CALL;
        const grantPromise = this.conversationRepository.grantMessage(eventInfoEntity, consentType);

        promises.push(grantPromise);
      }

      Promise.all(promises)
        .then(([callEntity, grantedCall]) => {
          if (grantedCall) {
            const mediaType = callEntity.isRemoteVideoCall() ? MediaType.AUDIO_VIDEO : MediaType.AUDIO;
            return this.conversationRepository.get_conversation_by_id(conversationId).then(conversationEntity => {
              this.joinCall(conversationEntity, mediaType);
            });
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
   * @param {CallEntity} callEntity - Call the message belongs to
   * @param {CallMessageEntity} callMessageEntity - Call message to validate
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
   * @param {CallMessageEntity} callMessageEntity - Call message to validate
   * @returns {Promise} Resolves if the message is valid
   */
  _validateMessageType(callMessageEntity) {
    const {conversationId, type} = callMessageEntity;

    return this.conversationRepository.get_conversation_by_id(conversationId).then(conversationEntity => {
      if (conversationEntity.is1to1()) {
        const groupMessageTypes = [
          CALL_MESSAGE_TYPE.GROUP_CHECK,
          CALL_MESSAGE_TYPE.GROUP_LEAVE,
          CALL_MESSAGE_TYPE.GROUP_SETUP,
          CALL_MESSAGE_TYPE.GROUP_START,
        ];

        if (groupMessageTypes.includes(type)) {
          throw new z.error.CallError(z.error.CallError.TYPE.WRONG_CONVERSATION_TYPE);
        }
      } else if (conversationEntity.isGroup()) {
        const one2oneMessageTypes = [CALL_MESSAGE_TYPE.SETUP];

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
   * @param {Conversation} conversationEntity - Conversation to send message in
   * @param {CallMessageEntity} callMessageEntity - Call message entity
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
          const isTypeHangup = type === CALL_MESSAGE_TYPE.HANGUP;
          if (isTypeHangup) {
            if (response) {
              throw error;
            }

            callMessageEntity.type = CALL_MESSAGE_TYPE.CANCEL;
          }

          this._logMessage(true, callMessageEntity);

          const protoCalling = new Calling({content: callMessageEntity.toContentString()});
          const genericMessage = new GenericMessage({
            [GENERIC_MESSAGE_TYPE.CALLING]: protoCalling,
            messageId: createRandomUuid(),
          });

          const options = {precondition, recipients};
          const eventInfoEntity = new EventInfoEntity(genericMessage, conversationEntity.id, options);

          return this.conversationRepository.sendCallingMessage(eventInfoEntity, conversationEntity, callMessageEntity);
        });
      });
  }

  /**
   *
   * @private
   * @param {CallEntity} callEntity - Call entity
   * @param {CallMessageEntity} incomingCallMessageEntity - Incoming call message
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
   * @param {CallMessageEntity} callMessageEntity - Call message to target at clients
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
        case CALL_MESSAGE_TYPE.CANCEL: {
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

        case CALL_MESSAGE_TYPE.GROUP_SETUP:
        case CALL_MESSAGE_TYPE.HANGUP:
        case CALL_MESSAGE_TYPE.PROP_SYNC:
        case CALL_MESSAGE_TYPE.UPDATE: {
          // Send to remote client that call is connected with
          if (remoteClientId) {
            precondition = true;
            recipients = {
              [remoteUserEntity.id]: [`${remoteClientId}`],
            };
          }
          break;
        }

        case CALL_MESSAGE_TYPE.REJECT: {
          // Send to all clients of self user
          precondition = [selfUserEntity.id];
          recipients = {
            [selfUserEntity.id]: selfUserEntity.devices().map(device => device.id),
          };
          break;
        }

        case CALL_MESSAGE_TYPE.SETUP: {
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
   * @param {Conversation} conversationEntity - conversation to join call in
   * @param {MediaType} mediaType - Media type for this call
   * @returns {undefined} No return value
   */
  joinCall(conversationEntity, mediaType) {
    this.getCallById(conversationEntity.id)
      .then(callEntity => ({callEntity, callState: callEntity.state()}))
      .catch(error => {
        this._handleNotFoundError(error);
        return {callState: CALL_STATE.OUTGOING};
      })
      .then(({callEntity, callState}) => this._joinCall(conversationEntity, mediaType, callState, callEntity))
      .catch(error => this._handleJoinCallError(error, conversationEntity.id));
  }

  /**
   * User action to leave a call.
   *
   * @param {string} conversationId - ID of conversation to leave call in
   * @param {TERMINATION_REASON} terminationReason - Reason for call termination
   * @returns {undefined} No return value
   */
  leaveCall(conversationId, terminationReason) {
    this.getCallById(conversationId)
      .then(callEntity => {
        const leftConversation = terminationReason === TERMINATION_REASON.MEMBER_LEAVE;
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
   * @param {MediaType} mediaType - MediaType of requested change
   * @returns {undefined} No return value
   */
  toggleMedia(conversationId, mediaType) {
    return this.getCallById(conversationId)
      .then(callEntity => this._toggleMediaState(mediaType).then(() => callEntity))
      .then(callEntity => callEntity.toggleMedia(mediaType))
      .catch(error => {
        const isNotFound = error.type === z.error.CallError.TYPE.NOT_FOUND;
        if (!isNotFound) {
          if (mediaType === MediaType.VIDEO || mediaType === MediaType.AUDIO_VIDEO) {
            this.mediaRepository.showNoCameraModal();
          }
        }
      });
  }

  /**
   * User action to toggle the call state.
   *
   * @param {MediaType} mediaType - Media type of call
   * @param {Conversation} [conversationEntity=this.conversationRepository.active_conversation()] - Conversation for which state will be toggled
   * @returns {undefined} No return value
   */
  toggleState(mediaType, conversationEntity = this.conversationRepository.active_conversation()) {
    if (conversationEntity) {
      const isActiveCall = conversationEntity.id === this._selfClientOnACall();
      return isActiveCall
        ? this.leaveCall(conversationEntity.id, TERMINATION_REASON.SELF_USER)
        : this.joinCall(conversationEntity, mediaType);
    }
  }

  /**
   * Check whether conversation supports calling.
   *
   * @private
   * @param {Conversation} conversationEntity - conversation to join call in
   * @param {MediaType} mediaType - Media type for this call
   * @param {CALL_STATE} callState - Current state of call
   * @returns {Promise} Resolves when conversation supports calling
   */
  _checkCallingSupport(conversationEntity, mediaType, callState) {
    return new Promise((resolve, reject) => {
      const noConversationParticipants = !conversationEntity.participating_user_ids().length;
      if (noConversationParticipants) {
        this._showModal(t('modalCallEmptyConversationHeadline'), t('modalCallEmptyConversationMessage'));
        return reject(new z.error.CallError(z.error.CallError.TYPE.NOT_SUPPORTED));
      }

      const isOutgoingCall = callState === CALL_STATE.OUTGOING;
      if (isOutgoingCall && !this.supportsCalling) {
        amplify.publish(WebAppEvents.WARNING.SHOW, WarningsViewModel.TYPE.UNSUPPORTED_OUTGOING_CALL);
        return reject(new z.error.CallError(z.error.CallError.TYPE.NOT_SUPPORTED));
      }

      const isVideoCall = mediaType === MediaType.AUDIO_VIDEO;
      if (isVideoCall && !conversationEntity.supportsVideoCall(isOutgoingCall)) {
        this._showModal(t('modalCallNoGroupVideoHeadline'), t('modalCallNoGroupVideoMessage'));
        return reject(new z.error.CallError(z.error.CallError.TYPE.NOT_SUPPORTED));
      }
      resolve();
    });
  }

  /**
   * Check whether we are actively participating in a call.
   *
   * @private
   * @param {string} newCallId - Conversation ID of call about to be joined
   * @param {CALL_STATE} callState - Call state of new call
   * @returns {Promise} Resolves when the new call was joined
   */
  _checkConcurrentJoinedCall(newCallId, callState) {
    return new Promise(resolve => {
      const ongoingCallId = this._selfParticipantOnACall();

      if (!ongoingCallId) {
        resolve();
      } else {
        let actionString;
        let messageString;
        let titleString;

        switch (callState) {
          case CALL_STATE.INCOMING:
          case CALL_STATE.REJECTED: {
            actionString = t('modalCallSecondIncomingAction');
            messageString = t('modalCallSecondIncomingMessage');
            titleString = t('modalCallSecondIncomingHeadline');
            break;
          }

          case CALL_STATE.ONGOING: {
            actionString = t('modalCallSecondOngoingAction');
            messageString = t('modalCallSecondOngoingMessage');
            titleString = t('modalCallSecondOngoingHeadline');
            break;
          }

          case CALL_STATE.OUTGOING: {
            actionString = t('modalCallSecondOutgoingAction');
            messageString = t('modalCallSecondOutgoingMessage');
            titleString = t('modalCallSecondOutgoingHeadline');
            break;
          }

          default: {
            this.callLogger.error(`Tried to join second call in unexpected state '${callState}'`);
            throw new z.error.CallError(z.error.CallError.TYPE.WRONG_STATE);
          }
        }

        amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
          close: () => {
            const isIncomingCall = callState === CALL_STATE.INCOMING;
            if (isIncomingCall) {
              amplify.publish(WebAppEvents.CALL.STATE.REJECT, newCallId);
            }
          },
          primaryAction: {
            action: () => {
              const terminationReason = TERMINATION_REASON.CONCURRENT_CALL;
              amplify.publish(WebAppEvents.CALL.STATE.LEAVE, ongoingCallId, terminationReason);
              window.setTimeout(resolve, TIME_IN_MILLIS.SECOND);
            },
            text: actionString,
          },
          text: {
            message: messageString,
            title: titleString,
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
   * @param {MediaType} mediaType - Media type of the call
   * @returns {undefined} No return value
   */
  _initiateJoinCall(callEntity, mediaType) {
    callEntity.timings.time_step(CallSetupSteps.STREAM_RECEIVED);
    callEntity.joinCall(mediaType);
  }

  /**
   * Initiate an outgoing call.
   *
   * @private
   * @param {string} conversationId - ID of conversation to join call in
   * @param {MediaType} mediaType - Media type for this call
   * @returns {Promise} Resolves with a call entity
   */
  _initiateOutgoingCall(conversationId, mediaType) {
    const videoSend = mediaType === MediaType.AUDIO_VIDEO;
    const payload = {conversationId};
    const messagePayload = CallMessageBuilder.createPropSync(this.selfStreamState, payload, videoSend);
    const callMessageEntity = CallMessageBuilder.buildPropSync(false, undefined, messagePayload);
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
   * @param {MediaType} mediaType - Media type for this call
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
   * @param {Conversation} conversationEntity - conversation to join call in
   * @param {MediaType} mediaType - Media type of the call
   * @param {CALL_STATE} callState - State of call
   * @param {CallEntity} [callEntity] - Retrieved call entity
   * @returns {undefined} No return value
   */
  _joinCall(conversationEntity, mediaType, callState, callEntity) {
    this._checkCallingSupport(conversationEntity, mediaType, callState)
      .then(() => this._checkConcurrentJoinedCall(conversationEntity.id, callState))
      .then(() => callEntity || this._initiateOutgoingCall(conversationEntity.id, mediaType, callState))
      .then(callEntityToJoin => this._initiatePreJoinCall(callEntityToJoin))
      .then(callEntityToJoin => this._initiateMediaStream(callEntityToJoin, mediaType))
      .then(callEntityToJoin => this._initiateJoinCall(callEntityToJoin, mediaType))
      .catch(error => this._handleJoinError(conversationEntity.id, !callEntity, error));
  }

  /**
   * Leave a call.
   *
   * @private
   * @param {CallEntity} callEntity - Call to leave
   * @param {TERMINATION_REASON} terminationReason - Reason for call termination
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
      const additionalPayload = CallMessageBuilder.createPayload(id, this.selfUserId(), userId);
      const callMessageEntity = CallMessageBuilder.buildGroupLeave(false, sessionId, additionalPayload);

      this._onGroupLeave(callMessageEntity, TERMINATION_REASON.MEMBER_LEAVE);
    });
  }

  /**
   * Show acknowledgement warning modal.
   *
   * @private
   * @param {string} title - modal title
   * @param {string} message - modal message
   * @returns {undefined} No return value
   */
  _showModal(title, message) {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        message,
        title,
      },
    });
  }

  /**
   * Toggle media state of a call.
   *
   * @param {MediaType} mediaType - MediaType of requested change
   * @returns {undefined} No return value
   */
  _toggleMediaState(mediaType) {
    switch (mediaType) {
      case MediaType.AUDIO: {
        return this.mediaStreamHandler.toggleAudioSend();
      }

      case MediaType.SCREEN: {
        return this.mediaStreamHandler.toggleScreenSend();
      }

      case MediaType.VIDEO: {
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
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.SETUP
   * @param {User} creatingUserEntity - User that created call
   * @param {CALL_STATE} direction - direction of the call (outgoing or incoming)
   * @returns {Promise} Resolves with the new call entity
   */
  _createCall(callMessageEntity, creatingUserEntity, direction) {
    const {conversationId, sessionId, properties} = callMessageEntity;
    const mediaType = this._getMediaTypeFromProperties(properties);

    return this.getCallById(conversationId).catch(() => {
      return this.conversationRepository.get_conversation_by_id(conversationId).then(conversationEntity => {
        const callEntity = new CallEntity(conversationEntity, creatingUserEntity, sessionId, this);

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
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.SETUP
   * @param {EventRepository.SOURCE} source - Source of event
   * @param {boolean} [silent=false] - Start call in rejected mode
   * @returns {Promise} Resolves with the new call entity
   */
  _createIncomingCall(callMessageEntity, source, silent = false) {
    const {conversationId, properties, userId} = callMessageEntity;

    return this.userRepository
      .get_user_by_id(userId)
      .then(remoteUserEntity => {
        return this._createCall(callMessageEntity, remoteUserEntity, CALL_STATE.INCOMING);
      })
      .then(callEntity => {
        const mediaType = this._getMediaTypeFromProperties(properties);
        const conversation = callEntity.conversationEntity;
        const conversationName = conversation.display_name();

        const logMessage = {
          data: {
            default: [mediaType, conversationName],
            obfuscated: [mediaType, this.callLogger.obfuscate(conversationId)],
          },
          message: `Incoming '{0}' call in conversation '{1}'`,
        };
        this.callLogger.info(logMessage, callEntity);

        callEntity.setRemoteVersion(callMessageEntity);

        if (conversation.showNotificationsNothing()) {
          silent = true;
        }

        const callState = silent ? CALL_STATE.REJECTED : CALL_STATE.INCOMING;
        callEntity.state(callState);

        return callEntity.addOrUpdateParticipant(userId, false, callMessageEntity).then(() => {
          this.telemetry.track_event(EventName.CALLING.RECEIVED_CALL, callEntity);
          this.injectActivateEvent(callMessageEntity, source);

          const eventFromWebSocket = source === EventRepository.SOURCE.WEB_SOCKET;
          const hasOtherCalls = this.calls().some(call => call.id !== callEntity.id);
          const hasCallWithoutVideo = hasOtherCalls && !this.mediaStreamHandler.selfStreamState.videoSend();

          if (eventFromWebSocket && callEntity.isRemoteVideoSend() && !hasCallWithoutVideo) {
            const mediaStreamType = MediaType.AUDIO_VIDEO;
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
   * @param {CallMessageEntity} callMessageEntity - Call message entity of type CALL_MESSAGE_TYPE.PROP_SYNC
   * @returns {Promise} Resolves with the new call entity
   */
  _createOutgoingCall(callMessageEntity) {
    const properties = callMessageEntity.properties;

    const direction = CALL_STATE.OUTGOING;
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

      callEntity.state(CALL_STATE.OUTGOING);

      this.telemetry.track_event(EventName.CALLING.INITIATED_CALL, callEntity);
      return callEntity;
    });
  }

  //##############################################################################
  // Notifications
  //##############################################################################

  /**
   * Inject a call activate event.
   * @param {CallMessageEntity} callMessageEntity - Call message to create event from
   * @param {EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  injectActivateEvent(callMessageEntity, source) {
    const event = z.conversation.EventBuilder.buildVoiceChannelActivate(callMessageEntity);
    this.eventRepository.injectEvent(event, source);
  }

  /**
   * Inject a call deactivate event.
   * @param {CallMessageEntity} callMessageEntity - Call message to create event from
   * @param {EventRepository.SOURCE} source - Source of event
   * @param {TERMINATION_REASON} [reason] - Reason for call to end
   * @returns {undefined} No return value
   */
  injectDeactivateEvent(callMessageEntity, source, reason) {
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
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
      this.leaveCall(conversationId, TERMINATION_REASON.PAGE_NAVIGATION);
    }
  }

  /**
   * Get the MediaType from given call event properties.
   * @param {Object} properties - call event properties
   * @returns {MediaType} MediaType of call
   */
  _getMediaTypeFromProperties(properties) {
    const isVideoSend = properties && properties.videosend === PROPERTY_STATE.TRUE;
    const isScreenSend = properties && properties.screensend === PROPERTY_STATE.TRUE;
    const isTypeVideo = isVideoSend || isScreenSend;
    return isTypeVideo ? MediaType.VIDEO : MediaType.AUDIO;
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
    const limit = Environment.browser.firefox ? CallingRepository.CONFIG.MAX_FIREFOX_TURN_COUNT : undefined;

    return this.callingService.getConfig(limit).then(callingConfig => {
      if (callingConfig) {
        this._clearConfigTimeout();

        const DEFAULT_CONFIG_TTL = CallingRepository.CONFIG.DEFAULT_CONFIG_TTL;
        const ttl = callingConfig.ttl * 0.9 || DEFAULT_CONFIG_TTL;
        const timeout = Math.min(ttl, DEFAULT_CONFIG_TTL) * TIME_IN_MILLIS.SECOND;
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
   * @param {CallMessageEntity} callMessageEntity - Call message to be logged in the sequence
   * @returns {undefined} No return value
   */
  _logMessage(isOutgoing, callMessageEntity) {
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
}
