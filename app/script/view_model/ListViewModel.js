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
    this.switchList = this.switchList.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);

    this.elementId = 'left-column';
    this.mainViewModel = mainViewModel;
    this.conversationRepository = repositories.conversation;
    this.userRepository = repositories.user;

    this.actionsViewModel = this.mainViewModel.actions;
    this.contentViewModel = this.mainViewModel.content;

    this.logger = new z.util.Logger('z.viewModel.ListViewModel', z.config.LOGGER.OPTIONS);

    // State
    this.state = ko.observable(ListViewModel.STATE.CONVERSATIONS);
    this.lastUpdate = ko.observable();
    this.modal = ko.observable();
    this.webappLoaded = ko.observable(false);

    this.selfUserPicture = ko.pureComputed(() => {
      if (this.webappLoaded() && this.userRepository.self()) {
        return this.userRepository.self().mediumPictureResource();
      }
    });

    this.visibleListItems = ko.pureComputed(() => {
      const isStatePreferences = this.state() === ListViewModel.STATE.PREFERENCES;
      if (isStatePreferences) {
        const preferenceItems = [
          z.viewModel.ContentViewModel.STATE.PREFERENCES_ACCOUNT,
          z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES,
          z.viewModel.ContentViewModel.STATE.PREFERENCES_OPTIONS,
          z.viewModel.ContentViewModel.STATE.PREFERENCES_AV,
        ];

        if (!z.util.Environment.desktop) {
          preferenceItems.push(z.viewModel.ContentViewModel.STATE.PREFERENCES_ABOUT);
        }

        return preferenceItems;
      }

      const hasConnectRequests = !!this.userRepository.connect_requests().length;
      const states = hasConnectRequests ? z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS : [];
      return this.conversationRepository
        .conversations_calls()
        .concat(states, this.conversationRepository.conversations_unarchived());
    });

    // Nested view models
    this.archive = new z.viewModel.list.ArchiveViewModel(mainViewModel, this, repositories);
    this.conversations = new z.viewModel.list.ConversationListViewModel(mainViewModel, this, repositories);
    this.preferences = new z.viewModel.list.PreferencesListViewModel(mainViewModel, this);
    this.start_ui = new z.viewModel.list.StartUIViewModel(mainViewModel, this, repositories);
    this.takeover = new z.viewModel.list.TakeoverViewModel(mainViewModel, this, repositories);

    this._initSubscriptions();

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  _initSubscriptions() {
    amplify.subscribe(z.event.WebApp.CONVERSATION.SHOW, this.openConversations.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.LOADED, () => this.webappLoaded(true));
    amplify.subscribe(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT, this.openPreferencesAccount.bind(this));
    amplify.subscribe(z.event.WebApp.PREFERENCES.MANAGE_DEVICES, this.openPreferencesDevices.bind(this));
    amplify.subscribe(z.event.WebApp.SEARCH.SHOW, this.openStartUI.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.NEXT, this.goToNext.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.PREV, this.goToPrevious.bind(this));
    amplify.subscribe(z.event.WebApp.TAKEOVER.SHOW, this.showTakeover.bind(this));
    amplify.subscribe(z.event.WebApp.TAKEOVER.DISMISS, this.dismissTakeover.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.ARCHIVE, this.clickToArchive.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.DELETE, this.clickToClear.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.SILENCE, this.clickToToggleMute.bind(this));
  }

  goToNext() {
    this._iterateActiveItem(true);
  }

  goToPrevious() {
    this._iterateActiveItem(false);
  }

  _iterateActiveItem(reverse = false) {
    const isStatePreferences = this.state() === ListViewModel.STATE.PREFERENCES;
    return isStatePreferences ? this._iterateActivePreference(reverse) : this._iterateActiveConversation(reverse);
  }

  _iterateActiveConversation(reverse) {
    const isStateRequests = this.contentViewModel.state() === z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS;
    const activeConversationItem = isStateRequests
      ? z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS
      : this.conversationRepository.active_conversation();

    const nextItem = z.util.ArrayUtil.iterate_item(this.visibleListItems(), activeConversationItem, reverse);

    const isConnectionRequestItem = nextItem === z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS;
    if (isConnectionRequestItem) {
      return this.contentViewModel.switchContent(z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS);
    }

    if (nextItem) {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, nextItem);
    }
  }

  _iterateActivePreference(reverse) {
    let activePreference = this.contentViewModel.state();

    const isDeviceDetails = activePreference === z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS;
    if (isDeviceDetails) {
      activePreference = z.viewModel.ContentViewModel.STATE.DEVICES;
    }

    const nextPreference = z.util.ArrayUtil.iterate_item(this.visibleListItems(), activePreference, reverse);
    if (nextPreference) {
      this.contentViewModel.switchContent(nextPreference);
    }
  }

  openPreferencesAccount() {
    this.switchList(ListViewModel.STATE.PREFERENCES);
    this.contentViewModel.switchContent(z.viewModel.ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  }

  openPreferencesDevices(deviceEntity) {
    this.switchList(ListViewModel.STATE.PREFERENCES);

    if (deviceEntity) {
      this.contentViewModel.preferencesDeviceDetails.device(deviceEntity);
      return this.contentViewModel.switchContent(z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS);
    }

    return this.contentViewModel.switchContent(z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES);
  }

  openStartUI() {
    this.switchList(ListViewModel.STATE.START_UI);
  }

  switchList(newListState, respectLastState = true) {
    const stateUnchanged = this.state() === newListState;
    if (!stateUnchanged) {
      this._hideList();
      this._updateList(newListState, respectLastState);
      this._showList(newListState);
    }
  }

  openConversations() {
    this.switchList(ListViewModel.STATE.CONVERSATIONS, false);
  }

  _hideList() {
    const listStateElementId = this._getElementIdOfList(this.state());
    $(`#${listStateElementId}`).removeClass('left-list-is-visible');
    $(document).off('keydown.listView');
  }

  _showList(newListState) {
    const listStateElementId = this._getElementIdOfList(newListState);
    $(`#${listStateElementId}`).addClass('left-list-is-visible');

    this.state(newListState);
    this.lastUpdate(Date.now());

    $(document).on('keydown.listView', keyboardEvent => {
      if (z.util.KeyboardUtil.isEscapeKey(keyboardEvent)) {
        this.switchList(ListViewModel.STATE.CONVERSATIONS);
      }
    });
  }

  _updateList(newListState, respectLastState) {
    switch (newListState) {
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
        if (respectLastState) {
          this.contentViewModel.switchPreviousContent();
        }
    }
  }

  _getElementIdOfList(listState) {
    switch (listState) {
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

  showTakeover() {
    this.modal(ListViewModel.MODAL_TYPE.TAKEOVER);
  }

  dismissTakeover() {
    this.modal(undefined);
  }

  //##############################################################################
  // Context menu
  //##############################################################################

  onContextMenu(conversationEntity, event) {
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

  clickToArchive(conversationEntity = this.conversationRepository.active_conversation()) {
    this.actionsViewModel.archiveConversation(conversationEntity);
  }

  clickToBlock(conversationEntity) {
    const nextConversationEntity = this._getNextConversation(conversationEntity);
    this.actionsViewModel.blockUser(conversationEntity.firstUserEntity(), nextConversationEntity);
  }

  clickToCancelRequest(conversationEntity) {
    const nextConversationEntity = this._getNextConversation(conversationEntity);
    this.actionsViewModel.cancelConnectionRequest(conversationEntity.firstUserEntity(), nextConversationEntity);
  }

  clickToClear(conversationEntity = this.conversationRepository.active_conversation()) {
    this.actionsViewModel.clearConversation(conversationEntity);
  }

  clickToLeave(conversationEntity) {
    this.actionsViewModel.leaveConversation(conversationEntity);
  }

  clickToToggleMute(conversationEntity = this.conversationRepository.active_conversation()) {
    this.actionsViewModel.toggleMuteConversation(conversationEntity);
  }

  clickToUnarchive(conversationEntity) {
    this.conversationRepository.unarchive_conversation(conversationEntity, 'manual un-archive').then(() => {
      if (!this.conversationRepository.conversations_archived().length) {
        this.switchList(ListViewModel.STATE.CONVERSATIONS);
      }
    });
  }

  _getNextConversation(conversationEntity) {
    const isStateConversations = this.state() === ListViewModel.STATE.CONVERSATIONS;
    const isActiveConversation = this.conversationRepository.is_active_conversation(conversationEntity);

    if (isStateConversations && isActiveConversation) {
      return this.conversationRepository.get_next_conversation(conversationEntity);
    }
  }
};
