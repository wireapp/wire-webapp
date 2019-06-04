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
import {getLogger} from 'Util/Logger';
// @ts-ignore
import adapter from 'webrtc-adapter';
import {Config} from '../auth/config';
import {GENERIC_MESSAGE_TYPE} from '../cryptography/GenericMessageType';

import {Environment} from 'Util/Environment';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {createRandomUuid} from 'Util/util';
import {EventBuilder} from '../conversation/EventBuilder';
import {ModalsViewModel} from '../view_model/ModalsViewModel';
import {TERMINATION_REASON} from './enum/TerminationReason';

import {CallLogger} from '../telemetry/calling/CallLogger';

import {CALL_MESSAGE_TYPE} from './enum/CallMessageType';

import {ConversationRepository} from '../conversation/ConversationRepository';
import {EventInfoEntity} from '../conversation/EventInfoEntity';
import {EventRepository} from '../event/EventRepository';
import {MediaType} from '../media/MediaType';

import {Call, ConversationId} from './Call';
import {DeviceId, Participant, UserId} from './Participant';

import {WebAppEvents} from '../event/WebApp';

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
  private readonly mediaStreamHandler: any;
  private readonly mediaDevicesHandler: any;
  private readonly mediaConstraintsHandler: any;
  private readonly serverTimeHandler: any;
  private readonly userRepository: any;

  private selfUserId: UserId;
  private selfClientId: DeviceId;
  private isReady: boolean = false;
  private wUser: number | undefined;
  private wCall: Wcall | undefined;
  public readonly activeCalls: ko.ObservableArray<Call>;
  private readonly isMuted: ko.Observable<boolean>;
  private incomingCallCallback: Function;

  public readonly joinedCall: ko.PureComputed<Call | undefined>;

  private callingConfig: any;
  private callingConfigTimeout: number | undefined;
  private readonly callLogger: CallLogger;

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
    mediaStreamHandler: any,
    mediaDevicesHandler: any,
    mediaConstraintsHandler: any,
    serverTimeHandler: any,
    userRepository: any
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
    this.userRepository = userRepository;
    // Media Handler
    this.mediaStreamHandler = mediaStreamHandler;
    this.mediaConstraintsHandler = mediaConstraintsHandler;
    this.mediaDevicesHandler = mediaDevicesHandler;
    this.incomingCallCallback = () => {};

    this.callLogger = new CallLogger('CallingRepository', null, []);

    this.callingConfig = undefined;
    this.callingConfigTimeout = undefined;

    this.subscribeToEvents();
    this.enableDebugging();
  }

  getStats(conversationId: ConversationId): Promise<{userid: UserId; stats: RTCStatsReport}> {
    // @ts-ignore
    return this.wCall.getStats(conversationId);
  }

  initAvs(selfUserId: UserId, clientId: DeviceId): void {
    this.selfUserId = selfUserId;
    this.selfClientId = clientId;
    getAvsInstance().then(callingInstance => {
      const {wCall, wUser} = this.configureCallingApi(callingInstance, selfUserId, clientId);
      this.wCall = wCall;
      this.wUser = wUser;
    });
  }

  setReady(): void {
    this.isReady = true;
  }

  configureCallingApi(wCall: Wcall, selfUserId: string, selfClientId: string): {wUser: number; wCall: any} {
    const avsLogger = getLogger('avs');
    wCall.setLogHandler((level: LOG_LEVEL, message: string, arg: any) => {
      const logFunctions = {
        [LOG_LEVEL.DEBUG]: avsLogger.debug,
        [LOG_LEVEL.INFO]: avsLogger.log,
        [LOG_LEVEL.WARN]: avsLogger.warn,
        [LOG_LEVEL.ERROR]: avsLogger.error,
      };
      logFunctions[level].call(avsLogger, message);
    });

    const avsEnv = Environment.browser.firefox ? AVS_ENV.FIREFOX : AVS_ENV.DEFAULT;
    wCall.init(avsEnv);

    wCall.setUserMediaHandler((conversationId: ConversationId, audio: boolean, video: boolean, screen: boolean) => {
      const call = this.findCall(conversationId);
      if (!call) {
        return Promise.reject();
      }
      const selfParticipant = call.selfParticipant;
      const audioStream = selfParticipant.audioStream();
      const cameraStream = selfParticipant.sharesCamera() && selfParticipant.videoStream();
      const screenStream = selfParticipant.sharesScreen() && selfParticipant.videoStream();

      const isMissingAudio = audio && !audioStream;
      const isMissingCamera = video && !cameraStream;
      const isMissingScreen = screen && !screenStream;

      const localTracks: MediaStreamTrack[] = [];
      if (audioStream) {
        localTracks.push.apply(localTracks, audioStream.getTracks());
      }
      if (selfParticipant.videoStream()) {
        localTracks.push.apply(localTracks, selfParticipant.videoStream().getTracks());
      }
      if (!isMissingAudio && !isMissingCamera && !isMissingScreen) {
        return Promise.resolve(new MediaStream(localTracks));
      }
      const isGroup = call.conversationType === CONV_TYPE.GROUP;
      return this.getMediaStream(isMissingAudio, isMissingCamera, isMissingScreen, isGroup)
        .then(mediaStream => {
          if (video || screen) {
            this.wCall.setVideoSendState(this.wUser, call.conversationId, VIDEO_STATE.STARTED);
            selfParticipant.videoState(VIDEO_STATE.STARTED);
          }
          // merge the local tracks with the one we just requested
          localTracks.forEach(localTrack => mediaStream.addTrack(localTrack.clone()));
          selfParticipant.replaceMediaStream(mediaStream);
          return mediaStream;
        })
        .catch(() => this.handleMediaStreamError(call));
    });

    wCall.setMediaStreamHandler(
      (conversationId: ConversationId, userId: UserId, deviceId: DeviceId, streams: MediaStream[]) => {
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
      }
    );

    const wUser = wCall.create(
      selfUserId,
      selfClientId,
      () => {}, //readyh,
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
      0
    );

    wCall.setParticipantChangedHandler(wUser, (conversationId: ConversationId, membersJson: string) => {
      const call = this.findCall(conversationId);
      if (call) {
        const {members}: {members: {userid: UserId; clientid: DeviceId}[]} = JSON.parse(membersJson);
        const newMembers = members
          .filter(({userid}) => !this.findParticipant(conversationId, userid))
          .map(({userid, clientid}) => new Participant(userid, clientid));
        const removedMembers = call.participants().filter(({userId}) => !members.find(({userid}) => userid === userId));

        newMembers.forEach(participant => call.participants.unshift(participant));
        removedMembers.forEach(participant => call.participants.remove(participant));
      }
    });

    wCall.setMuteHandler(wUser, this.isMuted);
    wCall.setStateHandler(wUser, (conversationId: ConversationId, state: number) => {
      const call = this.findCall(conversationId);
      if (!call) {
        this.callLogger.warn(`received state for call in conversation '${conversationId}' but no stored call found`);
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
    });
    setInterval(wCall.poll.bind(wCall), 500);

    return {wCall, wUser};
  }

  onIncomingCall(callback: Function): void {
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
    const reason = TERMINATION_REASON.MISSED; // TODO check other reasons
    this.injectDeactivateEvent(call.conversationId, call.initiator, reason, Date.now(), EventRepository.SOURCE.STREAM);
  }

  private loadVideoPreview(call: Call): Promise<boolean> {
    // if it's a video call we query the video user media in order to display the video preview
    const isGroup = call.conversationType === CONV_TYPE.GROUP;
    return this.getMediaStream(true, true, false, isGroup)
      .then(mediaStream => {
        call.selfParticipant.replaceMediaStream(mediaStream);
        call.selfParticipant.videoState(VIDEO_STATE.STARTED);
        return true;
      })
      .catch(() => false);
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
  subscribeToEvents(): void {
    amplify.subscribe(WebAppEvents.CALL.EVENT_FROM_BACKEND, this.onCallEvent.bind(this));
    amplify.subscribe(WebAppEvents.CALL.STATE.LEAVE, this.leaveCall.bind(this));
    amplify.subscribe(WebAppEvents.CALL.STATE.REJECT, this.rejectCall.bind(this));
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
  onCallEvent(event: any, source: string): void {
    const {content, conversation: conversationId, from: userId, sender: clientId, time} = event;
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const toSecond = (timestamp: number) => Math.floor(timestamp / 1000);
    const contentStr = JSON.stringify(content);

    let validatedPromise = Promise.resolve();
    switch (content.type) {
      case CALL_MESSAGE_TYPE.GROUP_LEAVE: {
        if (userId === this.selfUserId && clientId !== this.selfClientId) {
          const call = this.findCall(conversationId);
          if (call) {
            // If the group leave was sent from the self user from another device, we reset the reason so that the call would show in the UI again
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
        clientId
      );

      if (res !== 0) {
        this.callLogger.warn(`recv_msg failed with code: ${res}`);
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
    source: string
  ): void {
    // save event if needed
    switch (type) {
      case CALL_MESSAGE_TYPE.SETUP:
      case CALL_MESSAGE_TYPE.GROUP_START:
        this.injectActivateEvent(conversationId, userId, time, source);
        break;
    }
  }

  //##############################################################################
  // Call actions
  //##############################################################################

  toggleState(mediaType: MediaType, conversationEntity: any = this.conversationRepository.active_conversation()): void {
    if (conversationEntity) {
      const isActiveCall = this.findCall(conversationEntity.id);
      const isGroupCall = conversationEntity.isGroup() ? CONV_TYPE.GROUP : CONV_TYPE.ONEONONE;
      const callType = this.callTypeFromMediaType(mediaType);
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
          this.removeCall(rejectedCallInConversation);
        }
        const selfParticipant = new Participant(this.selfUserId, this.selfClientId);
        const call = new Call(this.selfUserId, conversationId, conversationType, selfParticipant, callType);
        this.storeCall(call);
        const loadPreviewPromise =
          conversationType === CONV_TYPE.GROUP && callType === CALL_TYPE.VIDEO
            ? this.loadVideoPreview(call)
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

  // Toggles the camera ON and OFF for the given call (does not switch between different cameras)
  toggleCamera(call: Call): void {
    const selfParticipant = call.selfParticipant;
    const newState = selfParticipant.sharesCamera() ? VIDEO_STATE.STOPPED : VIDEO_STATE.STARTED;
    this.wCall.setVideoSendState(this.wUser, call.conversationId, newState);
  }

  switchCameraInput(conversationId: ConversationId, deviceId: string): void {
    this.mediaDevicesHandler.currentDeviceId.videoInput(deviceId);
  }

  // Toggles screenshare ON and OFF for the given call (does not switch between different screens)
  toggleScreenshare(call: Call): void {
    const selfParticipant = call.selfParticipant;
    const newState = selfParticipant.sharesCamera() ? VIDEO_STATE.STOPPED : VIDEO_STATE.SCREENSHARE;
    this.wCall.setVideoSendState(this.wUser, call.conversationId, newState);
  }

  answerCall(conversationId: ConversationId, callType: number): void {
    this.checkConcurrentJoinedCall(conversationId, CALL_STATE.INCOMING)
      .then(() => {
        if (callType === CALL_TYPE.NORMAL) {
          const call = this.findCall(conversationId);
          if (call) {
            call.selfParticipant.videoState(VIDEO_STATE.STOPPED);
            call.selfParticipant.releaseVideoStream();
          }
        }

        this.wCall.answer(this.wUser, conversationId, callType, 0);
      })
      .catch(() => {
        this.rejectCall(conversationId);
      });
  }

  rejectCall(conversationId: ConversationId): void {
    // TODO sort out if rejection should be shared accross devices (does avs handle it?)
    this.wCall.reject(this.wUser, conversationId);
  }

  leaveCall(conversationId: ConversationId): void {
    this.wCall.end(this.wUser, conversationId);
  }

  muteCall(conversationId: ConversationId, shouldMute: boolean): void {
    this.wCall.setMute(this.wUser, shouldMute ? 1 : 0);
  }

  private callTypeFromMediaType(mediaType: MediaType): CALL_TYPE {
    const types: Record<MediaType, CALL_TYPE> = {
      [MediaType.AUDIO]: CALL_TYPE.NORMAL,
      [MediaType.AUDIO_VIDEO]: CALL_TYPE.VIDEO,
      [MediaType.SCREEN]: CALL_TYPE.VIDEO,
      [MediaType.VIDEO]: CALL_TYPE.VIDEO,
      [MediaType.NONE]: CALL_TYPE.NORMAL,
    };

    return types[mediaType] || CALL_TYPE.NORMAL;
  }

  private getMediaStream(audio: boolean, video: boolean, screen: boolean, isGroup: boolean): Promise<MediaStream> {
    let type;
    if (audio) {
      type = video ? MediaType.AUDIO_VIDEO : MediaType.AUDIO;
    } else if (video) {
      type = MediaType.VIDEO;
    } else if (screen) {
      type = MediaType.SCREEN;
    }

    const constraints = this.mediaConstraintsHandler.getMediaStreamConstraints(audio, video, false);

    return this.mediaStreamHandler
      .requestMediaStream(type, constraints)
      .then((mediaStreamInfo: any) => mediaStreamInfo.stream);
  }

  private handleMediaStreamError(call: Call): MediaStream {
    const validStateWithoutCamera = [CALL_STATE.MEDIA_ESTAB, CALL_STATE.ANSWERED];
    if (call && !validStateWithoutCamera.includes(call.state())) {
      this.leaveCall(call.conversationId);
    }
    if (call && call.state() !== CALL_STATE.ANSWERED) {
      this.showNoCameraModal();
    }
    return new MediaStream();
  }

  // returns true if a media stream has been stopped.
  public stopMediaSource(mediaType: MediaType): void {
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

  // will change the input source of all the active calls for the given media type
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
    const event = EventBuilder.buildVoiceChannelActivate(conversationId, userId, time);
    this.eventRepository.injectEvent(event, source);
  }

  private injectDeactivateEvent(
    conversationId: ConversationId,
    userId: UserId,
    reason: TERMINATION_REASON,
    time: number,
    source: string
  ): void {
    const event = EventBuilder.buildVoiceChannelDeactivate(conversationId, userId, reason, time);
    this.eventRepository.injectEvent(event, source);
  }

  private readonly sendMessage = (
    context: any,
    conversationId: ConversationId,
    userId: UserId,
    clientId: DeviceId,
    destinationUserId: UserId,
    destinationClientId: DeviceId,
    payload: string
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

    const type = JSON.parse(payload).type;
    if (type) {
      this.handleCallEventSaving(type, conversationId, userId, Date.now(), EventRepository.SOURCE.INJECTED);
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
    this.getConfig().then((config: any) => this.wCall.configUpdate(this.wUser, 0, JSON.stringify(config)));
    return 0;
  };

  private readonly callClosed = (reason: REASON, conversationId: ConversationId) => {
    const call = this.findCall(conversationId);
    if (!call) {
      return;
    }
    const stillActiveState = [REASON.STILL_ONGOING, REASON.ANSWERED_ELSEWHERE];
    if (!stillActiveState.includes(reason)) {
      this.removeCall(call);
      return;
    }
    call.selfParticipant.releaseVideoStream();
    call.reason(reason);
  };

  private readonly incomingCall = (
    conversationId: ConversationId,
    timestamp: number,
    userId: UserId,
    hasVideo: number,
    shouldRing: number
  ) => {
    const canRing = shouldRing && this.isReady;
    const selfParticipant = new Participant(this.selfUserId, this.selfClientId);
    const isVideoCall = hasVideo ? CALL_TYPE.VIDEO : CALL_TYPE.NORMAL;
    const call = new Call(
      userId,
      conversationId,
      CONV_TYPE.ONEONONE,
      selfParticipant,
      hasVideo ? CALL_TYPE.VIDEO : CALL_TYPE.NORMAL
    );
    call.state(CALL_STATE.INCOMING);
    if (!canRing) {
      // an incoming call that should not ring is an ongoing group call
      call.reason(REASON.STILL_ONGOING);
    }
    if (canRing && isVideoCall) {
      this.loadVideoPreview(call);
    }

    this.storeCall(call);
    this.incomingCallCallback(call);
  };

  private readonly videoStateChanged = (
    conversationId: ConversationId,
    userId: UserId,
    deviceId: DeviceId,
    state: number
  ) => {
    const call = this.findCall(conversationId);
    if (call) {
      if (userId === call.selfParticipant.userId) {
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
    remoteClientId: DeviceId | null
  ): {precondition: any; recipients: any} {
    const {type, resp} = JSON.parse(payload);
    const selfUserEntity = this.userRepository.self();
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
        precondition = [selfUserEntity.id];
        recipients = {
          [selfUserEntity.id]: selfUserEntity.devices().map((device: any) => device.id),
        };
        break;
      }

      case CALL_MESSAGE_TYPE.SETUP: {
        if (resp && remoteUserId) {
          // Send to remote client that initiated call and all clients of self user
          precondition = [selfUserEntity.id];
          recipients = {
            [remoteUserId]: [`${remoteClientId}`],
            [selfUserEntity.id]: selfUserEntity.devices().map((device: any) => device.id),
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
   * Leave a call we are joined immediately in case the browser window is closed.
   * @note Should only used by "window.onbeforeunload".
   * @returns {undefined} No return value
   */
  leaveCallOnUnload(): void {
    this.activeCalls().forEach((call: Call) => this.wCall.end(this.wUser, call.conversationId));
  }

  //##############################################################################
  // Calling config
  //##############################################################################

  getConfig = (): Promise<any> => {
    if (this.callingConfig) {
      const isExpiredConfig = this.callingConfig.expiration.getTime() < Date.now();

      if (!isExpiredConfig) {
        this.callLogger.debug('Returning local calling configuration. No update needed.', this.callingConfig);
        return Promise.resolve(this.callingConfig);
      }

      this.clearConfig();
    }

    return this.getConfigFromBackend();
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

  private clearConfig(): void {
    if (this.callingConfig) {
      const expirationDate = this.callingConfig.expiration.toISOString();
      this.callLogger.debug(`Removing calling configuration with expiration of '${expirationDate}'`);
      this.callingConfig = undefined;
    }
  }

  private clearConfigTimeout(): void {
    if (this.callingConfigTimeout) {
      window.clearTimeout(this.callingConfigTimeout);
      this.callingConfigTimeout = undefined;
    }
  }

  private getConfigFromBackend(): Promise<any> {
    const limit = Environment.browser.firefox ? CallingRepository.CONFIG.MAX_FIREFOX_TURN_COUNT : undefined;

    return this.fetchConfig(limit).then(callingConfig => {
      if (callingConfig) {
        this.clearConfigTimeout();

        const DEFAULT_CONFIG_TTL = CallingRepository.CONFIG.DEFAULT_CONFIG_TTL;
        const ttl = callingConfig.ttl * 0.9 || DEFAULT_CONFIG_TTL;
        const timeout = Math.min(ttl, DEFAULT_CONFIG_TTL) * TIME_IN_MILLIS.SECOND;
        const expirationDate = new Date(Date.now() + timeout);
        callingConfig.expiration = expirationDate;

        const turnServersConfig = (callingConfig.ice_servers || [])
          .map((server: any) => server.urls.join('\n'))
          .join('\n');
        const logMessage = `Updated calling configuration expires on '${expirationDate.toISOString()}' with servers:
${turnServersConfig}`;
        this.callLogger.info(logMessage);
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

  private enableDebugging(): void {
    adapter.disableLog = false;
  }

  /**
   * Check whether we are actively participating in a call.
   *
   * @private
   * @param {string} newCallId - Conversation ID of call about to be joined
   * @param {CALL_STATE} callState - Call state of new call
   * @returns {Promise} Resolves when the new call was joined
   */
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
        action: () => {
          if (activeCall.state() === CALL_STATE.INCOMING) {
            this.rejectCall(activeCall.conversationId);
          } else {
            this.leaveCall(activeCall.conversationId);
          }
          window.setTimeout(resolve, 1000);
        },
        secondary: reject,
        text: {
          action: actionString,
          message: messageString,
          title: titleString,
        },
      });
      this.callLogger.warn(`Tried to join a second call while calling in conversation '${activeCall.conversationId}'.`);
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
}
