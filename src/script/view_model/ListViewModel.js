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

import {t} from 'utils/LocalizerUtil';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};

z.viewModel.ListViewModel = class ListViewModel {
  static get MODAL_TYPE() {
    return {
      TAKEOVER: 'ListViewModel.MODAL_TYPE.TAKEOVER',
      TEMPORARY_GUEST: 'ListViewModal.MODAL_TYPE.TEMPORARY_GUEST',
    };
  }

  static get STATE() {
    return {
      ARCHIVE: 'ListViewModel.STATE.ARCHIVE',
      CONVERSATIONS: 'ListViewModel.STATE.CONVERSATIONS',
      PREFERENCES: 'ListViewModel.STATE.PREFERENCES',
      START_UI: 'ListViewModel.STATE.START_UI',
      TEMPORARY_GUEST: 'ListViewModel.STATE.TEMPORARY_GUEST',
    };
  }
  /**
   * View model for the list column.
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {Object} repositories - Object containing all the repositories
   */
  constructor(mainViewModel, repositories) {
    this.changeNotificationSetting = this.changeNotificationSetting.bind(this);
    this.switchList = this.switchList.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);

    this.elementId = 'left-column';
    this.conversationRepository = repositories.conversation;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;

    this.actionsViewModel = mainViewModel.actions;
    this.contentViewModel = mainViewModel.content;
    this.panelViewModel = mainViewModel.panel;

    this.isActivatedAccount = this.userRepository.isActivatedAccount;
    this.isProAccount = this.teamRepository.isTeam;
    this.selfUser = this.userRepository.self;

    this.logger = new z.util.Logger('z.viewModel.ListViewModel', z.config.LOGGER.OPTIONS);

    // State
    this.state = ko.observable(ListViewModel.STATE.CONVERSATIONS);
    this.lastUpdate = ko.observable();
    this.modal = ko.observable();
    this.webappLoaded = ko.observable(false);

    this.selfUserPicture = ko.pureComputed(() => {
      if (this.webappLoaded() && this.selfUser()) {
        return this.selfUser().mediumPictureResource();
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
    this.preferences = new z.viewModel.list.PreferencesListViewModel(mainViewModel, this, repositories);
    this.start = new z.viewModel.list.StartUIViewModel(mainViewModel, this, repositories);
    this.takeover = new z.viewModel.list.TakeoverViewModel(mainViewModel, this, repositories);
    this.temporaryGuest = new z.viewModel.list.TemporaryGuestViewModel(mainViewModel, this, repositories);

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
    amplify.subscribe(z.event.WebApp.SHORTCUT.ARCHIVE, this.clickToArchive.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.DELETE, this.clickToClear.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.NOTIFICATIONS, this.changeNotificationSetting);
    amplify.subscribe(z.event.WebApp.SHORTCUT.SILENCE, this.changeNotificationSetting); // todo: deprecated - remove when user base of wrappers version >= 3.4 is large enough
  }

  changeNotificationSetting() {
    if (this.isProAccount()) {
      this.panelViewModel.togglePanel(z.viewModel.PanelViewModel.STATE.NOTIFICATIONS);
    } else {
      this.clickToToggleMute();
    }
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

    const nextItem = z.util.ArrayUtil.iterateItem(this.visibleListItems(), activeConversationItem, reverse);

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
      activePreference = z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES;
    }

    const nextPreference = z.util.ArrayUtil.iterateItem(this.visibleListItems(), activePreference, reverse);
    if (nextPreference) {
      this.contentViewModel.switchContent(nextPreference);
    }
  }

  openPreferencesAccount() {
    if (this.isActivatedAccount()) {
      this.dismissModal();
    }

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
    const isStateChange = this.state() !== newListState;
    if (isStateChange) {
      this._hideList();
      this._updateList(newListState, respectLastState);
      this._showList(newListState);
    }
  }

  openConversations() {
    const newState = this.isActivatedAccount()
      ? ListViewModel.STATE.CONVERSATIONS
      : ListViewModel.STATE.TEMPORARY_GUEST;
    this.switchList(newState, false);
  }

  _hideList() {
    const stateIsStartUI = this.state() === ListViewModel.STATE.START_UI;
    if (stateIsStartUI) {
      this.start.resetView();
    }

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
        const newState = this.isActivatedAccount()
          ? ListViewModel.STATE.CONVERSATIONS
          : ListViewModel.STATE.TEMPORARY_GUEST;
        this.switchList(newState);
      }
    });
  }

  _updateList(newListState, respectLastState) {
    switch (newListState) {
      case ListViewModel.STATE.ARCHIVE:
        this.archive.updateList();
        break;
      case ListViewModel.STATE.START_UI:
        this.start.updateList();
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
      case ListViewModel.STATE.TEMPORARY_GUEST:
        return 'temporary-guest';
      default:
        return 'conversations';
    }
  }

  dismissModal() {
    this.modal(undefined);
  }

  showTakeover() {
    this.modal(ListViewModel.MODAL_TYPE.TAKEOVER);
  }

  showTemporaryGuest() {
    this.switchList(ListViewModel.STATE.TEMPORARY_GUEST);
    this.modal(ListViewModel.MODAL_TYPE.TEMPORARY_GUEST);
    const conversationEntity = this.conversationRepository.getMostRecentConversation();
    amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
  }

  //##############################################################################
  // Context menu
  //##############################################################################

  onContextMenu(conversationEntity, event) {
    const entries = [];

    if (conversationEntity.isMutable()) {
      const notificationsShortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.NOTIFICATIONS);

      if (this.isProAccount()) {
        entries.push({
          click: () => this.clickToOpenNotificationSettings(conversationEntity),
          label: t('conversationsPopoverNotificationSettings'),
          title: t('tooltipConversationsNotifications', notificationsShortcut),
        });
      } else {
        const label = conversationEntity.showNotificationsNothing()
          ? t('conversationsPopoverNotify')
          : t('conversationsPopoverSilence');
        const title = conversationEntity.showNotificationsNothing()
          ? t('tooltipConversationsNotify', notificationsShortcut)
          : t('tooltipConversationsSilence', notificationsShortcut);

        entries.push({
          click: () => this.clickToToggleMute(conversationEntity),
          label,
          title,
        });
      }
    }

    if (conversationEntity.is_archived()) {
      entries.push({
        click: () => this.clickToUnarchive(conversationEntity),
        label: t('conversationsPopoverUnarchive'),
      });
    } else {
      const shortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.ARCHIVE);

      entries.push({
        click: () => this.clickToArchive(conversationEntity),
        label: t('conversationsPopoverArchive'),
        title: t('tooltipConversationsArchive', shortcut),
      });
    }

    if (conversationEntity.isRequest()) {
      entries.push({
        click: () => this.clickToCancelRequest(conversationEntity),
        label: t('conversationsPopoverCancel'),
      });
    }

    if (conversationEntity.isClearable()) {
      entries.push({
        click: () => this.clickToClear(conversationEntity),
        label: t('conversationsPopoverClear'),
      });
    }

    if (!conversationEntity.isGroup()) {
      const userEntity = conversationEntity.firstUserEntity();
      const canBlock = userEntity && (userEntity.isConnected() || userEntity.isRequest());

      if (canBlock) {
        entries.push({
          click: () => this.clickToBlock(conversationEntity),
          label: t('conversationsPopoverBlock'),
        });
      }
    }

    if (conversationEntity.isLeavable()) {
      entries.push({
        click: () => this.clickToLeave(conversationEntity),
        label: t('conversationsPopoverLeave'),
      });
    }

    z.ui.Context.from(event, entries, 'conversation-list-options-menu');
  }

  clickToArchive(conversationEntity = this.conversationRepository.active_conversation()) {
    if (this.isActivatedAccount()) {
      this.actionsViewModel.archiveConversation(conversationEntity);
    }
  }

  clickToBlock(conversationEntity) {
    const userEntity = conversationEntity.firstUserEntity();
    const hideConversation = this._shouldHideConversation(conversationEntity);
    const nextConversationEntity = this.conversationRepository.get_next_conversation(conversationEntity);

    this.actionsViewModel.blockUser(userEntity, hideConversation, nextConversationEntity);
  }

  clickToCancelRequest(conversationEntity) {
    const userEntity = conversationEntity.firstUserEntity();
    const hideConversation = this._shouldHideConversation(conversationEntity);
    const nextConversationEntity = this.conversationRepository.get_next_conversation(conversationEntity);

    this.actionsViewModel.cancelConnectionRequest(userEntity, hideConversation, nextConversationEntity);
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

  clickToOpenNotificationSettings(conversationEntity = this.conversationRepository.active_conversation()) {
    amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity, {openNotificationSettings: true});
  }

  clickToUnarchive(conversationEntity) {
    this.conversationRepository.unarchiveConversation(conversationEntity, true, 'manual un-archive').then(() => {
      if (!this.conversationRepository.conversations_archived().length) {
        this.switchList(ListViewModel.STATE.CONVERSATIONS);
      }
    });
  }

  _shouldHideConversation(conversationEntity) {
    const isStateConversations = this.state() === ListViewModel.STATE.CONVERSATIONS;
    const isActiveConversation = this.conversationRepository.is_active_conversation(conversationEntity);

    return isStateConversations && isActiveConversation;
  }
};
