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
window.z.viewModel.list = z.viewModel.list || {};

z.viewModel.list.ConversationListViewModel = class ConversationListViewModel {
  /**
   * View model for conversation list.
   *
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {z.viewModel.ListViewModel} listViewModel - List view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, listViewModel, repositories) {
    this.clickOnConversation = this.clickOnConversation.bind(this);
    this.isSelectedConversation = this.isSelectedConversation.bind(this);

    this.callingRepository = repositories.calling;
    this.conversationRepository = repositories.conversation;
    this.permissionRepository = repositories.permission;
    this.preferenceNotificationRepository = repositories.preferenceNotification;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;
    this.videoGridRepository = repositories.videoGrid;

    this.contentViewModel = mainViewModel.content;
    this.listViewModel = listViewModel;

    this.logger = new z.util.Logger('z.viewModel.list.ConversationListViewModel', z.config.LOGGER.OPTIONS);
    this.multitasking = this.contentViewModel.multitasking;

    this.showCalls = ko.observable(false);

    this.contentState = this.contentViewModel.state;
    this.selectedConversation = ko.observable();

    this.isTeam = this.teamRepository.isTeam;
    this.isActivatedAccount = this.userRepository.isActivatedAccount;

    this.selfUser = ko.pureComputed(() => this.userRepository.self && this.userRepository.self());
    this.selfAvailability = ko.pureComputed(() => this.selfUser() && this.selfUser().availability());
    this.selfUserName = ko.pureComputed(() => this.selfUser() && this.selfUser().name());

    this.connectRequests = this.userRepository.connect_requests;
    this.connectRequestsText = ko.pureComputed(() => {
      const reqCount = this.connectRequests().length;
      const hasMultipleRequests = reqCount > 1;
      return hasMultipleRequests
        ? t('conversationsConnectionRequestMany', reqCount)
        : t('conversationsConnectionRequestOne');
    });
    this.stateIsRequests = ko.pureComputed(() => {
      return this.contentState() === z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS;
    });

    this.callConversations = this.conversationRepository.conversations_calls;
    this.archivedConversations = this.conversationRepository.conversations_archived;
    this.unarchivedConversations = this.conversationRepository.conversations_unarchived;

    this.noConversations = ko.pureComputed(() => {
      const noConversations = !this.unarchivedConversations().length && !this.callConversations().length;
      return noConversations && !this.connectRequests().length;
    });

    this.webappIsLoaded = ko.observable(false);

    this.shouldUpdateScrollbar = ko
      .computed(() => {
        const numberOfConversations = this.unarchivedConversations().length + this.callConversations().length;
        return this.webappIsLoaded() || numberOfConversations || this.connectRequests().length;
      })
      .extend({notify: 'always', rateLimit: 500});

    this.activeConversationId = ko.pureComputed(() => {
      if (this.conversationRepository.active_conversation()) {
        return this.conversationRepository.active_conversation().id;
      }
    });

    this.archiveTooltip = ko.pureComputed(() => {
      return t('tooltipConversationsArchived', this.archivedConversations().length);
    });

    const startShortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.START);
    this.startTooltip = t('tooltipConversationsStart', startShortcut);

    this.showConnectRequests = ko.pureComputed(() => this.connectRequests().length);

    this.showBadge = ko.pureComputed(() => {
      return this.preferenceNotificationRepository.notifications().length > 0;
    });

    this._initSubscriptions();
  }

  _initSubscriptions() {
    amplify.subscribe(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, this.setShowCallsState.bind(this));
    amplify.subscribe(z.event.WebApp.LIFECYCLE.LOADED, this.onWebappLoaded.bind(this));
    amplify.subscribe(z.event.WebApp.SHORTCUT.START, this.clickOnPeopleButton.bind(this));
  }

  clickOnAvailability(viewModel, event) {
    z.ui.AvailabilityContextMenu.show(event, 'list_header', 'left-list-availability-menu');
  }

  clickOnConnectRequests() {
    this.contentViewModel.switchContent(z.viewModel.ContentViewModel.STATE.CONNECTION_REQUESTS);
  }

  clickOnConversation(conversationEntity) {
    if (!this.isSelectedConversation(conversationEntity)) {
      this.contentViewModel.showConversation(conversationEntity);
    }
  }

  setShowCallsState(handlingNotifications) {
    const shouldShowCalls = handlingNotifications === z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isStateChange = this.showCalls() !== shouldShowCalls;
    if (isStateChange) {
      this.showCalls(shouldShowCalls);
      this.logger.debug(`Set show calls state to: ${this.showCalls()}`);
    }
  }

  isSelectedConversation(conversationEntity) {
    const expectedStates = [
      z.viewModel.ContentViewModel.STATE.COLLECTION,
      z.viewModel.ContentViewModel.STATE.COLLECTION_DETAILS,
      z.viewModel.ContentViewModel.STATE.CONVERSATION,
    ];

    const isSelectedConversation = this.conversationRepository.is_active_conversation(conversationEntity);
    const isExpectedState = expectedStates.includes(this.contentState());

    return isSelectedConversation && isExpectedState;
  }

  onWebappLoaded() {
    this.webappIsLoaded(true);
  }

  //##############################################################################
  // Footer actions
  //##############################################################################

  clickOnArchivedButton() {
    this.listViewModel.switchList(z.viewModel.ListViewModel.STATE.ARCHIVE);
  }

  clickOnPreferencesButton() {
    amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_ACCOUNT);
  }

  clickOnPeopleButton() {
    if (this.isActivatedAccount()) {
      this.listViewModel.switchList(z.viewModel.ListViewModel.STATE.START_UI);
    }
  }
};
