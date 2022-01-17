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

import axios from 'axios';
import {Runtime} from '@wireapp/commons';
import type {WebappProperties} from '@wireapp/api-client/src/user/data';
import type {QualifiedId} from '@wireapp/api-client/src/user';
import type {CallConfigData} from '@wireapp/api-client/src/account/CallConfigData';
import type {ClientMismatch, UserClients, QualifiedUserClients} from '@wireapp/api-client/src/conversation';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {
  CALL_TYPE,
  CONV_TYPE,
  ENV as AVS_ENV,
  ERROR,
  getAvsInstance,
  LOG_LEVEL,
  QUALITY,
  REASON,
  STATE as CALL_STATE,
  VIDEO_STATE,
  VSTREAMS,
  Wcall,
  WcallClient,
  WcallMember,
} from '@wireapp/avs';
import {WebAppEvents} from '@wireapp/webapp-events';
import {amplify} from 'amplify';
import ko from 'knockout';
import 'webrtc-adapter';
import {container} from 'tsyringe';

import {t} from 'Util/LocalizerUtil';
import {Logger, getLogger} from 'Util/Logger';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {flatten} from 'Util/ArrayUtil';
import {roundLogarithmic} from 'Util/NumberUtil';

import {Config} from '../Config';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';
import {CallingEvent, EventBuilder} from '../conversation/EventBuilder';
import {MessageSendingOptions} from '../conversation/EventInfoEntity';
import {EventRepository} from '../event/EventRepository';
import {MediaType} from '../media/MediaType';
import {Call, SerializedConversationId} from './Call';
import {CallState, MuteState} from './CallState';
import {ClientId, Participant, UserId} from './Participant';
import {EventName} from '../tracking/EventName';
import {Segmentation} from '../tracking/Segmentation';
import * as trackingHelpers from '../tracking/Helpers';
import type {MediaStreamHandler} from '../media/MediaStreamHandler';
import type {User} from '../entity/User';
import type {ServerTimeHandler} from '../time/serverTimeHandler';
import type {UserRepository} from '../user/UserRepository';
import type {EventRecord} from '../storage';
import type {EventSource} from '../event/EventSource';
import {CONSENT_TYPE, MessageRepository} from '../conversation/MessageRepository';
import type {MediaDevicesHandler} from '../media/MediaDevicesHandler';
import {NoAudioInputError} from '../error/NoAudioInputError';
import {APIClient} from '../service/APIClientSingleton';
import {ConversationState} from '../conversation/ConversationState';
import {TeamState} from '../team/TeamState';
import Warnings from '../view_model/WarningsContainer';
import {PayloadBundleState} from '@wireapp/core/src/main/conversation';
import {Core} from '../service/CoreSingleton';
import {isQualifiedUserClients} from '@wireapp/core/src/main/util';
import {
  flattenQualifiedUserClients,
  flattenUserClients,
} from '@wireapp/core/src/main/conversation/message/UserClientsUtil';

interface MediaStreamQuery {
  audio?: boolean;
  camera?: boolean;
  screen?: boolean;
}

type QualifiedWcallMember = Omit<WcallMember, 'userid'> & {userId: QualifiedId};

interface SendMessageTarget {
  clients: WcallClient[];
}

interface ActiveSpeaker {
  audio_level: number;
  audio_level_now: number;
  clientid: string;
  userid: string;
}

interface ActiveSpeakers {
  audio_levels: ActiveSpeaker[];
}

type Clients = {clientid: string; userid: string}[];

enum CALL_DIRECTION {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
}

export class CallingRepository {
  private readonly acceptVersionWarning: (conversationId: QualifiedId) => void;
  private readonly callLog: string[];
  private readonly logger: Logger;
  private avsVersion: number;
  private incomingCallCallback: (call: Call) => void;
  private isReady: boolean = false;
  /** will cache the query to media stream (in order to avoid asking the system for streams multiple times when we have multiple peers) */
  private mediaStreamQuery?: Promise<MediaStream>;
  private poorCallQualityUsers: {[conversationId: string]: string[]} = {};
  private selfClientId: ClientId;
  private selfUser: User;
  private wCall?: Wcall;
  private wUser?: number;
  private nextMuteState: MuteState;
  /**
   * Keeps track of the size of the avs log once the webapp is initiated. This allows detecting meaningless avs logs (logs that have a length equal to the length when the webapp was initiated)
   */
  private avsInitLogLength: number = 0;
  onChooseScreen: (deviceId: string) => void;

  static get CONFIG() {
    return {
      DEFAULT_CONFIG_TTL: 60 * 60, // 60 minutes in seconds
      MAX_FIREFOX_TURN_COUNT: 3,
    };
  }

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly eventRepository: EventRepository,
    private readonly userRepository: UserRepository,
    private readonly mediaStreamHandler: MediaStreamHandler,
    private readonly mediaDevicesHandler: MediaDevicesHandler,
    private readonly serverTimeHandler: ServerTimeHandler,
    private readonly apiClient = container.resolve(APIClient),
    private readonly conversationState = container.resolve(ConversationState),
    private readonly callState = container.resolve(CallState),
    private readonly teamState = container.resolve(TeamState),
    private readonly core = container.resolve(Core),
  ) {
    this.logger = getLogger('CallingRepository');
    this.incomingCallCallback = () => {};
    this.callLog = [];

    /** {<userId>: <isVerified>} */
    let callParticipants: Record<string, boolean> = {};
    ko.computed(() => {
      const activeCall = this.callState.joinedCall();
      if (!activeCall) {
        callParticipants = {};
        return;
      }

      for (const participant of activeCall.participants()) {
        const wasVerified = callParticipants[participant.user.id];
        const isVerified = participant.user.is_verified();

        callParticipants[participant.user.id] = isVerified;

        if (wasVerified === true && isVerified === false) {
          this.leaveCallOnUnverified(participant.user.qualifiedId);
          return;
        }
      }
    });

    this.acceptVersionWarning = (conversationId: QualifiedId) => {
      this.callState.acceptedVersionWarnings.push(conversationId);
      window.setTimeout(
        () => this.callState.acceptedVersionWarnings.remove(conversationId),
        TIME_IN_MILLIS.MINUTE * 15,
      );
    };

    this.subscribeToEvents();

    this.onChooseScreen = (deviceId: string) => {};

    ko.computed(() => {
      const call = this.callState.joinedCall();
      if (!call) {
        return;
      }
      const isSpeakersViewActive = this.callState.isSpeakersViewActive();
      if (isSpeakersViewActive) {
        this.requestVideoStreams(call.conversationId, call.activeSpeakers());
      }
    });
  }

  readonly toggleCbrEncoding = (vbrEnabled: boolean): void => {
    if (!Config.getConfig().FEATURE.ENFORCE_CONSTANT_BITRATE) {
      this.callState.cbrEncoding(vbrEnabled ? 0 : 1);
    }
  };

  getStats(conversationId: QualifiedId): Promise<{stats: RTCStatsReport; userid: string}[]> {
    return this.wCall.getStats(this.serializeQualifiedId(conversationId));
  }

  async initAvs(selfUser: User, clientId: ClientId): Promise<{wCall: Wcall; wUser: number}> {
    this.selfUser = selfUser;
    this.selfClientId = clientId;
    const callingInstance = await getAvsInstance();

    this.wCall = this.configureCallingApi(callingInstance);
    this.wUser = this.createWUser(this.wCall, this.serializeQualifiedId(this.selfUser.qualifiedId), clientId);
    return {wCall: this.wCall, wUser: this.wUser};
  }

  setReady(): void {
    this.isReady = true;
    this.avsInitLogLength = this.callLog.length;
  }

  private configureCallingApi(wCall: Wcall): Wcall {
    const avsLogger = getLogger('avs');
    const logLevels: Record<LOG_LEVEL, string> = {
      [LOG_LEVEL.DEBUG]: 'DEBUG',
      [LOG_LEVEL.INFO]: 'INFO ',
      [LOG_LEVEL.WARN]: 'WARN ',
      [LOG_LEVEL.ERROR]: 'ERROR',
    };
    const logFunctions: Record<LOG_LEVEL, Function> = {
      [LOG_LEVEL.DEBUG]: avsLogger.debug,
      [LOG_LEVEL.INFO]: avsLogger.log,
      [LOG_LEVEL.WARN]: avsLogger.warn,
      [LOG_LEVEL.ERROR]: avsLogger.error,
    };

    wCall.setLogHandler((level: LOG_LEVEL, message: string, error: Error) => {
      const trimmedMessage = message.trim();
      logFunctions[level].call(avsLogger, trimmedMessage, error);
      this.callLog.push(`${new Date().toISOString()} [${logLevels[level]}] ${trimmedMessage}`);
    });

    const avsEnv = Runtime.isFirefox() ? AVS_ENV.FIREFOX : AVS_ENV.DEFAULT;
    wCall.init(avsEnv);
    wCall.setUserMediaHandler(this.getCallMediaStream);
    wCall.setAudioStreamHandler(this.updateCallAudioStreams);
    wCall.setVideoStreamHandler(this.updateParticipantVideoStream);
    setInterval(() => wCall.poll(), 500);
    return wCall;
  }

  private createWUser(wCall: Wcall, selfUserId: string, selfClientId: string): number {
    /* cspell:disable */
    const wUser = wCall.create(
      selfUserId,
      selfClientId,
      this.setAvsVersion, // `readyh`,
      this.sendMessage, // `sendh`,
      this.sendSFTRequest, // `sfth`
      this.incomingCall, // `incomingh`,
      () => {}, // `missedh`,
      () => {}, // `answerh`,
      () => {}, // `estabh`,
      this.callClosed, // `closeh`,
      () => {}, // `metricsh`,
      this.requestConfig, // `cfg_reqh`,
      this.audioCbrChanged, // `acbrh`,
      this.videoStateChanged, // `vstateh`,
    );
    /* cspell:enable */
    const tenSeconds = 10;
    wCall.setNetworkQualityHandler(wUser, this.updateCallQuality, tenSeconds);
    wCall.setMuteHandler(wUser, this.updateMuteState);
    wCall.setStateHandler(wUser, this.updateCallState);
    wCall.setParticipantChangedHandler(wUser, this.handleCallParticipantChanges);
    wCall.setReqClientsHandler(wUser, this.requestClients);
    wCall.setActiveSpeakerHandler(wUser, this.updateActiveSpeakers);

    return wUser;
  }

  private readonly updateMuteState = (isMuted: number) => {
    this.callState.muteState(isMuted ? this.nextMuteState : MuteState.NOT_MUTED);
  };

  private async pushClients(call: Call, checkMismatch?: boolean): Promise<boolean> {
    const {id, domain} = call.conversationId;
    const missing = await this.core.service!.conversation.getAllParticipantsClients(id, domain);
    const qualifiedClients = isQualifiedUserClients(missing)
      ? flattenQualifiedUserClients(missing)
      : flattenUserClients(missing);

    const clients: Clients = flatten(
      qualifiedClients.map(({data, userId}) =>
        data.map(clientid => ({clientid, userid: this.serializeQualifiedId(userId)})),
      ),
    );
    this.wCall.setClientsForConv(this.wUser, this.serializeQualifiedId(call.conversationId), JSON.stringify({clients}));
    // We warn the message repository that a mismatch has happened outside of its lifecycle (eventually triggering a conversation degradation)
    const consentType =
      this.getCallDirection(call) === CALL_DIRECTION.INCOMING ? CONSENT_TYPE.INCOMING_CALL : CONSENT_TYPE.OUTGOING_CALL;
    return checkMismatch
      ? this.messageRepository.handleClientMismatch(call.conversationId, {missing} as ClientMismatch, consentType)
      : true;
  }

  private readonly updateCallQuality = (
    conversationId: SerializedConversationId,
    userId: string,
    clientId: string,
    quality: number,
  ) => {
    const call = this.findCall(this.parseQualifiedId(conversationId));
    if (!call) {
      return;
    }
    if (!this.poorCallQualityUsers[conversationId]) {
      this.poorCallQualityUsers[conversationId] = [];
    }

    let users = this.poorCallQualityUsers[conversationId];
    const isOldPoorCallQualityUser = users.some(_userId => _userId === userId);
    if (isOldPoorCallQualityUser && quality === QUALITY.NORMAL) {
      users = users.filter(_userId => _userId !== userId);
    }
    if (!isOldPoorCallQualityUser && quality !== QUALITY.NORMAL) {
      users = [...users, userId];
    }
    if (users.length === call.participants.length - 1) {
      amplify.publish(WebAppEvents.WARNING.SHOW, Warnings.TYPE.CALL_QUALITY_POOR);
    } else {
      amplify.publish(WebAppEvents.WARNING.DISMISS, Warnings.TYPE.CALL_QUALITY_POOR);
    }

    switch (quality) {
      case QUALITY.NORMAL: {
        this.logger.log(
          `Normal call quality with user "${userId}" and client "${clientId}" in conversation "${conversationId}".`,
        );
        break;
      }
      case QUALITY.MEDIUM: {
        this.logger.warn(
          `Medium call quality with user "${userId}" and client "${clientId}" in conversation "${conversationId}".`,
        );
        break;
      }
      case QUALITY.POOR: {
        this.logger.warn(
          `Poor call quality with user "${userId}" and client "${clientId}" in conversation "${conversationId}".`,
        );
        break;
      }
      case QUALITY.NETWORK_PROBLEM: {
        this.logger.warn(
          `Network problem during call with user "${userId}" and client "${clientId}" in conversation "${conversationId}".`,
        );
        break;
      }
    }
  };

  onIncomingCall(callback: (call: Call) => void): void {
    this.incomingCallCallback = callback;
  }

  findCall(conversationId: QualifiedId): Call | undefined {
    return this.callState
      .activeCalls()
      .find((callInstance: Call) => matchQualifiedIds(callInstance.conversationId, conversationId));
  }

  private findParticipant(
    conversationId: QualifiedId,
    userId: QualifiedId,
    clientId: ClientId,
  ): Participant | undefined {
    const call = this.findCall(conversationId);
    return call?.getParticipant(userId, clientId);
  }

  private storeCall(call: Call): void {
    this.callState.activeCalls.push(call);
    const conversation = this.conversationState.findConversation(call.conversationId);
    if (conversation) {
      conversation.call(call);
    }
  }

  private removeCall(call: Call): void {
    const index = this.callState.activeCalls().indexOf(call);
    call.getSelfParticipant().releaseMediaStream(true);
    call.participants.removeAll();
    call.removeAllAudio();
    if (index !== -1) {
      this.callState.activeCalls.splice(index, 1);
    }
    const conversation = this.conversationState.findConversation(call.conversationId);
    if (conversation) {
      conversation.call(null);
    }
  }

  private async warmupMediaStreams(call: Call, audio: boolean, camera: boolean): Promise<boolean> {
    // if it's a video call we query the video user media in order to display the video preview
    const isGroup = [CONV_TYPE.CONFERENCE, CONV_TYPE.GROUP].includes(call.conversationType);
    try {
      camera = this.teamState.isVideoCallingEnabled() ? camera : false;
      const mediaStream = await this.getMediaStream({audio, camera}, isGroup);
      if (call.state() !== CALL_STATE.NONE) {
        call.getSelfParticipant().updateMediaStream(mediaStream, true);
        if (camera) {
          call.getSelfParticipant().videoState(VIDEO_STATE.STARTED);
        }
      } else {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Checks if browser supports all WebRTC APIs which are required for conference calling. Users with Chrome 83 need to enable "Experimental Web Platform features" (--enable-experimental-web-platform-features) to use all required APIs.
   *
   * @returns `true` if browser supports WebRTC Insertable Streams
   * @see https://www.chromestatus.com/feature/6321945865879552
   */
  get supportsConferenceCalling(): boolean {
    return Runtime.isSupportingConferenceCalling();
  }

  /**
   * Extended check for calling support of browser.
   * @returns `true` if calling is supported
   */
  get supportsCalling(): boolean {
    return Runtime.isSupportingLegacyCalling();
  }

  /**
   * Extended check for screen sharing support of browser.
   * @returns `true` if screen sharing is supported
   */
  get supportsScreenSharing(): boolean {
    return Runtime.isSupportingScreensharing();
  }

  /**
   * Subscribe to amplify topics.
   */
  subscribeToEvents(): void {
    amplify.subscribe(WebAppEvents.CALL.EVENT_FROM_BACKEND, this.onCallEvent);
    amplify.subscribe(WebAppEvents.CALL.STATE.TOGGLE, this.toggleState); // This event needs to be kept, it is sent by the wrapper
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.CALL.ENABLE_VBR_ENCODING, this.toggleCbrEncoding);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, ({settings}: WebappProperties) => {
      this.toggleCbrEncoding(settings.call.enable_vbr_encoding);
    });
  }

  /**
   * Leave call when a participant is not verified anymore
   */
  private readonly leaveCallOnUnverified = (unverifiedUserId: QualifiedId): void => {
    const activeCall = this.callState.joinedCall();

    if (!activeCall) {
      return;
    }

    const clients = this.userRepository.findUserById(unverifiedUserId).devices();

    for (const {id: clientId} of clients) {
      const participant = activeCall.getParticipant(unverifiedUserId, clientId);

      if (participant) {
        this.leaveCall(activeCall.conversationId);
        amplify.publish(
          WebAppEvents.WARNING.MODAL,
          ModalsViewModel.TYPE.ACKNOWLEDGE,
          {
            action: {
              title: t('callDegradationAction'),
            },
            text: {
              message: t('callDegradationDescription', participant.user.name()),
              title: t('callDegradationTitle'),
            },
          },
          `degraded-${activeCall.conversationId}`,
        );
      }
    }
  };

  //##############################################################################
  // Inbound call events
  //##############################################################################

  private abortCall(conversationId: QualifiedId): void {
    const call = this.findCall(conversationId);
    if (call) {
      // we flag the call in order to prevent sending further messages
      call.blockMessages = true;
    }
    this.leaveCall(conversationId);
  }

  private warnOutdatedClient(conversationId: QualifiedId) {
    const brandName = Config.getConfig().BRAND_NAME;
    amplify.publish(
      WebAppEvents.WARNING.MODAL,
      ModalsViewModel.TYPE.ACKNOWLEDGE,
      {
        close: () => this.acceptVersionWarning(conversationId),
        text: {
          message: t('modalCallUpdateClientMessage', brandName),
          title: t('modalCallUpdateClientHeadline', brandName),
        },
      },
      'update-client-warning',
    );
  }

  /**
   * Handle incoming calling events from backend.
   */
  onCallEvent = async (event: CallingEvent, source: string): Promise<void> => {
    const {content, conversation, qualified_conversation, from, qualified_from, sender: clientId, time} = event;
    const isFederated = Config.getConfig().FEATURE.ENABLE_FEDERATION && qualified_conversation && qualified_from;
    const userId = isFederated ? qualified_from : {domain: '', id: from};
    const conversationId = isFederated ? qualified_conversation : {domain: '', id: conversation};
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const toSecond = (timestamp: number) => Math.floor(timestamp / 1000);
    const contentStr = JSON.stringify(content);

    switch (content.type) {
      case CALL_MESSAGE_TYPE.GROUP_LEAVE: {
        const isAnotherSelfClient =
          matchQualifiedIds(userId, this.selfUser.qualifiedId) && clientId !== this.selfClientId;
        if (isAnotherSelfClient) {
          const call = this.findCall(conversationId);
          if (call?.state() === CALL_STATE.INCOMING) {
            // If the group leave was sent from the self user from another device,
            // we reset the reason so that the call is not shown in the UI.
            // If the call is already accepted, we keep the call UI.
            call.reason(REASON.STILL_ONGOING);
          }
        }
        break;
      }
      case CALL_MESSAGE_TYPE.CONFKEY: {
        if (source !== EventRepository.SOURCE.STREAM) {
          const {id, domain} = conversationId;
          const missing = await this.core.service!.conversation.getAllParticipantsClients(id, domain);
          // We warn the message repository that a mismatch has happened outside of its lifecycle (eventually triggering a conversation degradation)
          const shouldContinue = await this.messageRepository.handleClientMismatch(
            conversationId,
            {missing} as ClientMismatch,
            CONSENT_TYPE.INCOMING_CALL,
          );

          if (!shouldContinue) {
            this.abortCall(conversationId);
          }
        }
        break;
      }
      case CALL_MESSAGE_TYPE.REMOTE_MUTE: {
        const call = this.findCall(conversationId);
        if (call) {
          this.muteCall(call, true, MuteState.REMOTE_MUTED);
        }
        break;
      }
      case CALL_MESSAGE_TYPE.REMOTE_KICK: {
        this.leaveCall(conversationId);
        break;
      }
    }

    const res = this.wCall.recvMsg(
      this.wUser,
      contentStr,
      contentStr.length,
      toSecond(currentTimestamp),
      toSecond(new Date(time).getTime()),
      this.serializeQualifiedId(conversationId),
      this.serializeQualifiedId(userId),
      clientId,
    );

    if (res !== 0) {
      this.logger.warn(`recv_msg failed with code: ${res}`);
      if (
        this.callState.acceptedVersionWarnings().every(acceptedId => !matchQualifiedIds(acceptedId, conversationId)) &&
        res === ERROR.UNKNOWN_PROTOCOL &&
        event.content.type === 'CONFSTART'
      ) {
        this.warnOutdatedClient(conversationId);
      }
      return;
    }
    return this.handleCallEventSaving(content.type, conversationId, userId, time, source);
  };

  private handleCallEventSaving(
    type: string,
    conversationId: QualifiedId,
    userId: QualifiedId,
    time: string,
    source: string,
  ): void {
    // save event if needed
    switch (type) {
      case CALL_MESSAGE_TYPE.SETUP:
      case CALL_MESSAGE_TYPE.CONF_START:
      case CALL_MESSAGE_TYPE.GROUP_START:
        const activeCall = this.findCall(conversationId);
        const ignoreNotificationStates = [CALL_STATE.MEDIA_ESTAB, CALL_STATE.ANSWERED, CALL_STATE.OUTGOING];
        if (!activeCall || !ignoreNotificationStates.includes(activeCall.state())) {
          // we want to ignore call start events that already have an active call (whether it's ringing or connected).
          this.injectActivateEvent(conversationId, userId, time, source);
        }
        break;
    }
  }

  //##############################################################################
  // Call actions
  //##############################################################################

  private readonly toggleState = (withVideo: boolean): void => {
    const conversationEntity = this.conversationState.activeConversation();
    if (conversationEntity) {
      const isActiveCall = this.findCall(conversationEntity.qualifiedId);
      const isGroupCall = conversationEntity.isGroup() ? CONV_TYPE.GROUP : CONV_TYPE.ONEONONE;
      const callType = withVideo ? CALL_TYPE.VIDEO : CALL_TYPE.NORMAL;
      return (
        (isActiveCall
          ? this.leaveCall(conversationEntity.qualifiedId)
          : this.startCall(conversationEntity.qualifiedId, isGroupCall, callType)) && undefined
      );
    }
  };

  async startCall(conversationId: QualifiedId, conversationType: CONV_TYPE, callType: CALL_TYPE): Promise<void | Call> {
    const convId = this.serializeQualifiedId(conversationId);
    this.logger.log(`Starting a call of type "${callType}" in conversation ID "${convId}"...`);
    try {
      await this.checkConcurrentJoinedCall(conversationId, CALL_STATE.OUTGOING);
      conversationType =
        conversationType === CONV_TYPE.GROUP && this.supportsConferenceCalling
          ? CONV_TYPE.CONFERENCE
          : conversationType;
      const rejectedCallInConversation = this.findCall(conversationId);
      if (rejectedCallInConversation) {
        // if there is a rejected call, we can remove it from the store
        rejectedCallInConversation.state(CALL_STATE.NONE);
        this.removeCall(rejectedCallInConversation);
      }
      const selfParticipant = new Participant(this.selfUser, this.selfClientId);
      const call = new Call(
        this.selfUser.qualifiedId,
        conversationId,
        conversationType,
        selfParticipant,
        callType,
        this.mediaDevicesHandler,
      );
      this.storeCall(call);
      const loadPreviewPromise =
        [CONV_TYPE.CONFERENCE, CONV_TYPE.GROUP].includes(conversationType) && callType === CALL_TYPE.VIDEO
          ? this.warmupMediaStreams(call, true, true)
          : Promise.resolve(true);
      const success = await loadPreviewPromise;
      if (success) {
        this.wCall.start(this.wUser, convId, callType, conversationType, this.callState.cbrEncoding());
        this.sendCallingEvent(EventName.CALLING.INITIATED_CALL, call);
        this.sendCallingEvent(EventName.CONTRIBUTED, call, {
          [Segmentation.MESSAGE.ACTION]: callType === CALL_TYPE.VIDEO ? 'video_call' : 'audio_call',
        });
      } else {
        this.showNoCameraModal();
        this.removeCall(call);
      }
      return call;
    } catch (error) {
      if (error) {
        this.logger.error('Failed starting call', error);
      }
    }
  }

  private serializeQualifiedId(id: QualifiedId): string {
    if (id.domain && Config.getConfig().FEATURE.ENABLE_FEDERATION) {
      return `${id.id}@${id.domain}`;
    }
    return id.id;
  }

  private parseQualifiedId(multiplexedId: string): QualifiedId {
    const [id, domain = ''] = multiplexedId.split('@');
    return {domain, id};
  }

  /**
   * Toggles the camera ON and OFF for the given call (does not switch between different cameras)
   */
  toggleCamera(call: Call): void {
    const selfParticipant = call.getSelfParticipant();
    const newState = selfParticipant.sharesCamera() ? VIDEO_STATE.STOPPED : VIDEO_STATE.STARTED;
    if (call.state() === CALL_STATE.INCOMING) {
      selfParticipant.videoState(newState);
      if (newState === VIDEO_STATE.STOPPED) {
        selfParticipant.releaseVideoStream(true);
      } else {
        this.warmupMediaStreams(call, false, true);
      }
    }
    this.wCall.setVideoSendState(this.wUser, this.serializeQualifiedId(call.conversationId), newState);
  }

  /**
   * Toggles screenshare ON and OFF for the given call (does not switch between different screens)
   */
  toggleScreenshare = async (call: Call): Promise<void> => {
    const selfParticipant = call.getSelfParticipant();
    if (selfParticipant.sharesScreen()) {
      selfParticipant.videoState(VIDEO_STATE.STOPPED);
      this.sendCallingEvent(EventName.CALLING.SCREEN_SHARE, call, {
        [Segmentation.SCREEN_SHARE.DIRECTION]: 'outgoing',
        [Segmentation.SCREEN_SHARE.DURATION]:
          Math.ceil((Date.now() - selfParticipant.startedScreenSharingAt()) / 5000) * 5,
      });
      return this.wCall.setVideoSendState(
        this.wUser,
        this.serializeQualifiedId(call.conversationId),
        VIDEO_STATE.STOPPED,
      );
    }
    try {
      const isGroup = [CONV_TYPE.CONFERENCE, CONV_TYPE.GROUP].includes(call.conversationType);
      const mediaStream = await this.getMediaStream({audio: true, screen: true}, isGroup);
      // https://stackoverflow.com/a/25179198/451634
      mediaStream.getVideoTracks()[0].onended = () => {
        this.wCall.setVideoSendState(this.wUser, this.serializeQualifiedId(call.conversationId), VIDEO_STATE.STOPPED);
      };
      const selfParticipant = call.getSelfParticipant();
      selfParticipant.videoState(VIDEO_STATE.SCREENSHARE);
      selfParticipant.updateMediaStream(mediaStream, true);
      this.wCall.setVideoSendState(this.wUser, this.serializeQualifiedId(call.conversationId), VIDEO_STATE.SCREENSHARE);
      selfParticipant.startedScreenSharingAt(Date.now());
    } catch (error) {
      this.logger.info('Failed to get screen sharing stream', error);
    }
  };

  async answerCall(call: Call, callType?: CALL_TYPE): Promise<void> {
    try {
      callType ??= call.getSelfParticipant().sharesCamera() ? call.initialType : CALL_TYPE.NORMAL;
      await this.checkConcurrentJoinedCall(call.conversationId, CALL_STATE.INCOMING);

      const isVideoCall = callType === CALL_TYPE.VIDEO;
      if (!isVideoCall) {
        call.getSelfParticipant().releaseVideoStream(true);
      }
      await this.warmupMediaStreams(call, true, isVideoCall);
      const shouldContinueCall = await this.pushClients(call, true);
      if (!shouldContinueCall) {
        this.rejectCall(call.conversationId);
        return;
      }

      if (Config.getConfig().FEATURE.CONFERENCE_AUTO_MUTE && call.conversationType === CONV_TYPE.CONFERENCE) {
        this.setMute(true);
      }

      this.wCall.answer(
        this.wUser,
        this.serializeQualifiedId(call.conversationId),
        callType,
        this.callState.cbrEncoding(),
      );

      this.sendCallingEvent(EventName.CALLING.JOINED_CALL, call, {
        [Segmentation.CALL.DIRECTION]: this.getCallDirection(call),
      });
    } catch (error) {
      if (error) {
        this.logger.error('Failed answering call', error);
      }
      this.rejectCall(call.conversationId);
    }
  }

  rejectCall(conversationId: QualifiedId): void {
    this.wCall.reject(this.wUser, this.serializeQualifiedId(conversationId));
  }

  changeCallPage(newPage: number, call: Call): void {
    call.currentPage(newPage);
    if (!this.callState.isSpeakersViewActive()) {
      this.requestCurrentPageVideoStreams();
    }
  }

  requestCurrentPageVideoStreams(): void {
    const call = this.callState.joinedCall();
    if (!call) {
      return;
    }
    const currentPageParticipants = call.pages()[call.currentPage()];
    this.requestVideoStreams(call.conversationId, currentPageParticipants);
  }

  requestVideoStreams(conversationId: QualifiedId, participants: Participant[]) {
    const convId = this.serializeQualifiedId(conversationId);
    const payload = {
      clients: participants.map(participant => ({
        clientid: participant.clientId,
        userid: this.serializeQualifiedId(participant.user.qualifiedId),
      })),
      convid: convId,
    };
    this.wCall.requestVideoStreams(this.wUser, convId, VSTREAMS.LIST, JSON.stringify(payload));
  }

  readonly leaveCall = (conversationId: QualifiedId): void => {
    const conversationIdStr = this.serializeQualifiedId(conversationId);
    delete this.poorCallQualityUsers[conversationIdStr];
    this.wCall.end(this.wUser, conversationIdStr);
  };

  muteCall(call: Call, shouldMute: boolean, reason?: MuteState): void {
    if (call.hasWorkingAudioInput === false && this.callState.isMuted()) {
      this.showNoAudioInputModal();
      return;
    }
    this.setMute(shouldMute, reason);
  }

  setMute(shouldMute: boolean, reason: MuteState = MuteState.SELF_MUTED): void {
    this.nextMuteState = reason;
    this.wCall.setMute(this.wUser, shouldMute ? 1 : 0);
  }

  private readonly setAvsVersion = (version: number) => {
    this.avsVersion = version;
  };

  private getMediaStream({audio, camera, screen}: MediaStreamQuery, isGroup: boolean): Promise<MediaStream> {
    return this.mediaStreamHandler.requestMediaStream(audio, camera, screen, isGroup);
  }

  private handleMediaStreamError(call: Call, requestedStreams: MediaStreamQuery, error: Error): void {
    if (error instanceof NoAudioInputError) {
      this.muteCall(call, true);
      this.showNoAudioInputModal();
      return;
    }

    const validStateWithoutCamera = [CALL_STATE.MEDIA_ESTAB, CALL_STATE.ANSWERED];

    if (call && !validStateWithoutCamera.includes(call.state())) {
      this.showNoCameraModal();
      this.leaveCall(call.conversationId);
      return;
    }

    if (call.state() !== CALL_STATE.ANSWERED) {
      if (requestedStreams.camera) {
        this.showNoCameraModal();
      }
      this.wCall.setVideoSendState(this.wUser, this.serializeQualifiedId(call.conversationId), VIDEO_STATE.STOPPED);
    }
  }

  public async refreshVideoInput(): Promise<MediaStream> {
    const stream = await this.mediaStreamHandler.requestMediaStream(false, true, false, false);
    this.stopMediaSource(MediaType.VIDEO);
    this.changeMediaSource(stream, MediaType.VIDEO);
    return stream;
  }

  public async refreshAudioInput(): Promise<MediaStream> {
    const stream = await this.mediaStreamHandler.requestMediaStream(true, false, false, false);
    this.stopMediaSource(MediaType.AUDIO);
    this.changeMediaSource(stream, MediaType.AUDIO);
    return stream;
  }

  /**
   * @returns `true` if a media stream has been stopped.
   */
  public stopMediaSource(mediaType: MediaType): boolean {
    const activeCall = this.callState.joinedCall();
    if (!activeCall) {
      return false;
    }
    const selfParticipant = activeCall.getSelfParticipant();
    switch (mediaType) {
      case MediaType.AUDIO:
        selfParticipant.releaseAudioStream();
        break;

      case MediaType.VIDEO: {
        // Don't stop video input (coming from A/V preferences) when screensharing is activated
        if (!selfParticipant.sharesScreen()) {
          selfParticipant.releaseVideoStream(true);
        }
        break;
      }
    }
    return true;
  }

  /**
   * Will change the input source of all the active calls for the given media type
   */
  public changeMediaSource(
    mediaStream: MediaStream,
    mediaType: MediaType,
    call: Call = this.callState.joinedCall(),
  ): void {
    if (!call) {
      return;
    }
    const selfParticipant = call.getSelfParticipant();

    if (mediaType === MediaType.AUDIO) {
      const audioTracks = mediaStream.getAudioTracks().map(track => track.clone());
      if (audioTracks.length > 0) {
        selfParticipant.setAudioStream(new MediaStream(audioTracks), true);
        this.wCall.replaceTrack(this.serializeQualifiedId(call.conversationId), audioTracks[0]);
      }
    }

    // Don't update video input (coming from A/V preferences) when screensharing is activated
    if (mediaType === MediaType.VIDEO && selfParticipant.sharesCamera() && !selfParticipant.sharesScreen()) {
      const videoTracks = mediaStream.getVideoTracks().map(track => track.clone());
      if (videoTracks.length > 0) {
        selfParticipant.setVideoStream(new MediaStream(videoTracks), true);
        this.wCall.replaceTrack(this.serializeQualifiedId(call.conversationId), videoTracks[0]);
      }
    }
  }

  private mapTargets(targets: SendMessageTarget): UserClients {
    const recipients: UserClients = {};

    for (const target of targets.clients) {
      const {userid, clientid} = target;

      if (!recipients[userid]) {
        recipients[userid] = [];
      }

      recipients[userid].push(clientid);
    }

    return recipients;
  }

  private mapQualifiedTargets(targets: SendMessageTarget): QualifiedUserClients {
    const recipients = targets.clients.reduce((acc, {userid, clientid}) => {
      const {domain: parsedDomain, id} = this.parseQualifiedId(userid);
      const domain = parsedDomain || this.selfUser.domain;
      const domainRecipients = (acc[domain] = acc[domain] ?? {});
      domainRecipients[id] = [...(domainRecipients[id] ?? []), clientid];
      return acc;
    }, {} as QualifiedUserClients);
    return recipients;
  }

  private injectActivateEvent(conversationId: QualifiedId, userId: QualifiedId, time: string, source: string): void {
    const event = EventBuilder.buildVoiceChannelActivate(conversationId, userId, time, this.avsVersion);
    this.eventRepository.injectEvent(event as unknown as EventRecord, source as EventSource);
  }

  private injectDeactivateEvent(
    conversationId: QualifiedId,
    userId: QualifiedId,
    duration: number,
    reason: REASON,
    time: string,
    source: string,
  ): void {
    const event = EventBuilder.buildVoiceChannelDeactivate(
      conversationId,
      userId,
      duration,
      reason,
      time,
      this.avsVersion,
    );
    this.eventRepository.injectEvent(event as unknown as EventRecord, source as EventSource);
  }

  private readonly sendMessage = (
    _context: number,
    convId: SerializedConversationId,
    _userId: UserId,
    _clientId: ClientId,
    targets: string | null,
    _unused: null,
    payload: string,
  ): number => {
    const conversationId = this.parseQualifiedId(convId);
    const call = this.findCall(conversationId);
    if (call?.blockMessages) {
      return 0;
    }
    let options: MessageSendingOptions | undefined = undefined;

    if (typeof targets === 'string') {
      const parsedTargets: SendMessageTarget = JSON.parse(targets);
      const isFederated = Config.getConfig().FEATURE.ENABLE_FEDERATION;
      const recipients = isFederated ? this.mapQualifiedTargets(parsedTargets) : this.mapTargets(parsedTargets);
      options = {
        nativePush: true,
        precondition: true,
        recipients,
      };
    }

    this.sendCallingMessage(conversationId, payload, options).catch(() => this.abortCall(conversationId));
    return 0;
  };

  private readonly sendCallingMessage = async (
    conversationId: QualifiedId,
    payload: string | Object,
    options?: MessageSendingOptions,
  ) => {
    const conversation = this.conversationState.findConversation(conversationId);
    const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const message = await this.messageRepository.sendCallingMessage(conversation, content, options);
    if (message.state === PayloadBundleState.CANCELLED) {
      // If the user has cancelled message sending because of a degradation warning, we abort the call
      this.abortCall(conversationId);
    }
  };

  readonly sendModeratorMute = (conversationId: QualifiedId, recipients: Record<UserId, ClientId[]>) => {
    this.sendCallingMessage(
      conversationId,
      {type: CALL_MESSAGE_TYPE.REMOTE_MUTE},
      {
        nativePush: true,
        precondition: true,
        recipients,
      },
    );
  };

  readonly sendModeratorKick = (conversationId: QualifiedId, recipients: Record<UserId, ClientId[]>) => {
    this.sendCallingMessage(
      conversationId,
      {type: CALL_MESSAGE_TYPE.REMOTE_KICK},
      {
        nativePush: true,
        precondition: true,
        recipients,
      },
    );
  };

  private readonly sendSFTRequest = (
    context: number,
    url: string,
    data: string,
    _dataLength: number,
    _: number,
  ): number => {
    (async () => {
      const response = await axios.post(url, data);

      const {status, data: axiosData} = response;
      const jsonData = JSON.stringify(axiosData);
      this.wCall.sftResp(this.wUser!, status, jsonData, jsonData.length, context);
    })();

    return 0;
  };

  private readonly requestConfig = () => {
    (async () => {
      const limit = Runtime.isFirefox() ? CallingRepository.CONFIG.MAX_FIREFOX_TURN_COUNT : undefined;
      try {
        const config = await this.fetchConfig(limit);
        this.wCall.configUpdate(this.wUser, 0, JSON.stringify(config));
      } catch (error) {
        this.logger.warn('Failed fetching calling config', error);
        this.wCall.configUpdate(this.wUser, 1, '');
      }
    })();

    return 0;
  };

  private readonly callClosed = (reason: REASON, convId: SerializedConversationId) => {
    amplify.publish(WebAppEvents.WARNING.DISMISS, Warnings.TYPE.CALL_QUALITY_POOR);
    const conversationId = this.parseQualifiedId(convId);
    const call = this.findCall(conversationId);
    if (!call) {
      return;
    }

    if (reason === REASON.NORMAL) {
      this.callState.selectableScreens([]);
      this.callState.selectableWindows([]);
    }

    if (reason === REASON.NOONE_JOINED || reason === REASON.EVERYONE_LEFT) {
      const conversationEntity = this.conversationState.findConversation(conversationId);
      const callingEvent = EventBuilder.buildCallingTimeoutEvent(
        reason,
        conversationEntity,
        call.getSelfParticipant().user.id,
      );
      this.eventRepository.injectEvent(callingEvent as EventRecord);
    }

    if (reason === REASON.OUTDATED_CLIENT) {
      this.warnOutdatedClient(conversationId);
    }

    const stillActiveState = [REASON.STILL_ONGOING, REASON.ANSWERED_ELSEWHERE, REASON.REJECTED];

    this.sendCallingEvent(EventName.CALLING.ENDED_CALL, call, {
      [Segmentation.CALL.AV_SWITCH_TOGGLE]: call.analyticsAvSwitchToggle,
      [Segmentation.CALL.DIRECTION]: this.getCallDirection(call),
      [Segmentation.CALL.DURATION]: Math.ceil((Date.now() - call.startedAt()) / 5000) * 5,
      [Segmentation.CALL.END_REASON]: reason,
      [Segmentation.CALL.PARTICIPANTS]: call.analyticsMaximumParticipants,
      [Segmentation.CALL.SCREEN_SHARE]: call.analyticsScreenSharing,
    });

    const selfParticipant = call.getSelfParticipant();
    /**
     * Handle case where user hangs up the call directly
     * and skips clicking on stop screen share
     */
    call.participants().forEach(participant => {
      if (participant.videoState() === VIDEO_STATE.SCREENSHARE && participant.startedScreenSharingAt() > 0) {
        const isSameUser = selfParticipant.doesMatchIds(participant.user.qualifiedId, participant.clientId);
        this.sendCallingEvent(EventName.CALLING.SCREEN_SHARE, call, {
          [Segmentation.SCREEN_SHARE.DIRECTION]: isSameUser ? CALL_DIRECTION.OUTGOING : CALL_DIRECTION.INCOMING,
          [Segmentation.SCREEN_SHARE.DURATION]:
            Math.ceil((Date.now() - participant.startedScreenSharingAt()) / 5000) * 5,
        });
      }
    });

    if (!stillActiveState.includes(reason)) {
      this.injectDeactivateEvent(
        call.conversationId,
        call.initiator,
        call.startedAt() ? Date.now() - call.startedAt() : 0,
        reason,
        new Date().toISOString(),
        EventRepository.SOURCE.WEB_SOCKET,
      );
      this.removeCall(call);
      return;
    }
    selfParticipant.releaseMediaStream(true);
    call.removeAllAudio();
    selfParticipant.videoState(VIDEO_STATE.STOPPED);
    call.reason(reason);
  };

  private readonly incomingCall = (
    convId: SerializedConversationId,
    timestamp: number,
    userId: UserId,
    clientId: string,
    hasVideo: number,
    shouldRing: number,
    conversationType: CONV_TYPE,
  ) => {
    const conversationId = this.parseQualifiedId(convId);
    const conversationEntity = this.conversationState.findConversation(conversationId);
    if (!conversationEntity) {
      return;
    }
    const storedCall = this.findCall(conversationId);
    if (storedCall) {
      // A call that has been picked up by another device can still be in storage.
      // When a second call arrives in the same conversation, we need to clean that call first
      this.removeCall(storedCall);
    }
    const canRing = !conversationEntity.showNotificationsNothing() && shouldRing && this.isReady;
    const selfParticipant = new Participant(this.selfUser, this.selfClientId);
    const isVideoCall = hasVideo ? CALL_TYPE.VIDEO : CALL_TYPE.NORMAL;
    const call = new Call(
      this.parseQualifiedId(userId),
      conversationId,
      conversationType,
      selfParticipant,
      hasVideo ? CALL_TYPE.VIDEO : CALL_TYPE.NORMAL,
      this.mediaDevicesHandler,
    );
    if (!canRing) {
      // an incoming call that should not ring is an ongoing group call
      call.reason(REASON.STILL_ONGOING);
    }
    call.state(CALL_STATE.INCOMING);
    if (canRing && isVideoCall) {
      this.warmupMediaStreams(call, true, true);
    }

    this.storeCall(call);
    this.incomingCallCallback(call);
    this.sendCallingEvent(EventName.CALLING.RECEIVED_CALL, call);
  };

  private readonly updateCallState = (convId: SerializedConversationId, state: CALL_STATE) => {
    const call = this.findCall(this.parseQualifiedId(convId));
    if (!call) {
      this.logger.warn(`received state for call in conversation '${convId}' but no stored call found`);
      return;
    }

    // If a call goes from a state to INCOMING, it means it's a group call that just ended
    call.reason(state === CALL_STATE.INCOMING ? REASON.STILL_ONGOING : undefined);
    call.state(state);

    switch (state) {
      case CALL_STATE.MEDIA_ESTAB:
        this.sendCallingEvent(EventName.CALLING.ESTABLISHED_CALL, call, {
          [Segmentation.CALL.DIRECTION]: this.getCallDirection(call),
        });
        call.startedAt(Date.now());
        break;
    }
  };

  private readonly getCallDirection = (call: Call): CALL_DIRECTION => {
    return matchQualifiedIds(call.initiator, call.getSelfParticipant().user.qualifiedId)
      ? CALL_DIRECTION.OUTGOING
      : CALL_DIRECTION.INCOMING;
  };

  private updateParticipantMutedState(call: Call, members: QualifiedWcallMember[]): void {
    members.forEach(member => call.getParticipant(member.userId, member.clientid)?.isMuted(!!member.muted));
  }

  private updateParticipantVideoState(call: Call, members: QualifiedWcallMember[]): void {
    members.forEach(member => call.getParticipant(member.userId, member.clientid)?.isSendingVideo(!!member.vrecv));
  }

  private updateParticipantList(call: Call, members: QualifiedWcallMember[]): void {
    const newMembers = members
      .filter(({userId, clientid}) => !call.getParticipant(userId, clientid))
      .map(({userId, clientid}) => new Participant(this.userRepository.findUserById(userId), clientid));

    const removedMembers = call
      .participants()
      .filter(participant => !members.find(({userId, clientid}) => participant.doesMatchIds(userId, clientid)));

    newMembers.forEach(participant => call.participants.unshift(participant));
    removedMembers.forEach(participant => call.participants.remove(participant));

    if (call.participants().length > call.analyticsMaximumParticipants) {
      call.analyticsMaximumParticipants = call.participants().length;
    }

    call.updatePages();
    this.changeCallPage(call.currentPage(), call);
  }

  private readonly handleCallParticipantChanges = (convId: SerializedConversationId, membersJson: string) => {
    const call = this.findCall(this.parseQualifiedId(convId));

    if (!call) {
      return;
    }

    const {members: serializedMembers}: {members: WcallMember[]} = JSON.parse(membersJson);
    const members = serializedMembers.map(member => ({
      ...member,
      userId: this.parseQualifiedId(member.userid),
    }));

    this.updateParticipantList(call, members);
    this.updateParticipantMutedState(call, members);
    this.updateParticipantVideoState(call, members);
  };

  private readonly requestClients = async (wUser: number, convId: SerializedConversationId, _: number) => {
    const call = this.findCall(this.parseQualifiedId(convId));
    this.pushClients(call);
  };

  private readonly getCallMediaStream = async (
    convId: SerializedConversationId,
    audio: boolean,
    camera: boolean,
    screen: boolean,
  ): Promise<MediaStream> => {
    if (this.mediaStreamQuery) {
      // if a query is already occurring, we will return the result of this query
      return this.mediaStreamQuery;
    }
    const call = this.findCall(this.parseQualifiedId(convId));
    if (!call) {
      return Promise.reject();
    }
    const selfParticipant = call.getSelfParticipant();
    const query: Required<MediaStreamQuery> = {audio, camera, screen};
    const cache = {
      audio: selfParticipant.audioStream(),
      camera: selfParticipant.videoStream(),
      screen: selfParticipant.videoStream(),
    };

    const missingStreams = Object.entries(cache).reduce(
      (accumulator: MediaStreamQuery, [type, isCached]: [keyof MediaStreamQuery, MediaStream]) => {
        if (!isCached && !!query[type]) {
          accumulator[type] = true;
        }
        return accumulator;
      },
      {},
    );

    const queryLog = Object.entries(query)
      .filter(([_type, needed]) => needed)
      .map(([type]) => (missingStreams[type as keyof MediaStreamQuery] ? type : `${type} (from cache)`))
      .join(', ');
    this.logger.debug(`mediaStream requested: ${queryLog}`);

    if (Object.keys(missingStreams).length === 0) {
      // we have everything in cache, just return the participant's stream
      return new Promise(resolve => {
        /*
         * There is a bug in Chrome (from version 73, the version where it's fixed is unknown).
         * This bug crashes the browser if the mediaStream is returned right away (probably some race condition in Chrome internal code)
         * The timeout(0) fixes this issue.
         */
        window.setTimeout(() => resolve(selfParticipant.getMediaStream()), 0);
      });
    }
    const isGroup = [CONV_TYPE.CONFERENCE, CONV_TYPE.GROUP].includes(call.conversationType);
    this.mediaStreamQuery = (async () => {
      try {
        if (missingStreams.screen && selfParticipant.sharesScreen()) {
          return selfParticipant.getMediaStream();
        }
        const mediaStream = await this.getMediaStream(missingStreams, isGroup);
        this.mediaStreamQuery = undefined;
        const newStream = selfParticipant.updateMediaStream(mediaStream, true);
        return newStream;
      } catch (error) {
        this.mediaStreamQuery = undefined;
        this.logger.warn('Could not get mediaStream for call', error);
        this.handleMediaStreamError(call, missingStreams, error);
        return selfParticipant.getMediaStream();
      }
    })();

    this.mediaStreamQuery.then(() => {
      const selfParticipant = call.getSelfParticipant();
      if (selfParticipant.videoState() === VIDEO_STATE.STOPPED) {
        selfParticipant.releaseVideoStream(true);
      }
    });
    return this.mediaStreamQuery;
  };

  private readonly updateActiveSpeakers = (wuser: number, convId: string, rawJson: string) => {
    const call = this.findCall(this.parseQualifiedId(convId));
    const activeSpeakers: ActiveSpeakers = JSON.parse(rawJson);
    if (call && activeSpeakers) {
      call.setActiveSpeakers(
        activeSpeakers.audio_levels.map(({userid, clientid, audio_level_now}) => ({
          clientId: clientid,
          levelNow: audio_level_now,
          userId: this.parseQualifiedId(userid),
        })),
      );
    }
  };

  private readonly updateCallAudioStreams = (
    convId: SerializedConversationId,
    streamId: string,
    streams: readonly MediaStream[] | null,
  ): void => {
    const call = this.findCall(this.parseQualifiedId(convId));
    if (!call) {
      return;
    }

    if (streams === null || streams.length === 0) {
      call.removeAudio(streamId);
      return;
    }

    const [stream] = streams;
    if (stream.getAudioTracks().length > 0) {
      call.addAudio(streamId, stream);
    }

    call.playAudioStreams();
  };

  private readonly updateParticipantVideoStream = (
    remoteConversationId: SerializedConversationId,
    remoteUserId: UserId,
    remoteClientId: ClientId,
    streams: readonly MediaStream[] | null,
  ): void => {
    const conversationId = this.parseQualifiedId(remoteConversationId);
    const userId = this.parseQualifiedId(remoteUserId);
    let participant = this.findParticipant(conversationId, userId, remoteClientId);
    if (!participant) {
      const call = this.findCall(conversationId);
      if (call?.conversationType !== CONV_TYPE.ONEONONE) {
        return;
      }
      participant = new Participant(this.userRepository.findUserById(userId), remoteClientId);
      call.addParticipant(participant);
    }

    if (streams === null || streams.length === 0) {
      participant.releaseVideoStream(false);
      return;
    }

    const [stream] = streams;
    if (stream.getVideoTracks().length > 0 && participant.videoStream() !== stream) {
      participant.videoStream(stream);
    }
  };

  private readonly audioCbrChanged = (userid: UserId, clientid: ClientId, enabled: number) => {
    const activeCall = this.callState.activeCalls()[0];
    if (activeCall && !Config.getConfig().FEATURE.ENFORCE_CONSTANT_BITRATE) {
      activeCall.isCbrEnabled(!!enabled);
    }
  };

  private readonly videoStateChanged = (
    convId: SerializedConversationId,
    userid: UserId,
    clientId: ClientId,
    state: VIDEO_STATE,
  ) => {
    const call = this.findCall(this.parseQualifiedId(convId));
    const userId = this.parseQualifiedId(userid);
    if (!call) {
      return;
    }
    const participant = call.getParticipant(userId, clientId);
    if (!participant) {
      return;
    }

    const selfParticipant = call.getSelfParticipant();
    const isSameUser = selfParticipant.doesMatchIds(userId, clientId);

    // user has just started to share their screen
    if (participant.videoState() !== VIDEO_STATE.SCREENSHARE && state === VIDEO_STATE.SCREENSHARE) {
      participant.startedScreenSharingAt(Date.now());
    }

    // user has stopped sharing their screen
    if (participant.videoState() === VIDEO_STATE.SCREENSHARE && state !== VIDEO_STATE.SCREENSHARE) {
      if (isSameUser) {
        selfParticipant.releaseVideoStream(true);
      }
      this.sendCallingEvent(EventName.CALLING.SCREEN_SHARE, call, {
        [Segmentation.SCREEN_SHARE.DIRECTION]: isSameUser ? CALL_DIRECTION.OUTGOING : CALL_DIRECTION.INCOMING,
        [Segmentation.SCREEN_SHARE.DURATION]: Math.ceil((Date.now() - participant.startedScreenSharingAt()) / 5000) * 5,
      });
    }

    if (state === VIDEO_STATE.STARTED) {
      call.analyticsAvSwitchToggle = true;
    }

    if (state === VIDEO_STATE.SCREENSHARE) {
      call.analyticsScreenSharing = true;
    }

    if (call.state() === CALL_STATE.MEDIA_ESTAB && isSameUser && !selfParticipant.sharesScreen()) {
      selfParticipant.releaseVideoStream(true);
    }

    call
      .participants()
      .filter(participant => participant.doesMatchIds(userId, clientId))
      .forEach(participant => participant.videoState(state));
  };

  private readonly sendCallingEvent = (
    eventName: string,
    call: Call,
    customSegmentations: Record<string, any> = {},
  ) => {
    const conversationEntity = this.conversationState.findConversation(call.conversationId);
    const participants = conversationEntity.participating_user_ets();
    const selfUserTeamId = call.getSelfParticipant().user.id;
    const guests = participants.filter(user => user.isGuest()).length;
    const guestsWireless = participants.filter(user => user.isTemporaryGuest()).length;
    const guestsPro = participants.filter(user => !!user.teamId && user.teamId !== selfUserTeamId).length;
    const segmentations = {
      [Segmentation.CONVERSATION.GUESTS]: roundLogarithmic(guests, 6),
      [Segmentation.CONVERSATION.GUESTS_PRO]: roundLogarithmic(guestsPro, 6),
      [Segmentation.CONVERSATION.GUESTS_WIRELESS]: roundLogarithmic(guestsWireless, 6),
      [Segmentation.CONVERSATION.SERVICES]: roundLogarithmic(conversationEntity.servicesCount(), 6),
      [Segmentation.CONVERSATION.SIZE]: roundLogarithmic(conversationEntity.participating_user_ets().length, 6),
      [Segmentation.CONVERSATION.TYPE]: trackingHelpers.getConversationType(conversationEntity),
      [Segmentation.CALL.VIDEO]: call.getSelfParticipant().sharesCamera(),
      ...customSegmentations,
    };
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, eventName, segmentations);
  };

  /**
   * Leave a call we joined immediately in case the browser window is closed.
   * @note Should only used by "window.onbeforeunload".
   */
  destroy(): void {
    this.callState
      .activeCalls()
      .forEach((call: Call) => this.wCall.end(this.wUser, this.serializeQualifiedId(call.conversationId)));
    this.wCall.destroy(this.wUser);
  }

  //##############################################################################
  // Calling config
  //##############################################################################

  fetchConfig(limit?: number): Promise<CallConfigData> {
    return this.apiClient.account.api.getCallConfig(limit);
  }

  private checkConcurrentJoinedCall(conversationId: QualifiedId, newCallState: CALL_STATE): Promise<void> {
    const idleCallStates = [CALL_STATE.INCOMING, CALL_STATE.NONE, CALL_STATE.UNKNOWN];
    const activeCall = this.callState
      .activeCalls()
      .find(call => !matchQualifiedIds(call.conversationId, conversationId) && !idleCallStates.includes(call.state()));
    if (!activeCall) {
      return Promise.resolve();
    }

    let actionString: string;
    let messageString: string;
    let titleString: string;

    switch (newCallState) {
      case CALL_STATE.INCOMING: {
        actionString = t('modalCallSecondIncomingAction');
        messageString = t('modalCallSecondIncomingMessage');
        titleString = t('modalCallSecondIncomingHeadline');
        break;
      }

      case CALL_STATE.OUTGOING: {
        actionString = t('modalCallSecondOutgoingAction');
        messageString = t('modalCallSecondOutgoingMessage');
        titleString = t('modalCallSecondOutgoingHeadline');
        break;
      }

      default: {
        return Promise.reject(`Tried to join second call in unexpected state '${newCallState}'`);
      }
    }

    return new Promise((resolve, reject) => {
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, {
        primaryAction: {
          action: () => {
            if (activeCall.state() === CALL_STATE.INCOMING) {
              this.rejectCall(activeCall.conversationId);
            } else {
              this.leaveCall(activeCall.conversationId);
            }
            window.setTimeout(resolve, 1000);
          },
          text: actionString,
        },
        secondaryAction: {
          action: reject,
        },
        text: {
          message: messageString,
          title: titleString,
        },
      });
      this.logger.warn(`Tried to join a second call while calling in conversation '${activeCall.conversationId}'.`);
    });
  }

  private showNoAudioInputModal(): void {
    const modalOptions = {
      primaryAction: {
        text: t('modalAcknowledgeAction'),
      },
      secondaryAction: {
        action: () => amplify.publish(WebAppEvents.PREFERENCES.SHOW_AV),
        text: t('modalNoAudioInputAction'),
      },
      text: {
        message: t('modalNoAudioInputMessage'),
        title: t('modalNoAudioInputTitle'),
      },
    };
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.CONFIRM, modalOptions);
  }

  private showNoCameraModal(): void {
    const modalOptions = {
      text: {
        htmlMessage: t('modalNoCameraMessage', Config.getConfig().BRAND_NAME, {
          '/faqLink': '</a>',
          br: '<br>',
          faqLink:
            '<a href="https://support.wire.com/hc/articles/202935412" data-uie-name="go-no-camera-faq" target="_blank" rel="noopener noreferrer">',
        }),
        title: t('modalNoCameraTitle'),
      },
    };
    amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, modalOptions);
  }

  //##############################################################################
  // Logging
  //##############################################################################

  /**
   * Returns the call log if it is a meaningful log.
   * An avs log is considered meaningful if more lines have been added after the webapp was first initiated
   */
  public getCallLog(): string[] | undefined {
    return this.callLog.length > this.avsInitLogLength ? this.callLog : undefined;
  }
}
