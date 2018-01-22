/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

    this.on_join_call = () => {
      const media_type = this.call().is_remote_video_send() ? z.media.MediaType.AUDIO_VIDEO : z.media.MediaType.AUDIO;
      amplify.publish(z.event.WebApp.CALL.STATE.JOIN, this.conversation.id, media_type);
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
      return this.call()
        .participants()
        .map(participant_et => participant_et.user);
    });

    const MAX_DISPLAYED_PARTICIPANTS = 9;
    this.call_participants_rest = ko.observable(0);
    this.call_participants_displayed = ko.pureComputed(() => {
      const displayed_user_ets = this.call_participants().slice(0, MAX_DISPLAYED_PARTICIPANTS);
      this.call_participants_rest(this.call_participants().length - displayed_user_ets.length);
      return displayed_user_ets;
    });

    this.joined_call = this.calling_repository.joined_call;

    this.self_stream_state = this.calling_repository.self_stream_state;

    this.show_screensharing_button = ko.pureComputed(() => z.calling.CallingRepository.supports_screen_sharing);
    this.show_video_button = ko.pureComputed(() => {
      if (this.joined_call()) {
        return this.joined_call().conversation_et.is_one2one();
      }
    });
    this.disable_toggle_screen = ko.pureComputed(() => {
      if (this.joined_call()) {
        return this.joined_call().is_remote_screen_send();
      }
    });

    this.call_is_outgoing = ko.pureComputed(() => this.call().state() === z.calling.enum.CALL_STATE.OUTGOING);
    this.call_is_ongoing = ko.pureComputed(() => this.call().state() === z.calling.enum.CALL_STATE.ONGOING);
    this.call_is_incoming = ko.pureComputed(() => this.call().state() === z.calling.enum.CALL_STATE.INCOMING);
    this.call_is_anwserable = ko.pureComputed(() => this.call_is_incoming() && !this.call().is_declined());

    this.show_leave_button = ko.pureComputed(() => {
      return this.call().self_user_joined();
    });

    this.show_decline_button = ko.pureComputed(() => {
      return this.call_is_anwserable();
    });

    this.show_accept_button = ko.pureComputed(() => {
      return this.call_is_anwserable() && !this.call().is_remote_video_send();
    });

    this.show_accept_video_button = ko.pureComputed(() => {
      return this.call_is_anwserable() && this.call().is_remote_video_send();
    });

    this.show_call_timer = ko.pureComputed(() => {
      return this.call_is_ongoing() && this.call().self_user_joined();
    });

    this.show_join_button = ko.pureComputed(() => {
      return (this.call_is_ongoing() && !this.call().self_user_joined()) || this.call().is_declined();
    });

    this.show_call_controls = ko.pureComputed(() => {
      return this.call().self_user_joined();
    });

    this.on_participants_button_click = () => {
      this.show_participants(!this.show_participants());
    };

    this.participants_button_label = ko.pureComputed(() => {
      return z.l10n.text(z.string.call_participants, this.call_participants().length);
    });

    this.show_participants_button = ko.pureComputed(() => {
      return this.conversation.is_group() && this.call_is_ongoing();
    });

    this.show_participants = ko.observable(false);
  }
};

ko.components.register('conversation-list-calling-cell', {
  template: `
    <div class="conversation-list-calling-cell conversation-list-cell" data-bind="attr: {'data-uie-uid': conversation.id, 'data-uie-value': conversation.display_name}, css: {'conversation-list-cell-active': is_selected(conversation)}" data-uie-name="item-call">
      <div class="conversation-list-cell-left">
        <!-- ko if: conversation.is_group() -->
          <group-avatar class="conversation-list-cell-avatar-arrow" params="users: users(), conversation: conversation"></group-avatar>
        <!-- /ko -->
        <!-- ko if: !conversation.is_group() && users().length -->
          <user-avatar class="user-avatar-s" params="user: users()[0]"></user-avatar>
        <!-- /ko -->
      </div>
      <div class="conversation-list-cell-center">
        <span class="conversation-list-cell-name" data-bind="text: conversation.display_name(), css: {'text-theme': is_selected(conversation)}"></span>
        <!-- ko if: call_is_outgoing -->
          <span class="conversation-list-cell-description" data-bind="l10n_text: z.string.call_state_outgoing" data-uie-name="call-label-outgoing"></span>
        <!-- /ko -->
        <!-- ko if: call_is_incoming -->
          <span class="conversation-list-cell-description" data-bind="l10n_text: z.string.call_state_incoming" data-uie-name="call-label-incoming"></span>
        <!-- /ko -->
        <!-- ko if: show_call_timer -->
          <span class="conversation-list-cell-description" data-bind="text: z.util.format_seconds(call().duration_time())" data-uie-name="call-duration"></span>
        <!-- /ko -->
      </div>
      <div class="conversation-list-cell-right">
        <!-- ko if: show_decline_button -->
           <div class="conversation-list-calling-cell-controls-button fill-red icon-end-call" data-bind="click: on_reject_call" data-uie-name="do-call-controls-call-decline"></div>
        <!-- /ko -->
        <!-- ko if: show_leave_button -->
           <div class="conversation-list-calling-cell-controls-button fill-red icon-end-call" data-bind="click: on_leave_call" data-uie-name="do-call-controls-call-leave"></div>
        <!-- /ko -->
        <!-- ko if: show_accept_button -->
          <div class="conversation-list-calling-cell-controls-button fill-green icon-call" data-bind="click: on_join_call" data-uie-name="do-call-controls-call-accept"></div>
        <!-- /ko -->
        <!-- ko if: show_accept_video_button -->
          <div class="conversation-list-calling-cell-controls-button fill-green icon-video" data-bind="click: on_join_call" data-uie-name="do-call-controls-call-accept"></div>
        <!-- /ko -->
        <!-- ko if: show_join_button -->
          <div class="conversation-list-calling-cell-controls-button conversation-list-calling-cell-controls-join-button" data-bind="click: on_join_call, l10n_text: z.string.call_join" data-uie-name="do-call-controls-call-join"></div>
        <!-- /ko -->
      </div>
    </div>
    <!-- ko if: show_call_controls -->
    <div class="conversation-list-calling-cell-controls">
      <!-- ko if: show_participants_button -->
        <div class="conversation-list-calling-cell-controls-button cursor-pointer conversation-list-calling-cell-controls-on-call" data-bind="click: on_participants_button_click, text: participants_button_label, css: show_participants() ? 'cell-badge-light' : 'cell-badge-dark'" data-uie-name="do-toggle-participants"></div>
      <!-- /ko -->
      <div class="conversation-list-calling-cell-controls-button icon-mute-small cursor-pointer" data-bind="click: on_toggle_audio, css: self_stream_state.audio_send() ? 'cell-badge-dark' : 'cell-badge-light'" data-uie-name="do-toggle-mute"></div>
      <!-- ko if: call_is_ongoing -->
        <!-- ko if: show_video_button() -->
          <div class="conversation-list-calling-cell-controls-button icon-video cursor-pointer" data-bind="click: on_toggle_video, css: self_stream_state.video_send() ? 'cell-badge-light' : 'cell-badge-dark'" data-uie-name="do-toggle-video"></div>
        <!-- /ko -->
        <!-- ko if: show_screensharing_button() -->
          <div data-uie-name="do-toggle-screenshare" class="conversation-list-calling-cell-controls-button icon-screensharing-small cursor-pointer"
               data-bind="click: on_toggle_screen, css: {
                'disabled': disable_toggle_screen(),
                'cell-badge-light': self_stream_state.screen_send(),
                'cell-badge-dark': !self_stream_state.screen_send()
               }">
          </div>
        <!-- /ko -->
      <!-- /ko -->
    </div>
    <!-- /ko -->
    <!-- ko if: show_participants -->
      <div class="conversation-list-calling-cell-participants">
        <!-- ko foreach: call_participants_displayed() -->
          <user-avatar class="conversation-list-calling-cell-participant user-avatar-xxs" params="user: $data"></user-avatar>
        <!-- /ko -->
        <!-- ko if: call_participants_rest() > 0 -->
          <div class="conversation-list-calling-cell-participants-rest" data-bind="text: call_participants_rest()"></div>
        <!-- /ko -->
      </div>
    <!-- /ko -->
  `,
  viewModel: z.components.ConversationListCallingCell,
});
