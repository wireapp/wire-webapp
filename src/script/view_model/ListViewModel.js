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

import {getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {iterateItem} from 'Util/ArrayUtil';
import {Environment} from 'Util/Environment';
import {isEscapeKey} from 'Util/KeyboardUtil';
import {CALL_TYPE} from '@wireapp/avs';

import {ArchiveViewModel} from './list/ArchiveViewModel';
import {ConversationListViewModel} from './list/ConversationListViewModel';
import {PreferencesListViewModel} from './list/PreferencesListViewModel';
import {StartUIViewModel} from './list/StartUIViewModel';
import {TakeoverViewModel} from './list/TakeoverViewModel';
import {TemporaryGuestViewModel} from './list/TemporaryGuestViewModel';
import {WebAppEvents} from '../event/WebApp';

import {Context} from '../ui/ContextMenu';
import {showLabelContextMenu} from '../ui/LabelContextMenu';
import {Shortcut} from '../ui/Shortcut';
import {ShortcutType} from '../ui/ShortcutType';
import {ContentViewModel} from './ContentViewModel';
import {DefaultLabelIds} from '../conversation/ConversationLabelRepository';

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
   * @param {MainViewModel} mainViewModel Main view model
   * @param {Object} repositories Object containing all the repositories
   */
  constructor(mainViewModel, repositories) {
    this.changeNotificationSetting = this.changeNotificationSetting.bind(this);
    this.switchList = this.switchList.bind(this);
    this.onContextMenu = this.onContextMenu.bind(this);

    this.elementId = 'left-column';
    this.conversationRepository = repositories.conversation;
    this.callingRepository = repositories.calling;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;

    this.actionsViewModel = mainViewModel.actions;
    this.contentViewModel = mainViewModel.content;
    this.panelViewModel = mainViewModel.panel;

    this.isActivatedAccount = this.userRepository.isActivatedAccount;
    this.isProAccount = this.teamRepository.isTeam;
    this.selfUser = this.userRepository.self;

    this.logger = getLogger('z.viewModel.ListViewModel');

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
          ContentViewModel.STATE.PREFERENCES_ACCOUNT,
          ContentViewModel.STATE.PREFERENCES_DEVICES,
          ContentViewModel.STATE.PREFERENCES_OPTIONS,
          ContentViewModel.STATE.PREFERENCES_AV,
        ];

        if (!Environment.desktop) {
          preferenceItems.push(ContentViewModel.STATE.PREFERENCES_ABOUT);
        }

        return preferenceItems;
      }

      const hasConnectRequests = !!this.userRepository.connect_requests().length;
      const states = hasConnectRequests ? [ContentViewModel.STATE.CONNECTION_REQUESTS] : [];
      return states.concat(this.conversationRepository.conversations_unarchived());
    });

    // Nested view models
    this.archive = new ArchiveViewModel(this, repositories.conversation, this.answerCall);
    this.conversations = new ConversationListViewModel(mainViewModel, this, repositories, this.answerCall);
    this.preferences = new PreferencesListViewModel(
      this.contentViewModel,
      this,
      repositories.user,
      repositories.calling,
    );
    this.start = new StartUIViewModel(mainViewModel, this, repositories);
    this.takeover = new TakeoverViewModel(mainViewModel, this, repositories);
    this.temporaryGuest = new TemporaryGuestViewModel(mainViewModel, this, repositories);

    this._initSubscriptions();

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  _initSubscriptions() {
    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, this.openConversations.bind(this));
    amplify.subscribe(WebAppEvents.LIFECYCLE.LOADED, () => this.webappLoaded(true));
    amplify.subscribe(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT, this.openPreferencesAccount.bind(this));
    amplify.subscribe(WebAppEvents.PREFERENCES.MANAGE_DEVICES, this.openPreferencesDevices.bind(this));
    amplify.subscribe(WebAppEvents.SEARCH.SHOW, this.openStartUI.bind(this));
    amplify.subscribe(WebAppEvents.SHORTCUT.NEXT, this.goToNext.bind(this));
    amplify.subscribe(WebAppEvents.SHORTCUT.PREV, this.goToPrevious.bind(this));
    amplify.subscribe(WebAppEvents.SHORTCUT.ARCHIVE, this.clickToArchive.bind(this));
    amplify.subscribe(WebAppEvents.SHORTCUT.DELETE, this.clickToClear.bind(this));
    amplify.subscribe(WebAppEvents.SHORTCUT.NOTIFICATIONS, this.changeNotificationSetting);
    amplify.subscribe(WebAppEvents.SHORTCUT.SILENCE, this.changeNotificationSetting); // todo: deprecated - remove when user base of wrappers version >= 3.4 is large enough
  }

  answerCall = conversationEntity => {
    const call = this.callingRepository.findCall(conversationEntity.id);
    if (call) {
      const callType = call.selfParticipant.sharesCamera() ? call.initialType : CALL_TYPE.NORMAL;
      this.callingRepository.answerCall(call, callType);
    }
  };

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
    const isStateRequests = this.contentViewModel.state() === ContentViewModel.STATE.CONNECTION_REQUESTS;
    const activeConversationItem = isStateRequests
      ? ContentViewModel.STATE.CONNECTION_REQUESTS
      : this.conversationRepository.active_conversation();

    const nextItem = iterateItem(this.visibleListItems(), activeConversationItem, reverse);

    const isConnectionRequestItem = nextItem === ContentViewModel.STATE.CONNECTION_REQUESTS;
    if (isConnectionRequestItem) {
      return this.contentViewModel.switchContent(ContentViewModel.STATE.CONNECTION_REQUESTS);
    }

    if (nextItem) {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextItem);
    }
  }

  _iterateActivePreference(reverse) {
    let activePreference = this.contentViewModel.state();

    const isDeviceDetails = activePreference === ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS;
    if (isDeviceDetails) {
      activePreference = ContentViewModel.STATE.PREFERENCES_DEVICES;
    }

    const nextPreference = iterateItem(this.visibleListItems(), activePreference, reverse);
    if (nextPreference) {
      this.contentViewModel.switchContent(nextPreference);
    }
  }

  openPreferencesAccount() {
    if (this.isActivatedAccount()) {
      this.dismissModal();
    }

    this.switchList(ListViewModel.STATE.PREFERENCES);
    this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  }

  openPreferencesDevices(deviceEntity) {
    this.switchList(ListViewModel.STATE.PREFERENCES);

    if (deviceEntity) {
      this.contentViewModel.preferencesDeviceDetails.device(deviceEntity);
      return this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS);
    }

    return this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_DEVICES);
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
      if (isEscapeKey(keyboardEvent)) {
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
        amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.PREFERENCES_ACCOUNT);
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
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity);
  }

  onContextMenu(conversationEntity, event) {
    const entries = [];

    if (conversationEntity.isMutable()) {
      const notificationsShortcut = Shortcut.getShortcutTooltip(ShortcutType.NOTIFICATIONS);

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

    if (!conversationEntity.is_archived()) {
      const {conversationLabelRepository} = this.conversationRepository;
      if (!conversationLabelRepository.isFavorite(conversationEntity)) {
        entries.push({
          click: () => {
            conversationLabelRepository.addConversationToFavorites(conversationEntity);
            this.conversations.expandFolder(DefaultLabelIds.Favorites);
          },
          label: t('conversationPopoverFavorite'),
        });
      } else {
        entries.push({
          click: () => conversationLabelRepository.removeConversationFromFavorites(conversationEntity),
          label: t('conversationPopoverUnfavorite'),
        });
      }

      const customLabel = conversationLabelRepository.getConversationCustomLabel(conversationEntity);
      if (customLabel) {
        entries.push({
          click: () => conversationLabelRepository.removeConversationFromLabel(customLabel, conversationEntity),
          label: t('conversationsPopoverRemoveFrom', customLabel.name),
        });
      }

      entries.push({
        click: () => showLabelContextMenu(event, conversationEntity, conversationLabelRepository),
        label: t('conversationsPopoverMoveTo'),
      });
    }

    if (conversationEntity.is_archived()) {
      entries.push({
        click: () => this.clickToUnarchive(conversationEntity),
        label: t('conversationsPopoverUnarchive'),
      });
    } else {
      const shortcut = Shortcut.getShortcutTooltip(ShortcutType.ARCHIVE);

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

    Context.from(event, entries, 'conversation-list-options-menu');
  }

  clickToArchive(conversationEntity = this.conversationRepository.active_conversation()) {
    if (this.isActivatedAccount()) {
      this.actionsViewModel.archiveConversation(conversationEntity);
    }
  }

  async clickToBlock(conversationEntity) {
    const userEntity = conversationEntity.firstUserEntity();
    const hideConversation = this._shouldHideConversation(conversationEntity);
    const nextConversationEntity = this.conversationRepository.get_next_conversation(conversationEntity);
    await this.actionsViewModel.blockUser(userEntity, hideConversation, nextConversationEntity);
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
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, {openNotificationSettings: true});
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
