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
import {FEATURE_KEY} from '@wireapp/api-client/lib/team';
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
  RESOLUTION,
  STATE as CALL_STATE,
  VIDEO_STATE,
  VSTREAMS,
  Wcall,
  WcallClient,
  WcallMember,
} from '@wireapp/avs';
import {AvsDebugger} from '@wireapp/avs-debugger';
import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {useCallAlertState} from 'Components/calling/useCallAlertState';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {CALL_QUALITY_FEEDBACK_KEY} from 'Components/Modals/QualityFeedbackModal/constants';
import {RatingListLabel} from 'Components/Modals/QualityFeedbackModal/typings';
import {isMLSConversation, MLSConversation} from 'Repositories/conversation/ConversationSelectors';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {ConversationVerificationState} from 'Repositories/conversation/ConversationVerificationState';
import {EventBuilder} from 'Repositories/conversation/EventBuilder';
import {CONSENT_TYPE, MessageRepository, MessageSendingOptions} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';
import {CallingEvent} from 'Repositories/event/CallingEvent';
import {EventRepository} from 'Repositories/event/EventRepository';
import {EventSource} from 'Repositories/event/EventSource';
import {NOTIFICATION_HANDLING_STATE} from 'Repositories/event/NotificationHandlingState';
import type {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import type {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';
import {MediaType} from 'Repositories/media/MediaType';
import {TeamState} from 'Repositories/team/TeamState';
import {EventName} from 'Repositories/tracking/EventName';
import * as trackingHelpers from 'Repositories/tracking/Helpers';
import {Segmentation} from 'Repositories/tracking/Segmentation';
import {isTelemetryEnabledAtCurrentEnvironment} from 'Repositories/tracking/Telemetry.helpers';
import type {UserRepository} from 'Repositories/user/UserRepository';
import {flatten} from 'Util/ArrayUtil';
import {calculateChildWindowPosition} from 'Util/DOM/caculateChildWindowPosition';
import {isDetachedCallingFeatureEnabled} from 'Util/isDetachedCallingFeatureEnabled';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {roundLogarithmic} from 'Util/NumberUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {copyStyles} from 'Util/renderElement';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {createUuid} from 'Util/uuid';

import {Call, SerializedConversationId} from './Call';
import {CallingEpochData} from './CallingEpochCache';
import {callingSubscriptions} from './callingSubscriptionsHandler';
import {CallingViewMode, CallState, MuteState} from './CallState';
import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';
import {LEAVE_CALL_REASON} from './enum/LeaveCallReason';
import {ClientId, Participant, UserId} from './Participant';

import {Config} from '../../Config';
import {NoAudioInputError} from '../../error/NoAudioInputError';
import {APIClient} from '../../service/APIClientSingleton';
import {Core} from '../../service/CoreSingleton';
import type {ServerTimeHandler} from '../../time/serverTimeHandler';
import {Warnings} from '../../view_model/WarningsContainer';

const avsLogger = getLogger('avs');
const AVS_BROWSER_SLEEP_MODE_DETECTION_TIME = 3000;

interface MediaStreamQuery {
  audio?: boolean;
  camera?: boolean;
  screen?: boolean;
}

export type QualifiedWcallMember = Omit<WcallMember, 'userid'> & {
  userId: QualifiedId;
};

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

type SubconversationData = {
  epoch: number;
  secretKey: string;
  members: SubconversationEpochInfoMember[];
};

export class CallingRepository {
  private readonly acceptVersionWarning: (conversationId: QualifiedId) => void;
  private readonly callLog: string[];
  private readonly logger: Logger;
  private enableBackgroundBlur = false;
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
  private isOnAvsRustSft = false;

  static EMOJI_TIME_OUT_DURATION = TIME_IN_MILLIS.SECOND * 4;

  /**
   * Keeps track of the size of the avs log once the webapp is initiated. This allows detecting meaningless avs logs (logs that have a length equal to the length when the webapp was initiated)
   */
  private avsInitLogLength: number = 0;
  private isSoftLock = false;

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

    // abort call while conversation is degraded
    ko.computed(() => {
      const call = this.callState.joinedCall();

      if (!call) {
        return;
      }

      const activeConversation = call.conversation;

      const isDegraded = activeConversation.mlsVerificationState() === ConversationVerificationState.DEGRADED;

      if (isDegraded) {
        this.abortCall(activeConversation.qualifiedId, LEAVE_CALL_REASON.CONVERSATION_DEGRADED);

        const modalOptions = {
          primaryAction: {
            text: t('conversation.E2EIOk'),
          },
          text: {
            message: t('conversation.E2EIGroupCallDisconnected'),
            title: t('conversation.E2EIConversationNoLongerVerified'),
          },
        };

        PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, modalOptions, `degraded-${activeConversation.id}`);
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

    // Request the video streams whenever the mode changes to active speaker
    ko.computed(() => {
      const call = this.callState.joinedCall();
      if (!call) {
        return;
      }
      const isSpeakersViewActive = this.callState.isSpeakersViewActive();
      if (isSpeakersViewActive) {
        const videoQuality = call.activeSpeakers().length > 2 ? RESOLUTION.LOW : RESOLUTION.HIGH;

        const speakers = call.activeSpeakers();
        speakers.forEach(speaker => {
          speaker.setTemporarilyVideoScreenOff();
        });

        this.requestVideoStreams(call.conversation.qualifiedId, speakers, videoQuality);
      }
    });

    // Request the video streams whenever toggle display maximised Participant.
    ko.computed(() => {
      const call = this.callState.joinedCall();
      if (!call) {
        return;
      }
      const maximizedParticipant = call.maximizedParticipant();
      if (maximizedParticipant !== null) {
        maximizedParticipant.setTemporarilyVideoScreenOff();
        this.requestVideoStreams(call.conversation.qualifiedId, [maximizedParticipant], RESOLUTION.HIGH);
      } else {
        this.requestCurrentPageVideoStreams(call);
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

  public async switchVideoBackgroundBlur(enable: boolean): Promise<void> {
    const activeCall = this.callState.joinedCall();
    if (!activeCall) {
      return;
    }
    const selfParticipant = activeCall.getSelfParticipant();
    selfParticipant.releaseBlurredVideoStream();
    const videoFeed = selfParticipant.videoStream();
    if (!videoFeed) {
      return;
    }
    this.enableBackgroundBlur = enable;
    const newVideoFeed = enable ? ((await selfParticipant.setBlurredBackground(true)) as MediaStream) : videoFeed;
    this.changeMediaSource(newVideoFeed, MediaType.VIDEO, false);
  }

  getStats(conversationId: QualifiedId) {
    return this.wCall?.getStats(this.serializeQualifiedId(conversationId));
  }

  setSoftLock(value: boolean) {
    this.isSoftLock = value;
  }

  async initAvs(selfUser: User, clientId: ClientId): Promise<{wCall: Wcall; wUser: number}> {
    this.selfUser = selfUser;
    this.selfClientId = clientId;
    const callingInstance = await getAvsInstance();

    this.wCall = this.configureCallingApi(callingInstance);
    this.wUser = this.createWUser(this.wCall, this.serializeQualifiedId(this.selfUser.qualifiedId), clientId);

    this.mediaDevicesHandler.setOnMediaDevicesRefreshHandler(this.onMediaDevicesRefresh);

    return {wCall: this.wCall, wUser: this.wUser};
  }

  private onMediaDevicesRefresh = () => {
    const activeCall = this.callState.joinedCall();

    if (!activeCall) {
      return;
    }

    const selfParticipant = activeCall.getSelfParticipant();

    if (!selfParticipant.isMuted()) {
      void this.refreshAudioInput();
    }

    if (selfParticipant.isSendingVideo()) {
      void this.refreshVideoInput();
    }
  };

  setReady(): void {
    this.isReady = true;
    this.avsInitLogLength = this.callLog.length;
  }

  private configureCallingApi(wCall: Wcall): Wcall {
    wCall.setLogHandler(this.avsLogHandler);

    const avsEnv = Runtime.isFirefox() || Runtime.isSafari() ? AVS_ENV.FIREFOX : AVS_ENV.DEFAULT;
    wCall.init(avsEnv);
    wCall.setUserMediaHandler(this.getCallMediaStream);
    wCall.setAudioStreamHandler(this.updateCallAudioStreams);
    wCall.setVideoStreamHandler(this.updateParticipantVideoStream);
    this.isConferenceCallingSupported = wCall.isConferenceCallingSupported();
    let last = Date.now();
    setInterval(() => {
      // When the app enters sleep mode, no JavaScript is executed and the timer stops. We then determine this by
      // calculating the time difference.
      const now = Date.now();
      const diff = now - last;

      if (diff > AVS_BROWSER_SLEEP_MODE_DETECTION_TIME) {
        // Inform AVS that the app was in sleep mode. This recalibrates the timers within AVS
        try {
          wCall.setBackground(this.wUser, 0);
        } catch (e) {
          this.logger.warn(`Informed AVS about background mode failed". ${e}`);
        }
      }

      wCall.poll();
      last = now;
    }, 500);

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
      this.metricsReceived, // `metricsh`,
      this.requestConfig, // `cfg_reqh`,
      this.audioCbrChanged, // `acbrh`,
      this.videoStateChanged, // `vstateh`,
    );
    const tenSeconds = 10;
    wCall.setNetworkQualityHandler(wUser, this.updateCallQuality, tenSeconds);
    wCall.setMuteHandler(wUser, this.updateMuteState);
    wCall.setStateHandler(wUser, this.updateCallState);
    wCall.setParticipantChangedHandler(wUser, this.handleCallParticipantChanges);
    wCall.setReqClientsHandler(wUser, this.requestClients);
    wCall.setReqNewEpochHandler(wUser, this.requestNewEpoch);
    wCall.setActiveSpeakerHandler(wUser, this.updateActiveSpeakers);
    // Set AVS to process notification mode on startup so that old calls will be ignored.
    // This mode is terminated by the web app via the corresponding event NOTIFICATION_HANDLING_STATE.
    wCall.processNotifications(wUser, 1);

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

  private readonly isMLSConference = (conversation: Conversation): conversation is MLSConversation => {
    return isMLSConversation(conversation) && this.getConversationType(conversation) === CONV_TYPE.CONFERENCE_MLS;
  };

  public async pushClients(call: Call | undefined = this.callState.joinedCall(), checkMismatch?: boolean) {
    if (!call) {
      return false;
    }
    const {conversation} = call;

    const allClients = await this.core.service!.conversation.fetchAllParticipantsClients(conversation.qualifiedId);

    if (!this.isMLSConference(conversation)) {
      const qualifiedClients = flattenUserMap(allClients);

      const clients: Clients = flatten(
        qualifiedClients.map(({data, userId}) =>
          data.map(clientid => ({
            clientid,
            userid: this.serializeQualifiedId(userId),
          })),
        ),
      );

      this.wCall?.setClientsForConv(
        this.wUser,
        this.serializeQualifiedId(conversation.qualifiedId),
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
      .find((callInstance: Call) => matchQualifiedIds(callInstance.conversation.qualifiedId, conversationId));
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
  }

  private removeCall(call: Call): void {
    const index = this.callState.calls().indexOf(call);
    call.getSelfParticipant().releaseMediaStream(true);
    call.participants.removeAll();
    call.removeAllAudio();
    if (index !== -1) {
      this.callState.calls.splice(index, 1);
    }
  }

  private async warmupMediaStreams(call: Call, audio: boolean, camera: boolean): Promise<boolean> {
    // if it's a video call we query the video user media in order to display the video preview
    try {
      const selfParticipant = call.getSelfParticipant();
      camera = this.teamState.isVideoCallingEnabled() ? camera : false;
      const mediaStream = await this.getMediaStream({audio, camera}, call.isGroupOrConference);
      if (call.state() !== CALL_STATE.NONE) {
        selfParticipant.updateMediaStream(mediaStream, true);
        await selfParticipant.setBlurredBackground(this.enableBackgroundBlur);
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
    amplify.subscribe(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE, this.setNotificationHandlingState);
  }

  /**
   * Leave call when a participant is not verified anymore
   */
  private readonly leaveCallOnUnverified = (unverifiedUserId: QualifiedId): void => {
    const activeCall = this.callState.joinedCall();

    if (!activeCall) {
      return;
    }

    const {conversation} = activeCall;

    const clients = this.userRepository?.findUserById(unverifiedUserId)?.devices() || [];

    for (const {id: clientId} of clients) {
      const participant = activeCall.getParticipant(unverifiedUserId, clientId);

      if (participant) {
        this.leaveCall(conversation.qualifiedId, LEAVE_CALL_REASON.USER_TURNED_UNVERIFIED);
        PrimaryModal.show(
          PrimaryModal.type.ACKNOWLEDGE,
          {
            primaryAction: {
              text: t('callDegradationAction'),
            },
            text: {
              message: t('callDegradationDescription', {username: participant.user.name()}),
              title: t('callDegradationTitle'),
            },
          },
          `degraded-${conversation.qualifiedId}`,
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
          message: t('modalCallUpdateClientMessage', {brandName}),
          title: t('modalCallUpdateClientHeadline', {brandName}),
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
    const conversationId = targetedConversationId ?? {
      domain: '',
      id: conversation,
    };

    return conversationId;
  }

  /**
   * Handle incoming calling events from backend.
   */
  onCallEvent = async (event: CallingEvent, source: string): Promise<void> => {
    if (this.isSoftLock) {
      return;
    }

    const {content, qualified_conversation, from, qualified_from, time} = event;
    const isFederated = this.core.backendFeatures.isFederated && qualified_conversation && qualified_from;
    const userId = isFederated ? qualified_from : {domain: '', id: from};
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
        return this.processCallingMessage(conversation, event);
      }

      case CALL_MESSAGE_TYPE.REMOTE_MUTE: {
        const currentCall = this.callState.joinedCall();
        if (
          !currentCall ||
          !matchQualifiedIds(currentCall.conversation.qualifiedId, conversationId) ||
          !this.selfUser
        ) {
          return;
        }

        const isSenderAdmin = conversation.isAdmin(userId);
        if (!isSenderAdmin) {
          return;
        }

        const selfUserId = this.selfUser?.qualifiedId;
        const selfClientId = this.selfClientId;

        if (!selfUserId || !selfClientId) {
          return;
        }

        const isSelfClientTargetted =
          !!content.data.targets[selfUserId.domain]?.[selfUserId.id]?.includes(selfClientId);

        if (!isSelfClientTargetted) {
          return;
        }

        this.muteCall(currentCall, true, MuteState.REMOTE_MUTED);
        return this.processCallingMessage(conversation, event);
      }

      case CALL_MESSAGE_TYPE.EMOJIS: {
        const currentCall = this.callState.joinedCall();
        if (
          !currentCall ||
          !matchQualifiedIds(currentCall.conversation.qualifiedId, conversationId) ||
          !this.selfUser
        ) {
          return;
        }

        const senderParticipant = currentCall
          .participants()
          .find(participant => matchQualifiedIds(participant.user.qualifiedId, userId));

        const emojis: string[] = Object.entries(content.emojis).flatMap(([key, value]) => Array(value).fill(key));

        const isSelf = matchQualifiedIds(this.selfUser.qualifiedId, userId);

        const newEmojis = emojis.map(emoji => {
          const id = createUuid();

          return {
            id: `${Date.now()}-${id}`,
            emoji,
            left: Math.random() * 500,
            from: isSelf ? t('conversationYouAccusative') : (senderParticipant?.user.name() ?? ''),
          };
        });

        this.callState.emojis([...this.callState.emojis(), ...newEmojis]);

        setTimeout(() => {
          const remainingEmojis = this.callState
            .emojis()
            .filter(item => !newEmojis.some(newItem => newItem.id === item.id));
          this.callState.emojis(remainingEmojis);
        }, CallingRepository.EMOJI_TIME_OUT_DURATION);
        break;
      }

      case CALL_MESSAGE_TYPE.HAND_RAISED: {
        const currentCall = this.callState.joinedCall();
        if (
          !currentCall ||
          !matchQualifiedIds(currentCall.conversation.qualifiedId, conversationId) ||
          !this.selfUser
        ) {
          this.logger.info('Ignored hand raise event because no active call was found');
          return;
        }

        const participant = currentCall
          .participants()
          .find(participant => matchQualifiedIds(participant.user.qualifiedId, userId));

        if (!participant) {
          this.logger.info('Ignored hand raise event because no active participant was found');
          return;
        }

        const isSelf = matchQualifiedIds(this.selfUser.qualifiedId, userId);

        const {isHandUp} = content;
        const handRaisedAt = time ? new Date(time).getTime() : new Date().getTime();
        participant.handRaisedAt(isHandUp ? handRaisedAt : null);

        if (!isHandUp) {
          break;
        }

        const name = participant.user.name();
        const handUpMessage = isSelf
          ? t('videoCallParticipantRaisedSelfHandUp')
          : t('videoCallParticipantRaisedTheirHandUp', {name});

        window.dispatchEvent(
          new CustomEvent(WebAppEvents.CALL.HAND_RAISED, {
            detail: {
              notificationMessage: handUpMessage,
            },
          }),
        );

        break;
      }

      case CALL_MESSAGE_TYPE.REMOTE_KICK: {
        this.leaveCall(conversationId, LEAVE_CALL_REASON.REMOTE_KICK);
        return this.processCallingMessage(conversation, event);
      }

      default: {
        return this.processCallingMessage(conversation, event);
      }
    }
  };

  private readonly processCallingMessage = (conversation: Conversation, event: CallingEvent): void => {
    const {
      content,
      time = new Date().toISOString(),
      qualified_conversation,
      from,
      qualified_from,
      sender: clientId,
      senderClientId: senderFullyQualifiedClientId = '',
    } = event;
    const contentStr = JSON.stringify(content);
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const toSecond = (timestamp: number) => Math.floor(timestamp / 1000);

    const isFederated = this.core.backendFeatures.isFederated && qualified_conversation && qualified_from;
    const userId = isFederated ? qualified_from : {domain: '', id: from};

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
      this.serializeQualifiedId(conversation.qualifiedId),
      this.serializeQualifiedId(userId),
      conversation && isMLSConversation(conversation) ? senderClientId : clientId,
      conversation && this.getConversationType(conversation),
      0, // if call a meeting 1
    );

    if (res !== 0) {
      this.logger.warn(`recv_msg failed with code: ${res}`);
      if (
        this.callState
          .acceptedVersionWarnings()
          .every(acceptedId => !matchQualifiedIds(acceptedId, conversation.qualifiedId)) &&
        res === ERROR.UNKNOWN_PROTOCOL &&
        event.content.type === 'CONFSTART'
      ) {
        this.warnOutdatedClient(conversation.qualifiedId);
      }
    }
  };

  //##############################################################################
  // Call actions
  //##############################################################################

  private getConversationType(conversation: Conversation): CONV_TYPE {
    const useSFTForOneToOneCalls =
      this.teamState.teamFeatures()?.[FEATURE_KEY.CONFERENCE_CALLING]?.config?.useSFTForOneToOneCalls;

    if (conversation.isGroupOrChannel() || useSFTForOneToOneCalls) {
      if (isMLSConversation(conversation)) {
        return CONV_TYPE.CONFERENCE_MLS;
      }

      return this.supportsConferenceCalling ? CONV_TYPE.CONFERENCE : CONV_TYPE.GROUP;
    }

    return CONV_TYPE.ONEONONE;
  }

  async startCall(conversation: Conversation): Promise<void | Call> {
    void this.setViewModeMinimized();
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
    this.logger.log(`Starting a call of type "${CALL_TYPE.NORMAL}" in conversation ID "${convId}"...`);
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
        conversation,
        conversationType,
        selfParticipant,
        CALL_TYPE.NORMAL,
        this.mediaDevicesHandler,
      );
      this.storeCall(call);

      // Temporary feature to toggle Rust SFT
      this.setSetupSftConfig(call);

      if (this.isMLSConference(conversation)) {
        call.epochCache.enable();
        await this.joinMlsConferenceSubconversation(conversation);
      }

      /**
       * Since we might have been on a conference call before, which was started as muted, then we've hung up and started an outgoing call,
       * we are stuck in muted state so we should call the AVS function setMute(this.wUser, 0) before initiating the call to fix this
       * Further info: https://wearezeta.atlassian.net/browse/SQCALL-551
       */
      this.wCall?.setMute(this.wUser, 0);
      this.wCall?.start(this.wUser, convId, CALL_TYPE.NORMAL, conversationType, this.callState.cbrEncoding(), 0); // if call a meeting 1
      if (!!conversation && this.isMLSConference(conversation)) {
        this.setCachedEpochInfos(call);
      }
      this.sendCallingEvent(EventName.CALLING.INITIATED_CALL, call);
      this.sendCallingEvent(EventName.CONTRIBUTED, call, {
        [Segmentation.MESSAGE.ACTION]: 'audio_call',
      });

      return call;
    } catch (error) {
      if (error) {
        this.logger.error('Failed starting call', error);
      }
      if (!!conversation && this.isMLSConference(conversation)) {
        await this.leaveMLSConferenceBecauseError(conversation);
      }
    }
  }

  /**
   * We're fetching Rust SFT config in case user wants to use them.
   * We also use a cache value to avoid unnecessarily fetching the config.
   */
  private setSetupSftConfig(call: Call) {
    if (call.useAvsRustSFT()) {
      if (!this.isOnAvsRustSft) {
        this.isOnAvsRustSft = true;
        this.requestConfig();
        this.logger.info('SetupSftConfig: Switch SFT setup use Rust SFT: false->true');
      }
    } else if (this.isOnAvsRustSft) {
      this.isOnAvsRustSft = false;
      this.requestConfig();
      this.logger.info('SetupSftConfig: Switch SFT setup use Rust SFT: true->false');
    }
    this.logger.info('SetupSftConfig: Use Rust SFT', this.isOnAvsRustSft);
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
    const callState = call.state();

    // If screen sharing is active, stop it first
    if (selfParticipant.sharesScreen()) {
      this.stopScreenShare(selfParticipant, call.conversation, call);
    }

    if (callState === CALL_STATE.INCOMING) {
      selfParticipant.videoState(newState);
      if (newState === VIDEO_STATE.STOPPED) {
        selfParticipant.releaseVideoStream(true);
      } else {
        this.warmupMediaStreams(call, false, true);
      }
    }

    if (callState !== CALL_STATE.INCOMING && newState === VIDEO_STATE.STOPPED && !selfParticipant.sharesScreen()) {
      selfParticipant.releaseVideoStream(true);
    }

    // Let us test this one in staging before we go live with it!
    // if (callState !== CALL_STATE.MEDIA_ESTAB && callState !== CALL_STATE.INCOMING) {
    //   // Toggle Camera should not be available in any other call state for this reason we make an exception for the
    //   // case that someone wants to access the camera outside a call!
    //   throw new Error('invalid call state in `toggleCamera`');
    // }

    this.wCall?.setVideoSendState(this.wUser, this.serializeQualifiedId(call.conversation.qualifiedId), newState);
  }

  /**
   * Toggles screenshare ON and OFF for the given call (depending on the feature flag)
   */
  toggleScreenshare = async (call: Call): Promise<void> => {
    if (Config.getConfig().FEATURE.ENABLE_SCREEN_SHARE_WITH_VIDEO) {
      await this.toggleScreenShareWithVideo(call);
    } else {
      await this.toggleOnlyScreenshare(call);
    }
  };

  /**
   * Toggles screenshare ON and OFF for the given call (does not switch between different screens)
   */
  toggleOnlyScreenshare = async (call: Call): Promise<void> => {
    const {conversation} = call;

    // The screen share was stopped by the user through the application. We clean up the state and stop the screen share
    // video track. Note that stopping a track does not trigger an "ended" event.
    const selfParticipant = call.getSelfParticipant();
    if (selfParticipant.sharesScreen()) {
      this.stopScreenShare(selfParticipant, conversation, call);
      return;
    }

    try {
      const mediaStream = await this.getMediaStream({audio: true, screen: true}, call.isGroupOrConference);
      if ('contentHint' in mediaStream.getVideoTracks()[0]) {
        mediaStream.getVideoTracks()[0].contentHint = 'detail';
      }

      // If the screen share is stopped by the os system or the browser, an "ended" event is triggered. We listen for
      // this event to clean up the screen share state in this case.
      mediaStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare(selfParticipant, conversation, call);
      };

      selfParticipant.videoState(VIDEO_STATE.SCREENSHARE);
      selfParticipant.updateMediaStream(mediaStream, true);
      this.wCall?.setVideoSendState(
        this.wUser,
        this.serializeQualifiedId(conversation.qualifiedId),
        VIDEO_STATE.SCREENSHARE,
      );
      selfParticipant.startedScreenSharingAt(Date.now());
    } catch (error) {
      this.logger.info('Failed to get screen sharing stream', error);
    }
  };

  /**
   * Toggles screenshare with video for the given call
   */
  toggleScreenShareWithVideo = async (call: Call): Promise<void> => {
    const selfParticipant = call.getSelfParticipant();
    if (!selfParticipant) {
      this.logger.warn('No self participant found for screen share');
      return;
    }

    if (selfParticipant.sharesScreen()) {
      this.stopScreenShare(selfParticipant, call.conversation, call);
      return;
    }

    let screenStream: MediaStream | null = null;
    let cameraStream: MediaStream | null = null;

    try {
      // If we're currently in a video call, release the camera resources first
      if (selfParticipant.sharesCamera()) {
        selfParticipant.releaseVideoStream(true);
      }

      screenStream = await this.getMediaStream({screen: true}, call.isGroupOrConference);
      if (!screenStream) {
        throw new Error('Failed to get screen share stream');
      }

      cameraStream = await this.getMediaStream({camera: true}, call.isGroupOrConference);
      if (!cameraStream) {
        throw new Error('Failed to get camera stream');
      }

      const videoTracks = cameraStream.getVideoTracks();
      if (!videoTracks.length || videoTracks[0].readyState !== 'live') {
        throw new Error('Camera stream has no active video tracks');
      }

      this.logger.info('Camera track details:', {
        enabled: videoTracks[0].enabled,
        muted: videoTracks[0].muted,
        readyState: videoTracks[0].readyState,
        settings: videoTracks[0].getSettings(),
        constraints: videoTracks[0].getConstraints(),
        capabilities: videoTracks[0].getCapabilities(),
      });

      const mixedStream = await call.canvasMixer.startMixing(screenStream, cameraStream);
      if (!mixedStream) {
        throw new Error('Failed to create mixed stream');
      }

      selfParticipant.videoStream(mixedStream);
      selfParticipant.videoState(VIDEO_STATE.SCREENSHARE);
      selfParticipant.startedScreenSharingAt(Date.now());

      this.wCall?.setVideoSendState(
        this.wUser,
        this.serializeQualifiedId(call.conversation.qualifiedId),
        VIDEO_STATE.SCREENSHARE,
      );

      screenStream.getVideoTracks()[0].onended = () => {
        this.stopScreenShare(selfParticipant, call.conversation, call);
      };

      call.analyticsScreenSharing = true;
    } catch (error) {
      this.logger.error('Error in toggleScreenShareWithVideo:', error);
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    }
  };

  private stopScreenShare(selfParticipant: Participant, conversation: Conversation, call: Call): void {
    if (!selfParticipant.sharesScreen()) {
      return;
    }

    const mixedStream = selfParticipant.videoStream();
    if (mixedStream) {
      mixedStream.getTracks().forEach(track => track.stop());
    }

    selfParticipant.releaseVideoStream(true);
    call.canvasMixer.releaseStreams();
    selfParticipant.videoState(VIDEO_STATE.STOPPED);

    this.wCall?.setVideoSendState(this.wUser, this.serializeQualifiedId(conversation.qualifiedId), VIDEO_STATE.STOPPED);
  }

  onPageHide = (event: PageTransitionEvent) => {
    if (event.persisted) {
      return;
    }

    this.callState.detachedWindow()?.close();
  };

  handleThemeUpdateEvent = () => {
    const detachedWindow = this.callState.detachedWindow();
    if (detachedWindow) {
      detachedWindow.document.body.className = window.document.body.className;
    }
  };

  closeDetachedWindow = () => {
    this.callState.detachedWindow(null);
    this.callState.detachedWindowCallQualifiedId(null);
    amplify.unsubscribe(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.THEME, this.handleThemeUpdateEvent);
    this.callState.viewMode(CallingViewMode.MINIMIZED);

    const joinedCall = this.callState.joinedCall();
    const isSharingScreen = joinedCall?.getSelfParticipant().sharesScreen();
    const isScreenSharingSourceFromDetachedWindow = this.callState.isScreenSharingSourceFromDetachedWindow();

    if (joinedCall && isSharingScreen && isScreenSharingSourceFromDetachedWindow) {
      window.dispatchEvent(new CustomEvent(WebAppEvents.CALL.SCREEN_SHARING_ENDED));
      this.callState.isScreenSharingSourceFromDetachedWindow(false);
      void this.toggleOnlyScreenshare(joinedCall);
    }
  };

  setViewModeMinimized = () => {
    const isDetachedWindowSupported = isDetachedCallingFeatureEnabled();

    if (!isDetachedWindowSupported) {
      this.callState.viewMode(CallingViewMode.MINIMIZED);
      return;
    }

    this.callState.detachedWindow()?.close();
    this.closeDetachedWindow();
  };

  setViewModeFullScreen = () => {
    this.callState.viewMode(CallingViewMode.FULL_SCREEN);
  };

  async setViewModeDetached(
    detachedViewModeOptions: {name: string; height: number; width: number} = {
      name: 'WIRE_PICTURE_IN_PICTURE_CALL',
      width: 1026,
      height: 829,
    },
  ) {
    if (!isDetachedCallingFeatureEnabled()) {
      this.setViewModeFullScreen();
      return;
    }

    const {name, width, height} = detachedViewModeOptions;
    const {top, left} = calculateChildWindowPosition(height, width);

    const detachedWindow = window.open(
      '',
      name,
      `
        width=${width}
        height=${height},
        top=${top},
        left=${left}
        location=no,
        menubar=no,
        resizable=yes,
        status=no,
        toolbar=no,
      `,
    );

    this.callState.detachedWindow(detachedWindow);

    this.callState.detachedWindowCallQualifiedId(this.callState.joinedCall()?.conversation.qualifiedId ?? null);

    if (!detachedWindow) {
      return;
    }

    // New window is not opened on the same domain (it's about:blank), so we cannot use any of the dom loaded events to copy the styles.
    setTimeout(() => copyStyles(window.document, detachedWindow.document), 0);

    detachedWindow.document.title = t('callingPopOutWindowTitle', {brandName: Config.getConfig().BRAND_NAME});

    detachedWindow.addEventListener('beforeunload', this.closeDetachedWindow);
    detachedWindow.addEventListener('pagehide', this.closeDetachedWindow);
    window.addEventListener('pagehide', this.onPageHide);

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.THEME, this.handleThemeUpdateEvent);

    this.callState.viewMode(CallingViewMode.DETACHED_WINDOW);
  }

  async answerCall(call: Call, callType?: CALL_TYPE): Promise<void> {
    void this.setViewModeMinimized();

    // Temporary feature to toggle Rust SFT
    this.setSetupSftConfig(call);

    const {conversation} = call;
    try {
      callType ??= call.getSelfParticipant().sharesCamera() ? call.initialType : CALL_TYPE.NORMAL;

      const isVideoCall = callType === CALL_TYPE.VIDEO;
      if (!isVideoCall) {
        call.getSelfParticipant().releaseVideoStream(true);
      }
      await this.warmupMediaStreams(call, true, isVideoCall);

      const isE2EIDegradedConversation = conversation.mlsVerificationState() === ConversationVerificationState.DEGRADED;
      let userConsentWithDegradation = true;
      if (isE2EIDegradedConversation) {
        userConsentWithDegradation = await new Promise(resolve =>
          PrimaryModal.show(PrimaryModal.type.CONFIRM, {
            primaryAction: {
              action: () => {
                conversation.mlsVerificationState(ConversationVerificationState.UNVERIFIED);
                resolve(true);
              },
              text: t('conversation.E2EIJoinAnyway'),
            },
            secondaryAction: {
              action: () => resolve(false),
              text: t('conversation.E2EICancel'),
            },
            text: {
              message: t('conversation.E2EIDegradedJoinCall'),
              title: t('conversation.E2EIConversationNoLongerVerified'),
            },
          }),
        );
      }
      const shouldContinueCall = userConsentWithDegradation && (await this.pushClients(call, true));
      if (!shouldContinueCall) {
        this.rejectCall(conversation.qualifiedId);
        return;
      }
      this.setMute(call.muteState() !== MuteState.NOT_MUTED);

      if (!!conversation && this.isMLSConference(conversation)) {
        // Enable the epoch cache to save all epoch infos while init avs!
        call.epochCache.enable();
        await this.joinMlsConferenceSubconversation(conversation);
      }

      this.wCall?.answer(
        this.wUser,
        this.serializeQualifiedId(conversation.qualifiedId),
        callType,
        this.callState.cbrEncoding(),
      );

      if (!!conversation && this.isMLSConference(conversation)) {
        this.setCachedEpochInfos(call);
      }

      this.sendCallingEvent(EventName.CALLING.JOINED_CALL, call, {
        [Segmentation.CALL.DIRECTION]: this.getCallDirection(call),
      });
    } catch (error) {
      if (error) {
        this.logger.error('Failed answering call', error);
      }
      this.rejectCall(conversation.qualifiedId);
      if (!!conversation && this.isMLSConference(conversation)) {
        await this.leaveMLSConferenceBecauseError(conversation);
      }
    }
  }

  private getConversationById(conversationId: QualifiedId): Conversation | undefined {
    return this.conversationState.findConversation(conversationId);
  }

  private readonly leave1on1MLSConference = async (conversationId: QualifiedId) => {
    const call = this.findCall(conversationId);
    call?.endedAt(Date.now());
    if (isTelemetryEnabledAtCurrentEnvironment()) {
      this.showCallQualityFeedbackModal(conversationId);
    }
    const serializeSelfUser = this.selfUser ? this.serializeQualifiedId(this.selfUser) : 'unknown';
    const serializeConversationId = this.serializeQualifiedId(conversationId);
    this.logger.info(`Call Epoch Info: _leave, user: ${serializeSelfUser}, conversation: ${serializeConversationId}`);
    await this.subconversationService.leaveConferenceSubconversation(conversationId);

    const conversationIdStr = this.serializeQualifiedId(conversationId);
    this.wCall?.end(this.wUser, conversationIdStr);
    callingSubscriptions.removeCall(conversationId);
    AvsDebugger.reset();
  };

  private readonly leaveMLSConference = async (conversationId: QualifiedId) => {
    const serializeSelfUser = this.selfUser ? this.serializeQualifiedId(this.selfUser) : 'unknown';
    const serializeConversationId = this.serializeQualifiedId(conversationId);

    this.logger.info(`Call Epoch Info: _leave, user: ${serializeSelfUser}, conversation: ${serializeConversationId}`);
    await this.subconversationService.leaveConferenceSubconversation(conversationId);
  };

  private readonly leaveMLSConferenceBecauseError = async (conversationId: QualifiedId) => {
    const call = this.findCall(conversationId);
    if (call !== undefined) {
      call.epochCache.clean();
      call.epochCache.disable();
    }
    await this.leaveMLSConference(conversationId);
    callingSubscriptions.removeCall(conversationId);
  };

  private readonly joinMlsConferenceSubconversation = async ({qualifiedId, groupId}: MLSConversation) => {
    const serializeSelfUser = this.selfUser ? this.serializeQualifiedId(this.selfUser) : 'unknown';
    const serializeConversationId = this.serializeQualifiedId(qualifiedId);

    const unsubscribe = await this.subconversationService.subscribeToEpochUpdates(
      qualifiedId,
      groupId,
      (groupId: string) => this.conversationState.findConversationByGroupId(groupId)?.qualifiedId,
      data => {
        this.logger.info(
          `Call Epoch Info: _update_subscription_trigger, user: ${serializeSelfUser}, conversation: ${serializeConversationId}`,
        );
        return this.setEpochInfo(qualifiedId, data);
      },
    );

    callingSubscriptions.addCall(qualifiedId, unsubscribe);
    this.logger.info(`Call Epoch Info: _join, user: ${serializeSelfUser}, conversation: ${serializeConversationId}`);
  };

  private readonly updateConferenceSubconversationEpoch = async (conversationId: QualifiedId) => {
    const conversation = this.getConversationById(conversationId);
    if (!conversation || !this.isMLSConference(conversation)) {
      return;
    }

    const serializeSelfUser = this.selfUser ? this.serializeQualifiedId(this.selfUser) : 'unknown';

    const subconversationEpochInfo = await this.subconversationService.getSubconversationEpochInfo(
      conversationId,
      conversation.groupId,
      true,
    );

    if (!subconversationEpochInfo) {
      return;
    }

    this.logger.info(
      `Call Epoch Info: _update, epoch: ${subconversationEpochInfo} user: ${serializeSelfUser}, conversation: ${conversationId}`,
    );
    this.setEpochInfo(conversationId, subconversationEpochInfo);
  };

  private readonly handleCallParticipantChange = (conversationId: QualifiedId, members: QualifiedWcallMember[]) => {
    const conversation = this.getConversationById(conversationId);
    if (!conversation || !this.isMLSConference(conversation)) {
      return;
    }

    const serializeSelfUser = this.selfUser ? this.serializeQualifiedId(this.selfUser.qualifiedId) : 'unknown';

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

      // If there is already a task for the client, don't overwrite it
      if (TaskScheduler.hasActiveTask(key)) {
        continue;
      }

      // otherwise, remove the client from subconversation if it won't establish their audio state in 3 mins timeout
      const firingDate = new Date().getTime() + TIME_IN_MILLIS.MINUTE * 3;

      TaskScheduler.addTask({
        firingDate,
        key,
        // if timer expires = client is stale -> remove client from the subconversation
        task: () => {
          this.logger.info(
            `Call Epoch Info: on client left remove from subconversation, user: ${serializeSelfUser}, conversation: ${conversationId}`,
          );
          return this.subconversationService.removeClientFromConferenceSubconversation(conversationId, {
            user: {id: member.userId.id, domain: member.userId.domain},
            clientId: member.clientid,
          });
        },
      });
    }
  };

  private setCachedEpochInfos(call: Call) {
    call.epochCache.disable();
    const userId = this.selfUser ? this.serializeQualifiedId(this.selfUser.qualifiedId) : 'unknown';
    this.logger.info(
      `Call Epoch Info: _cache_disable, user: ${userId}, conversation: ${this.serializeQualifiedId(call.conversation.qualifiedId)}`,
    );
    call.epochCache.getEpochList().forEach((d: CallingEpochData) => {
      this.logger.info(
        `Call Epoch Info: _cache_avs_set, epoch: ${d.epoch}, user: ${userId}, conversation: ${d.serializedConversationId}`,
      );
      this.wCall?.setEpochInfo(this.wUser, d.serializedConversationId, d.epoch, JSON.stringify(d.clients), d.secretKey);
    });
    call.epochCache.clean();
  }

  private readonly setEpochInfo = (conversationId: QualifiedId, subconversationData: SubconversationData) => {
    const serializedConversationId = this.serializeQualifiedId(conversationId);
    const userId = this.selfUser ? this.serializeQualifiedId(this.selfUser.qualifiedId) : 'unknown';
    const {epoch, secretKey, members} = subconversationData;
    const clients = {
      convid: serializedConversationId,
      clients: members,
    };
    const call = this.findCall(conversationId);
    if (!call) {
      return -1;
    }

    if (call.epochCache.isEnabled()) {
      this.logger.info(
        `Call Epoch Info: _cache_store, epoch: ${epoch}, user: ${userId}, conversation: ${serializedConversationId}`,
      );
      return call.epochCache.store({serializedConversationId, epoch, clients, secretKey});
    }

    this.logger.info(
      `Call Epoch Info: _avs_set, epoch: ${epoch}, user: ${userId}, conversation: ${serializedConversationId}`,
    );
    return this.wCall?.setEpochInfo(this.wUser, serializedConversationId, epoch, JSON.stringify(clients), secretKey);
  };

  rejectCall(conversationId: QualifiedId): void {
    this.wCall?.reject(this.wUser, this.serializeQualifiedId(conversationId));
  }

  /**
   * This method monitors every change in the call and is therefore the main method for handling video requests.
   * These changes include mute/unmute, screen sharing, or camera switching, joining or leaving of participants, or...
   * @param call
   * @param newPage
   */
  changeCallPage(call: Call, newPage: number): void {
    call.currentPage(newPage);
    if (!this.callState.isSpeakersViewActive() && !this.callState.isMaximisedViewActive()) {
      this.requestCurrentPageVideoStreams(call);
    }
  }

  /**
   * This method queries streams for the participants who are displayed on the active page! This can include up to nine
   * participants and is used when flipping pages or starting a call.
   * @param call
   */
  requestCurrentPageVideoStreams(call: Call): void {
    const currentPageParticipants = call.pages()[call.currentPage()] ?? [];
    const videoQuality: RESOLUTION = currentPageParticipants.length <= 2 ? RESOLUTION.HIGH : RESOLUTION.LOW;
    this.requestVideoStreams(call.conversation.qualifiedId, currentPageParticipants, videoQuality);
  }

  requestVideoStreams(conversationId: QualifiedId, participants: Participant[], videoQuality: RESOLUTION) {
    if (participants.length === 0) {
      return;
    }
    // Filter myself out and do not request my own stream.
    const requestParticipants = participants.filter(p => !this.isSelfUser(p));
    if (requestParticipants.length === 0) {
      return;
    }

    const convId = this.serializeQualifiedId(conversationId);

    const payload = {
      clients: requestParticipants.map(participant => ({
        clientid: participant.clientId,
        userid: this.serializeQualifiedId(participant.user.qualifiedId),
        quality: videoQuality,
      })),
      convid: convId,
    };
    this.wCall?.requestVideoStreams(this.wUser, convId, VSTREAMS.LIST, JSON.stringify(payload));
  }

  readonly showCallQualityFeedbackModal = (conversationId: QualifiedId) => {
    if (!this.selfUser || !this.hasActiveCall()) {
      return;
    }

    const {setQualityFeedbackModalShown, setConversationId} = useCallAlertState.getState();

    try {
      const qualityFeedbackStorage = localStorage.getItem(CALL_QUALITY_FEEDBACK_KEY);
      const currentStorageData = qualityFeedbackStorage ? JSON.parse(qualityFeedbackStorage) : {};
      const currentUserDate = currentStorageData?.[this.selfUser.id];
      const currentDate = new Date().getTime();
      const call = this.findCall(conversationId);
      const isCallTooShort = (call?.endedAt() || 0) - (call?.startedAt() || 0) <= TIME_IN_MILLIS.MINUTE;
      const isFeedbackMuted =
        currentUserDate !== undefined && (currentUserDate === null || currentDate < currentUserDate);

      if (isFeedbackMuted || isCallTooShort) {
        trackingHelpers.trackCallQualityFeedback({
          call,
          label: isFeedbackMuted ? RatingListLabel.MUTED : RatingListLabel.CALL_TOO_SHORT,
        });
      } else {
        setConversationId(conversationId);
        setQualityFeedbackModalShown(true);
      }
    } catch (error) {
      this.logger.warn(`Storage data can't found: ${(error as Error).message}`);
      setConversationId(conversationId);
      setQualityFeedbackModalShown(true);
    }
  };

  /**
   * Leaves the call in the given conversation and on the basis of the given reason,
   * Remove the call from the call state.
   * @param conversationId
   * @param reason
   */
  readonly leaveCall = (conversationId: QualifiedId, reason: LEAVE_CALL_REASON): void => {
    const call = this.findCall(conversationId);
    if (call) {
      call.endedAt(Date.now());
      // Stop screen sharing if active
      if (call.getSelfParticipant().sharesScreen()) {
        this.stopScreenShare(call.getSelfParticipant(), call.conversation, call);
      }

      // If the user is not part of the conversation, the call must be removed from the state
      if (reason === LEAVE_CALL_REASON.USER_IS_REMOVED_FROM_CONVERSATION) {
        this.removeCall(call);
      }
    }

    if (isTelemetryEnabledAtCurrentEnvironment()) {
      this.showCallQualityFeedbackModal(conversationId);
    }

    this.logger.info(`Ending call with reason ${reason} \n Stack trace: `, new Error().stack);
    const conversationIdStr = this.serializeQualifiedId(conversationId);
    delete this.poorCallQualityUsers[conversationIdStr];
    this.wCall?.end(this.wUser, conversationIdStr);
    AvsDebugger.reset();
  };

  muteCall(call: Call, shouldMute: boolean, reason?: MuteState): void {
    if (call.state() === CALL_STATE.INCOMING) {
      call.muteState(shouldMute ? MuteState.SELF_MUTED : MuteState.NOT_MUTED);
      return;
    }
    if (!shouldMute && call.hasWorkingAudioInput === false && call.muteState() !== MuteState.NOT_MUTED) {
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

  private getMediaStream({audio = false, camera = false, screen = false}: MediaStreamQuery, isGroup: boolean) {
    return this.mediaStreamHandler
      .requestMediaStream(audio, camera, screen, isGroup)
      .then(stream => {
        if (!stream) {
          throw new Error('Failed to get media stream');
        }

        // For camera streams, verify we have video tracks
        if (camera) {
          const videoTracks = stream.getVideoTracks();
          if (!videoTracks.length) {
            throw new Error('No video tracks found in camera stream');
          }

          const videoTrack = videoTracks[0];
          if (videoTrack.readyState !== 'live') {
            throw new Error(`Camera track not live. State: ${videoTrack.readyState}`);
          }

          // Log camera track details for debugging
          this.logger.info('Camera track details:', {
            enabled: videoTrack.enabled,
            muted: videoTrack.muted,
            readyState: videoTrack.readyState,
            settings: videoTrack.getSettings(),
            constraints: videoTrack.getConstraints(),
            capabilities: videoTrack.getCapabilities(),
          });
        }

        return this.mediaDevicesHandler
          .initializeMediaDevices(camera)
          .then(() => stream)
          .catch(error => {
            this.logger.warn('Failed to initialize media devices:', error);
            return stream;
          });
      })
      .catch(error => {
        this.logger.error('Failed to get media stream:', error);
        throw error;
      });
  }

  private handleMediaStreamError(call: Call, requestedStreams: MediaStreamQuery, error: Error | unknown): void {
    if (error instanceof NoAudioInputError) {
      this.muteCall(call, true);
      this.showNoAudioInputModal();
      return;
    }

    const validStateWithoutCamera = [CALL_STATE.MEDIA_ESTAB, CALL_STATE.ANSWERED];
    const {conversation} = call;

    if (call && !validStateWithoutCamera.includes(call.state())) {
      this.showNoCameraModal();
      this.leaveCall(conversation.qualifiedId, LEAVE_CALL_REASON.MEDIA_STREAM_ERROR);
      return;
    }

    if (call.state() !== CALL_STATE.ANSWERED) {
      if (requestedStreams.camera) {
        this.showNoCameraModal();
      }
      this.wCall?.setVideoSendState(
        this.wUser,
        this.serializeQualifiedId(conversation.qualifiedId),
        VIDEO_STATE.STOPPED,
      );
    }
  }

  public async refreshVideoInput() {
    const stream = await this.mediaStreamHandler.requestMediaStream(false, true, false, false);
    this.stopMediaSource(MediaType.VIDEO);
    const clonedMediaStream = this.changeMediaSource(stream, MediaType.VIDEO);
    return clonedMediaStream;
  }

  public async refreshAudioInput() {
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
    updateSelfParticipant: boolean = true,
    call = this.callState.joinedCall(),
  ): MediaStream | void {
    if (!call) {
      return;
    }
    const selfParticipant = call.getSelfParticipant();
    const {conversation} = call;

    if (mediaType === MediaType.AUDIO) {
      const audioTracks = mediaStream.getAudioTracks();
      if (audioTracks.length > 0) {
        selfParticipant.setAudioStream(new MediaStream(audioTracks), true);
        this.wCall?.replaceTrack(this.serializeQualifiedId(conversation.qualifiedId), audioTracks[0]);
      }
    }

    // Don't update video input (coming from A/V preferences) when screensharing is activated
    if (mediaType === MediaType.VIDEO && selfParticipant.sharesCamera() && !selfParticipant.sharesScreen()) {
      const videoTracks = mediaStream.getVideoTracks();
      if (videoTracks.length > 0) {
        this.wCall?.replaceTrack(this.serializeQualifiedId(conversation.qualifiedId), videoTracks[0]);
        // Remove the previous video stream
        if (updateSelfParticipant) {
          selfParticipant.setVideoStream(mediaStream, true);
        }
        return mediaStream;
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

  readonly sendInCallEmoji = async (emojis: string, call: Call) => {
    void this.messageRepository.sendInCallEmoji(call.conversation, {
      [emojis]: 1,
    });
  };

  readonly sendInCallHandRaised = async (isHandUp: boolean, call: Call) => {
    void this.messageRepository.sendInCallHandRaised(call.conversation, isHandUp);
  };

  readonly sendModeratorMute = (conversationId: QualifiedId, participants: Participant[]) => {
    const recipients = this.convertParticipantsToCallingMessageRecepients(participants);
    void this.sendCallingMessage(
      conversationId,
      {type: CALL_MESSAGE_TYPE.REMOTE_MUTE, data: {targets: recipients}},
      {nativePush: true, recipients},
    );
  };

  readonly sendModeratorKick = (conversationId: QualifiedId, participants: Participant[]) => {
    const recipients = this.convertParticipantsToCallingMessageRecepients(participants);
    void this.sendCallingMessage(conversationId, {type: CALL_MESSAGE_TYPE.REMOTE_KICK}, {nativePush: true, recipients});
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
    const useRustSft = this.isOnAvsRustSft;
    const _requestConfig = async () => {
      const limit = Runtime.isFirefox() ? CallingRepository.CONFIG.MAX_FIREFOX_TURN_COUNT : undefined;
      const config = await this.fetchConfig(limit);
      if (useRustSft) {
        (config as any).sft_servers = [{urls: ['https://rust-sft.stars.wire.link']}];
        (config as any).sft_servers_all = [{urls: ['https://rust-sft.stars.wire.link']}];
      }

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
    const conversation = this.getConversationById(conversationId);
    if (!call) {
      return;
    }

    if (
      matchQualifiedIds(
        call.conversation.qualifiedId,
        this.callState.detachedWindowCallQualifiedId() ?? {
          id: '',
          domain: '',
        },
      )
    ) {
      void this.setViewModeMinimized();
    }

    // There's nothing we need to do for non-mls calls
    if (call.conversationType === CONV_TYPE.CONFERENCE_MLS) {
      call.epochCache.clean();
      call.epochCache.disable();
      if (!conversation?.is1to1()) {
        await this.leaveMLSConference(conversationId);
      } else {
        await this.leave1on1MLSConference(conversationId);
      }
    }

    // Remove all the tasks related to the call
    callingSubscriptions.removeCall(conversationId);

    if (reason === REASON.NORMAL) {
      this.callState.selectableScreens([]);
      this.callState.selectableWindows([]);
    }

    if (reason === REASON.NOONE_JOINED || reason === REASON.EVERYONE_LEFT) {
      const {conversation} = call;
      const callingEvent = EventBuilder.buildCallingTimeoutEvent(
        reason,
        conversation,
        call.getSelfParticipant().user.id,
      );
      this.eventRepository.injectEvent(callingEvent);
    }

    if (reason === REASON.OUTDATED_CLIENT) {
      this.warnOutdatedClient(conversationId);
    }

    const stillActiveState = [REASON.STILL_ONGOING, REASON.ANSWERED_ELSEWHERE, REASON.REJECTED];

    this.sendCallingEvent(EventName.CALLING.ENDED_CALL, call, {
      [Segmentation.CALL.AV_SWITCH_TOGGLE]: call.analyticsAvSwitchToggle,
      [Segmentation.CALL.DIRECTION]: this.getCallDirection(call),
      [Segmentation.CALL.DURATION]: Math.ceil((call.endedAt() - (call.startedAt() || 0)) / TIME_IN_MILLIS.SECOND),
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
        call.conversation.qualifiedId,
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

  hasActiveCall = (): boolean => {
    return !!this.callState.joinedCall();
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
        JSON.stringify({
          conversationId,
          selfClientId: this.selfClientId,
          selfUser: this.selfUser,
        }),
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
      conversation,
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
    members.forEach(member =>
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

    this.handleOneToOneMlsCallParticipantLeave(conversationId, members);
    this.updateParticipantList(call, members);
    this.updateParticipantMutedState(call, members);
    this.updateParticipantVideoState(call, members);
    this.updateParticipantAudioState(call, members);
    this.handleCallParticipantChange(conversationId, members);
  };

  private readonly handleOneToOneMlsCallParticipantLeave = (
    conversationId: QualifiedId,
    members: QualifiedWcallMember[],
  ) => {
    const conversation = this.getConversationById(conversationId);
    const call = this.findCall(conversationId);

    if (!conversation || !this.isMLSConference(conversation) || !conversation?.is1to1() || !call) {
      return;
    }

    const selfParticipant = call.getSelfParticipant();

    const nextOtherParticipant = members.find(
      participant => !matchQualifiedIds(participant.userId, selfParticipant.user.qualifiedId),
    );

    if (!nextOtherParticipant) {
      return;
    }

    const currentOtherParticipant = call
      .participants()
      .find(participant => matchQualifiedIds(nextOtherParticipant.userId, participant.user.qualifiedId));

    if (!currentOtherParticipant) {
      return;
    }

    const isCurrentlyEstablished = currentOtherParticipant.isAudioEstablished();
    const {aestab: newEstablishedStatus} = nextOtherParticipant;

    if (isCurrentlyEstablished && newEstablishedStatus === AUDIO_STATE.CONNECTING) {
      call.epochCache.clean();
      call.epochCache.disable();
      void this.leave1on1MLSConference(conversationId);
    }
  };

  private readonly requestClients = async (wUser: number, convId: SerializedConversationId, __: number) => {
    const call = this.findCall(this.parseQualifiedId(convId));
    if (!call) {
      this.logger.warn(`Unable to find a call for the conversation id of ${convId}`);
      return;
    }

    const {conversation} = call;

    if (conversation && this.isMLSConference(conversation)) {
      const subconversationEpochInfo = await this.subconversationService.getSubconversationEpochInfo(
        conversation.qualifiedId,
        conversation.groupId,
      );

      if (subconversationEpochInfo) {
        this.setEpochInfo(conversation.qualifiedId, subconversationEpochInfo);
      }

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
        selfParticipant.updateMediaStream(mediaStream, true);
        await selfParticipant.setBlurredBackground(this.enableBackgroundBlur);
        return selfParticipant.getMediaStream();
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
        call?.addParticipant(participant);
      }
    }

    if (streams === null || streams.length === 0) {
      participant?.releaseVideoStream(false);
      return;
    }

    const [stream] = streams;
    if (stream.getVideoTracks().length > 0 && participant?.videoStream() !== stream) {
      const call = this.findCall(conversationId);
      if (call?.conversationType !== CONV_TYPE.ONEONONE) {
        stream?.getVideoTracks().forEach(track => {
          track.onended = () => {
            participant?.videoState(VIDEO_STATE.RECONNECTING);
            participant?.releaseVideoStream(true);
          };
        });
      }
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

    call
      .participants()
      .filter(participant => participant.doesMatchIds(userId, clientId))
      .forEach(participant => participant.videoState(state));
  };

  private readonly metricsReceived = (_: string, metrics: string) => {
    this.logger.info('Calling metrics:', metrics);
  };

  private readonly sendCallingEvent = (
    eventName: string,
    call: Call,
    customSegmentations: Record<string, any> = {},
  ) => {
    const {conversation} = call;
    const participants = conversation.participating_user_ets() || [];
    const selfUserTeamId = call.getSelfParticipant().user.id;
    const guests = participants.filter(user => user.isGuest()).length;
    const guestsWireless = participants.filter(user => user.isTemporaryGuest()).length;
    const guestsPro = participants.filter(user => !!user.teamId && user.teamId !== selfUserTeamId).length;
    const segmentations = {
      [Segmentation.CONVERSATION.GUESTS]: roundLogarithmic(guests, 6),
      [Segmentation.CONVERSATION.GUESTS_PRO]: roundLogarithmic(guestsPro, 6),
      [Segmentation.CONVERSATION.GUESTS_WIRELESS]: roundLogarithmic(guestsWireless, 6),
      [Segmentation.CONVERSATION.SERVICES]: roundLogarithmic(conversation.servicesCount() || 0, 6),
      [Segmentation.CONVERSATION.SIZE]: roundLogarithmic((conversation.participating_user_ets() || []).length, 6),
      [Segmentation.CONVERSATION.TYPE]: trackingHelpers.getConversationType(conversation),
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
      .forEach((call: Call) => this.wCall?.end(this.wUser, this.serializeQualifiedId(call.conversation.qualifiedId)));

    AvsDebugger.reset();
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
        htmlMessage: t(
          'modalNoCameraMessage',
          {brandName: Config.getConfig().BRAND_NAME},
          {
            '/faqLink': '</a>',
            br: '<br>',
            faqLink: `<a href="${
              Config.getConfig().URL.SUPPORT.CAMERA_ACCESS_DENIED
            }" data-uie-name="go-no-camera-faq" target="_blank" rel="noopener noreferrer">`,
          },
        ),
        title: t('modalNoCameraTitle'),
      },
    };
    PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, modalOptions);
  }

  private isSelfUser(participant: Participant): boolean {
    if (this.selfUser == null || this.selfClientId == null) {
      return false;
    }
    return participant.doesMatchIds(this.selfUser.qualifiedId, this.selfClientId);
  }

  /**
   * Set the notification handling state in AVS.
   *
   * @note Inform AVS that now obsolete Call events may arrive. This prevents old calls from being displayed as missed.
   * the events NOTIFICATION_HANDLING_STATE.RECOVERY and NOTIFICATION_HANDLING_STATE.STREAM switch AVS to standby mode.
   * Both events will be ended again by NOTIFICATION_HANDLING_STATE.WEB_SOCKET.
   *
   * @param handlingState State of the notifications stream handling
   */
  private readonly setNotificationHandlingState = (handlingState: NOTIFICATION_HANDLING_STATE) => {
    const isFetchingFromStream = handlingState !== NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (isFetchingFromStream) {
      this.wCall?.processNotifications(this.wUser, 1);
      this.logger.debug(`Block avs call notification handling`);
    } else {
      this.wCall?.processNotifications(this.wUser, 0);
      this.logger.debug(`Finish blocking avs call notification handling`);
    }
  };

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

  public getMediaStreamHandler() {
    return this.mediaStreamHandler;
  }
}
