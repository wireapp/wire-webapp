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

import {Calling, GenericMessage} from '@wireapp/protocol-messaging';
import {amplify} from 'amplify';
import ko from 'knockout';
import {getLogger} from 'Util/Logger';
import adapter from 'webrtc-adapter';
import {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {Environment} from 'Util/Environment';
import {createRandomUuid} from 'Util/util';
import {EventBuilder} from '../conversation/EventBuilder';
import {TERMINATION_REASON} from './enum/TerminationReason';

import {CallLogger} from '../telemetry/calling/CallLogger';

import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';

import {EventInfoEntity} from '../conversation/EventInfoEntity';
import {MediaType} from '../media/MediaType';

import {WebAppEvents} from '../event/WebApp';

import {CALL_TYPE, CONV_TYPE, ENV as AVS_ENV, STATE as CALL_STATE, getAvsInstance} from 'avs-web';

type UserId = string;
type ConversationId = string;

interface Call {
  conversationId: ConversationId;
  reason: ko.Observable<number | undefined>;
  startedAt: ko.Observable<number | undefined>;
  state: ko.Observable<number>;
  participants: ko.ObservableArray<string>;
}

export class CallingRepository {
  private readonly backendClient: any;
  private readonly conversationRepository: any;
  private readonly eventRepository: any;
  private readonly mediaConstraintsHandler: any;
  private readonly serverTimeHandler: any;

  private wUser: number | undefined;
  private callingApi: any | undefined;
  private readonly activeCalls: ko.ObservableArray<any>;
  private readonly isMuted: ko.Observable<boolean>;

  public readonly calls: ko.ObservableArray<any>;
  public readonly joinedCall: ko.Observable<any>;

  private callingConfig: any;
  private callingConfigTimeout: number | undefined;
  private readonly callLogger: CallLogger;

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
   * @param {BackendClient} backendClient - Client for the backend API
   * @param {ConversationRepository} conversationRepository -  Repository for conversation interactions
   * @param {EventRepository} eventRepository -  Repository that handles events
   * @param {MediaRepository} mediaRepository -  Repository for media interactions
   * @param {serverTimeHandler} serverTimeHandler - Handles time shift between server and client
   */
  constructor(
    backendClient: any,
    conversationRepository: any,
    eventRepository: any,
    mediaRepository: any,
    serverTimeHandler: any
  ) {
    this.activeCalls = ko.observableArray();
    this.isMuted = ko.observable(false);

    this.calls = ko.observableArray();
    this.joinedCall = ko.observable();

    this.backendClient = backendClient;
    this.conversationRepository = conversationRepository;
    this.eventRepository = eventRepository;
    this.serverTimeHandler = serverTimeHandler;
    // Media Handler
    this.mediaConstraintsHandler = mediaRepository.constraintsHandler;

    this.callLogger = new CallLogger('CallingRepository', null, []);

    this.callingConfig = undefined;
    this.callingConfigTimeout = undefined;

    this.subscribeToEvents();
    this._enableDebugging();
  }

  initAvs(selfUserId: string, clientId: string) {
    getAvsInstance().then((callingInstance: any) => {
      const {callingApi, wUser} = this.configureCallingApi(callingInstance, selfUserId, clientId);
      this.callingApi = callingApi;
      this.wUser = wUser;
    });
  }

  configureCallingApi(callingApi: any, selfUserId: string, selfClientId: string): {wUser: number; callingApi: any} {
    const log = (name: string) => {
      return function() {
        // eslint-disable-next-line no-console
        console.log('avs_cb', name, arguments);
      };
    };
    const avsLogger = getLogger('avs');
    callingApi.set_log_handler((level: number, message: string) => {
      // TODO handle levels
      avsLogger.debug(message);
    });

    const avsEnv = Environment.browser.firefox ? AVS_ENV.FIREFOX : AVS_ENV.DEFAULT;
    callingApi.init(avsEnv);

    callingApi.setUserMediaHandler((audio: boolean, video: boolean, screen: boolean) => {
      const constraints = this.mediaConstraintsHandler.getMediaStreamConstraints(audio, video, false);
      return navigator.mediaDevices.getUserMedia(constraints);
    });

    const requestConfig = () => {
      this.getConfig().then((config: any) => callingApi.config_update(this.wUser, 0, JSON.stringify(config)));
      return 0;
    };

    const sendMessage = (
      context: any,
      conversationId: ConversationId,
      userId: UserId,
      clientId: string,
      destinationUserId: string,
      destinationClientId: string,
      payload: string
    ) => {
      const protoCalling = new Calling({content: payload});
      const genericMessage = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.CALLING]: protoCalling,
        messageId: createRandomUuid(),
      });

      const options = {}; // TODO {precondition, recipients};
      const eventInfoEntity = new EventInfoEntity(genericMessage, conversationId, options);
      this.conversationRepository.sendCallingMessage(eventInfoEntity, conversationId);
      return 0;
    };

    const callClosed = (reason: number, conversationId: ConversationId) => {
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

    callingApi.set_group_chgjson_handler(wUser, (conversationId: ConversationId, membersJson: string) => {
      const call = this.findCall(conversationId);
      if (call) {
        const {members} = JSON.parse(membersJson);
        call.participants(members.map((member: any) => member.userid));
      }
    });

    callingApi.set_mute_handler(wUser, this.isMuted);
    callingApi.set_state_handler(wUser, (conversationId: ConversationId, state: number) => {
      const storedCall = this.findCall(conversationId);
      const call: Call = storedCall || {
        conversationId,
        participants: ko.observableArray(),
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

  findCall(conversationId: ConversationId): Call | undefined {
    return this.activeCalls().find((callInstance: Call) => callInstance.conversationId === conversationId);
  }

  storeCall(call: Call) {
    this.activeCalls.push(call);
  }

  removeCall(call: Call) {
    const index = this.activeCalls().indexOf(call);
    if (index !== -1) {
      this.activeCalls.splice(index, 1);
    }
  }

  /**
   * Extended check for calling support of browser.
   * @returns {boolean} True if calling is supported
   */
  get supportsCalling(): boolean {
    return Environment.browser.supports.calling;
  }

  /**
   * Extended check for screen sharing support of browser.
   * @returns {boolean} True if screen sharing is supported
   */
  get supportsScreenSharing(): boolean {
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
  onCallEvent(event: any, source: string) {
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

  //##############################################################################
  // Call actions
  //##############################################################################

  /**
   * User action to toggle the call state.
   *
   * @param mediaType - Media type of call
   * @param [conversationEntity] - Conversation for which state will be toggled
   * @returns {undefined} No return value
   */
  toggleState(mediaType: MediaType, conversationEntity: any = this.conversationRepository.active_conversation()) {
    if (conversationEntity) {
      // TODO deduce active call from avs api
      const isActiveCall = false;
      const isGroupCall = conversationEntity.isGroup() ? CONV_TYPE.GROUP : CONV_TYPE.ONEONONE;
      const callType = this.callTypeFromMediaType(mediaType);
      return isActiveCall
        ? this.leaveCall(conversationEntity.id)
        : this.startCall(conversationEntity.id, isGroupCall, callType);
    }
  }

  /**
   * Join a call.
   *
   * @param {string} conversationId - id of the conversation to join call in
   * @param {CONV_TYPE} conversationType - Type of the conversation (group or 1:1)
   * @param {CALL_TYPE} callType - Type of call (audio or video)
   * @returns {undefined} No return value
   */
  startCall(conversationId: ConversationId, conversationType: number, callType: number) {
    this.callingApi.start(this.wUser, conversationId, callType, conversationType, false);
  }

  answerCall(conversationId: ConversationId, callType: number) {
    this.callingApi.answer(this.wUser, conversationId, callType, false);
  }

  rejectCall(conversationId: ConversationId) {
    // TODO sort out if rejection should be shared accross devices (does avs handle it?)
    this.callingApi.reject(this.wUser, conversationId);
  }

  removeParticipant(conversationId: ConversationId, userId: UserId) {
    throw new Error('TODO: implement removeParticipant');
  }

  muteCall(conversationId: ConversationId, isMuted: boolean) {
    this.callingApi.set_mute(this.wUser, isMuted);
  }

  callTypeFromMediaType(mediaType: MediaType): number {
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
  leaveCall(conversationId: ConversationId) {
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
  /* TODO : migrate the error messages
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
  injectActivateEvent(conversationId: ConversationId, userId: UserId, time: number, source: string) {
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
  injectDeactivateEvent(
    conversationId: ConversationId,
    userId: UserId,
    reason: TERMINATION_REASON,
    time: number,
    source: string
  ) {
    const event = EventBuilder.buildVoiceChannelDeactivate(conversationId, userId, reason, time);
    this.eventRepository.injectEvent(event, source);
  }

  //##############################################################################
  // Helper functions
  //##############################################################################

  /**
   * Leave a call we are joined immediately in case the browser window is closed.
   * @note Should only used by "window.onbeforeunload".
   * @returns {undefined} No return value
   */
  leaveCallOnUnload() {
    this.activeCalls().forEach((call: Call) => this.callingApi.end(this.wUser, call.conversationId));
  }

  //##############################################################################
  // Calling config
  //##############################################################################

  /**
   * Get the current calling config.
   * @returns {Promise} Resolves with calling config
   */
  getConfig = (): Promise<any> => {
    if (this.callingConfig) {
      const isExpiredConfig = this.callingConfig.expiration.getTime() < Date.now();

      if (!isExpiredConfig) {
        this.callLogger.debug('Returning local calling configuration. No update needed.', this.callingConfig);
        return Promise.resolve(this.callingConfig);
      }

      this._clearConfig();
    }

    return this._getConfigFromBackend();
  };

  /**
   * Retrieves a calling config from the backend.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/tab.html#!//getCallsConfigV2
   * @see ./documentation/blob/master/topics/web/calling/calling-v3.md#limiting
   *
   * @param {number} [limit] - Limit the number of TURNs servers in the response (range 1, 10)
   * @returns {Promise} Resolves with call config information
   */
  fetchConfig(limit: number | undefined): Promise<any> {
    return this.backendClient.sendRequest({
      cache: false,
      data: {
        limit,
      },
      type: 'GET',
      url: '/calls/config/v2',
    });
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
  _getConfigFromBackend(): Promise<any> {
    const limit = Environment.browser.firefox ? CallingRepository.CONFIG.MAX_FIREFOX_TURN_COUNT : undefined;

    return this.fetchConfig(limit).then(callingConfig => {
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
   * Set logging on adapter.js.
   * @returns {undefined} No return value
   */
  _enableDebugging() {
    adapter.disableLog = false;
  }

  /**
   * Log call messages for debugging.
   *
   * @private
   * @param {boolean} isOutgoing - Is message outgoing
   * @param {CallMessageEntity} callMessageEntity - Call message to be logged in the sequence
   * @returns {undefined} No return value
   */
  /*
  _logMessage(isOutgoing: boolean, callMessageEntity: any) {
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
  */

  /**
   * Send Raygun report.
   *
   * @private
   * @param {Object} customData - Information to add to the call report
   * @returns {undefined} No return value
   */
  /* TODO migrate?
  _sendReport(customData) {
    Raygun.send(new Error('Call failure report'), customData);
    this.callLogger.debug(`Reported status of flow id '${customData.meta.flowId}' for call analysis`, customData);
  }
  */

  /**
   * Throw error is not expected types.
   *
   * @private
   * @param {z.error.CallError|Error} error - Error thrown during call message handling
   * @returns {undefined} No return value
   */
  /*
  _throwMessageError(error) {
    const expectedErrorTypes = [z.error.CallError.TYPE.MISTARGETED_MESSAGE, z.error.CallError.TYPE.NOT_FOUND];
    const isExpectedError = expectedErrorTypes.includes(error.type);

    if (!isExpectedError) {
      throw error;
    }
  }
  */

  /**
   * Show acknowledgement warning modal.
   *
   * @private
   * @param {string} title - modal title
   * @param {string} message - modal message
   * @returns {undefined} No return value
   */
  /*
  _showModal(title, message) {
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        message,
        title,
      },
    });
  }
  */

  /**
   * Check whether we are actively participating in a call.
   *
   * @private
   * @param {string} newCallId - Conversation ID of call about to be joined
   * @param {CALL_STATE} callState - Call state of new call
   * @returns {Promise} Resolves when the new call was joined
   */
  /* TODO use AVS
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
          action: () => {
            const terminationReason = 0;
            amplify.publish(WebAppEvents.CALL.STATE.LEAVE, ongoingCallId, terminationReason);
            window.setTimeout(resolve, TimeUtil.UNITS_IN_MILLIS.SECOND);
          },
          close: () => {
            const isIncomingCall = callState === CALL_STATE.INCOMING;
            if (isIncomingCall) {
              amplify.publish(WebAppEvents.CALL.STATE.REJECT, newCallId);
            }
          },
          text: {
            action: actionString,
            message: messageString,
            title: titleString,
          },
        });
        this.callLogger.warn(`You cannot join a second call while calling in conversation '${ongoingCallId}'.`);
      }
    });
  }
  */
}
