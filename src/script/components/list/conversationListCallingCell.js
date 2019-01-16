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

window.z = window.z || {};
window.z.components = z.components || {};

z.components.ConversationListCallingCell = class ConversationListCallingCell {
  constructor(params) {
    this.conversation = params.conversation;

    const callingRepository = params.callingRepository;
    const permissionRepository = params.permissionRepository;

    this.multitasking = params.multitasking;
    this.temporaryUserStyle = params.temporaryUserStyle;
    this.videoGridRepository = params.videoGridRepository;

    this.calls = callingRepository.calls;
    this.call = this.conversation.call;
    this.conversationParticipants = this.conversation.participating_user_ets;
    this.joinedCall = callingRepository.joinedCall;
    this.selfStreamState = callingRepository.selfStreamState;
    this.selfUser = this.conversation.selfUser();

    this.isConnected = this.call().isConnected;

    this.isConnecting = this.call().isConnecting;
    this.isDeclined = this.call().isDeclined;
    this.isIncoming = this.call().isIncoming;
    this.isOngoing = this.call().isOngoing;
    this.isOutgoing = this.call().isOutgoing;

    this.showParticipants = ko.observable(false);

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
    this.showParticipantsButton = ko.pureComputed(() => this.isConnected() && this.conversation.isGroup());
    this.showVideoButton = ko.pureComputed(() => this.isVideoCall() || this.isConnected());

    this.disableVideoButton = ko.pureComputed(() => {
      const isOutgoingVideoCall = this.isOutgoing() && this.selfStreamState.videoSend();
      const isVideoUnsupported = !this.selfStreamState.videoSend() && !this.conversation.supportsVideoCall();
      return isOutgoingVideoCall || isVideoUnsupported;
    });
    this.disableScreenButton = ko.pureComputed(() => !z.calling.CallingRepository.supportsScreenSharing);

    this.participantsButtonLabel = ko.pureComputed(() => {
      return z.l10n.text(z.string.callParticipants, this.callParticipants().length);
    });

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
      const isNotGranted = permissionRepository.permissionState.camera() !== z.notification.PermissionState.GRANTED;
      return this.call().isRemoteVideoCall() && !this.showVideoPreview() && !this.isConnected() && isNotGranted;
    });

    this.showMaximize = ko.pureComputed(() => this.multitasking.isMinimized() && this.isConnected());

    this.shouldUpdateScrollbar = ko
      .pureComputed(() => this.callParticipants() && this.showParticipants())
      .extend({notify: 'always', rateLimit: 100});
  }

  onEndCall() {
    return this.isIncoming() ? this.onRejectCall() : this.onLeaveCall();
  }

  onJoinCall() {
    const isVideoCall = this.call().isRemoteVideoSend() && this.selfStreamState.videoSend();
    const mediaType = isVideoCall ? z.media.MediaType.AUDIO_VIDEO : z.media.MediaType.AUDIO;
    amplify.publish(z.event.WebApp.CALL.STATE.JOIN, this.conversation.id, mediaType);
  }

  onJoinDeclinedCall() {
    amplify.publish(z.event.WebApp.CALL.STATE.JOIN, this.conversation.id, z.media.MediaType.AUDIO);
  }

  onLeaveCall() {
    amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, this.conversation.id, z.calling.enum.TERMINATION_REASON.SELF_USER);
  }

  onMaximizeVideoGrid() {
    this.multitasking.autoMinimize(false);
    this.multitasking.isMinimized(false);
  }

  onParticipantsClick() {
    this.showParticipants(!this.showParticipants());

    // TODO: this is a very hacky way to get antiscroll to recalculate the height of the conversationlist.
    // Once there is a new solution to this, this needs to go.
    z.util.afterRender(() => window.dispatchEvent(new Event('resize')));
  }

  onRejectCall() {
    amplify.publish(z.event.WebApp.CALL.STATE.REJECT, this.conversation.id);
  }

  onToggleAudio() {
    amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, this.conversation.id, z.media.MediaType.AUDIO);
  }

  onToggleScreen() {
    amplify.publish(z.event.WebApp.CALL.MEDIA.CHOOSE_SCREEN, this.conversation.id);
  }

  onToggleVideo() {
    amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, this.conversation.id, z.media.MediaType.VIDEO);
  }
};

ko.components.register('conversation-list-calling-cell', {
  template: `
    <div class="conversation-list-calling-cell conversation-list-cell">

      <!-- ko ifnot: temporaryUserStyle -->
        <div class="conversation-list-cell-left">
          <!-- ko if: conversation.isGroup() -->
            <group-avatar class="conversation-list-cell-avatar-arrow call-ui__avatar" params="users: conversationParticipants(), conversation: conversation"></group-avatar>
          <!-- /ko -->
          <!-- ko if: !conversation.isGroup() && conversationParticipants().length -->
            <participant-avatar params="participant: conversationParticipants()[0], size: z.components.ParticipantAvatar.SIZE.SMALL"></participant-avatar>
          <!-- /ko -->
        </div>
      <!-- /ko -->

      <div class="conversation-list-cell-center" data-bind="css: {'conversation-list-cell-center-no-left': temporaryUserStyle}">
        <span class="conversation-list-cell-name" data-bind="text: conversation.display_name()"></span>
        <!-- ko if: isIncoming() -->
          <!-- ko if: call().isGroup -->
            <span class="conversation-list-cell-description" data-bind="l10n_text: {id: z.string.callStateIncomingGroup, substitute: call().creatingUser.first_name()}" data-uie-name="call-label-incoming"></span>
          <!-- /ko -->
          <!-- ko ifnot: call().isGroup -->
            <span class="conversation-list-cell-description" data-bind="l10n_text: z.string.callStateIncoming" data-uie-name="call-label-incoming"></span>
          <!-- /ko -->
        <!-- /ko -->
        <!-- ko if: isOutgoing() -->
          <span class="conversation-list-cell-description" data-bind="l10n_text: z.string.callStateOutgoing" data-uie-name="call-label-outgoing"></span>
        <!-- /ko -->
        <!-- ko if: isConnecting() -->
          <span class="conversation-list-cell-description" data-bind="l10n_text: z.string.callStateConnecting" data-uie-name="call-label-connecting"></span>
        <!-- /ko -->
        <!-- ko if: isConnected() -->
          <span class="conversation-list-cell-description" data-bind="text: z.util.TimeUtil.formatSeconds(call().durationTime())" data-uie-name="call-duration"></span>
        <!-- /ko -->
      </div>

      <div class="conversation-list-cell-right">
        <!-- ko if: isConnecting() || isConnected() -->
          <div class="call-ui__button call-ui__button--red" data-bind="click: onLeaveCall" data-uie-name="do-call-controls-call-leave">
            <hangup-icon class="small-icon"></hangup-icon>
          </div>
        <!-- /ko -->
        <!-- ko if: canJoin() -->
          <div class="call-ui__button call-ui__button--join call-ui__button--green" data-bind="click: onJoinDeclinedCall, l10n_text: z.string.callJoin" data-uie-name="do-call-controls-call-join"></div>
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
    <!-- ko if: showNoCameraPreview() -->
      <div class="group-video__minimized-wrapper group-video__minimized-wrapper--no-camera-access" data-bind="l10n_text: z.string.callNoCameraAccess" data-uie-name="label-no-camera-access-preview"></div>
    <!-- /ko -->

    <!-- ko ifnot: canJoin() -->
      <div class="conversation-list-calling-cell-controls">
        <div class="conversation-list-calling-cell-controls-left">
          <div class="call-ui__button" data-bind="click: onToggleAudio, css: {'call-ui__button--active': !selfStreamState.audioSend()}, attr: {'data-uie-value': selfStreamState.audioSend() ? 'inactive' : 'active'}" data-uie-name="do-toggle-mute">
            <micoff-icon class="small-icon"></micoff-icon>
          </div>
          <!-- ko if: showVideoButton() -->
            <button class="call-ui__button" data-bind="click: onToggleVideo, css: {'call-ui__button--active': selfStreamState.videoSend()}, disable: disableVideoButton(), attr: {'data-uie-value': selfStreamState.videoSend() ? 'active' : 'inactive'}" data-uie-name="do-toggle-video">
              <camera-icon class="small-icon"></camera-icon>
            </button>
          <!-- /ko -->
          <!-- ko if: isConnected() -->
            <div class="call-ui__button" data-bind="tooltip: {text: z.string.videoCallScreenShareNotSupported, disabled: !disableScreenButton(), position: 'bottom'}, click: onToggleScreen, css: {'call-ui__button--active': selfStreamState.screenSend(), 'call-ui__button--disabled': disableScreenButton()}, attr: {'data-uie-value': selfStreamState.screenSend() ? 'active' : 'inactive', 'data-uie-enabled': disableScreenButton() ? 'false' : 'true'}" data-uie-name="do-call-controls-toggle-screenshare">
              <screenshare-icon class="small-icon"></screenshare-icon>
            </div>
          <!-- /ko -->
        </div>

        <div class="conversation-list-calling-cell-controls-right">
          <!-- ko if: showParticipantsButton() -->
            <div class="call-ui__button call-ui__button--participants" data-bind="click: onParticipantsClick, css: {'call-ui__button--active': showParticipants()}" data-uie-name="do-toggle-participants">
              <span data-bind="text: participantsButtonLabel"></span><chevron-icon></chevron-icon>
            </div>
          <!-- /ko -->
          <!-- ko if: isIncoming() || isOutgoing() -->
            <div class="call-ui__button call-ui__button--red call-ui__button--large" data-bind="click: onEndCall" data-uie-name="do-call-controls-call-decline">
              <hangup-icon class="small-icon"></hangup-icon>
            </div>
          <!-- /ko -->
          <!-- ko if: isIncoming() -->
            <div class="call-ui__button call-ui__button--green call-ui__button--large" data-bind="click: onJoinCall" data-uie-name="do-call-controls-call-accept">
              <pickup-icon class="small-icon"></pickup-icon>
            </div>
          <!-- /ko -->
        </div>

      </div>
      <div class="call-ui__participant-list__wrapper" data-bind="css: {'call-ui__participant-list__wrapper--active': showParticipants}">
        <div class="call-ui__participant-list" data-bind="foreach: callParticipants, antiscroll: shouldUpdateScrollbar" data-uie-name="list-call-ui-participants">
          <participant-item params="participant: $data.user, hideInfo: true, showCamera: $data.activeState.videoSend()" data-bind="css: {'no-underline': true}"></participant-item>
        </div>
      </div>
    <!-- /ko -->
 `,
  viewModel: z.components.ConversationListCallingCell,
});
