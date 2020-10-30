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

import {REASON as CALL_REASON, STATE as CALL_STATE} from '@wireapp/avs';
import {WebAppEvents} from '@wireapp/webapp-events';
import 'Components/availabilityState';
import 'Components/legalHoldDot';
import 'Components/list/groupedConversations';
import ko from 'knockout';
import {amplify} from 'amplify';

import {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import {PROPERTIES_TYPE} from '../../properties/PropertiesType';
import {t} from 'Util/LocalizerUtil';
import {getLogger, Logger} from 'Util/Logger';
import {NOTIFICATION_HANDLING_STATE} from '../../event/NotificationHandlingState';
import {generateConversationUrl} from '../../router/routeGenerator';
import {AvailabilityContextMenu} from '../../ui/AvailabilityContextMenu';
import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {ContentViewModel} from '../ContentViewModel';
import {ListViewModel} from '../ListViewModel';
import type {WebappProperties} from '@wireapp/api-client/src/user/data';
import type {MainViewModel} from '../MainViewModel';
import type {CallingViewModel} from '../CallingViewModel';
import type {CallingRepository} from '../../calling/CallingRepository';
import type {ConversationRepository} from '../../conversation/ConversationRepository';
import type {PreferenceNotificationRepository} from '../../notification/PreferenceNotificationRepository';
import type {PropertiesRepository} from '../../properties/PropertiesRepository';
import type {Conversation} from '../../entity/Conversation';
import type {User} from '../../entity/User';
import type {EventRepository} from '../../event/EventRepository';
import type {Availability} from '@wireapp/protocol-messaging';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';
import {TeamState} from '../../team/TeamState';
import {ConversationState} from '../../conversation/ConversationState';

export class ConversationListViewModel {
  readonly startTooltip: string;
  readonly foldersTooltip: string;
  readonly conversationsTooltip: string;
  readonly isTeam: ko.PureComputed<boolean>;
  readonly contentViewModel: ContentViewModel;
  readonly showBadge: ko.PureComputed<boolean>;
  readonly selfUserName: ko.PureComputed<string>;
  readonly isOnLegalHold: ko.PureComputed<boolean>;
  readonly archiveTooltip: ko.PureComputed<string>;
  readonly shouldUpdateScrollbar: ko.Computed<void>;
  readonly stateIsRequests: ko.PureComputed<boolean>;
  readonly noConversations: ko.PureComputed<boolean>;
  readonly connectRequestsText: ko.PureComputed<string>;
  readonly hasPendingLegalHold: ko.PureComputed<boolean>;
  readonly showConnectRequests: ko.PureComputed<boolean>;
  readonly selfAvailability: ko.PureComputed<Availability.Type>;
  readonly getConversationUrl: (conversationId: string) => string;
  readonly participantAvatarSize: typeof AVATAR_SIZE.SMALL;
  readonly getIsVisibleFunc: () => (() => boolean) | ((top: number, bottom: number) => boolean);
  private readonly logger: Logger;
  private readonly selfUser: ko.PureComputed<User>;
  private readonly showCalls: ko.Observable<boolean>;
  private readonly callingViewModel: CallingViewModel;
  private readonly contentState: ko.Observable<string>;
  private readonly webappIsLoaded: ko.Observable<boolean>;
  private readonly connectRequests: ko.PureComputed<User[]>;
  private readonly isActivatedAccount: ko.PureComputed<boolean>;
  private readonly expandedFoldersIds: ko.ObservableArray<string>;
  private readonly showRecentConversations: ko.Observable<boolean>;
  private readonly archivedConversations: ko.ObservableArray<Conversation>;
  private readonly unarchivedConversations: ko.ObservableArray<Conversation>;

  constructor(
    mainViewModel: MainViewModel,
    readonly listViewModel: ListViewModel,
    readonly onJoinCall: Function,
    eventRepository: EventRepository,
    readonly callingRepository: CallingRepository,
    readonly conversationRepository: ConversationRepository,
    private readonly preferenceNotificationRepository: PreferenceNotificationRepository,
    private readonly propertiesRepository: PropertiesRepository,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.participantAvatarSize = AVATAR_SIZE.SMALL;

    this.contentViewModel = mainViewModel.content;
    this.callingViewModel = mainViewModel.calling;

    this.logger = getLogger('ConversationListViewModel');

    this.showCalls = ko.observable();
    this.setShowCallsState(eventRepository.notificationHandlingState());
    eventRepository.notificationHandlingState.subscribe(this.setShowCallsState);

    this.contentState = this.contentViewModel.state;

    this.isOnLegalHold = ko.pureComputed(() => this.selfUser().isOnLegalHold());
    this.hasPendingLegalHold = ko.pureComputed(() => this.selfUser().hasPendingLegalHold());
    this.isTeam = this.teamState.isTeam;
    this.isActivatedAccount = this.userState.isActivatedAccount;
    this.getConversationUrl = generateConversationUrl;

    this.selfUser = ko.pureComputed(() => this.userState.self && this.userState.self());
    this.selfAvailability = ko.pureComputed(() => this.selfUser() && this.selfUser().availability());
    this.selfUserName = ko.pureComputed(() => this.selfUser() && this.selfUser().name());

    this.connectRequests = this.userState.connectRequests;
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

    this.archivedConversations = this.conversationState.conversations_archived;
    this.unarchivedConversations = this.conversationState.conversations_unarchived;

    this.noConversations = ko.pureComputed(() => {
      return !this.unarchivedConversations().length && !this.connectRequests().length;
    });

    this.webappIsLoaded = ko.observable(false);

    this.archiveTooltip = ko.pureComputed(() => {
      return t('tooltipConversationsArchived', this.archivedConversations().length);
    });

    const startShortcut = Shortcut.getShortcutTooltip(ShortcutType.START);
    this.startTooltip = t('tooltipConversationsStart', startShortcut);
    this.conversationsTooltip = t('conversationViewTooltip');
    this.foldersTooltip = t('folderViewTooltip');

    this.showConnectRequests = ko.pureComputed(() => this.connectRequests().length > 0);

    this.showBadge = ko.pureComputed(() => {
      return this.preferenceNotificationRepository.notifications().length > 0;
    });

    this.showRecentConversations = ko.observable(
      !this.propertiesRepository.getPreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS) ?? false,
    );
    this.expandedFoldersIds = ko.observableArray([]);

    this.showRecentConversations.subscribe(showRecentConversations => {
      const conversationList = document.querySelector('.conversation-list');
      if (conversationList) {
        conversationList.scrollTop = 0;
      }
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.INTERFACE.VIEW_FOLDERS, !showRecentConversations);
    });

    this.conversationState.activeConversation.subscribe(activeConversation => {
      if (!activeConversation) {
        return;
      }
      const activeLabelIds = this.conversationRepository.conversationLabelRepository.getConversationLabelIds(
        activeConversation,
      );

      const isAlreadyOpen = activeLabelIds.some(labelId => this.expandedFoldersIds().includes(labelId));

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
        this.expandedFoldersIds();
        this.callingViewModel.activeCalls();
      })
      .extend({notify: 'always', rateLimit: 500});

    /*
     *  We generate a helper function to determine wether a <conversation-list-cell> is
     *  initially visible or not.
     *  We need this as we use an IntersectionObserver to improve rendering performance
     *  and only render cells as they become visible.
     *  If we would set them to be invisible initially on every render, we would get a
     *  lot of flickering every time the list updates.
     */
    this.getIsVisibleFunc = () => {
      const conversationList: HTMLElement = document.querySelector('.conversation-list');
      if (!conversationList) {
        return () => false;
      }
      const containerTop = conversationList.scrollTop;
      const containerBottom = containerTop + conversationList.offsetHeight;
      return (top: number, bottom: number) => bottom > containerTop && top < containerBottom;
    };

    this._initSubscriptions();
  }

  private readonly _initSubscriptions = (): void => {
    amplify.subscribe(WebAppEvents.LIFECYCLE.LOADED, this.onWebappLoaded);
    amplify.subscribe(WebAppEvents.SHORTCUT.START, this.clickOnPeopleButton);
    amplify.subscribe(WebAppEvents.CONTENT.EXPAND_FOLDER, this.expandFolder);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, (properties: WebappProperties) => {
      const viewFolders = properties.settings.interface.view_folders;
      this.showRecentConversations(!viewFolders);
    });
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.VIEW_FOLDERS, (viewFolders: boolean) => {
      this.showRecentConversations(!viewFolders);
    });
  };

  expandFolder = (label: string) => {
    if (!this.expandedFoldersIds().includes(label)) {
      this.expandedFoldersIds.push(label);
    }
  };

  clickOnAvailability = (viewModel: unknown, event: MouseEvent): void => {
    AvailabilityContextMenu.show(event, 'list_header', 'left-list-availability-menu');
  };

  clickOnConnectRequests = (): void => {
    this.contentViewModel.switchContent(ContentViewModel.STATE.CONNECTION_REQUESTS);
  };

  hasJoinableCall = (conversationId: string): boolean => {
    const call = this.callingRepository.findCall(conversationId);
    if (!call) {
      return false;
    }
    const conversation = this.conversationState.findConversation(conversationId);
    return (
      !conversation.removed_from_conversation() &&
      call.state() === CALL_STATE.INCOMING &&
      call.reason() !== CALL_REASON.ANSWERED_ELSEWHERE
    );
  };

  setShowCallsState = (handlingNotifications: string): void => {
    const shouldShowCalls = handlingNotifications === NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    const isStateChange = this.showCalls() !== shouldShowCalls;
    if (isStateChange) {
      this.showCalls(shouldShowCalls);
      this.logger.debug(`Set show calls state to: ${this.showCalls()}`);
    }
  };

  isSelectedConversation = (conversationEntity: Conversation): boolean => {
    const expectedStates = [
      ContentViewModel.STATE.COLLECTION,
      ContentViewModel.STATE.COLLECTION_DETAILS,
      ContentViewModel.STATE.CONVERSATION,
    ];

    const isSelectedConversation = this.conversationState.isActiveConversation(conversationEntity);
    const isExpectedState = expectedStates.includes(this.contentState());

    return isSelectedConversation && isExpectedState;
  };

  onWebappLoaded = (): void => {
    this.webappIsLoaded(true);
  };

  //##############################################################################
  // Footer actions
  //##############################################################################

  clickOnArchivedButton = (): void => {
    this.listViewModel.switchList(ListViewModel.STATE.ARCHIVE);
  };

  clickOnPreferencesButton = (): void => {
    amplify.publish(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT);
  };

  clickOnPeopleButton = (): void => {
    if (this.isActivatedAccount()) {
      this.listViewModel.switchList(ListViewModel.STATE.START_UI);
    }
  };
}
