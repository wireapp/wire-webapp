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

'use strict';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.ConversationListCallingCell = class ConversationListCallingCell {
  constructor(params) {
    this.conversation = params.conversation;
    this.calling_repository = params.calling_repository;
    this.mediaRepository = params.mediaRepository;
    this.multitasking = params.multitasking;
    this.temporaryUserStyle = params.temporaryUserStyle;

    this.onJoinCall = () => {
      const mediaType = this.call().isRemoteVideoSend() ? z.media.MediaType.AUDIO_VIDEO : z.media.MediaType.AUDIO;
      amplify.publish(z.event.WebApp.CALL.STATE.JOIN, this.conversation.id, mediaType);
    };

    this.videoStreams = this.mediaRepository.stream_handler.remote_media_streams.activeVideo;
    this.localVideoStream = this.mediaRepository.stream_handler.localMediaStream;

    this.onLeaveCall = () => {
      amplify.publish(
        z.event.WebApp.CALL.STATE.LEAVE,
        this.conversation.id,
        z.calling.enum.TERMINATION_REASON.SELF_USER
      );
    };

    this.onRejectCall = () => {
      amplify.publish(z.event.WebApp.CALL.STATE.REJECT, this.conversation.id);
    };

    this.onToggleAudio = () => {
      amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, this.conversation.id, z.media.MediaType.AUDIO);
    };

    this.onToggleScreen = () => {
      amplify.publish(z.event.WebApp.CALL.MEDIA.CHOOSE_SCREEN, this.conversation.id);
    };

    this.onToggleVideo = () => {
      amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, this.conversation.id, z.media.MediaType.VIDEO);
    };

    this.onMaximizeVideoGrid = () => this.multitasking.isMinimized(false);

    this.users = ko.pureComputed(() => this.conversation.participating_user_ets());
    this.call = ko.pureComputed(() => this.conversation.call());
    this.callParticipants = ko.pureComputed(() => this.call().participants());

    this.joinedCall = this.calling_repository.joinedCall;

    this.selfStreamState = this.calling_repository.selfStreamState;

    this.showScreensharingButton = ko.pureComputed(() => {
      return this.callIsConnected() && z.calling.CallingRepository.supportsScreenSharing;
    });

    this.showVideoButton = ko.pureComputed(() => {
      return this.call().isRemoteVideoSend() || (this.callIsOutgoing() && this.selfStreamState.videoSend());
    });

    this.disableVideoButton = ko.pureComputed(() => {
      return this.callIsOutgoing() && this.selfStreamState.videoSend() && !this.callIsConnected();
    });

    this.disableToggleScreen = ko.pureComputed(() => {
      return this.joinedCall() ? this.joinedCall().isRemoteScreenSend() : true;
    });

    this.callIsOutgoing = ko.pureComputed(() => this.call().state() === z.calling.enum.CALL_STATE.OUTGOING);
    this.callIsOngoing = ko.pureComputed(() => this.call().state() === z.calling.enum.CALL_STATE.ONGOING);
    this.callIsIncoming = ko.pureComputed(() => this.call().state() === z.calling.enum.CALL_STATE.INCOMING);
    this.callIsAnswerable = ko.pureComputed(() => this.callIsIncoming() && !this.call().isDeclined());
    this.callIsConnected = ko.pureComputed(() => this.call().isConnected());

    this.showLeaveButton = ko.pureComputed(() => {
      return this.call().selfUserJoined();
    });

    this.showDeclineButton = ko.pureComputed(() => {
      return !this.callIsConnected();
    });

    this.showAcceptButton = ko.pureComputed(() => {
      return !this.callIsConnected() && this.callIsAnswerable();
    });

    this.showAcceptVideoButton = ko.pureComputed(() => {
      return this.callIsAnswerable() && this.call().isRemoteVideoSend();
    });

    this.showCallTimer = ko.pureComputed(() => {
      return this.callIsOngoing() && this.call().selfUserJoined();
    });

    this.showJoinButton = ko.pureComputed(() => {
      return (this.callIsOngoing() && !this.call().selfUserJoined()) || this.call().isDeclined();
    });

    this.showCallControls = ko.pureComputed(() => {
      return this.call().selfUserJoined();
    });

    this.onParticipantsButtonClick = () => {
      this.showParticipants(!this.showParticipants());
    };

    this.participantsButtonLabel = ko.pureComputed(() => {
      return z.l10n.text(z.string.callParticipants, this.callParticipants().length);
    });

    this.showParticipantsButton = ko.pureComputed(() => {
      return this.callIsConnected() && this.conversation.is_group() && this.callIsOngoing();
    });

    this.showParticipants = ko.observable(false);

    this.showVideoPreview = ko.pureComputed(() => this.multitasking.isMinimized() || !this.callIsConnected());
    this.showMaximize = ko.pureComputed(() => this.multitasking.isMinimized() && this.callIsConnected());
  }
};

ko.components.register('conversation-list-calling-cell', {
  template: `
    <div class="conversation-list-calling-cell conversation-list-cell">

      <!-- ko ifnot: temporaryUserStyle -->
        <div class="conversation-list-cell-left">
          <!-- ko if: conversation.is_group() -->
            <group-avatar class="conversation-list-cell-avatar-arrow call-ui__avatar" params="users: users(), conversation: conversation"></group-avatar>
          <!-- /ko -->
          <!-- ko if: !conversation.is_group() && users().length -->
            <participant-avatar params="participant: users()[0], size: z.components.ParticipantAvatar.SIZE.SMALL"></participant-avatar>
          <!-- /ko -->
        </div>
      <!-- /ko -->

      <div class="conversation-list-cell-center" data-bind="css: {'conversation-list-cell-center-no-left': temporaryUserStyle}">
        <span class="conversation-list-cell-name" data-bind="text: conversation.display_name()"></span>
        <!-- ko if: callIsOutgoing -->
          <span class="conversation-list-cell-description" data-bind="l10n_text: z.string.callStateOutgoing" data-uie-name="call-label-outgoing"></span>
        <!-- /ko -->
        <!-- ko if: callIsIncoming -->
          <span class="conversation-list-cell-description" data-bind="l10n_text: z.string.callStateIncoming" data-uie-name="call-label-incoming"></span>
        <!-- /ko -->
        <!-- ko if: showCallTimer -->
          <span class="conversation-list-cell-description" data-bind="text: z.util.TimeUtil.formatSeconds(call().durationTime())" data-uie-name="call-duration"></span>
        <!-- /ko -->
      </div>

      <div class="conversation-list-cell-right">
        <!-- ko if: callIsConnected -->
          <div class="call-ui__button call-ui__button--red" data-bind="click: onLeaveCall" data-uie-name="do-call-controls-call-leave">
            <hangup-icon class="small-icon"></hangup-icon>
          </div>
        <!-- /ko -->
      </div>

    </div>

    <!-- ko if: showVideoPreview -->
      <div class="group-video__minimized-wrapper" data-bind="click: onMaximizeVideoGrid">
        <group-video-grid params="streams: videoStreams, ownStream: localVideoStream, minimized: true"></group-video-grid>
        <!-- ko if: showMaximize -->
          <div class="group-video__minimized-wrapper__overlay" data-uie-name="do-maximize-call">
            <fullscreen-icon></fullscreen-icon>
          </div>
        <!-- /ko -->
      </div>
    <!-- /ko -->

    <div class="conversation-list-calling-cell-controls">

      <div class="conversation-list-calling-cell-controls-left">
        <div class="call-ui__button" data-bind="click: onToggleAudio, css: {'call-ui__button--active': !selfStreamState.audioSend()}, attr: {'data-uie-value': selfStreamState.audioSend() ? 'inactive' : 'active'}" data-uie-name="do-toggle-mute">
          <micoff-icon class="small-icon"></micoff-icon>
        </div>
        <!-- ko if: showVideoButton -->
          <div class="call-ui__button" data-bind="click: onToggleVideo, css: {'call-ui__button--active': selfStreamState.videoSend(), 'call-ui__button--disabled': disableVideoButton()}, attr: {'data-uie-value': selfStreamState.videoSend() ? 'active' : 'inactive'}" data-uie-name="do-toggle-video">
            <camera-icon class="small-icon"></camera-icon>
          </div>
        <!-- /ko -->
        <!-- ko if: showScreensharingButton -->
        <div data-uie-name="do-toggle-screenshare" class="call-ui__button"
          data-bind="click: onToggleScreen, css: {'call-ui__button--disabled': disableToggleScreen(), 'call-ui__button--active': selfStreamState.screenSend()}">
          <screenshare-icon class="small-icon"></screenshare-icon>
        </div>
        <!-- /ko -->
      </div>

      <div class="conversation-list-calling-cell-controls-right">
        <!-- ko if: showParticipantsButton -->
          <div class="call-ui__button call-ui__button--participants" data-bind="click: onParticipantsButtonClick, css: {'call-ui__button--active': showParticipants()}" data-uie-name="do-toggle-participants">
            <span data-bind="text: participantsButtonLabel"></span><chevron-icon></chevron-icon>
          </div>
        <!-- /ko -->
        <!-- ko if: showDeclineButton -->
          <div class="call-ui__button call-ui__button--red call-ui__button--large" data-bind="click: callIsAnswerable() ? onRejectCall : onLeaveCall" data-uie-name="do-call-controls-call-decline">
            <hangup-icon class="small-icon"></hangup-icon>
          </div>
        <!-- /ko -->
        <!-- ko if: showAcceptButton -->
          <div class="call-ui__button call-ui__button--green call-ui__button--large" data-bind="click: onJoinCall" data-uie-name="do-call-controls-call-accept">
            <pickup-icon class="small-icon"></pickup-icon>
          </div>
        <!-- /ko -->
      </div>

    </div>

    <!-- ko if: showParticipants -->
      <div class="call-ui__participant-list" data-bind="foreach: {data: callParticipants}" data-uie-name="list-call-ui-participants">
        <participant-item params="participant: $data.user, hideInfo: true, showCamera: $data.state.videoSend()" data-bind="css: {'no-underline': true}"></participant-item>
      </div>
    <!-- /ko -->
  `,
  viewModel: z.components.ConversationListCallingCell,
});
