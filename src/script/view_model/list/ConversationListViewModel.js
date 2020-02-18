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

import {WebAppEvents} from '../../event/WebApp';
import {NOTIFICATION_HANDLING_STATE} from '../../event/NotificationHandlingState';
import {ParticipantAvatar} from 'Components/participantAvatar';

import {STATE as CALL_STATE, REASON as CALL_REASON} from '@wireapp/avs';
import {AvailabilityContextMenu} from '../../ui/AvailabilityContextMenu';
import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {ContentViewModel} from '../ContentViewModel';
import {generateConversationUrl} from '../../router/routeGenerator';

import 'Components/legalHoldDot';
import 'Components/availabilityState';
import 'Components/list/groupedConversations';

export class ConversationListViewModel {
  /**
   * View model for conversation list.
   *
   * @param {MainViewModel} mainViewModel Main view model
   * @param {z.viewModel.ListViewModel} listViewModel List view model
   * @param {Object} repositories Object containing all repositories
   * @param {Function} onJoinCall Callback called when the user wants to join a call
   */
  constructor(mainViewModel, listViewModel, repositories, onJoinCall) {
    this.isSelectedConversation = this.isSelectedConversation.bind(this);

    this.audioRepository = repositories.audio;
    this.callingRepository = repositories.calling;
    this.conversationRepository = repositories.conversation;
    this.permissionRepository = repositories.permission;
    this.preferenceNotificationRepository = repositories.preferenceNotification;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;
    this.videoGridRepository = repositories.videoGrid;
    this.ParticipantAvatar = ParticipantAvatar;

    this.contentViewModel = mainViewModel.content;
    this.callingViewModel = mainViewModel.calling;
    this.listViewModel = listViewModel;
    this.onJoinCall = onJoinCall;

    this.logger = getLogger('ConversationListViewModel');

    this.showCalls = ko.observable();
    this.setShowCallsState(repositories.event.notificationHandlingState());
    repositories.event.notificationHandlingState.subscribe(this.setShowCallsState.bind(this));

    this.contentState = this.contentViewModel.state;
    this.selectedConversation = ko.observable();

    this.isOnLegalHold = ko.pureComputed(() => this.selfUser().isOnLegalHold());
    this.hasPendingLegalHold = ko.pureComputed(() => this.selfUser().hasPendingLegalHold());
    this.isTeam = this.teamRepository.isTeam;
    this.isActivatedAccount = this.userRepository.isActivatedAccount;
    this.getConversationUrl = generateConversationUrl;

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
      return this.contentState() === ContentViewModel.STATE.CONNECTION_REQUESTS;
    });

    this.archivedConversations = this.conversationRepository.conversations_archived;
    this.unarchivedConversations = this.conversationRepository.conversations_unarchived;

    this.noConversations = ko.pureComputed(() => {
      return !this.unarchivedConversations().length && !this.connectRequests().length;
    });

    this.webappIsLoaded = ko.observable(false);

    this.activeConversationId = ko.pureComputed(() => {
      if (this.conversationRepository.active_conversation()) {
        return this.conversationRepository.active_conversation().id;
      }
    });

    this.archiveTooltip = ko.pureComputed(() => {
      return t('tooltipConversationsArchived', this.archivedConversations().length);
    });

    const startShortcut = Shortcut.getShortcutTooltip(ShortcutType.START);
    this.startTooltip = t('tooltipConversationsStart', startShortcut);
    this.conversationsTooltip = t('conversationViewTooltip');
    this.foldersTooltip = t('folderViewTooltip');

    this.showConnectRequests = ko.pureComputed(() => this.connectRequests().length);

    this.showBadge = ko.pureComputed(() => {
      return this.preferenceNotificationRepository.notifications().length > 0;
    });

    this.showRecentConversations = ko.observable(true);
    // TODO: Rename "expandedFolders" to "expandedFolderIds"
    this.expandedFolders = ko.observableArray([]);

    this.showRecentConversations.subscribe(() => {
      const conversationList = document.querySelector('.conversation-list');
      if (conversationList) {
        conversationList.scrollTop = 0;
      }
    });

    this.conversationRepository.active_conversation.subscribe(activeConversation => {
      if (!activeConversation) {
        return;
      }
      const activeLabelIds = this.conversationRepository.conversationLabelRepository.getConversationLabelIds(
        activeConversation,
      );

      const isAlreadyOpen = activeLabelIds.some(labelId => this.expandedFolders().includes(labelId));

      if (!isAlreadyOpen) {
        this.expandFolder(activeLabelIds[0]);
      }
    });

    this.shouldUpdateScrollbar = ko
      .computed(() => {
        /**
         * We need all of those as trigger for the antiscroll update.
         * If we would just use
         * `this.unarchivedConversations() || this.webappIsLoaded() || this.connectRequests() || this.callingViewModel.activeCalls();`
         * it might return after the first truthy value and not monitor the remaining observables.
         */
        this.unarchivedConversations();
        this.webappIsLoaded();
        this.connectRequests();
        this.showRecentConversations();
        this.expandedFolders();
        this.callingViewModel.activeCalls();
      })
      .extend({notify: 'always', rateLimit: 500});

    /*
     *  We generate a helper function to determine wether a <conversation-list-cell> is
     *  initially visible or not.
     *  We need this as we use an IntersectionObserver to improve rendering performance
     *  and only render cells as they become visible.
     *  If we would set them to be invisible initially on every render, we would get a
     *  lot of flickering everytime the list updates.
     */
    this.getIsVisibleFunc = () => {
      const conversationList = document.querySelector('.conversation-list');
      if (!conversationList) {
        return () => false;
      }
      const containerTop = conversationList.scrollTop;
      const containerBottom = containerTop + conversationList.offsetHeight;
      return (top, bottom) => bottom > containerTop && top < containerBottom;
    };

    this._initSubscriptions();
  }

  _initSubscriptions() {
    amplify.subscribe(WebAppEvents.LIFECYCLE.LOADED, this.onWebappLoaded.bind(this));
    amplify.subscribe(WebAppEvents.SHORTCUT.START, this.clickOnPeopleButton.bind(this));
    amplify.subscribe(WebAppEvents.CONTENT.EXPAND_FOLDER, this.expandFolder);
  }

  expandFolder = label => {
    if (!this.expandedFolders().includes(label)) {
      this.expandedFolders.push(label);
    }
  };

  clickOnAvailability(viewModel, event) {
    AvailabilityContextMenu.show(event, 'list_header', 'left-list-availability-menu');
  }

  clickOnConnectRequests() {
    this.contentViewModel.switchContent(ContentViewModel.STATE.CONNECTION_REQUESTS);
  }

  hasJoinableCall = conversationId => {
    const call = this.callingRepository.findCall(conversationId);
    return call && call.state() === CALL_STATE.INCOMING && call.reason() !== CALL_REASON.ANSWERED_ELSEWHERE;
  };

  setShowCallsState(handlingNotifications) {
    const shouldShowCalls = handlingNotifications === NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isStateChange = this.showCalls() !== shouldShowCalls;
    if (isStateChange) {
      this.showCalls(shouldShowCalls);
      this.logger.debug(`Set show calls state to: ${this.showCalls()}`);
    }
  }

  isSelectedConversation(conversationEntity) {
    const expectedStates = [
      ContentViewModel.STATE.COLLECTION,
      ContentViewModel.STATE.COLLECTION_DETAILS,
      ContentViewModel.STATE.CONVERSATION,
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
    amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT);
  }

  clickOnPeopleButton() {
    if (this.isActivatedAccount()) {
      this.listViewModel.switchList(z.viewModel.ListViewModel.STATE.START_UI);
    }
  }
}
