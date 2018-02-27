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
  static get MODAL_TYPE() {
    return {
      TAKEOVER: 'ListViewModel.MODAL_TYPE.TAKEOVER',
    };
  }

  static get STATE() {
    return {
      ARCHIVE: 'ListViewModel.STATE.ARCHIVE',
      CONVERSATIONS: 'ListViewModel.STATE.CONVERSATIONS',
      PREFERENCES: 'ListViewModel.STATE.PREFERENCES',
      START_UI: 'ListViewModel.STATE.START_UI',
    };
  }
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
    this.state = ko.observable(ListViewModel.STATE.CONVERSATIONS);
    this.last_update = ko.observable();
    this.modal = ko.observable();
    this.webapp_loaded = ko.observable(false);

    // Nested view models
    this.archive = new z.viewModel.list.ArchiveViewModel(mainViewModel, this, repositories);
    this.conversations = new z.viewModel.list.ConversationListViewModel(mainViewModel, this, repositories);
    this.preferences = new z.viewModel.list.PreferencesListViewModel(mainViewModel, this);
    this.start_ui = new z.viewModel.list.StartUIViewModel(mainViewModel, this, repositories);
    this.takeover = new z.viewModel.list.TakeoverViewModel(mainViewModel, this, repositories);

    this.self_user_picture = ko.pureComputed(() => {
      if (this.webapp_loaded() && this.user_repository.self()) {
        return this.user_repository.self().mediumPictureResource();
      }
    });

    this.visible_list_items = ko.pureComputed(() => {
      if (this.state() === ListViewModel.STATE.PREFERENCES) {
        const preference_items = [
          z.viewModel.ContentViewModel.STATE.PREFERENCES_ACCOUNT,
          z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES,
          z.viewModel.ContentViewModel.STATE.PREFERENCES_OPTIONS,
          z.viewModel.ContentViewModel.STATE.PREFERENCES_AV,
        ];

        if (!z.util.Environment.desktop) {
          preference_items.push(z.viewModel.ContentViewModel.STATE.PREFERENCES_ABOUT);
        }

        return preference_items;
      }

      const has_connect_requests = this.user_repository.connect_requests().length;
      const connect_requests = has_connect_requests ? z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS : [];
      return this.conversation_repository
        .conversations_calls()
        .concat(connect_requests, this.conversation_repository.conversations_unarchived());
    });

    this._init_subscriptions();

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.CONVERSATION.SHOW, () =>
      this.switch_list(ListViewModel.STATE.CONVERSATIONS, false)
    );
    amplify.subscribe(z.event.WebApp.LIFECYCLE.LOADED, () => this.webapp_loaded(true));
    amplify.subscribe(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT, this.open_preferences_account.bind(this));
    amplify.subscribe(z.event.WebApp.PREFERENCES.MANAGE_DEVICES, this.open_preferences_devices.bind(this));
    amplify.subscribe(z.event.WebApp.SEARCH.SHOW, this.open_start_ui.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.NEXT, this.go_to_next.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.PREV, this.go_to_previous.bind(this));
    amplify.subscribe(z.event.WebApp.TAKEOVER.SHOW, this.show_takeover.bind(this));
    amplify.subscribe(z.event.WebApp.TAKEOVER.DISMISS, this.dismiss_takeover.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.ARCHIVE, this.clickToArchive.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.DELETE, this.clickToClear.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.SILENCE, this.clickToToggleMute.bind(this));
  }

  go_to_next() {
    this._iterate_active_item(true);
  }

  go_to_previous() {
    this._iterate_active_item(false);
  }

  _iterate_active_item(reverse = false) {
    if (this.state() === ListViewModel.STATE.PREFERENCES) {
      return this._iterate_active_preference(reverse);
    }

    this._iterate_active_conversation(reverse);
  }

  _iterate_active_conversation(reverse) {
    const is_connection_request_state =
      this.content_view_model.state() === z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS;
    const active_conversation_item = is_connection_request_state
      ? z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS
      : this.conversation_repository.active_conversation();
    const next_conversation_item = z.util.ArrayUtil.iterate_item(
      this.visible_list_items(),
      active_conversation_item,
      reverse
    );

    if (next_conversation_item === z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS) {
      this.content_view_model.switchContent(z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS);
    } else if (next_conversation_item) {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, next_conversation_item);
    }
  }

  _iterate_active_preference(reverse) {
    let active_preference = this.content_view_model.state();

    if (active_preference === z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS) {
      active_preference = z.viewModel.ContentViewModel.STATE.DEVICES;
    }

    const next_preference = z.util.ArrayUtil.iterate_item(this.visible_list_items(), active_preference, reverse);

    if (next_preference) {
      this.content_view_model.switchContent(next_preference);
    }
  }

  open_preferences_account() {
    this.switch_list(ListViewModel.STATE.PREFERENCES);
    this.content_view_model.switchContent(z.viewModel.ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  }

  open_preferences_devices(device_et) {
    this.switch_list(ListViewModel.STATE.PREFERENCES);

    if (device_et) {
      this.content_view_model.preferencesDeviceDetails.device(device_et);
      return this.content_view_model.switchContent(z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS);
    }

    return this.content_view_model.switchContent(z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES);
  }

  open_start_ui() {
    this.switch_list(ListViewModel.STATE.START_UI);
  }

  switch_list(new_list_state, respect_last_state = true) {
    if (this.state() !== new_list_state) {
      this._hide_list();
      this._update_list(new_list_state, respect_last_state);
      this._show_list(new_list_state);
    }
  }

  _hide_list() {
    $(`#${this._get_element_id_of_list(this.state())}`).removeClass('left-list-is-visible');
    $(document).off('keydown.list_view');
  }

  _show_list(new_list_state) {
    $(`#${this._get_element_id_of_list(new_list_state)}`).addClass('left-list-is-visible');
    this.state(new_list_state);
    this.last_update(Date.now());
    $(document).on('keydown.list_view', keyboard_event => {
      if (z.util.KeyboardUtil.isEscapeKey(keyboard_event)) {
        this.switch_list(ListViewModel.STATE.CONVERSATIONS);
      }
    });
  }

  _update_list(new_list_state, respect_last_state) {
    switch (new_list_state) {
      case ListViewModel.STATE.ARCHIVE:
        this.archive.updateList();
        break;
      case ListViewModel.STATE.START_UI:
        this.start_ui.updateList();
        break;
      case ListViewModel.STATE.PREFERENCES:
        amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.PREFERENCES_ACCOUNT);
        break;
      default:
        if (respect_last_state) {
          this.content_view_model.switchPreviousContent();
        }
    }
  }

  _get_element_id_of_list(list_state) {
    switch (list_state) {
      case ListViewModel.STATE.ARCHIVE:
        return 'archive';
      case ListViewModel.STATE.PREFERENCES:
        return 'preferences';
      case ListViewModel.STATE.START_UI:
        return 'start-ui';
      default:
        return 'conversations';
    }
  }

  show_takeover() {
    this.modal(ListViewModel.MODAL_TYPE.TAKEOVER);
  }

  dismiss_takeover() {
    this.modal(undefined);
  }

  //##############################################################################
  // Context menu
  //##############################################################################

  on_context_menu(conversationEntity, event) {
    let title;
    const entries = [];

    const canToggleMute = !conversationEntity.is_request() && !conversationEntity.removed_from_conversation();
    if (canToggleMute) {
      const silenceShortcut = z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.SILENCE);
      const notifyTooltip = z.l10n.text(z.string.tooltipConversationsNotify, silenceShortcut);
      const silence_tooltip = z.l10n.text(z.string.tooltipConversationsSilence, silenceShortcut);

      const labelStringId = conversationEntity.is_muted()
        ? z.string.conversationsPopoverNotify
        : z.string.conversationsPopoverSilence;
      title = conversationEntity.is_muted() ? notifyTooltip : silence_tooltip;
      entries.push({
        click: () => this.clickToToggleMute(conversationEntity),
        label: z.l10n.text(labelStringId),
        title: title,
      });
    }

    if (conversationEntity.is_archived()) {
      entries.push({
        click: () => this.clickToUnarchive(conversationEntity),
        label: z.l10n.text(z.string.conversationsPopoverUnarchive),
      });
    } else {
      const shortcut = z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.ARCHIVE);

      entries.push({
        click: () => this.clickToArchive(conversationEntity),
        label: z.l10n.text(z.string.conversationsPopoverArchive),
        title: z.l10n.text(z.string.tooltipConversationsArchive, shortcut),
      });
    }

    if (conversationEntity.is_request()) {
      entries.push({
        click: () => this.clickToCancelRequest(conversationEntity),
        label: z.l10n.text(z.string.conversationsPopoverCancel),
      });
    }

    const canClear = !conversationEntity.is_request() && !conversationEntity.is_cleared();
    if (canClear) {
      entries.push({
        click: () => this.clickToClear(conversationEntity),
        label: z.l10n.text(z.string.conversationsPopoverClear),
      });
    }

    if (!conversationEntity.is_group()) {
      const userEntity = conversationEntity.firstUserEntity();
      const canBlock = userEntity && (userEntity.is_connected() || userEntity.is_request());

      if (canBlock) {
        entries.push({
          click: () => this.clickToBlock(conversationEntity),
          label: z.l10n.text(z.string.conversationsPopoverBlock),
        });
      }
    }

    const canLeave = conversationEntity.is_group() && !conversationEntity.removed_from_conversation();
    if (canLeave) {
      entries.push({
        click: () => this.clickToLeave(conversationEntity),
        label: z.l10n.text(z.string.conversationsPopoverLeave),
      });
    }

    z.ui.Context.from(event, entries, 'conversation-list-options-menu');
  }

  clickToArchive(conversationEntity = this.conversation_repository.active_conversation()) {
    if (conversationEntity) {
      this.conversation_repository.archive_conversation(conversationEntity);
    }
  }

  clickToBlock(conversationEntity) {
    const nextConversationEntity = this._getNextConversation(conversationEntity);
    const userEntity = conversationEntity.firstUserEntity();

    if (userEntity) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
        action: () => {
          this.user_repository.block_user(userEntity, nextConversationEntity);
        },
        text: {
          action: z.l10n.text(z.string.modalUserBlockAction),
          message: z.l10n.text(z.string.modalUserBlockMessage, userEntity.first_name()),
          title: z.l10n.text(z.string.modalUserBlockHeadline),
        },
      });
    }
  }

  clickToCancelRequest(conversationEntity) {
    const nextConversationEntity = this._getNextConversation(conversationEntity);
    const userEntity = conversationEntity.firstUserEntity();

    if (userEntity) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
        action: () => this.user_repository.cancel_connection_request(userEntity, nextConversationEntity),
        text: {
          action: z.l10n.text(z.string.modalConnectCancelAction),
          message: z.l10n.text(z.string.modalConnectCancelMessage, userEntity.first_name()),
          secondary: z.l10n.text(z.string.modalConnectCancelSecondary),
          title: z.l10n.text(z.string.modalConnectCancelHeadline),
        },
      });
    }
  }

  clickToClear(conversationEntity = this.conversation_repository.active_conversation()) {
    if (conversationEntity) {
      const canLeaveConversation = conversationEntity.is_group() && !conversationEntity.removed_from_conversation();
      const modalType = canLeaveConversation
        ? z.viewModel.ModalsViewModel.TYPE.OPTION
        : z.viewModel.ModalsViewModel.TYPE.CONFIRM;

      amplify.publish(z.event.WebApp.WARNING.MODAL, modalType, {
        action: (leaveConversation = false) => {
          this.conversation_repository.clear_conversation(conversationEntity, leaveConversation);
        },
        text: {
          action: z.l10n.text(z.string.modalConversationClearAction),
          message: z.l10n.text(z.string.modalConversationClearMessage),
          option: z.l10n.text(z.string.modalConversationClearOption),
          title: z.l10n.text(z.string.modalConversationClearHeadline),
        },
      });
    }
  }

  clickToLeave(conversationEntity) {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => {
        this.conversation_repository.removeMember(conversationEntity, this.user_repository.self().id);
      },
      text: {
        action: z.l10n.text(z.string.modalConversationLeaveAction),
        message: z.l10n.text(z.string.modalConversationLeaveMessage),
        title: z.l10n.text(z.string.modalConversationLeaveHeadline, conversationEntity.display_name()),
      },
    });
  }

  clickToToggleMute(conversationEntity = this.conversation_repository.active_conversation()) {
    if (conversationEntity) {
      this.conversation_repository.toggle_silence_conversation(conversationEntity);
    }
  }

  clickToUnarchive(conversationEntity) {
    this.conversation_repository.unarchive_conversation(conversationEntity, 'manual un-archive').then(() => {
      if (!this.conversation_repository.conversations_archived().length) {
        this.switch_list(ListViewModel.STATE.CONVERSATIONS);
      }
    });
  }

  _getNextConversation(conversationEntity) {
    const isStateConversations = this.state() === ListViewModel.STATE.CONVERSATIONS;
    const isActiveConversation = this.conversation_repository.is_active_conversation(conversationEntity);

    if (isStateConversations && isActiveConversation) {
      return this.conversation_repository.get_next_conversation(conversationEntity);
    }
  }
};
