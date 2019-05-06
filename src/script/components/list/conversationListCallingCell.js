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

import {formatSeconds} from 'Util/TimeUtil';
import {afterRender} from 'Util/util';
import {t} from 'Util/LocalizerUtil';

//import {PermissionState} from '../../notification/PermissionState';
import {CALL_TYPE, VIDEO_STATE} from 'avs-web';
import {WebAppEvents} from '../../event/WebApp';
import {STATE as CALL_STATE, REASON as CALL_REASON} from 'avs-web';
import {AudioType} from '../../audio/AudioType';

import 'Components/list/participantItem';

class ConversationListCallingCell {
  constructor({
    call,
    conversation,
    temporaryUserStyle = false,
    callingRepository,
    audioRepository,
    videoGridRepository,
  }) {
    this.call = call;
    this.conversation = conversation;
    this.temporaryUserStyle = temporaryUserStyle;
    this.callingRepository = callingRepository;
    this.audioRepository = audioRepository;
    this.videoGridRepository = videoGridRepository;

    this.conversationParticipants = ko.pureComputed(
      () => this.conversation() && this.conversation().participating_user_ets()
    );

    this.selfStreamState = {
      audioSend: () => false,
      screenSend: () => false,
      videoSend: () => false,
    };

    this.callParticipants = call.participants;

    const isState = state => () => call.state() === state;
    this.isIdle = ko.pureComputed(isState(CALL_STATE.NONE));
    this.isOutgoing = ko.pureComputed(isState(CALL_STATE.OUTGOING));
    this.isConnecting = ko.pureComputed(isState(CALL_STATE.ANSWERED));
    this.isDisconnecting = ko.pureComputed(isState(CALL_STATE.DISCONNECTING));
    this.isIncoming = ko.pureComputed(isState(CALL_STATE.INCOMING));
    this.isOngoing = ko.pureComputed(isState(CALL_STATE.MEDIA_ESTAB));

    this.isDeclined = ko.pureComputed(() => call.reason() === CALL_REASON.STILL_ONGOING);

    this.isMuted = this.callingRepository.isMuted;

    this.callDuration = ko.observable();
    let callDurationUpdateInterval;
    const startedAtSubscription = call.startedAt.subscribe(startedAt => {
      if (startedAt) {
        const updateTimer = () => {
          const time = Math.floor((Date.now() - startedAt) / 1000);
          this.callDuration(formatSeconds(time));
        };
        updateTimer();
        callDurationUpdateInterval = window.setInterval(updateTimer, 1000);
      }
    });

    const ringingSubscription = ko.computed(() => {
      const isOutgoing = this.isOutgoing();
      const isIncoming = this.isIncoming();
      const isDeclined = this.isDeclined();
      if (!isDeclined && (isOutgoing || isIncoming)) {
        const audioId = isIncoming ? AudioType.INCOMING_CALL : AudioType.OUTGOING_CALL;
        this.audioRepository.loop(audioId);
      } else {
        this.audioRepository.stop(AudioType.INCOMING_CALL);
        this.audioRepository.stop(AudioType.OUTGOING_CALL);
      }
    });

    this.showParticipants = ko.observable(false);
    this.showParticipantsButton = ko.pureComputed(() => this.isOngoing() && this.conversation().isGroup());
    this.participantsButtonLabel = ko.pureComputed(() => {
      return t('callParticipants', this.callParticipants().length);
    });
    this.showVideoPreview = () => call.initialType === CALL_TYPE.VIDEO;
    this.showMaximize = ko.pureComputed(() => false /*TODOthis.multitasking.isMinimized() && this.isConnected()*/);

    this.disableScreenButton = !this.callingRepository.supportsScreenSharing;

    this.dispose = () => {
      window.clearInterval(callDurationUpdateInterval);
      startedAtSubscription.dispose();
      ringingSubscription.dispose();
    };
    /*
    this.conversation = params.conversation;

    const permissionRepository = params.permissionRepository;

    this.multitasking = params.multitasking;

    this.calls = this.callingRepository.calls;
    this.call = this.conversation.call;
    this.joinedCall = this.callingRepository.joinedCall;
    this.selfStreamState = this.callingRepository.selfStreamState;
    this.selfUser = this.conversation.selfUser();
    this.selfInTeam = this.selfUser.inTeam();



    this.callParticipants = ko.pureComputed(() => {
      const callParticipants = this.call().participants();
      return callParticipants.slice().reverse();
    });

    this.isVideoCall = ko.pureComputed(() => this.call().isLocalVideoCall() || this.call().isRemoteVideoCall());

    this.canJoin = ko.pureComputed(() => {
      if (this.selfUser.isTemporaryGuest()) {
        const isOngoingCall = !this.call().selfUserJoined() && this.isOngoing();
        return this.call().isDeclined() || isOngoingCall;
      }
      return false;
    });
    this.showVideoButton = ko.pureComputed(() => this.isVideoCall() || this.isConnected());

    this.disableVideoButton = ko.pureComputed(() => {
      const isOutgoingVideoCall = this.isOutgoing() && this.selfStreamState.videoSend();
      const isVideoUnsupported = !this.selfStreamState.videoSend() && !this.conversation.supportsVideoCall();
      return isOutgoingVideoCall || isVideoUnsupported;
    });
    this.disableScreenButton = ko.pureComputed(() => !this.callingRepository.supportsScreenSharing);

    this.showVideoPreview = ko.pureComputed(() => {
      const hasOtherOngoingCalls = this.calls().some(callEntity => {
        return callEntity.id !== this.call().id && callEntity.isOngoing();
      });

      const isInMinimizedState = this.multitasking.isMinimized() || !this.isConnected();
      const hasPreJoinVideo = !this.isConnected() && this.call().selfState.videoSend();
      const isOngoingVideoCall = this.isConnected() && this.isVideoCall() && !this.isDeclined();

      return !hasOtherOngoingCalls && isInMinimizedState && (hasPreJoinVideo || isOngoingVideoCall);
    });

    this.showNoCameraPreview = ko.computed(() => {
      const isNotGranted = permissionRepository.permissionState.camera() !== PermissionState.GRANTED;
      return this.call().isRemoteVideoCall() && !this.showVideoPreview() && !this.isConnected() && isNotGranted;
    });


    this.TimeUtil = TimeUtil;
    */
  }

  endCall(data, event) {
    event.stopPropagation();
    return this.isIncoming() ? this.onRejectCall() : this.onLeaveCall();
  }

  onJoinCall(data, event) {
    event.stopPropagation();
    this.callingRepository.answerCall(this.conversation().id, CALL_TYPE.NORMAL);
  }

  onJoinDeclinedCall() {
    this.callingRepository.startCall(this.conversation().id, CALL_TYPE.NORMAL);
  }

  onLeaveCall() {
    this.callingRepository.leaveCall(this.conversation().id);
  }

  onMaximizeVideoGrid() {
    this.multitasking.autoMinimize(false);
    this.multitasking.isMinimized(false);
  }

  toggleShowParticipants() {
    this.showParticipants(!this.showParticipants());

    // TODO: this is a very hacky way to get antiscroll to recalculate the height of the conversationlist.
    // Once there is a new solution to this, this needs to go.
    afterRender(() => window.dispatchEvent(new Event('resize')));
  }

  onRejectCall() {
    this.callingRepository.rejectCall(this.conversation().id);
  }

  toggleMute(data, event) {
    event.stopPropagation();
    this.callingRepository.muteCall(this.conversation.id, !this.isMuted());
  }

  onToggleScreen(data, event) {
    event.stopPropagation();
    amplify.publish(WebAppEvents.CALL.MEDIA.CHOOSE_SCREEN, this.conversation.id);
  }

  onToggleVideo(data, event) {
    event.stopPropagation();
    // TODO
    //amplify.publish(WebAppEvents.CALL.MEDIA.TOGGLE, this.conversation.id, MediaType.VIDEO);
  }

  findUser(userId) {
    return this.conversationParticipants().find(user => user.id === userId);
  }

  hasVideoStream(participant) {
    const activeVideoStates = [VIDEO_STATE.STARTED, VIDEO_STATE.SCREENSHARING];
    return activeVideoStates.includes(participant.videoState());
  }
}

ko.components.register('conversation-list-calling-cell', {
  template: `
   <!-- ko if: conversation() && !isDeclined() -->
    <div class="conversation-list-calling-cell conversation-list-cell">
      <!-- ko ifnot: temporaryUserStyle -->
        <div class="conversation-list-cell-left">
          <!-- ko if: conversation().isGroup() -->
            <group-avatar class="conversation-list-cell-avatar-arrow call-ui__avatar" params="users: conversationParticipants(), conversation: conversation"></group-avatar>
          <!-- /ko -->
          <!-- ko if: !conversation().isGroup() && conversationParticipants().length -->
            <participant-avatar params="participant: conversationParticipants()[0], size: z.components.ParticipantAvatar.SIZE.SMALL"></participant-avatar>
          <!-- /ko -->
        </div>
      <!-- /ko -->

      <div class="conversation-list-cell-center" data-bind="css: {'conversation-list-cell-center-no-left': temporaryUserStyle}">
        <span class="conversation-list-cell-name" data-bind="text: conversation().display_name()"></span>
        <!-- ko if: isIncoming() -->
          <!-- ko if: call.isGroup -->
            <span class="conversation-list-cell-description" data-bind="text: t('callStateIncomingGroup', call.creatingUser.first_name())" data-uie-name="call-label-incoming"></span>
          <!-- /ko -->
          <!-- ko ifnot: call.isGroup -->
            <span class="conversation-list-cell-description" data-bind="text: t('callStateIncoming')" data-uie-name="call-label-incoming"></span>
          <!-- /ko -->
        <!-- /ko -->
        <!-- ko if: isOutgoing() -->
          <span class="conversation-list-cell-description" data-bind="text: t('callStateOutgoing')" data-uie-name="call-label-outgoing"></span>
        <!-- /ko -->
        <!-- ko if: isConnecting() -->
          <span class="conversation-list-cell-description" data-bind="text: t('callStateConnecting')" data-uie-name="call-label-connecting"></span>
        <!-- /ko -->
        <!-- ko if: callDuration() -->
          <span class="conversation-list-cell-description" data-bind="text: callDuration()" data-uie-name="call-duration"></span>
        <!-- /ko -->
      </div>

      <div class="conversation-list-cell-right">
        <!-- ko if: isConnecting() || isOngoing() -->
          <div class="call-ui__button call-ui__button--red" data-bind="click: onLeaveCall" data-uie-name="do-call-controls-call-leave">
            <hangup-icon class="small-icon"></hangup-icon>
          </div>
        <!-- /ko -->
      </div>

    </div>

    <!-- ko if: showVideoPreview() -->
      <div class="group-video__minimized-wrapper" data-bind="click: onMaximizeVideoGrid">
        <group-video-grid params="minimized: true, videoGridRepository: videoGridRepository"></group-video-grid>
        <!-- ko if: showMaximize() -->
          <div class="group-video__minimized-wrapper__overlay" data-uie-name="do-maximize-call">
            <fullscreen-icon></fullscreen-icon>
          </div>
        <!-- /ko -->
      </div>
    <!-- /ko -->

    <!-- ko if: !isDeclined() -->
      <div class="conversation-list-calling-cell-controls">
        <div class="conversation-list-calling-cell-controls-left">
          <div class="call-ui__button" data-bind="click: toggleMute, css: {'call-ui__button--active': isMuted()}, attr: {'data-uie-value': !isMuted() ? 'inactive' : 'active'}" data-uie-name="do-toggle-mute">
            <micoff-icon class="small-icon"></micoff-icon>
          </div>
          <!-- ko if: false && showVideoButton() -->
            <button class="call-ui__button" data-bind="click: onToggleVideo, css: {'call-ui__button--active': selfStreamState.videoSend()}, disable: disableVideoButton(), attr: {'data-uie-value': selfStreamState.videoSend() ? 'active' : 'inactive'}" data-uie-name="do-toggle-video">
              <camera-icon class="small-icon"></camera-icon>
            </button>
          <!-- /ko -->
          <!-- ko if: isOngoing() -->
            <div class="call-ui__button" data-bind="tooltip: {text: t('videoCallScreenShareNotSupported'), disabled: !disableScreenButton, position: 'bottom'}, click: onToggleScreen, css: {'call-ui__button--active': selfStreamState.screenSend(), 'call-ui__button--disabled': disableScreenButton}, attr: {'data-uie-value': selfStreamState.screenSend() ? 'active' : 'inactive', 'data-uie-enabled': disableScreenButton ? 'false' : 'true'}" data-uie-name="do-call-controls-toggle-screenshare">
              <screenshare-icon class="small-icon"></screenshare-icon>
            </div>
          <!-- /ko -->
        </div>

        <div class="conversation-list-calling-cell-controls-right">
          <!-- ko if: showParticipantsButton() -->
            <div class="call-ui__button call-ui__button--participants" data-bind="click: toggleShowParticipants, css: {'call-ui__button--active': showParticipants()}" data-uie-name="do-toggle-participants">
              <span data-bind="text: participantsButtonLabel"></span><chevron-icon></chevron-icon>
            </div>
          <!-- /ko -->
          <!-- ko if: isIncoming() || isOutgoing() -->
            <div class="call-ui__button call-ui__button--red call-ui__button--large" data-bind="click: endCall" data-uie-name="do-call-controls-call-decline">
              <hangup-icon class="small-icon"></hangup-icon>
            </div>
          <!-- /ko -->
          <!-- ko if: isIncoming() && !isDeclined() -->
            <div class="call-ui__button call-ui__button--green call-ui__button--large" data-bind="click: onJoinCall" data-uie-name="do-call-controls-call-accept">
              <pickup-icon class="small-icon"></pickup-icon>
            </div>
          <!-- /ko -->
        </div>
      </div>

      <div class="call-ui__participant-list__wrapper" data-bind="css: {'call-ui__participant-list__wrapper--active': showParticipants}">
        <div class="call-ui__participant-list" data-bind="foreach: {data: callParticipants(), as: 'participant', noChildContext: true}, fadingscrollbar" data-uie-name="list-call-ui-participants">
            <participant-item params="participant: findUser(participant.userId), hideInfo: true, showCamera: hasVideoStream(participant)" data-bind="css: {'no-underline': true}"></participant-item>
        </div>
      </div>
    <!-- /ko -->
  <!-- /ko -->
  `,
  viewModel: ConversationListCallingCell,
});

/*
const oldTmpl = `


    </div>

    <!-- ko if: showNoCameraPreview() -->
      <div class="group-video__minimized-wrapper group-video__minimized-wrapper--no-camera-access" data-bind="text: t('callNoCameraAccess')" data-uie-name="label-no-camera-access-preview"></div>
    <!-- /ko -->

    <!-- ko ifnot: canJoin() -->



      </div>
    <!-- /ko -->
 `;
 */
