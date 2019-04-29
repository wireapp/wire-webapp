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
import {getLogger} from 'Util/Logger';

import {t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {createRandomUuid} from 'Util/util';
import {Environment} from 'Util/Environment';
import {EventBuilder} from '../conversation/EventBuilder';
import {TERMINATION_REASON} from './enum/TerminationReason';

import {CallLogger} from '../telemetry/calling/CallLogger';

import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';

import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {WarningsViewModel} from '../view_model/WarningsViewModel';

import {EventInfoEntity} from '../conversation/EventInfoEntity';
import {MediaType} from '../media/MediaType';

import {WebAppEvents} from '../event/WebApp';
import {EventRepository} from '../event/EventRepository';
import {EventName} from '../tracking/EventName';

import {ConversationRepository} from '../conversation/ConversationRepository';
import {getAvsInstance, CALL_TYPE, STATE as CALL_STATE, CONV_TYPE, ENV as AVS_ENV} from 'avs-web';

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
    userRepository,
  ) {
    this.getConfig = this.getConfig.bind(this);

    this.wUser = undefined;
    this.callingApi = undefined;
    this.activeCalls = ko.observableArray();

    ko.computed(() => {
      if (userRepository.self() && clientRepository.currentClient()) {
        getAvsInstance()
          .then(callingInstance => {
            return this.configureCallingApi(
              callingInstance,
              userRepository.self().id,
              clientRepository.currentClient().id
            );
          })
          .then(({callingApi, wUser}) => {
            this.callingApi = callingApi;
            this.wUser = wUser;
          });
      }
    });

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

    // Media Handler
    this.mediaConstraintsHandler = this.mediaRepository.constraintsHandler;

    this.calls = ko.observableArray([]);
    this.joinedCall = ko.pureComputed(() => {
      for (const callEntity of this.calls()) {
        if (callEntity.selfClientJoined()) {
          return callEntity;
        }
      }
    });

    this.flowStatus = undefined;

    this.subscribeToEvents();
    this._enableDebugging();
  }

  configureCallingApi(callingApi, selfUserId, selfClientId) {
    const log = name => {
      return function() {
        // eslint-disable-next-line no-console
        console.log('avs_cb', name, arguments);
      };
    };
    const avsLogger = getLogger('avs');
    callingApi.set_log_handler((level, message) => {
      // TODO handle levels
      avsLogger.debug(message);
    });

    const avsEnv = Environment.browser.firefox ? AVS_ENV.FIREFOX : AVS_ENV.DEFAULT;
    callingApi.init(avsEnv);

    callingApi.setUserMediaHandler((audio, video, screen) => {
      const constraints = this.mediaConstraintsHandler.getMediaStreamConstraints(audio, video, false);
      return navigator.mediaDevices.getUserMedia(constraints);
    });

    const requestConfig = () => {
      this.getConfig().then(config => callingApi.config_update(this.wUser, 0, JSON.stringify(config)));
      return 0;
    };

    const sendMessage = (
      context,
      conversationId,
      userId,
      clientId,
      destinationUserId,
      destinationClientId,
      payload
    ) => {
      const protoCalling = new Calling({content: payload});
      const genericMessage = new GenericMessage({
        [z.cryptography.GENERIC_MESSAGE_TYPE.CALLING]: protoCalling,
        messageId: createRandomUuid(),
      });

      //const options = {precondition, recipients};
      const eventInfoEntity = new EventInfoEntity(genericMessage, conversationId /*, options*/);
      this.conversationRepository.sendCallingMessage(eventInfoEntity, conversationId);
      return 0;
    };

    const callClosed = (reason, conversationId) => {
      const storedCall = this.findCall(conversationId);
      if (!storedCall) {
        return;
      }
      storedCall.reason(reason);
    };

    const wUser = callingApi.create(
      selfUserId,
      selfClientId,
      log('readyh'), //readyh,
      sendMessage, //sendh,
      log('incomingh'), //incomingh,
      log('missedh'), //missedh,
      log('answerh'), //answerh,
      log('estabh'), //estabh,
      callClosed, //closeh,
      log('metricsh'), //metricsh,
      requestConfig, //cfg_reqh,
      log('acbrh'), //acbrh,
      log('vstateh') //vstateh,
    );

    callingApi.set_state_handler(wUser, (conversationId, state) => {
      log('state_handler')(conversationId, state);
      const storedCall = this.findCall(conversationId);
      const call = storedCall || {
        conversationId,
        reason: ko.observable(),
        startedAt: ko.observable(),
        state: ko.observable(state),
      };

      call.state(state);
      call.reason(undefined);

      switch (state) {
        case CALL_STATE.TERM_REMOTE:
        case CALL_STATE.TERM_LOCAL:
        case CALL_STATE.NONE:
          this.removeCall(storedCall);
          return;

        case CALL_STATE.MEDIA_ESTAB:
          call.startedAt(Date.now());
          break;
      }

      if (!storedCall) {
        this.storeCall(call);
      }
    });
    setInterval(callingApi.poll, 500);

    return {callingApi, wUser};
  }

  findCall(conversationId) {
    return this.activeCalls().find(callInstance => callInstance.conversationId === conversationId);
  }

  storeCall(call) {
    this.activeCalls.push(call);
  }

  removeCall(call) {
    const index = this.activeCalls().indexOf(call);
    if (index !== -1) {
      this.activeCalls.splice(index, 1);
    }
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
   * Subscribe to amplify topics.
   * @returns {undefined} No return value
   */
  subscribeToEvents() {
    amplify.subscribe(WebAppEvents.CALL.EVENT_FROM_BACKEND, this.onCallEvent.bind(this));
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
    // TODO handle saving activate/deactivate events
    const {content, conversation: conversationId, from: userId, sender: clientId, time} = event;
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const toSecond = timestamp => Math.floor(timestamp / 1000);
    const contentStr = JSON.stringify(content);
    const res = this.callingApi.recv_msg(
      this.wUser,
      contentStr,
      contentStr.length,
      toSecond(currentTimestamp),
      toSecond(new Date(time).getTime()),
      conversationId,
      userId,
      clientId
    );

    if (res !== 0) {
      this.callLogger.warn(`recv_msg failed with code: ${res}`);
      return;
    }

    // save event if needed
    switch (content.type) {
      case 'SETUP':
        this.injectActivateEvent(conversationId, userId, time, source);
        break;

      case 'CANCEL':
        const reason = TERMINATION_REASON.MISSED; // TODO check other reasons
        this.injectDeactivateEvent(conversationId, userId, reason, time, source);
        break;
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
              this.startCall(conversationEntity.id, mediaType);
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

          return this.conversationRepository.sendCallingMessage(eventInfoEntity, conversationEntity);
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
   * User action to toggle the call state.
   *
   * @param {MediaType} mediaType - Media type of call
   * @param {Conversation} [conversationEntity=this.conversationRepository.active_conversation()] - Conversation for which state will be to
gled
   * @returns {undefined} No return value
   */
  toggleState(mediaType, conversationEntity = this.conversationRepository.active_conversation()) {
    if (conversationEntity) {
      // TODO deduce active call from avs api
      const isActiveCall = false;
      return isActiveCall ? this.leaveCall(conversationEntity.id) : this.startCall(conversationEntity.id, mediaType);
    }
  }

  /**
   * Join a call.
   *
   * @param {string} conversationId - id of the conversation to join call in
   * @param {MediaType} mediaType - Media type for this call
   * @returns {undefined} No return value
   */
  startCall(conversationId, mediaType) {
    // TODO pass on the conversation type
    const callType = this.callTypeFromMediaType(mediaType);
    this.callingApi.start(this.wUser, conversationId, callType, CONV_TYPE.ONEONONE, false);
  }

  answerCall(conversationId, mediaType) {
    const callType = this.callTypeFromMediaType(mediaType);
    this.callingApi.answer(this.wUser, conversationId, callType, false);
  }

  rejectCall(conversationId) {
    // TODO sort out if rejection should be shared accross devices (does avs handle it?)
    this.callingApi.reject(this.wUser, conversationId);
  }

  removeParticipant(conversationId, userId) {
    throw new Error('TODO: implement removeParticipant');
  }

  muteCall(conversationId, isMuted) {
    this.callingApi.set_mute(this.wUser, isMuted);
  }

  callTypeFromMediaType(mediaType) {
    const types = {
      [MediaType.AUDIO]: CALL_TYPE.NORMAL,
      [MediaType.AUDIO_VIDEO]: CALL_TYPE.VIDEO,
      [MediaType.SCREEN]: CALL_TYPE.VIDEO,
    };

    return types[mediaType] || CALL_TYPE.NORMAL;
  }

  /**
   * User action to leave a call.
   *
   * @param {string} conversationId - ID of conversation to leave call in
   * @returns {undefined} No return value
   */
  leaveCall(conversationId) {
    this.callingApi.end(this.wUser, conversationId);
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
    // FIXME use info from avs lib
    const ongoingCallId = false;
    return new Promise(resolve => {
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

          case CALL_STATE.ANSWER: {
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
            const terminationReason = 0;
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

  //##############################################################################
  // Notifications
  //##############################################################################

  /**
   * Inject a call activate event.
   *
   * @param {string} conversationId - The conversation id the event occured on
   * @param {string} userId - The user sending the event
   * @param {string} time - Time of the event
   * @param {EventRepository.SOURCE} source - Source of the event
   * @returns {void} - nothing
   */
  injectActivateEvent(conversationId, userId, time, source) {
    const event = EventBuilder.buildVoiceChannelActivate(conversationId, userId, time);
    this.eventRepository.injectEvent(event, source);
  }

  /**
   * Inject a call deactivate event.
   *
   * @param {string} conversationId - The conversation id the event occured on
   * @param {string} userId - The user sending the event
   * @param {TERMINATION_REASON} reason - reason why the call was deactivated
   * @param {string} time - Time of the event
   * @param {EventRepository.SOURCE} source - Source of the event
   * @returns {void} - nothing
   */
  injectDeactivateEvent(conversationId, userId, reason, time, source) {
    const event = EventBuilder.buildVoiceChannelDeactivate(conversationId, userId, reason, time);
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
    // TODO
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
