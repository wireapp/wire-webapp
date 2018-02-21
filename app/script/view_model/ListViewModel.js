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
window.z.viewModel = z.viewModel || {};

z.viewModel.ListViewModel = class ListViewModel {
  /**
   * View model for the list column.
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {Object} repositories - Object containing all the repositories
   */
  constructor(mainViewModel, repositories) {
    this.switch_list = this.switch_list.bind(this);
    this.on_context_menu = this.on_context_menu.bind(this);

    this.elementId = 'left-column';
    this.content_view_model = mainViewModel.content;

    // Repositories
    this.conversation_repository = repositories.conversation;
    this.user_repository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.ListViewModel', z.config.LOGGER.OPTIONS);

    // State
    this.list_state = ko.observable(z.viewModel.list.LIST_STATE.CONVERSATIONS);
    this.last_update = ko.observable();
    this.list_modal = ko.observable();
    this.webapp_loaded = ko.observable(false);

    // Nested view models
    this.archive = new z.viewModel.list.ArchiveViewModel(mainViewModel, repositories);
    this.conversations = new z.viewModel.list.ConversationListViewModel(mainViewModel, repositories);
    this.preferences = new z.viewModel.list.PreferencesListViewModel(mainViewModel);
    this.start_ui = new z.viewModel.list.StartUIViewModel(mainViewModel, repositories);
    this.takeover = new z.viewModel.list.TakeoverViewModel(mainViewModel, repositories);

    this.self_user_picture = ko.pureComputed(() => {
      if (this.webapp_loaded() && this.user_repository.self()) {
        return this.user_repository.self().mediumPictureResource();
      }
    });

    this.visible_list_items = ko.pureComputed(() => {
      if (this.list_state() === z.viewModel.list.LIST_STATE.PREFERENCES) {
        const preference_items = [
          z.viewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT,
          z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICES,
          z.viewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS,
          z.viewModel.content.CONTENT_STATE.PREFERENCES_AV,
        ];

        if (!z.util.Environment.desktop) {
          preference_items.push(z.viewModel.content.CONTENT_STATE.PREFERENCES_ABOUT);
        }

        return preference_items;
      }

      const has_connect_requests = this.user_repository.connect_requests().length;
      const connect_requests = has_connect_requests ? z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS : [];
      return this.conversation_repository
        .conversations_calls()
        .concat(connect_requests, this.conversation_repository.conversations_unarchived());
    });

    this._init_subscriptions();

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.CONVERSATION.SHOW, () =>
      this.switch_list(z.viewModel.list.LIST_STATE.CONVERSATIONS, false)
    );
    amplify.subscribe(z.event.WebApp.LIFECYCLE.LOADED, () => this.webapp_loaded(true));
    amplify.subscribe(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT, this.open_preferences_account.bind(this));
    amplify.subscribe(z.event.WebApp.PREFERENCES.MANAGE_DEVICES, this.open_preferences_devices.bind(this));
    amplify.subscribe(z.event.WebApp.SEARCH.SHOW, this.open_start_ui.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.NEXT, this.go_to_next.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.PREV, this.go_to_previous.bind(this));
    amplify.subscribe(z.event.WebApp.TAKEOVER.SHOW, this.show_takeover.bind(this));
    amplify.subscribe(z.event.WebApp.TAKEOVER.DISMISS, this.dismiss_takeover.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.ARCHIVE, this.click_on_archive_action.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.DELETE, this.click_on_clear_action.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.SILENCE, this.click_on_mute_action.bind(this));
  }

  go_to_next() {
    this._iterate_active_item(true);
  }

  go_to_previous() {
    this._iterate_active_item(false);
  }

  _iterate_active_item(reverse = false) {
    if (this.list_state() === z.viewModel.list.LIST_STATE.PREFERENCES) {
      return this._iterate_active_preference(reverse);
    }

    this._iterate_active_conversation(reverse);
  }

  _iterate_active_conversation(reverse) {
    const is_connection_request_state =
      this.content_view_model.content_state() === z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS;
    const active_conversation_item = is_connection_request_state
      ? z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS
      : this.conversation_repository.active_conversation();
    const next_conversation_item = z.util.ArrayUtil.iterate_item(
      this.visible_list_items(),
      active_conversation_item,
      reverse
    );

    if (next_conversation_item === z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS) {
      this.content_view_model.switch_content(z.viewModel.content.CONTENT_STATE.CONNECTION_REQUESTS);
    } else if (next_conversation_item) {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, next_conversation_item);
    }
  }

  _iterate_active_preference(reverse) {
    let active_preference = this.content_view_model.content_state();

    if (active_preference === z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS) {
      active_preference = z.viewModel.content.CONTENT_STATE.DEVICES;
    }

    const next_preference = z.util.ArrayUtil.iterate_item(this.visible_list_items(), active_preference, reverse);

    if (next_preference) {
      this.content_view_model.switch_content(next_preference);
    }
  }

  open_preferences_account() {
    this.switch_list(z.viewModel.list.LIST_STATE.PREFERENCES);
    this.content_view_model.switch_content(z.viewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT);
  }

  open_preferences_devices(device_et) {
    this.switch_list(z.viewModel.list.LIST_STATE.PREFERENCES);

    if (device_et) {
      this.content_view_model.preferences_device_details.device(device_et);
      return this.content_view_model.switch_content(z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS);
    }

    return this.content_view_model.switch_content(z.viewModel.content.CONTENT_STATE.PREFERENCES_DEVICES);
  }

  open_start_ui() {
    this.switch_list(z.viewModel.list.LIST_STATE.START_UI);
  }

  switch_list(new_list_state, respect_last_state = true) {
    if (this.list_state() !== new_list_state) {
      this._hide_list();
      this._update_list(new_list_state, respect_last_state);
      this._show_list(new_list_state);
    }
  }

  _hide_list() {
    $(`#${this._get_element_id_of_list(this.list_state())}`).removeClass('left-list-is-visible');
    $(document).off('keydown.list_view');
  }

  _show_list(new_list_state) {
    $(`#${this._get_element_id_of_list(new_list_state)}`).addClass('left-list-is-visible');
    this.list_state(new_list_state);
    this.last_update(Date.now());
    $(document).on('keydown.list_view', keyboard_event => {
      if (z.util.KeyboardUtil.isEscapeKey(keyboard_event)) {
        this.switch_list(z.viewModel.list.LIST_STATE.CONVERSATIONS);
      }
    });
  }

  _update_list(new_list_state, respect_last_state) {
    switch (new_list_state) {
      case z.viewModel.list.LIST_STATE.ARCHIVE:
        this.archive.updateList();
        break;
      case z.viewModel.list.LIST_STATE.START_UI:
        this.start_ui.updateList();
        break;
      case z.viewModel.list.LIST_STATE.PREFERENCES:
        amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT);
        break;
      default:
        if (respect_last_state) {
          this.content_view_model.switch_previous_content();
        }
    }
  }

  _get_element_id_of_list(list_state) {
    switch (list_state) {
      case z.viewModel.list.LIST_STATE.ARCHIVE:
        return 'archive';
      case z.viewModel.list.LIST_STATE.PREFERENCES:
        return 'preferences';
      case z.viewModel.list.LIST_STATE.START_UI:
        return 'start-ui';
      default:
        return 'conversations';
    }
  }

  show_takeover() {
    this.list_modal(z.viewModel.list.LIST_MODAL_TYPE.TAKEOVER);
  }

  dismiss_takeover() {
    this.list_modal(undefined);
  }

  //##############################################################################
  // Context menu
  //##############################################################################

  on_context_menu(conversation_et, event) {
    let label;
    let title;
    const entries = [];

    if (!conversation_et.is_request() && !conversation_et.removed_from_conversation()) {
      const silence_shortcut = z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.SILENCE);
      const notify_tooltip = z.l10n.text(z.string.tooltip_conversations_notify, silence_shortcut);
      const silence_tooltip = z.l10n.text(z.string.tooltip_conversations_silence, silence_shortcut);

      label = conversation_et.is_muted()
        ? z.string.conversations_popover_notify
        : z.string.conversations_popover_silence;
      title = conversation_et.is_muted() ? notify_tooltip : silence_tooltip;
      entries.push({
        click: () => this.click_on_mute_action(conversation_et),
        label: z.l10n.text(label),
        title: title,
      });
    }

    if (conversation_et.is_archived()) {
      entries.push({
        click: () => this.click_on_unarchive_action(conversation_et),
        label: z.l10n.text(z.string.conversations_popover_unarchive),
      });
    } else {
      const shortcut = z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.ARCHIVE);

      entries.push({
        click: () => this.click_on_archive_action(conversation_et),
        label: z.l10n.text(z.string.conversations_popover_archive),
        title: z.l10n.text(z.string.tooltip_conversations_archive, shortcut),
      });
    }

    if (conversation_et.is_request()) {
      entries.push({
        click: () => this.click_on_cancel_action(conversation_et),
        label: z.l10n.text(z.string.conversations_popover_cancel),
      });
    }

    if (!conversation_et.is_request() && !conversation_et.is_cleared()) {
      entries.push({
        click: () => this.click_on_clear_action(conversation_et),
        label: z.l10n.text(z.string.conversations_popover_clear),
      });
    }

    if (!conversation_et.is_group()) {
      const [user_et] = conversation_et.participating_user_ets();

      if (user_et && (user_et.is_connected() || user_et.is_request())) {
        entries.push({
          click: () => this.click_on_block_action(conversation_et),
          label: z.l10n.text(z.string.conversations_popover_block),
        });
      }
    }

    if (conversation_et.is_group() && !conversation_et.removed_from_conversation()) {
      entries.push({
        click: () => this.click_on_leave_action(conversation_et),
        label: z.l10n.text(z.string.conversations_popover_leave),
      });
    }

    z.ui.Context.from(event, entries, 'conversation-list-options-menu');
  }

  click_on_archive_action(conversation_et = this.conversation_repository.active_conversation()) {
    if (conversation_et) {
      this.conversation_repository.archive_conversation(conversation_et);
    }
  }

  click_on_block_action(conversation_et) {
    const next_conversation_et = this._get_next_conversation(conversation_et);
    const [user_et] = conversation_et.participating_user_ets();

    if (user_et) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalType.BLOCK, {
        action: () => {
          this.user_repository.block_user(user_et, next_conversation_et);
        },
        data: user_et.first_name(),
      });
    }
  }

  click_on_cancel_action(conversation_et) {
    const next_conversation_et = this._get_next_conversation(conversation_et);
    const [user_et] = conversation_et.participating_user_ets();

    this.user_repository.cancel_connection_request(user_et, next_conversation_et);
  }

  click_on_clear_action(conversation_et = this.conversation_repository.active_conversation()) {
    if (conversation_et) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalType.CLEAR, {
        action: (leave_conversation = false) => {
          this.conversation_repository.clear_conversation(conversation_et, leave_conversation);
        },
        conversation: conversation_et,
      });
    }
  }

  click_on_leave_action(conversation_et) {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalType.LEAVE, {
      action: () => this.conversation_repository.removeMember(conversation_et, this.user_repository.self().id),
      data: conversation_et.display_name(),
    });
  }

  click_on_mute_action(conversation_et = this.conversation_repository.active_conversation()) {
    if (conversation_et) {
      this.conversation_repository.toggle_silence_conversation(conversation_et);
    }
  }

  click_on_unarchive_action(conversation_et) {
    this.conversation_repository.unarchive_conversation(conversation_et, 'manual un-archive').then(() => {
      if (!this.conversation_repository.conversations_archived().length) {
        this.switch_list(z.viewModel.list.LIST_STATE.CONVERSATIONS);
      }
    });
  }

  _get_next_conversation(conversation_et) {
    const in_conversations = this.list_state() === z.viewModel.list.LIST_STATE.CONVERSATIONS;
    const is_active_conversation = this.conversation_repository.is_active_conversation(conversation_et);

    if (in_conversations && is_active_conversation) {
      return this.conversation_repository.get_next_conversation(conversation_et);
    }
  }
};
