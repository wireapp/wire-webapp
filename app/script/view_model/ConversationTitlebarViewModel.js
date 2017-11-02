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
window.z.ViewModel = z.ViewModel || {};

// Parent: z.ViewModel.ConversationTitlebarViewModel
z.ViewModel.ConversationTitlebarViewModel = class ConversationTitlebarViewModel {
  constructor(element_id, calling_repository, conversation_repository, multitasking) {
    this.added_to_view = this.added_to_view.bind(this);

    this.calling_repository = calling_repository;
    this.conversation_repository = conversation_repository;
    this.multitasking = multitasking;
    this.logger = new z.util.Logger('z.ViewModel.ConversationTitlebarViewModel', z.config.LOGGER.OPTIONS);

    // TODO remove the titlebar for now to ensure that buttons are clickable in macOS wrappers
    window.setTimeout(() => $('.titlebar').remove(), 1000);

    this.conversation_et = this.conversation_repository.active_conversation;

    this.joined_call = this.calling_repository.joined_call;
    this.remote_media_streams = this.calling_repository.remote_media_streams;
    this.self_stream_state = this.calling_repository.self_stream_state;

    this.has_call = ko.pureComputed(() => {
      if (!this.conversation_et() || !this.joined_call()) {
        return false;
      }

      return this.conversation_et().id === this.joined_call().id;
    });

    this.has_ongoing_call = ko.computed(() => {
      if (!this.joined_call()) {
        return false;
      }

      return this.has_call() && this.joined_call().state() === z.calling.enum.CALL_STATE.ONGOING;
    });

    this.show_maximize_control = ko.pureComputed(() => {
      if (!this.joined_call()) {
        return false;
      }

      const has_local_video = this.self_stream_state.video_send() || this.self_stream_state.screen_send();
      const has_remote_video =
        (this.joined_call().is_remote_screen_send() || this.joined_call().is_remote_video_send()) &&
        this.remote_media_streams.video();
      return this.has_ongoing_call() && this.multitasking.is_minimized() && has_local_video && !has_remote_video;
    });

    this.show_call_controls = ko.computed(() => {
      if (!this.conversation_et()) {
        return false;
      }

      const is_supported_conversation = this.conversation_et().is_group() || this.conversation_et().is_one2one();
      const is_active_conversation =
        this.conversation_et().participating_user_ids().length && !this.conversation_et().removed_from_conversation();
      return !this.has_call() && is_supported_conversation && is_active_conversation;
    });

    this.people_tooltip = z.l10n.text(
      z.string.tooltip_conversation_people,
      z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.PEOPLE)
    );
  }

  added_to_view() {
    window.setTimeout(() => {
      amplify.subscribe(z.event.WebApp.SHORTCUT.PEOPLE, () => this.show_participants());
      amplify.subscribe(z.event.WebApp.SHORTCUT.ADD_PEOPLE, () => this.show_participants(true));
    }, 50);
  }

  removed_from_view() {
    amplify.unsubscribeAll(z.event.WebApp.SHORTCUT.PEOPLE);
    amplify.unsubscribeAll(z.event.WebApp.SHORTCUT.ADD_PEOPLE);
  }

  click_on_call_button() {
    amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, z.media.MediaType.AUDIO);
  }

  click_on_maximize() {
    this.multitasking.auto_minimize(false);
    this.multitasking.is_minimized(false);
    this.logger.info(`Maximizing call '${this.joined_call().id}' on user click`);
  }

  click_on_participants() {
    this.show_participants();
  }

  click_on_video_button() {
    amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, z.media.MediaType.AUDIO_VIDEO);
  }

  click_on_collection_button() {
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.COLLECTION);
  }

  show_participants(add_people) {
    amplify.publish(z.event.WebApp.PEOPLE.TOGGLE, add_people);
  }
};
