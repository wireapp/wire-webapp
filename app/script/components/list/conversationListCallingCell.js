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
    this.is_selected = params.is_selected;
    this.temporaryUserStyle = params.temporaryUserStyle;

    this.on_join_call = () => {
      const mediaType = this.call().isRemoteVideoSend() ? z.media.MediaType.AUDIO_VIDEO : z.media.MediaType.AUDIO;
      amplify.publish(z.event.WebApp.CALL.STATE.JOIN, this.conversation.id, mediaType);
    };

    this.on_leave_call = () => {
      amplify.publish(
        z.event.WebApp.CALL.STATE.LEAVE,
        this.conversation.id,
        z.calling.enum.TERMINATION_REASON.SELF_USER
      );
    };

    this.on_reject_call = () => {
      amplify.publish(z.event.WebApp.CALL.STATE.REJECT, this.conversation.id);
    };

    this.on_toggle_audio = () => {
      amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, this.conversation.id, z.media.MediaType.AUDIO);
    };

    this.on_toggle_screen = () => {
      amplify.publish(z.event.WebApp.CALL.MEDIA.CHOOSE_SCREEN, this.conversation.id);
    };

    this.on_toggle_video = () => {
      amplify.publish(z.event.WebApp.CALL.MEDIA.TOGGLE, this.conversation.id, z.media.MediaType.VIDEO);
    };

    this.users = ko.pureComputed(() => this.conversation.participating_user_ets());
    this.call = ko.pureComputed(() => this.conversation.call());
    this.call_participants = ko.pureComputed(() => {
      const participants = this.call()
        .participants()
        .map(participantEntity => participantEntity.user);
      return Array(6).fill(participants[0]);
    });

    const MAX_DISPLAYED_PARTICIPANTS = 9;
    this.call_participants_rest = ko.observable(0);
    this.call_participants_displayed = ko.pureComputed(() => {
      const displayed_user_ets = this.call_participants().slice(0, MAX_DISPLAYED_PARTICIPANTS);
      this.call_participants_rest(this.call_participants().length - displayed_user_ets.length);
      return displayed_user_ets;
    });

    this.joinedCall = this.calling_repository.joinedCall;

    this.self_stream_state = this.calling_repository.selfStreamState;

    this.show_screensharing_button = ko.pureComputed(() => z.calling.CallingRepository.supportsScreenSharing);
    this.show_video_button = ko.pureComputed(() => {
      return this.joined_call() ? this.joined_call().conversationEntity.supportsVideoCall(false) : false;
    });
    this.disableToggleScreen = ko.pureComputed(() => {
      return this.joinedCall() ? this.joinedCall().isRemoteScreenSend() : true;
    });

    this.call_is_outgoing = ko.pureComputed(() => this.call().state() === z.calling.enum.CALL_STATE.OUTGOING);
    this.call_is_ongoing = ko.pureComputed(() => this.call().state() === z.calling.enum.CALL_STATE.ONGOING);
    this.call_is_incoming = ko.pureComputed(() => this.call().state() === z.calling.enum.CALL_STATE.INCOMING);
    this.call_is_answerable = ko.pureComputed(() => this.call_is_incoming() && !this.call().isDeclined());
    this.callIsConnected = ko.pureComputed(() => this.call().isConnected());

    this.show_leave_button = ko.pureComputed(() => {
      return this.call().selfUserJoined();
    });

    this.show_decline_button = ko.pureComputed(() => {
      return this.call_is_answerable();
    });

    this.show_accept_button = ko.pureComputed(() => {
      return this.call_is_answerable() && !this.call().isRemoteVideoSend();
    });

    this.show_accept_video_button = ko.pureComputed(() => {
      return this.call_is_answerable() && this.call().isRemoteVideoSend();
    });

    this.show_call_timer = ko.pureComputed(() => {
      return this.call_is_ongoing() && this.call().selfUserJoined();
    });

    this.show_join_button = ko.pureComputed(() => {
      return (this.call_is_ongoing() && !this.call().selfUserJoined()) || this.call().isDeclined();
    });

    this.show_call_controls = ko.pureComputed(() => {
      return this.call().selfUserJoined();
    });

    this.on_participants_button_click = () => {
      this.showParticipants(!this.showParticipants());
    };

    this.participants_button_label = ko.pureComputed(() => {
      return z.l10n.text(z.string.callParticipants, this.call_participants().length);
    });

    this.showParticipantsButton = ko.pureComputed(() => {
      return this.conversation.is_group() && this.call_is_ongoing();
    });

    this.showParticipants = ko.observable(false);

    this.showVideoPreview = ko.observable(false);
  }
};

ko.components.register('conversation-list-calling-cell', {
  template: `
    <div class="conversation-list-calling-cell conversation-list-cell" data-bind="attr: {'data-uie-uid': conversation.id, 'data-uie-value': conversation.display_name}" data-uie-name="item-call">

      <!-- ko ifnot: temporaryUserStyle -->
        <div class="conversation-list-cell-left">
          <!-- ko if: conversation.is_group() -->
            <group-avatar class="conversation-list-cell-avatar-arrow" params="users: users(), conversation: conversation"></group-avatar>
          <!-- /ko -->
          <!-- ko if: !conversation.is_group() && users().length -->
            <participant-avatar params="participant: users()[0], size: z.components.ParticipantAvatar.SIZE.SMALL"></participant-avatar>
          <!-- /ko -->
        </div>
      <!-- /ko -->

      <div class="conversation-list-cell-center" data-bind="css: {'conversation-list-cell-center-no-left': temporaryUserStyle}">
        <span class="conversation-list-cell-name" data-bind="text: conversation.display_name()"></span>
        <!-- ko if: call_is_outgoing -->
          <span class="conversation-list-cell-description" data-bind="l10n_text: z.string.callStateOutgoing" data-uie-name="call-label-outgoing"></span>
        <!-- /ko -->
        <!-- ko if: call_is_incoming -->
          <span class="conversation-list-cell-description" data-bind="l10n_text: z.string.callStateIncoming" data-uie-name="call-label-incoming"></span>
        <!-- /ko -->
        <!-- ko if: show_call_timer -->
          <span class="conversation-list-cell-description" data-bind="text: z.util.TimeUtil.formatSeconds(call().durationTime())" data-uie-name="call-duration"></span>
        <!-- /ko -->
      </div>

      <div class="conversation-list-cell-right">
        <!-- ko if: callIsConnected -->
          <div class="call-ui__button call-ui__button--red icon-end-call" data-bind="click: on_leave_call" data-uie-name="do-call-controls-call-leave"></div>
        <!-- /ko -->
      </div>

    </div>

    <!-- ko if: showVideoPreview -->
      <div>video</div>
    <!-- /ko -->

    <div class="conversation-list-calling-cell-controls">

      <div class="conversation-list-calling-cell-controls-left">
        <div class="call-ui__button icon-mute-small" data-bind="click: on_toggle_audio, css: {'call-ui__button--active': self_stream_state.audioSend()}" data-uie-name="do-toggle-mute"></div>
        <div class="call-ui__button icon-video" data-bind="if: show_video_button, click: on_toggle_video, css: {'call-ui__button--active': self_stream_state.videoSend()}" data-uie-name="do-toggle-video"></div>
        <!-- ko if: show_screensharing_button -->
        <div data-uie-name="do-toggle-screenshare" class="call-ui__button icon-screensharing-small"
          data-bind="click: on_toggle_screen, css: {'call-ui__button--disabled': disableToggleScreen(), 'call-ui__button--active': self_stream_state.screenSend()}">
          </div>
        <!-- /ko -->
      </div>

      <div class="conversation-list-calling-cell-controls-right">
        <!-- ko if: true || show_call_controls && showParticipantsButton -->
          <div class="call-ui__button call-ui__button--participants" data-bind="click: on_participants_button_click, text: participants_button_label, css: {'call-ui__button--active': showParticipants()}" data-uie-name="do-toggle-participants"></div>
        <!-- /ko -->
        <!-- ko if: show_accept_video_button -->
          <div class="call-ui__button call-ui__button--green call-ui__button--large icon-video" data-bind="click: on_join_call" data-uie-name="do-call-controls-call-accept"></div>
        <!-- /ko -->
        <!-- ko if: show_join_button -->
          <div class="call-ui__button call-ui__button--green call-ui__button--large" data-bind="click: on_join_call, l10n_text: z.string.callJoin" data-uie-name="do-call-controls-call-join"></div>
        <!-- /ko -->
        <!-- ko if: show_accept_button -->
          <div class="call-ui__button call-ui__button--green call-ui__button--large icon-call" data-bind="click: on_join_call" data-uie-name="do-call-controls-call-accept"></div>
        <!-- /ko -->
        <!-- ko if: show_decline_button -->
          <div class="call-ui__button call-ui__button--red call-ui__button--large icon-end-call" data-bind="click: on_reject_call" data-uie-name="do-call-controls-call-decline"></div>
        <!-- /ko -->
        <!-- ko if: show_leave_button -->
          <div class="call-ui__button call-ui__button--red call-ui__button--large icon-end-call" data-bind="click: on_leave_call" data-uie-name="do-call-controls-call-leave"></div>
        <!-- /ko -->
      </div>

    </div>

    <!-- ko if: showParticipants -->
      <div class="call-ui__participant-list"  data-bind="foreach: {data: call_participants}">
      <participant-item params="participant: $data, hideInfo: true, showCamera: true" data-bind="css: {'no-underline': true}"></participant-item>
      </div>
    <!-- /ko -->
  `,
  viewModel: z.components.ConversationListCallingCell,
});
