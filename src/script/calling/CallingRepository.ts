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
import {t} from 'Util/LocalizerUtil';
import {Logger, getLogger} from 'Util/Logger';
import 'webrtc-adapter';
import {Config} from '../Config';
import {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';

import {Environment} from 'Util/Environment';
import {createRandomUuid} from 'Util/util';
import {EventBuilder} from '../conversation/EventBuilder';
import {MediaStreamHandler} from '../media/MediaStreamHandler';
import {ModalsViewModel} from '../view_model/ModalsViewModel';

import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';

import {ConversationRepository} from '../conversation/ConversationRepository';
import {EventInfoEntity} from '../conversation/EventInfoEntity';
import {EventRepository} from '../event/EventRepository';
import {MediaType} from '../media/MediaType';

import {Call, ConversationId} from './Call';
import {DeviceId, Participant, UserId} from './Participant';

import {WebAppEvents} from '../event/WebApp';

interface MediaStreamQuery {
  audio?: boolean;
  camera?: boolean;
  screen?: boolean;
}

import {
  CALL_TYPE,
  CONV_TYPE,
  ENV as AVS_ENV,
  LOG_LEVEL,
  REASON,
  STATE as CALL_STATE,
  VIDEO_STATE,
  Wcall,
  getAvsInstance,
} from '@wireapp/avs';

export class CallingRepository {
  private readonly backendClient: any;
  private readonly conversationRepository: any;
  private readonly eventRepository: any;
  private readonly mediaStreamHandler: MediaStreamHandler;
  private readonly serverTimeHandler: any;

  private selfUser: any;
  private selfClientId: DeviceId;
  private isReady: boolean = false;
  private wUser?: number;
  private wCall?: Wcall;
  private avsVersion: number;
  public readonly activeCalls: ko.ObservableArray<Call>;
  private readonly isMuted: ko.Observable<boolean>;
  private incomingCallCallback: (call: Call) => void;

  // will cache the query to media stream (in order to avoid asking the system for streams multiple times when we have multiple peers)
  private mediaStreamQuery?: Promise<MediaStream>;

  public readonly joinedCall: ko.PureComputed<Call | undefined>;

  private readonly logger: Logger;
  private readonly callLog: string[];

  static get CONFIG(): any {
    return {
      DEFAULT_CONFIG_TTL: 60 * 60, // 60 minutes in seconds
      MAX_FIREFOX_TURN_COUNT: 3,
    };
  }

  constructor(
    backendClient: any,
    conversationRepository: any,
    eventRepository: any,
    mediaStreamHandler: MediaStreamHandler,
    serverTimeHandler: any,
  ) {
    this.activeCalls = ko.observableArray();
    this.isMuted = ko.observable(false);
    this.joinedCall = ko.pureComputed(() => {
      return this.activeCalls().find(call => call.state() === CALL_STATE.MEDIA_ESTAB);
    });

    this.backendClient = backendClient;
    this.conversationRepository = conversationRepository;
    this.eventRepository = eventRepository;
    this.serverTimeHandler = serverTimeHandler;
    // Media Handler
    this.mediaStreamHandler = mediaStreamHandler;
    this.incomingCallCallback = () => {};

    this.logger = getLogger('CallingRepository');
    this.callLog = [];

    this.subscribeToEvents();
  }

  getStats(conversationId: ConversationId): Promise<{userid: UserId; stats: RTCStatsReport}[]> {
    return this.wCall.getStats(conversationId);
  }

  initAvs(selfUser: any, clientId: DeviceId): Promise<{wCall: Wcall; wUser: number}> {
    this.selfUser = selfUser;
    this.selfClientId = clientId;
    return getAvsInstance().then(callingInstance => {
      this.wCall = this.configureCallingApi(callingInstance);
      this.wUser = this.createWUser(this.wCall, this.selfUser.id, clientId);
      return {wCall: this.wCall, wUser: this.wUser};
    });
  }

  setReady(): void {
    this.isReady = true;
  }

  private configureCallingApi(wCall: Wcall): Wcall {
    const avsLogger = getLogger('avs');
    const logLevelStrs: Record<LOG_LEVEL, string> = {
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

    wCall.setLogHandler((level: LOG_LEVEL, message: string) => {
      const trimedMessage = message.trim();
      logFunctions[level].call(avsLogger, trimedMessage);
      this.callLog.push(`${new Date().toISOString()} [${logLevelStrs[level]}] ${trimedMessage}`);
    });

    const avsEnv = Environment.browser.firefox ? AVS_ENV.FIREFOX : AVS_ENV.DEFAULT;
    wCall.init(avsEnv);
    wCall.setUserMediaHandler(this.getCallMediaStream);
    wCall.setMediaStreamHandler(this.updateParticipantStream);
    setInterval(() => wCall.poll(), 500);
    return wCall;
  }

  private createWUser(wCall: Wcall, selfUserId: string, selfClientId: string): number {
    const wUser = wCall.create(
      selfUserId,
      selfClientId,
      this.setAvsVersion, //readyh,
      this.sendMessage, //sendh,
      this.incomingCall, //incomingh,
      () => {}, //missedh,
      () => {}, //answerh,
      () => {}, //estabh,
      this.callClosed, //closeh,
      () => {}, //metricsh,
      this.requestConfig, //cfg_reqh,
      () => {}, //acbrh,
      this.videoStateChanged, //vstateh,
      0,
    );
    wCall.setMuteHandler(wUser, this.isMuted);
    wCall.setStateHandler(wUser, this.updateCallState);
    wCall.setParticipantChangedHandler(wUser, this.updateCallParticipants);

    return wUser;
  }

  onIncomingCall(callback: (call: Call) => void): void {
    this.incomingCallCallback = callback;
  }

  findCall(conversationId: ConversationId): Call | undefined {
    return this.activeCalls().find((callInstance: Call) => callInstance.conversationId === conversationId);
  }

  private findParticipant(conversationId: ConversationId, userId: UserId): Participant | undefined {
    const call = this.findCall(conversationId);
    return call && call.participants().find(participant => participant.userId === userId);
  }

  private storeCall(call: Call): void {
    this.activeCalls.push(call);
  }

  private removeCall(call: Call): void {
    const index = this.activeCalls().indexOf(call);
    call.selfParticipant.releaseMediaStream();
    call.participants.removeAll();
    if (index !== -1) {
      this.activeCalls.splice(index, 1);
    }
  }

  private warmupMediaStreams(call: Call, audio: boolean, camera: boolean): Promise<boolean> {
    // if it's a video call we query the video user media in order to display the video preview
    const isGroup = call.conversationType === CONV_TYPE.GROUP;
    return this.getMediaStream({audio, camera}, isGroup)
      .then(mediaStream => {
        if (call.state() !== CALL_STATE.NONE) {
          call.selfParticipant.updateMediaStream(mediaStream);
          if (camera) {
            call.selfParticipant.videoState(VIDEO_STATE.STARTED);
          }
        } else {
          mediaStream.getTracks().forEach(track => track.stop());
        }
        return true;
      })
      .catch(() => false);
  }

  /**
   * Extended check for calling support of browser.
   * @returns `true` if calling is supported
   */
  get supportsCalling(): boolean {
    return Environment.browser.supports.calling;
  }

  /**
   * Extended check for screen sharing support of browser.
   * @returns `true` if screen sharing is supported
   */
  get supportsScreenSharing(): boolean {
    return Environment.browser.supports.screenSharing;
  }

  /**
   * Subscribe to amplify topics.
   */
  subscribeToEvents(): void {
    amplify.subscribe(WebAppEvents.CALL.EVENT_FROM_BACKEND, this.onCallEvent.bind(this));
    amplify.subscribe(WebAppEvents.CALL.STATE.TOGGLE, this.toggleState.bind(this)); // This event needs to be kept, it is sent by the wrapper
  }

  //##############################################################################
  // Inbound call events
  //##############################################################################

  /**
   * Handle incoming calling events from backend.
   *
   * @param {Object} event - Event payload
   * @param {EventRepository.SOURCE} source - Source of event
   */
  onCallEvent(event: any, source: string): void {
    const {content, conversation: conversationId, from: userId, sender: clientId, time} = event;
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const toSecond = (timestamp: number) => Math.floor(timestamp / 1000);
    const contentStr = JSON.stringify(content);

    let validatedPromise = Promise.resolve();
    switch (content.type) {
      case CALL_MESSAGE_TYPE.GROUP_LEAVE: {
        const isAnotherSelfClient = userId === this.selfUser.id && clientId !== this.selfClientId;
        if (isAnotherSelfClient) {
          const call = this.findCall(conversationId);
          if (call && call.state() === CALL_STATE.INCOMING) {
            // If the group leave was sent from the self user from another device,
            // we reset the reason so that the call is not shown in the UI.
            // If the call is already accepted, we keep the call UI.
            call.reason(REASON.STILL_ONGOING);
          }
        }
        break;
      }

      case CALL_MESSAGE_TYPE.SETUP:
      case CALL_MESSAGE_TYPE.GROUP_START: {
        if (source !== EventRepository.SOURCE.STREAM) {
          const eventInfoEntity = new EventInfoEntity(undefined, conversationId, {recipients: [userId]});
          eventInfoEntity.setType(GENERIC_MESSAGE_TYPE.CALLING);
          const consentType = ConversationRepository.CONSENT_TYPE.INCOMING_CALL;
          validatedPromise = this.conversationRepository.grantMessage(eventInfoEntity, consentType);
        }

        break;
      }
    }

    validatedPromise.then(() => {
      const res = this.wCall.recvMsg(
        this.wUser,
        contentStr,
        contentStr.length,
        toSecond(currentTimestamp),
        toSecond(new Date(time).getTime()),
        conversationId,
        userId,
        clientId,
      );

      if (res !== 0) {
        this.logger.warn(`recv_msg failed with code: ${res}`);
        return;
      }
      this.handleCallEventSaving(content.type, conversationId, userId, time, source);
    });
  }

  handleCallEventSaving(
    type: string,
    conversationId: ConversationId,
    userId: UserId,
    time: number,
    source: string,
  ): void {
    // save event if needed
    switch (type) {
      case CALL_MESSAGE_TYPE.SETUP:
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

  toggleState(withVideo: boolean): void {
    const conversationEntity: any = this.conversationRepository.active_conversation();
    if (conversationEntity) {
      const isActiveCall = this.findCall(conversationEntity.id);
      const isGroupCall = conversationEntity.isGroup() ? CONV_TYPE.GROUP : CONV_TYPE.ONEONONE;
      const callType = withVideo ? CALL_TYPE.VIDEO : CALL_TYPE.NORMAL;
      return isActiveCall
        ? this.leaveCall(conversationEntity.id)
        : this.startCall(conversationEntity.id, isGroupCall, callType) && undefined;
    }
  }

  startCall(conversationId: ConversationId, conversationType: CONV_TYPE, callType: CALL_TYPE): Promise<void | Call> {
    return this.checkConcurrentJoinedCall(conversationId, CALL_STATE.OUTGOING)
      .then(() => {
        const rejectedCallInConversation = this.findCall(conversationId);
        if (rejectedCallInConversation) {
          // if there is a rejected call, we can remove it from the store
          rejectedCallInConversation.state(CALL_STATE.NONE);
          this.removeCall(rejectedCallInConversation);
        }
        const selfParticipant = new Participant(this.selfUser.id, this.selfClientId);
        const call = new Call(this.selfUser.id, conversationId, conversationType, selfParticipant, callType);
        this.storeCall(call);
        const loadPreviewPromise =
          conversationType === CONV_TYPE.GROUP && callType === CALL_TYPE.VIDEO
            ? this.warmupMediaStreams(call, true, true)
            : Promise.resolve(true);

        return loadPreviewPromise.then(success => {
          if (success) {
            this.wCall.start(this.wUser, conversationId, callType, conversationType, 0);
          } else {
            this.showNoCameraModal();
            this.removeCall(call);
          }
          return call;
        });
      })
      .catch(() => {});
  }

  /**
   * Toggles the camera ON and OFF for the given call (does not switch between different cameras)
   */
  toggleCamera(call: Call): void {
    const selfParticipant = call.selfParticipant;
    const newState = selfParticipant.sharesCamera() ? VIDEO_STATE.STOPPED : VIDEO_STATE.STARTED;
    if (call.state() === CALL_STATE.INCOMING) {
      selfParticipant.videoState(newState);
      if (newState === VIDEO_STATE.STOPPED) {
        selfParticipant.releaseVideoStream();
      } else {
        this.warmupMediaStreams(call, false, true);
      }
    }
    this.wCall.setVideoSendState(this.wUser, call.conversationId, newState);
  }

  /**
   * Toggles screenshare ON and OFF for the given call (does not switch between different screens)
   */
  toggleScreenshare(call: Call): void {
    const selfParticipant = call.selfParticipant;
    const newState = selfParticipant.sharesScreen() ? VIDEO_STATE.STOPPED : VIDEO_STATE.SCREENSHARE;
    this.wCall.setVideoSendState(this.wUser, call.conversationId, newState);
  }

  answerCall(call: Call, callType: number): void {
    this.checkConcurrentJoinedCall(call.conversationId, CALL_STATE.INCOMING)
      .then(() => {
        const isVideoCall = callType === CALL_TYPE.VIDEO;
        if (!isVideoCall) {
          call.selfParticipant.releaseVideoStream();
        }
        return this.warmupMediaStreams(call, true, isVideoCall).then(() => {
          this.wCall.answer(this.wUser, call.conversationId, callType, 0);
        });
      })
      .catch(() => {
        this.rejectCall(call.conversationId);
      });
  }

  rejectCall(conversationId: ConversationId): void {
    this.wCall.reject(this.wUser, conversationId);
  }

  leaveCall(conversationId: ConversationId): void {
    this.wCall.end(this.wUser, conversationId);
  }

  muteCall(conversationId: ConversationId, shouldMute: boolean): void {
    this.wCall.setMute(this.wUser, shouldMute ? 1 : 0);
  }

  private readonly setAvsVersion = (version: number) => {
    this.avsVersion = version;
  };

  private getMediaStream({audio, camera, screen}: MediaStreamQuery, isGroup: boolean): Promise<MediaStream> {
    return this.mediaStreamHandler.requestMediaStream(audio, camera, screen, isGroup);
  }

  private handleMediaStreamError(call: Call, requestedStreams: MediaStreamQuery): void {
    const validStateWithoutCamera = [CALL_STATE.MEDIA_ESTAB, CALL_STATE.ANSWERED];
    if (call && !validStateWithoutCamera.includes(call.state())) {
      this.leaveCall(call.conversationId);
    }
    if (call && call.state() !== CALL_STATE.ANSWERED) {
      if (requestedStreams.camera) {
        this.showNoCameraModal();
      }
      this.wCall.setVideoSendState(this.wUser, call.conversationId, VIDEO_STATE.STOPPED);
    }
  }

  /**
   * @returns `true` if a media stream has been stopped.
   */
  public stopMediaSource(mediaType: MediaType): boolean {
    const activeCall = this.joinedCall();
    if (!activeCall) {
      return false;
    }
    switch (mediaType) {
      case MediaType.AUDIO:
        activeCall.selfParticipant.releaseAudioStream();
        break;

      case MediaType.VIDEO:
        activeCall.selfParticipant.releaseVideoStream();
        break;
    }
    return true;
  }

  /**
   * Will change the input source of all the active calls for the given media type
   */
  public changeMediaSource(mediaStream: MediaStream, mediaType: MediaType, call: Call = this.joinedCall()): void {
    if (!call) {
      return;
    }
    if (mediaType === MediaType.AUDIO) {
      const audioTracks = mediaStream.getAudioTracks().map(track => track.clone());
      call.selfParticipant.setAudioStream(new MediaStream(audioTracks));
      this.wCall.replaceTrack(call.conversationId, audioTracks[0]);
    }
    if (mediaType === MediaType.VIDEO && call.selfParticipant.sharesCamera()) {
      const videoTracks = mediaStream.getVideoTracks().map(track => track.clone());
      call.selfParticipant.setVideoStream(new MediaStream(videoTracks));
      this.wCall.replaceTrack(call.conversationId, videoTracks[0]);
    }
  }

  //##############################################################################
  // Notifications
  //##############################################################################

  private injectActivateEvent(conversationId: ConversationId, userId: UserId, time: number, source: string): void {
    const event = EventBuilder.buildVoiceChannelActivate(conversationId, userId, time, this.avsVersion);
    this.eventRepository.injectEvent(event, source);
  }

  private injectDeactivateEvent(
    conversationId: ConversationId,
    userId: UserId,
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
    this.eventRepository.injectEvent(event, source);
  }

  private readonly sendMessage = (
    context: any,
    conversationId: ConversationId,
    userId: UserId,
    clientId: DeviceId,
    destinationUserId: UserId,
    destinationClientId: DeviceId,
    payload: string,
  ): number => {
    const protoCalling = new Calling({content: payload});
    const genericMessage = new GenericMessage({
      [GENERIC_MESSAGE_TYPE.CALLING]: protoCalling,
      messageId: createRandomUuid(),
    });
    const call = this.findCall(conversationId);
    if (call && call.blockMessages) {
      return 0;
    }

    const options = this.targetMessageRecipients(payload, destinationUserId, destinationClientId);
    const eventInfoEntity = new EventInfoEntity(genericMessage, conversationId, options);
    this.conversationRepository.sendCallingMessage(eventInfoEntity, conversationId).catch(() => {
      if (call) {
        // we flag the call in order to prevent sending further messages
        call.blockMessages = true;
      }
      this.leaveCall(conversationId);
    });
    return 0;
  };

  private readonly requestConfig = () => {
    const limit = Environment.browser.firefox ? CallingRepository.CONFIG.MAX_FIREFOX_TURN_COUNT : undefined;
    this.fetchConfig(limit)
      .then(config => this.wCall.configUpdate(this.wUser, 0, JSON.stringify(config)))
      .catch(() => this.wCall.configUpdate(this.wUser, 1, ''));
    return 0;
  };

  private readonly callClosed = (reason: REASON, conversationId: ConversationId) => {
    const call = this.findCall(conversationId);
    if (!call) {
      return;
    }
    const stillActiveState = [REASON.STILL_ONGOING, REASON.ANSWERED_ELSEWHERE];
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
    call.selfParticipant.releaseMediaStream();
    call.selfParticipant.videoState(VIDEO_STATE.STOPPED);
    call.reason(reason);
  };

  private readonly incomingCall = (
    conversationId: ConversationId,
    timestamp: number,
    userId: UserId,
    hasVideo: number,
    shouldRing: number,
  ) => {
    const conversationEntity = this.conversationRepository.find_conversation_by_id(conversationId);
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
    const selfParticipant = new Participant(this.selfUser.id, this.selfClientId);
    const isVideoCall = hasVideo ? CALL_TYPE.VIDEO : CALL_TYPE.NORMAL;
    const call = new Call(
      userId,
      conversationId,
      conversationEntity.isGroup() ? CONV_TYPE.GROUP : CONV_TYPE.ONEONONE,
      selfParticipant,
      hasVideo ? CALL_TYPE.VIDEO : CALL_TYPE.NORMAL,
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
  };

  private readonly updateCallState = (conversationId: ConversationId, state: number) => {
    const call = this.findCall(conversationId);
    if (!call) {
      this.logger.warn(`received state for call in conversation '${conversationId}' but no stored call found`);
      return;
    }

    // If a call goes from a state to INCOMING, it means it's a group call that just ended
    call.reason(state === CALL_STATE.INCOMING ? REASON.STILL_ONGOING : undefined);
    call.state(state);

    switch (state) {
      case CALL_STATE.MEDIA_ESTAB:
        call.startedAt(Date.now());
        break;
    }
  };

  private readonly updateCallParticipants = (conversationId: ConversationId, membersJson: string) => {
    const call = this.findCall(conversationId);
    if (call) {
      const {members}: {members: {userid: UserId; clientid: DeviceId}[]} = JSON.parse(membersJson);
      const newMembers = members
        .filter(({userid}) => !this.findParticipant(conversationId, userid))
        .map(({userid, clientid}) => new Participant(userid, clientid));
      const removedMembers = call
        .participants()
        .filter(
          ({userId, deviceId}) => !members.find(({userid, clientid}) => userid === userId && clientid === deviceId),
        );

      newMembers.forEach(participant => call.participants.unshift(participant));
      removedMembers.forEach(participant => call.participants.remove(participant));
    }
  };

  private readonly getCallMediaStream = (
    conversationId: ConversationId,
    audio: boolean,
    camera: boolean,
    screen: boolean,
  ): Promise<MediaStream> => {
    if (this.mediaStreamQuery) {
      // if a query is already occuring, we will return the result of this query
      return this.mediaStreamQuery;
    }
    const call = this.findCall(conversationId);
    if (!call) {
      return Promise.reject();
    }
    const selfParticipant = call.selfParticipant;
    const query = {audio, camera, screen};
    const cache = {
      audio: selfParticipant.audioStream(),
      camera: selfParticipant.videoStream(),
      screen: selfParticipant.videoStream(),
    };
    const missingStreams: MediaStreamQuery = Object.entries(cache).reduce((missings, [type, isCached]) => {
      if (isCached || !(query as any)[type]) {
        return missings;
      }
      return {...missings, [type]: true};
    }, {});

    const queryLog = Object.entries(query)
      .filter(([type, needed]) => needed)
      .map(([type]) => ((missingStreams as any)[type] ? type : `${type} (from cache)`))
      .join(', ');
    this.logger.debug(`mediaStream requested: ${queryLog}`);

    if (Object.keys(missingStreams).length === 0) {
      // we have everything in cache, just return the participant's stream
      return new Promise(resolve => {
        /*
          There is a bug in Chrome (from version 73, the version where it's fixed is unknown).
          This bug crashes the browser if the mediaStream is returned right away (probably some race condition in Chrome internal code)
          The timeout(0) fixes this issue.
        */
        setTimeout(() => resolve(selfParticipant.getMediaStream()), 0);
      });
    }
    const isGroup = call.conversationType === CONV_TYPE.GROUP;
    this.mediaStreamQuery = this.getMediaStream(missingStreams, isGroup)
      .then(mediaStream => {
        this.mediaStreamQuery = undefined;
        const newStream = selfParticipant.updateMediaStream(mediaStream);
        return newStream;
      })
      .catch(error => {
        this.mediaStreamQuery = undefined;
        this.logger.warn('Could not get mediaStream for call', error);
        this.handleMediaStreamError(call, missingStreams);
        return selfParticipant.getMediaStream();
      });

    return this.mediaStreamQuery;
  };

  private readonly updateParticipantStream = (
    conversationId: ConversationId,
    userId: UserId,
    deviceId: DeviceId,
    streams: MediaStream[],
  ): void => {
    let participant = this.findParticipant(conversationId, userId);
    if (!participant) {
      participant = new Participant(userId, deviceId);
      this.findCall(conversationId).participants.unshift(participant);
    }

    if (streams.length === 0) {
      return;
    }

    const [stream] = streams;
    if (stream.getAudioTracks().length > 0) {
      participant.audioStream(stream);
    }
    if (stream.getVideoTracks().length > 0) {
      participant.videoStream(stream);
    }
  };

  private readonly videoStateChanged = (
    conversationId: ConversationId,
    userId: UserId,
    deviceId: DeviceId,
    state: number,
  ) => {
    const call = this.findCall(conversationId);
    if (call) {
      if (call.state() === CALL_STATE.MEDIA_ESTAB && userId === call.selfParticipant.userId) {
        call.selfParticipant.releaseVideoStream();
      }
      call
        .participants()
        .concat(call.selfParticipant)
        .filter(participant => participant.userId === userId)
        .forEach(participant => participant.videoState(state));
    }
  };

  private targetMessageRecipients(
    payload: string,
    remoteUserId: UserId | null,
    remoteClientId: DeviceId | null,
  ): {precondition: any; recipients: any} {
    const {type, resp} = JSON.parse(payload);
    let precondition;
    let recipients;

    switch (type) {
      case CALL_MESSAGE_TYPE.CANCEL: {
        if (resp && remoteUserId) {
          // Send to remote client that initiated call
          precondition = true;
          recipients = {
            [remoteUserId]: [`${remoteClientId}`],
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
            [remoteUserId]: [`${remoteClientId}`],
          };
        }
        break;
      }

      case CALL_MESSAGE_TYPE.REJECT: {
        // Send to all clients of self user
        precondition = [this.selfUser.id];
        recipients = {
          [this.selfUser.id]: this.selfUser.devices().map((device: any) => device.id),
        };
        break;
      }

      case CALL_MESSAGE_TYPE.SETUP: {
        if (resp && remoteUserId) {
          // Send to remote client that initiated call and all clients of self user
          precondition = [this.selfUser.id];
          recipients = {
            [remoteUserId]: [`${remoteClientId}`],
            [this.selfUser.id]: this.selfUser.devices().map((device: any) => device.id),
          };
        }
        break;
      }
    }

    return {precondition, recipients};
  }

  //##############################################################################
  // Helper functions
  //##############################################################################

  /**
   * Leave a call we joined immediately in case the browser window is closed.
   * @note Should only used by "window.onbeforeunload".
   */
  destroy(): void {
    this.activeCalls().forEach((call: Call) => this.wCall.end(this.wUser, call.conversationId));
    this.wCall.destroy(this.wUser);
  }

  //##############################################################################
  // Calling config
  //##############################################################################

  fetchConfig(limit?: number): Promise<any> {
    return this.backendClient.sendRequest({
      cache: false,
      data: {limit},
      type: 'GET',
      url: '/calls/config/v2',
    });
  }

  private checkConcurrentJoinedCall(conversationId: ConversationId, newCallState: CALL_STATE): Promise<void> {
    const activeCall = this.activeCalls().find(call => call.conversationId !== conversationId);
    const idleCallStates = [CALL_STATE.INCOMING, CALL_STATE.NONE, CALL_STATE.UNKNOWN];
    if (!activeCall || idleCallStates.includes(activeCall.state())) {
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

  private showNoCameraModal(): void {
    const modalOptions = {
      text: {
        htmlMessage: t('modalNoCameraMessage', Config.BRAND_NAME, {
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

  public getCallLog(): string[] {
    return this.callLog;
  }
}
