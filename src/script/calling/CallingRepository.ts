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

import type {CallConfigData} from '@wireapp/api-client/lib/account/CallConfigData';
import {QualifiedUserClients} from '@wireapp/api-client/lib/conversation';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import type {WebappProperties} from '@wireapp/api-client/lib/user/data';
import {MessageSendingState} from '@wireapp/core/lib/conversation';
import {flattenUserMap} from '@wireapp/core/lib/conversation/message/UserClientsUtil';
import {SubconversationEpochInfoMember} from '@wireapp/core/lib/conversation/SubconversationService/SubconversationService';
import {TaskScheduler} from '@wireapp/core/lib/util';
import {constructFullyQualifiedClientId} from '@wireapp/core/lib/util/fullyQualifiedClientIdUtils';
import {amplify} from 'amplify';
import axios from 'axios';
import ko from 'knockout';
import {container} from 'tsyringe';
import 'webrtc-adapter';

import {
  AUDIO_STATE,
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
import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {flatten} from 'Util/ArrayUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {roundLogarithmic} from 'Util/NumberUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {Call, SerializedConversationId} from './Call';
import {callingSubscriptions} from './callingSubscriptionsHandler';
import {CallState, MuteState} from './CallState';
import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';
import {LEAVE_CALL_REASON} from './enum/LeaveCallReason';
import {ClientId, Participant, UserId} from './Participant';

import {PrimaryModal} from '../components/Modals/PrimaryModal';
import {Config} from '../Config';
import {isGroupMLSConversation, isMLSConversation, MLSConversation} from '../conversation/ConversationSelectors';
import {ConversationState} from '../conversation/ConversationState';
import {CallingEvent, EventBuilder} from '../conversation/EventBuilder';
import {CONSENT_TYPE, MessageRepository, MessageSendingOptions} from '../conversation/MessageRepository';
import {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';
import {NoAudioInputError} from '../error/NoAudioInputError';
import {EventRepository} from '../event/EventRepository';
import {EventSource} from '../event/EventSource';
import type {MediaDevicesHandler} from '../media/MediaDevicesHandler';
import type {MediaStreamHandler} from '../media/MediaStreamHandler';
import {MediaType} from '../media/MediaType';
import {APIClient} from '../service/APIClientSingleton';
import {Core} from '../service/CoreSingleton';
import {TeamState} from '../team/TeamState';
import type {ServerTimeHandler} from '../time/serverTimeHandler';
import {EventName} from '../tracking/EventName';
import * as trackingHelpers from '../tracking/Helpers';
import {Segmentation} from '../tracking/Segmentation';
import type {UserRepository} from '../user/UserRepository';
import {Warnings} from '../view_model/WarningsContainer';

const avsLogger = getLogger('avs');

interface MediaStreamQuery {
  audio?: boolean;
  camera?: boolean;
  screen?: boolean;
}

export type QualifiedWcallMember = Omit<WcallMember, 'userid'> & {userId: QualifiedId};

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

type SubconversationData = {epoch: number; secretKey: string; members: SubconversationEpochInfoMember[]};

export class CallingRepository {
  private readonly acceptVersionWarning: (conversationId: QualifiedId) => void;
  private readonly callLog: string[];
  private readonly logger: Logger;
  private avsVersion: number = 0;
  private incomingCallCallback: (call: Call) => void;
  private isReady: boolean = false;
  /** will cache the query to media stream (in order to avoid asking the system for streams multiple times when we have multiple peers) */
  private mediaStreamQuery?: Promise<MediaStream>;
  private poorCallQualityUsers: {[conversationId: string]: string[]} = {};
  private selfClientId: ClientId | null = null;
  private selfUser: User | null = null;
  private wCall?: Wcall;
  private wUser: number = 0;
  private nextMuteState: MuteState = MuteState.SELF_MUTED;
  private isConferenceCallingSupported = false;
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

  get subconversationService() {
    const subconversationService = this.core.service?.subconversation;
    if (!subconversationService) {
      throw new Error('SubconversationService was not initialised');
    }

    return subconversationService;
  }

  readonly toggleCbrEncoding = (vbrEnabled: boolean): void => {
    if (!Config.getConfig().FEATURE.ENFORCE_CONSTANT_BITRATE) {
      this.callState.cbrEncoding(vbrEnabled ? 0 : 1);
    }
  };

  getStats(conversationId: QualifiedId) {
    return this.wCall?.getStats(this.serializeQualifiedId(conversationId));
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
    wCall.setLogHandler(this.avsLogHandler);

    const avsEnv = Runtime.isFirefox() ? AVS_ENV.FIREFOX : AVS_ENV.DEFAULT;
    wCall.init(avsEnv);
    wCall.setUserMediaHandler(this.getCallMediaStream);
    wCall.setAudioStreamHandler(this.updateCallAudioStreams);
    wCall.setVideoStreamHandler(this.updateParticipantVideoStream);
    this.isConferenceCallingSupported = wCall.isConferenceCallingSupported();
    setInterval(() => wCall.poll(), 500);
    return wCall;
  }

  private readonly avsLogHandler = (level: LOG_LEVEL, message: string, error: Error | unknown) => {
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
    const trimmedMessage = message.trim();
    logFunctions[level].call(avsLogger, trimmedMessage, error);
    this.callLog.push(`${new Date().toISOString()} [${logLevels[level]}] ${trimmedMessage}`);
  };

  private createWUser(wCall: Wcall, selfUserId: string, selfClientId: string): number {
    /* cspell:disable */
    const wUser = wCall.create(
      selfUserId,
      selfClientId,
      this.setAvsVersion, // `readyh`,
      this.sendMessage, // `sendh`,
      this.sendSFTRequest, // `sfth`
      this.incomingCall, // `incomingh`,
      this.handleMissedCall, // `missedh`,
      () => {}, // `answer
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
    wCall.setReqNewEpochHandler(wUser, this.requestNewEpoch);
    wCall.setActiveSpeakerHandler(wUser, this.updateActiveSpeakers);

    return wUser;
  }

  private readonly handleMissedCall = (conversationId: string, timestamp: number, userId: string) => {
    const callDuration = 0;
    this.injectDeactivateEvent(
      this.parseQualifiedId(conversationId),
      this.parseQualifiedId(userId),
      callDuration,
      REASON.CANCELED,
      new Date(timestamp * 1000).toISOString(),
      EventSource.INJECTED,
    );
  };

  private readonly updateMuteState = (isMuted: number) => {
    const activeStates = [CALL_STATE.MEDIA_ESTAB, CALL_STATE.ANSWERED, CALL_STATE.OUTGOING];
    const activeCall = this.callState.calls().find(call => activeStates.includes(call.state()));
    activeCall?.muteState(isMuted ? this.nextMuteState : MuteState.NOT_MUTED);
  };

  public async pushClients(call: Call | undefined = this.callState.joinedCall(), checkMismatch?: boolean) {
    if (!call) {
      return false;
    }
    const conversation = this.getConversationById(call.conversationId);
    if (!conversation) {
      this.logger.warn(
        `Unable to find a conversation with id of ${call.conversationId.id}@${call.conversationId.domain}`,
      );
      return false;
    }
    const allClients = await this.core.service!.conversation.fetchAllParticipantsClients(call.conversationId);

    if (!isGroupMLSConversation(conversation)) {
      const qualifiedClients = flattenUserMap(allClients);

      const clients: Clients = flatten(
        qualifiedClients.map(({data, userId}) =>
          data.map(clientid => ({clientid, userid: this.serializeQualifiedId(userId)})),
        ),
      );

      this.wCall?.setClientsForConv(
        this.wUser,
        this.serializeQualifiedId(call.conversationId),
        JSON.stringify({clients}),
      );
    }

    // We warn the message repository that a mismatch has happened outside of its lifecycle (eventually triggering a conversation degradation)
    const consentType =
      this.getCallDirection(call) === CALL_DIRECTION.INCOMING ? CONSENT_TYPE.INCOMING_CALL : CONSENT_TYPE.OUTGOING_CALL;
    return checkMismatch ? this.messageRepository.updateMissingClients(conversation, allClients, consentType) : true;
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
      Warnings.showWarning(Warnings.TYPE.CALL_QUALITY_POOR);
    } else {
      Warnings.hideWarning(Warnings.TYPE.CALL_QUALITY_POOR);
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
      .calls()
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
    this.callState.calls.push(call);
    const conversation = this.getConversationById(call.conversationId);
    if (conversation) {
      conversation.call(call);
    }
  }

  private removeCall(call: Call): void {
    const index = this.callState.calls().indexOf(call);
    call.getSelfParticipant().releaseMediaStream(true);
    call.participants.removeAll();
    call.removeAllAudio();
    if (index !== -1) {
      this.callState.calls.splice(index, 1);
    }
    const conversation = this.getConversationById(call.conversationId);
    if (conversation) {
      conversation.call(null);
    }
  }

  private async warmupMediaStreams(call: Call, audio: boolean, camera: boolean): Promise<boolean> {
    // if it's a video call we query the video user media in order to display the video preview
    try {
      camera = this.teamState.isVideoCallingEnabled() ? camera : false;
      const mediaStream = await this.getMediaStream({audio, camera}, call.isGroupOrConference);
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
    return this.isConferenceCallingSupported;
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

    const clients = this.userRepository?.findUserById(unverifiedUserId)?.devices() || [];

    for (const {id: clientId} of clients) {
      const participant = activeCall.getParticipant(unverifiedUserId, clientId);

      if (participant) {
        this.leaveCall(activeCall.conversationId, LEAVE_CALL_REASON.USER_TURNED_UNVERIFIED);
        PrimaryModal.show(
          PrimaryModal.type.ACKNOWLEDGE,
          {
            primaryAction: {
              text: t('callDegradationAction'),
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

  private abortCall(conversationId: QualifiedId, reason: LEAVE_CALL_REASON): void {
    const call = this.findCall(conversationId);
    if (call) {
      // we flag the call in order to prevent sending further messages
      call.blockMessages = true;
    }
    this.leaveCall(conversationId, reason);
  }

  private warnOutdatedClient(conversationId: QualifiedId) {
    const brandName = Config.getConfig().BRAND_NAME;
    PrimaryModal.show(
      PrimaryModal.type.ACKNOWLEDGE,
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
   * Will extract the conversation that is referred to by the calling event.
   * It could happen that messages relative to a particular conversation was sent in a different conversation (most likely the self conversation).
   * We need to find the correct conversation in order for AVS to know which call is concerned
   */
  private extractTargetedConversationId(event: CallingEvent): QualifiedId {
    const {targetConversation, conversation, qualified_conversation} = event;
    const targetedConversationId = targetConversation || qualified_conversation;
    const conversationId = targetedConversationId ?? {domain: '', id: conversation};

    return conversationId;
  }

  /**
   * Handle incoming calling events from backend.
   */
  onCallEvent = async (event: CallingEvent, source: string): Promise<void> => {
    const {
      content,
      qualified_conversation,
      from,
      qualified_from,
      sender: clientId,
      time = new Date().toISOString(),
      senderClientId: senderFullyQualifiedClientId = '',
    } = event;
    const isFederated = this.core.backendFeatures.isFederated && qualified_conversation && qualified_from;
    const userId = isFederated ? qualified_from : {domain: '', id: from};
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const toSecond = (timestamp: number) => Math.floor(timestamp / 1000);
    const contentStr = JSON.stringify(content);
    const conversationId = this.extractTargetedConversationId(event);
    const conversation = this.getConversationById(conversationId);

    if (!conversation) {
      this.logger.warn(`Unable to find a conversation with id of ${conversationId.id}@${conversationId.domain}`);
      return;
    }
    switch (content.type) {
      case CALL_MESSAGE_TYPE.CONFKEY: {
        if (source !== EventRepository.SOURCE.STREAM) {
          const allClients = await this.core.service!.conversation.fetchAllParticipantsClients(conversationId);

          // We warn the message repository that a mismatch has happened outside of its lifecycle (eventually triggering a conversation degradation)
          const shouldContinue = await this.messageRepository.updateMissingClients(
            conversation,
            allClients,
            CONSENT_TYPE.INCOMING_CALL,
          );

          if (!shouldContinue) {
            this.abortCall(conversationId, LEAVE_CALL_REASON.ABORTED_BECAUSE_FAILED_TO_UPDATE_MISSING_CLIENTS);
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
        this.leaveCall(conversationId, LEAVE_CALL_REASON.REMOTE_KICK);
        break;
      }
    }

    let senderClientId = '';
    if (senderFullyQualifiedClientId) {
      senderClientId = this.parseQualifiedId(senderFullyQualifiedClientId).id.split(':')[1];
    }

    const res = this.wCall?.recvMsg(
      this.wUser,
      contentStr,
      contentStr.length,
      toSecond(currentTimestamp),
      toSecond(new Date(time).getTime()),
      this.serializeQualifiedId(conversationId),
      this.serializeQualifiedId(userId),
      conversation && isMLSConversation(conversation) ? senderClientId : clientId,
      conversation && isGroupMLSConversation(conversation) ? CONV_TYPE.CONFERENCE_MLS : CONV_TYPE.CONFERENCE,
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
    }
  };

  //##############################################################################
  // Call actions
  //##############################################################################

  private getConversationType(conversation: Conversation): CONV_TYPE {
    if (!conversation.isGroup()) {
      return CONV_TYPE.ONEONONE;
    }

    if (isGroupMLSConversation(conversation)) {
      return CONV_TYPE.CONFERENCE_MLS;
    }
    return this.supportsConferenceCalling ? CONV_TYPE.CONFERENCE : CONV_TYPE.GROUP;
  }

  async startCall(conversation: Conversation, callType: CALL_TYPE): Promise<void | Call> {
    if (!this.selfUser || !this.selfClientId) {
      this.logger.warn(
        `Calling repository is not initialized correctly \n ${JSON.stringify({
          selfClientId: this.selfClientId,
          selfUser: this.selfUser,
          wUser: this.wUser,
        })}`,
      );
      return;
    }
    const conversationId = conversation.qualifiedId;
    const convId = this.serializeQualifiedId(conversationId);
    this.logger.log(`Starting a call of type "${callType}" in conversation ID "${convId}"...`);
    try {
      const rejectedCallInConversation = this.findCall(conversationId);
      if (rejectedCallInConversation) {
        // if there is a rejected call, we can remove it from the store
        rejectedCallInConversation.state(CALL_STATE.NONE);
        this.removeCall(rejectedCallInConversation);
      }
      const selfParticipant = new Participant(this.selfUser, this.selfClientId);
      const conversationType = this.getConversationType(conversation);
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
        call.isGroupOrConference && callType === CALL_TYPE.VIDEO
          ? this.warmupMediaStreams(call, true, true)
          : Promise.resolve(true);
      const success = await loadPreviewPromise;
      if (success) {
        /**
         * Since we might have been on a conference call before, which was started as muted, then we've hung up and started an outgoing call,
         * we are stuck in muted state so we should call the AVS function setMute(this.wUser, 0) before initiating the call to fix this
         * Further info: https://wearezeta.atlassian.net/browse/SQCALL-551
         */
        this.wCall?.setMute(this.wUser, 0);
        this.wCall?.start(this.wUser, convId, callType, conversationType, this.callState.cbrEncoding());
        this.sendCallingEvent(EventName.CALLING.INITIATED_CALL, call);
        this.sendCallingEvent(EventName.CONTRIBUTED, call, {
          [Segmentation.MESSAGE.ACTION]: callType === CALL_TYPE.VIDEO ? 'video_call' : 'audio_call',
        });
      } else {
        this.showNoCameraModal();
        this.removeCall(call);
      }

      if (isGroupMLSConversation(conversation)) {
        await this.joinMlsConferenceSubconversation(conversation);
      }

      return call;
    } catch (error) {
      if (error) {
        this.logger.error('Failed starting call', error);
      }
    }
  }

  private serializeQualifiedId(id: QualifiedId): string {
    if (id.domain && this.core.backendFeatures.isFederated) {
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
    this.wCall?.setVideoSendState(this.wUser, this.serializeQualifiedId(call.conversationId), newState);
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
      return this.wCall?.setVideoSendState(
        this.wUser,
        this.serializeQualifiedId(call.conversationId),
        VIDEO_STATE.STOPPED,
      );
    }
    try {
      const mediaStream = await this.getMediaStream({audio: true, screen: true}, call.isGroupOrConference);
      // https://stackoverflow.com/a/25179198/451634
      mediaStream.getVideoTracks()[0].onended = () => {
        this.wCall?.setVideoSendState(this.wUser, this.serializeQualifiedId(call.conversationId), VIDEO_STATE.STOPPED);
      };
      const selfParticipant = call.getSelfParticipant();
      selfParticipant.videoState(VIDEO_STATE.SCREENSHARE);
      selfParticipant.updateMediaStream(mediaStream, true);
      this.wCall?.setVideoSendState(
        this.wUser,
        this.serializeQualifiedId(call.conversationId),
        VIDEO_STATE.SCREENSHARE,
      );
      selfParticipant.startedScreenSharingAt(Date.now());
    } catch (error) {
      this.logger.info('Failed to get screen sharing stream', error);
    }
  };

  async answerCall(call: Call, callType?: CALL_TYPE): Promise<void> {
    try {
      callType ??= call.getSelfParticipant().sharesCamera() ? call.initialType : CALL_TYPE.NORMAL;

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
      this.setMute(call.muteState() !== MuteState.NOT_MUTED);

      this.wCall?.answer(
        this.wUser,
        this.serializeQualifiedId(call.conversationId),
        callType,
        this.callState.cbrEncoding(),
      );

      this.sendCallingEvent(EventName.CALLING.JOINED_CALL, call, {
        [Segmentation.CALL.DIRECTION]: this.getCallDirection(call),
      });

      const conversation = this.getConversationById(call.conversationId);

      if (!conversation || !isGroupMLSConversation(conversation)) {
        return;
      }

      await this.joinMlsConferenceSubconversation(conversation);
    } catch (error) {
      if (error) {
        this.logger.error('Failed answering call', error);
      }
      this.rejectCall(call.conversationId);
    }
  }

  private getConversationById(conversationId: QualifiedId): Conversation | undefined {
    return this.conversationState.findConversation(conversationId);
  }

  private readonly leaveMLSConference = async (conversationId: QualifiedId) => {
    await this.subconversationService.leaveConferenceSubconversation(conversationId);
    callingSubscriptions.removeCall(conversationId);
  };

  private readonly joinMlsConferenceSubconversation = async ({qualifiedId, groupId}: MLSConversation) => {
    const unsubscribe = await this.subconversationService.subscribeToEpochUpdates(
      qualifiedId,
      groupId,
      (groupId: string) => this.conversationState.findConversationByGroupId(groupId)?.qualifiedId,
      data => this.setEpochInfo(qualifiedId, data),
    );

    callingSubscriptions.addCall(qualifiedId, unsubscribe);
  };

  private readonly updateConferenceSubconversationEpoch = async (conversationId: QualifiedId) => {
    const conversation = this.getConversationById(conversationId);
    if (!conversation || !isGroupMLSConversation(conversation)) {
      return;
    }

    const subconversationEpochInfo = await this.subconversationService.getSubconversationEpochInfo(
      conversationId,
      conversation.groupId,
      true,
    );

    if (!subconversationEpochInfo) {
      return;
    }

    this.setEpochInfo(conversationId, subconversationEpochInfo);
  };

  private readonly handleCallParticipantChange = (conversationId: QualifiedId, members: QualifiedWcallMember[]) => {
    const conversation = this.getConversationById(conversationId);
    if (!conversation || !isGroupMLSConversation(conversation)) {
      return;
    }

    for (const member of members) {
      const isSelfClient = member.userId.id === this.core.userId && member.clientid === this.core.clientId;
      //no need to set a timer for selfClient (it will most likely leave or get dropped from the call before the timer could expire)
      if (isSelfClient) {
        continue;
      }

      const {id: userId, domain} = member.userId;
      const clientQualifiedId = constructFullyQualifiedClientId(userId, member.clientid, domain);

      const key = `mls-call-client-${conversation.id}-${clientQualifiedId}`;

      // audio state is established -> clear timer
      if (member.aestab === AUDIO_STATE.ESTABLISHED) {
        TaskScheduler.cancelTask(key);
        continue;
      }

      // otherwise, remove the client from subconversation if it won't establish their audio state in 3 mins timeout
      const firingDate = new Date().getTime() + TIME_IN_MILLIS.MINUTE * 3;

      TaskScheduler.addTask({
        firingDate,
        key,
        // if timer expires = client is stale -> remove client from the subconversation
        task: () =>
          this.subconversationService.removeClientFromConferenceSubconversation(conversationId, {
            user: {id: member.userId.id, domain: member.userId.domain},
            clientId: member.clientid,
          }),
      });
    }
  };

  private readonly setEpochInfo = (conversationId: QualifiedId, subconversationData: SubconversationData) => {
    const serializedConversationId = this.serializeQualifiedId(conversationId);
    const {epoch, secretKey, members} = subconversationData;
    const clients = {
      convid: serializedConversationId,
      clients: members,
    };

    return this.wCall?.setEpochInfo(this.wUser, serializedConversationId, epoch, JSON.stringify(clients), secretKey);
  };

  rejectCall(conversationId: QualifiedId): void {
    this.wCall?.reject(this.wUser, this.serializeQualifiedId(conversationId));
  }

  changeCallPage(call: Call, newPage: number): void {
    call.currentPage(newPage);
    if (!this.callState.isSpeakersViewActive()) {
      this.requestCurrentPageVideoStreams(call);
    }
  }

  requestCurrentPageVideoStreams(call: Call): void {
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
    this.wCall?.requestVideoStreams(this.wUser, convId, VSTREAMS.LIST, JSON.stringify(payload));
  }

  readonly leaveCall = (conversationId: QualifiedId, reason: LEAVE_CALL_REASON): void => {
    this.logger.info(`Ending call with reason ${reason} \n Stack trace: `, new Error().stack);
    const conversationIdStr = this.serializeQualifiedId(conversationId);
    delete this.poorCallQualityUsers[conversationIdStr];
    this.wCall?.end(this.wUser, conversationIdStr);
  };

  muteCall(call: Call, shouldMute: boolean, reason?: MuteState): void {
    if (call.state() === CALL_STATE.INCOMING) {
      call.muteState(shouldMute ? MuteState.SELF_MUTED : MuteState.NOT_MUTED);
      return;
    }
    if (call.hasWorkingAudioInput === false && call.muteState() !== MuteState.NOT_MUTED) {
      this.showNoAudioInputModal();
      return;
    }
    this.setMute(shouldMute, reason);
  }

  setMute(shouldMute: boolean, reason: MuteState = MuteState.SELF_MUTED): void {
    this.nextMuteState = reason;
    this.wCall?.setMute(this.wUser, shouldMute ? 1 : 0);
  }

  private readonly setAvsVersion = (version: number) => {
    this.avsVersion = version;
  };

  private getMediaStream(
    {audio = false, camera = false, screen = false}: MediaStreamQuery,
    isGroup: boolean,
  ): Promise<MediaStream> {
    return this.mediaStreamHandler.requestMediaStream(audio, camera, screen, isGroup);
  }

  private handleMediaStreamError(call: Call, requestedStreams: MediaStreamQuery, error: Error | unknown): void {
    if (error instanceof NoAudioInputError) {
      this.muteCall(call, true);
      this.showNoAudioInputModal();
      return;
    }

    const validStateWithoutCamera = [CALL_STATE.MEDIA_ESTAB, CALL_STATE.ANSWERED];

    if (call && !validStateWithoutCamera.includes(call.state())) {
      this.showNoCameraModal();
      this.leaveCall(call.conversationId, LEAVE_CALL_REASON.MEDIA_STREAM_ERROR);
      return;
    }

    if (call.state() !== CALL_STATE.ANSWERED) {
      if (requestedStreams.camera) {
        this.showNoCameraModal();
      }
      this.wCall?.setVideoSendState(this.wUser, this.serializeQualifiedId(call.conversationId), VIDEO_STATE.STOPPED);
    }
  }

  public async refreshVideoInput(): Promise<MediaStream | void> {
    const stream = await this.mediaStreamHandler.requestMediaStream(false, true, false, false);
    this.stopMediaSource(MediaType.VIDEO);
    const clonedMediaStream = this.changeMediaSource(stream, MediaType.VIDEO);
    return clonedMediaStream;
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
    call = this.callState.joinedCall(),
  ): MediaStream | void {
    if (!call) {
      return;
    }
    const selfParticipant = call.getSelfParticipant();

    if (mediaType === MediaType.AUDIO) {
      const audioTracks = mediaStream.getAudioTracks().map(track => track.clone());
      if (audioTracks.length > 0) {
        selfParticipant.setAudioStream(new MediaStream(audioTracks), true);
        this.wCall?.replaceTrack(this.serializeQualifiedId(call.conversationId), audioTracks[0]);
      }
    }

    // Don't update video input (coming from A/V preferences) when screensharing is activated
    if (mediaType === MediaType.VIDEO && selfParticipant.sharesCamera() && !selfParticipant.sharesScreen()) {
      const videoTracks = mediaStream.getVideoTracks().map(track => track.clone());
      if (videoTracks.length > 0) {
        const clonedMediaStream = new MediaStream(videoTracks);
        selfParticipant.setVideoStream(clonedMediaStream, true);
        this.wCall?.replaceTrack(this.serializeQualifiedId(call.conversationId), videoTracks[0]);
        // Remove the previous video stream
        this.mediaStreamHandler.releaseTracksFromStream(mediaStream);
        return clonedMediaStream;
      }
    }
  }

  hasActiveCameraStream(): boolean {
    const call = this.callState.joinedCall();
    if (!call) {
      return false;
    }
    const selfParticipant = call.getSelfParticipant();
    return selfParticipant.sharesCamera() && selfParticipant.hasActiveVideo();
  }

  private mapTargets(targets: SendMessageTarget): QualifiedUserClients {
    const recipients = targets.clients.reduce((acc, {userid, clientid}) => {
      const {domain: parsedDomain, id} = this.parseQualifiedId(userid);
      const domain = parsedDomain || this.selfUser?.domain || '';
      const domainRecipients = (acc[domain] = acc[domain] ?? {});
      domainRecipients[id] = [...(domainRecipients[id] ?? []), clientid];
      return acc;
    }, {} as QualifiedUserClients);
    return recipients;
  }

  private injectActivateEvent(conversationId: QualifiedId, userId: QualifiedId, time: string): void {
    const event = EventBuilder.buildVoiceChannelActivate(conversationId, userId, time, this.avsVersion);
    this.eventRepository.injectEvent(event, EventSource.INJECTED);
  }

  private injectDeactivateEvent(
    conversationId: QualifiedId,
    userId: QualifiedId,
    duration: number,
    reason: REASON,
    time: string,
    source: EventSource,
  ): void {
    const event = EventBuilder.buildVoiceChannelDeactivate(
      conversationId,
      userId,
      duration,
      reason,
      time,
      this.avsVersion,
    );
    this.eventRepository.injectEvent(event, source);
  }

  private readonly sendMessage = (
    _context: number,
    convId: string,
    _userid_self: string,
    _clientid_self: string,
    targets: string | null,
    _unused: string | null,
    payload: string,
    _len: number,
    _trans: number,
    myClientsOnly: number,
  ): number => {
    const conversationId = this.parseQualifiedId(convId);
    const call = this.findCall(conversationId);
    if (call?.blockMessages) {
      return 0;
    }
    let options: MessageSendingOptions | undefined = undefined;

    if (typeof targets === 'string') {
      const parsedTargets: SendMessageTarget = JSON.parse(targets);
      const recipients = this.mapTargets(parsedTargets);
      options = {
        nativePush: true,
        recipients,
      };
    }

    this.sendCallingMessage(conversationId, payload, options, myClientsOnly === 1).catch(error => {
      this.logger.warn('Failed to send calling message, aborting call', error);
      this.abortCall(conversationId, LEAVE_CALL_REASON.ABORTED_BECAUSE_FAILED_TO_SEND_CALLING_MESSAGE);
    });
    return 0;
  };

  private readonly sendCallingMessage = async (
    conversationId: QualifiedId,
    payload: string | Object,
    options?: MessageSendingOptions,
    myClientsOnly: boolean = false,
  ): Promise<void> => {
    const conversation = this.getConversationById(conversationId);
    if (!conversation) {
      this.logger.warn(`Unable to send calling message, no conversation found with id ${conversationId}`);
      return;
    }
    const content = typeof payload === 'string' ? payload : JSON.stringify(payload);

    /**
     * @note If myClientsOnly option is true, the message should be sent via the mls self-conversation.
     * This message is used to tell your other clients you have answered or
     * rejected a call and to stop ringing.
     */
    if (typeof payload === 'string' && isMLSConversation(conversation) && myClientsOnly) {
      return void this.messageRepository.sendCallingMessageToSelfMLSConversation(payload, conversation.qualifiedId);
    }

    const message = await this.messageRepository.sendCallingMessage(conversation, content, options);
    if (message.state === MessageSendingState.CANCELED) {
      // If the user has cancelled message sending because of a degradation warning, we abort the call
      this.abortCall(
        conversationId,
        LEAVE_CALL_REASON.ABORTED_BECAUSE_USER_CANCELLED_MESSAGE_SENDING_BECAUSE_OF_A_DEGRADATION_WARNING,
      );
    }
  };

  readonly convertParticipantsToCallingMessageRecepients = (participants: Participant[]): QualifiedUserClients => {
    return participants.reduce((participants, participant) => {
      participants[participant.user.domain] ||= {};
      participants[participant.user.domain][participant.user.id] = [participant.clientId];
      return participants;
    }, {} as QualifiedUserClients);
  };

  readonly sendModeratorMute = (conversationId: QualifiedId, participants: Participant[]) => {
    const recipients = this.convertParticipantsToCallingMessageRecepients(participants);
    this.sendCallingMessage(conversationId, {type: CALL_MESSAGE_TYPE.REMOTE_MUTE}, {nativePush: true, recipients});
  };

  readonly sendModeratorKick = (conversationId: QualifiedId, participants: Participant[]) => {
    const recipients = this.convertParticipantsToCallingMessageRecepients(participants);
    this.sendCallingMessage(conversationId, {type: CALL_MESSAGE_TYPE.REMOTE_KICK}, {nativePush: true, recipients});
  };

  private readonly sendSFTRequest = (
    context: number,
    url: string,
    data: string,
    _dataLength: number,
    __: number,
  ): number => {
    const _sendSFTRequest = async () => {
      const response = await axios.post(url, data);
      const {status, data: axiosData} = response;
      const jsonData = JSON.stringify(axiosData);
      this.wCall?.sftResp(this.wUser!, status, jsonData, jsonData.length, context);
    };
    const avsSftResponseFailedCode = 1000;
    _sendSFTRequest().catch(error => {
      this.avsLogHandler(LOG_LEVEL.WARN, `Request to sft server failed with error: ${error?.message}`, error);
      avsLogger.warn(`Request to sft server failed with error`, error);
      this.wCall?.sftResp(this.wUser!, avsSftResponseFailedCode, '', 0, context);
    });

    return 0;
  };

  private readonly requestConfig = () => {
    const _requestConfig = async () => {
      const limit = Runtime.isFirefox() ? CallingRepository.CONFIG.MAX_FIREFOX_TURN_COUNT : undefined;
      const config = await this.fetchConfig(limit);
      this.wCall?.configUpdate(this.wUser, 0, JSON.stringify(config));
    };
    _requestConfig().catch(error => {
      this.logger.warn('Failed fetching calling config', error);
      this.wCall?.configUpdate(this.wUser, 1, '');
    });

    return 0;
  };

  private readonly callClosed = async (reason: REASON, convId: SerializedConversationId) => {
    Warnings.hideWarning(Warnings.TYPE.CALL_QUALITY_POOR);
    const conversationId = this.parseQualifiedId(convId);
    const call = this.findCall(conversationId);
    if (!call) {
      return;
    }

    // There's nothing we need to do for non-mls calls
    if (call.conversationType === CONV_TYPE.CONFERENCE_MLS) {
      await this.leaveMLSConference(conversationId);
    }

    if (reason === REASON.NORMAL) {
      this.callState.selectableScreens([]);
      this.callState.selectableWindows([]);
    }

    if (reason === REASON.NOONE_JOINED || reason === REASON.EVERYONE_LEFT) {
      const conversationEntity = this.getConversationById(conversationId);
      if (!conversationEntity) {
        this.logger.warn(
          `Unable to find a conversation with id of ${call.conversationId.id}@${call.conversationId.domain}`,
        );
      } else {
        const callingEvent = EventBuilder.buildCallingTimeoutEvent(
          reason,
          conversationEntity,
          call.getSelfParticipant().user.id,
        );
        this.eventRepository.injectEvent(callingEvent);
      }
    }

    if (reason === REASON.OUTDATED_CLIENT) {
      this.warnOutdatedClient(conversationId);
    }

    const stillActiveState = [REASON.STILL_ONGOING, REASON.ANSWERED_ELSEWHERE, REASON.REJECTED];

    this.sendCallingEvent(EventName.CALLING.ENDED_CALL, call, {
      [Segmentation.CALL.AV_SWITCH_TOGGLE]: call.analyticsAvSwitchToggle,
      [Segmentation.CALL.DIRECTION]: this.getCallDirection(call),
      [Segmentation.CALL.DURATION]: Math.ceil((Date.now() - (call.startedAt() || 0)) / 5000) * 5,
      [Segmentation.CALL.END_REASON]: reason,
      [Segmentation.CALL.REASON]: this.getCallEndReasonText(reason),
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
        call.startedAt() ? Date.now() - (call.startedAt() || 0) : 0,
        reason,
        new Date().toISOString(),
        EventSource.WEBSOCKET,
      );
      this.removeCall(call);
      return;
    }
    selfParticipant.releaseMediaStream(true);
    call.removeAllAudio();
    selfParticipant.videoState(VIDEO_STATE.STOPPED);
    call.reason(reason);
  };

  /*
    Note: This is in sync with our ios code base
    https://github.com/wireapp/wire-ios/blob/cf91b35d6ccbee5f03592f5bb763534341630428/Wire-iOS/Sources/Analytics/AnalyticsCallingTracker.swift#L182-L212
  */
  getCallEndReasonText = (reason: REASON): string => {
    switch (reason) {
      case REASON.CANCELED:
        return 'canceled';
      case REASON.NORMAL:
      case REASON.STILL_ONGOING:
        return 'normal';
      case REASON.IO_ERROR:
        return 'io_error';
      case REASON.ERROR:
        return 'internal_error';
      case REASON.ANSWERED_ELSEWHERE:
        return 'answered_elsewhere';
      case REASON.TIMEOUT:
      case REASON.TIMEOUT_ECONN:
        return 'timeout';
      case REASON.LOST_MEDIA:
        return 'drop';
      case REASON.REJECTED:
        return 'rejected_elsewhere';
      case REASON.OUTDATED_CLIENT:
        return 'outdated_client';
      case REASON.DATACHANNEL:
        return 'datachannel';
      case REASON.NOONE_JOINED:
        return 'no_one_joined';
      case REASON.EVERYONE_LEFT:
        return 'everyone_left';
      default:
        return 'unknown';
    }
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
    const qualifiedUserId = this.parseQualifiedId(userId);
    const conversationId = this.parseQualifiedId(convId);
    const conversation = this.getConversationById(conversationId);
    if (!conversation || !this.selfUser || !this.selfClientId) {
      this.logger.warn(
        'Unable to process incoming call',
        JSON.stringify({conversationId, selfClientId: this.selfClientId, selfUser: this.selfUser}),
      );
      return;
    }
    const storedCall = this.findCall(conversationId);
    if (storedCall) {
      // A call that has been picked up by another device can still be in storage.
      // When a second call arrives in the same conversation, we need to clean that call first
      this.removeCall(storedCall);
    }
    const canRing = !conversation.showNotificationsNothing() && shouldRing && this.isReady;
    const selfParticipant = new Participant(this.selfUser, this.selfClientId);
    const isVideoCall = hasVideo ? CALL_TYPE.VIDEO : CALL_TYPE.NORMAL;
    const isMuted =
      Config.getConfig().FEATURE.CONFERENCE_AUTO_MUTE &&
      [CONV_TYPE.CONFERENCE, CONV_TYPE.CONFERENCE_MLS].includes(conversationType);
    const call = new Call(
      qualifiedUserId,
      conversation.qualifiedId,
      conversationType,
      selfParticipant,
      hasVideo ? CALL_TYPE.VIDEO : CALL_TYPE.NORMAL,
      this.mediaDevicesHandler,
      isMuted,
    );
    if (!canRing) {
      // an incoming call that should not ring is an ongoing group call
      call.reason(REASON.STILL_ONGOING);
    }
    call.state(CALL_STATE.INCOMING);
    if (canRing && isVideoCall) {
      this.warmupMediaStreams(call, true, true);
    }
    this.injectActivateEvent(conversationId, qualifiedUserId, new Date(timestamp * 1000).toISOString());

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
    members.forEach(member => call.getParticipant(member.userId, member.clientid)?.videoState(member.vrecv));
  }

  private updateParticipantAudioState(call: Call, members: QualifiedWcallMember[]): void {
    members.forEach(
      member =>
        call
          .getParticipant(member.userId, member.clientid)
          ?.isAudioEstablished(member.aestab === AUDIO_STATE.ESTABLISHED),
    );
  }

  private updateParticipantList(call: Call, members: QualifiedWcallMember[]): void {
    const newMembers = members
      .filter(({userId, clientid}) => !call.getParticipant(userId, clientid))
      .map(({userId, clientid}) => {
        const user = this.userRepository.findUserById(userId);
        if (!user) {
          return null;
        }
        return new Participant(user, clientid);
      })
      .filter((participant): participant is Participant => !!participant);

    const removedMembers = call
      .participants()
      .filter(participant => !members.find(({userId, clientid}) => participant.doesMatchIds(userId, clientid)));

    newMembers.forEach(participant => call.participants.unshift(participant));
    removedMembers.forEach(participant => call.participants.remove(participant));

    if (call.participants().length > call.analyticsMaximumParticipants) {
      call.analyticsMaximumParticipants = call.participants().length;
    }

    call.updatePages();
    this.changeCallPage(call, call.currentPage());
  }

  private readonly handleCallParticipantChanges = (convId: SerializedConversationId, membersJson: string) => {
    const conversationId = this.parseQualifiedId(convId);
    const call = this.findCall(conversationId);

    if (!call) {
      return;
    }

    const {members: serializedMembers}: {members: WcallMember[]} = JSON.parse(membersJson);
    const members: QualifiedWcallMember[] = serializedMembers.map(member => ({
      ...member,
      userId: this.parseQualifiedId(member.userid),
    }));

    this.updateParticipantList(call, members);
    this.updateParticipantMutedState(call, members);
    this.updateParticipantVideoState(call, members);
    this.updateParticipantAudioState(call, members);
    this.handleCallParticipantChange(conversationId, members);
  };

  private readonly requestClients = async (wUser: number, convId: SerializedConversationId, __: number) => {
    const call = this.findCall(this.parseQualifiedId(convId));
    if (!call) {
      this.logger.warn(`Unable to find a call for the conversation id of ${convId}`);
      return;
    }
    await this.pushClients(call);
  };

  private readonly requestNewEpoch = async (_wUser: number, convId: SerializedConversationId) => {
    const qualifiedConversationId = this.parseQualifiedId(convId);
    return this.updateConferenceSubconversationEpoch(qualifiedConversationId);
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

    const missingStreams = Object.entries(cache).reduce((accumulator: MediaStreamQuery, currentValue) => {
      const [type, isCached] = currentValue;
      if (!isCached && !!query[type as keyof MediaStreamQuery]) {
        accumulator[type as keyof MediaStreamQuery] = true;
      }
      return accumulator;
    }, {});

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
    this.mediaStreamQuery = (async () => {
      try {
        if (missingStreams.screen && selfParticipant.sharesScreen()) {
          return selfParticipant.getMediaStream();
        }
        const mediaStream = await this.getMediaStream(missingStreams, call.isGroupOrConference);
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

    this.mediaStreamQuery
      .then(() => {
        const selfParticipant = call.getSelfParticipant();
        if (selfParticipant.videoState() === VIDEO_STATE.STOPPED) {
          selfParticipant.releaseVideoStream(true);
        }
      })
      .catch(this.logger.warn);
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
      const user = this.userRepository.findUserById(userId);
      if (user) {
        participant = new Participant(user, remoteClientId);
        call.addParticipant(participant);
      }
    }

    if (streams === null || streams.length === 0) {
      participant?.releaseVideoStream(false);
      return;
    }

    const [stream] = streams;
    if (stream.getVideoTracks().length > 0 && participant?.videoStream() !== stream) {
      participant?.videoStream(stream);
    }
  };

  private readonly audioCbrChanged = (userid: UserId, clientid: ClientId, enabled: number) => {
    const activeCall = this.callState.calls()[0];
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
    const conversationEntity = this.getConversationById(call.conversationId);
    const participants = conversationEntity?.participating_user_ets() || [];
    const selfUserTeamId = call.getSelfParticipant().user.id;
    const guests = participants.filter(user => user.isGuest()).length;
    const guestsWireless = participants.filter(user => user.isTemporaryGuest()).length;
    const guestsPro = participants.filter(user => !!user.teamId && user.teamId !== selfUserTeamId).length;
    const segmentations = {
      [Segmentation.CONVERSATION.GUESTS]: roundLogarithmic(guests, 6),
      [Segmentation.CONVERSATION.GUESTS_PRO]: roundLogarithmic(guestsPro, 6),
      [Segmentation.CONVERSATION.GUESTS_WIRELESS]: roundLogarithmic(guestsWireless, 6),
      [Segmentation.CONVERSATION.SERVICES]: roundLogarithmic(conversationEntity?.servicesCount() || 0, 6),
      [Segmentation.CONVERSATION.SIZE]: roundLogarithmic(
        (conversationEntity?.participating_user_ets() || []).length,
        6,
      ),
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
      .calls()
      .forEach((call: Call) => this.wCall?.end(this.wUser, this.serializeQualifiedId(call.conversationId)));
    this.wCall?.destroy(this.wUser);
  }

  //##############################################################################
  // Calling config
  //##############################################################################

  fetchConfig(limit?: number): Promise<CallConfigData> {
    return this.apiClient.api.account.getCallConfig(limit);
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
        closeBtnLabel: t('modalNoAudioCloseBtn'),
        message: t('modalNoAudioInputMessage'),
        title: t('modalNoAudioInputTitle'),
      },
    };
    PrimaryModal.show(PrimaryModal.type.CONFIRM, modalOptions);
  }

  private showNoCameraModal(): void {
    const modalOptions = {
      text: {
        closeBtnLabel: t('modalNoCameraCloseBtn'),
        htmlMessage: t('modalNoCameraMessage', Config.getConfig().BRAND_NAME, {
          '/faqLink': '</a>',
          br: '<br>',
          faqLink: `<a href="${
            Config.getConfig().URL.SUPPORT.CAMERA_ACCESS_DENIED
          }" data-uie-name="go-no-camera-faq" target="_blank" rel="noopener noreferrer">`,
        }),
        title: t('modalNoCameraTitle'),
      },
    };
    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, modalOptions);
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
