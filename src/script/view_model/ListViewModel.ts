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

import {amplify} from 'amplify';
import ko from 'knockout';
import {container} from 'tsyringe';

import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal, usePrimaryModalState} from 'Components/Modals/PrimaryModal';
import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import type {Conversation} from 'Repositories/entity/Conversation';
import type {User} from 'Repositories/entity/User';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {SearchRepository} from 'Repositories/search/SearchRepository';
import type {TeamRepository} from 'Repositories/team/TeamRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/UserState';
import {iterateItem} from 'Util/ArrayUtil';
import {isEscapeKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import type {ActionsViewModel} from './ActionsViewModel';
import {CallingViewModel} from './CallingViewModel';
import {ContentViewModel} from './ContentViewModel';
import type {MainViewModel, ViewModelRepositories} from './MainViewModel';

import {Config} from '../Config';
import {SidebarTabs, useSidebarStore} from '../page/LeftSidebar/panels/Conversations/useSidebarStore';
import {PanelState} from '../page/RightSidebar';
import {useAppMainState} from '../page/state';
import {ContentState, ListState, useAppState} from '../page/useAppState';
import {showContextMenu} from '../ui/ContextMenu';
import {showLabelContextMenu} from '../ui/LabelContextMenu';
import {Shortcut} from '../ui/Shortcut';
import {ShortcutType} from '../ui/ShortcutType';

export class ListViewModel {
  private readonly userState: UserState;
  private readonly teamState: TeamState;
  private readonly conversationState: ConversationState;

  readonly isActivatedAccount: ko.PureComputed<boolean>;
  readonly lastUpdate: ko.Observable<number>;
  readonly repositories: ViewModelRepositories;

  public readonly mainViewModel: MainViewModel;
  public readonly conversationRepository: ConversationRepository;
  public readonly propertiesRepository: PropertiesRepository;
  private readonly callingRepository: CallingRepository;
  public readonly teamRepository: TeamRepository;
  public readonly searchRepository: SearchRepository;
  private readonly actionsViewModel: ActionsViewModel;
  public readonly contentViewModel: ContentViewModel;
  public readonly callingViewModel: CallingViewModel;
  private readonly isProAccount: ko.PureComputed<boolean>;
  public readonly selfUser: ko.Subscribable<User>;
  private readonly visibleListItems: ko.PureComputed<(string | Conversation)[]>;

  get isFederated() {
    return this.mainViewModel.isFederated;
  }

  constructor(mainViewModel: MainViewModel, repositories: ViewModelRepositories) {
    this.userState = container.resolve(UserState);
    this.teamState = container.resolve(TeamState);
    this.conversationState = container.resolve(ConversationState);

    this.mainViewModel = mainViewModel;
    this.repositories = repositories;
    this.conversationRepository = repositories.conversation;
    this.callingRepository = repositories.calling;
    this.teamRepository = repositories.team;
    this.propertiesRepository = repositories.properties;
    this.searchRepository = repositories.search;

    this.actionsViewModel = mainViewModel.actions;
    this.contentViewModel = mainViewModel.content;
    this.callingViewModel = mainViewModel.calling;

    this.isProAccount = this.teamState.isTeam;
    this.selfUser = this.userState.self;
    this.isActivatedAccount = ko.pureComputed(() => this.selfUser()?.isActivatedAccount());

    // State
    this.lastUpdate = ko.observable();

    this.visibleListItems = ko.pureComputed(() => {
      const {listState} = useAppState.getState();
      const isStatePreferences = listState === ListState.PREFERENCES;

      if (isStatePreferences) {
        const preferenceItems = [
          ContentState.PREFERENCES_ACCOUNT,
          ContentState.PREFERENCES_DEVICES,
          ContentState.PREFERENCES_OPTIONS,
          ContentState.PREFERENCES_AV,
        ];

        if (!Runtime.isDesktopApp()) {
          preferenceItems.push(ContentState.PREFERENCES_ABOUT);
        }

        return preferenceItems;
      }

      const hasConnectRequests = !!this.userState.connectRequests().length;
      const states: (string | Conversation)[] = hasConnectRequests ? [ContentState.CONNECTION_REQUESTS] : [];

      return states.concat(this.conversationState.visibleConversations());
    });

    this._initSubscriptions();
  }

  private readonly _initSubscriptions = () => {
    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, (conversation?: Conversation) => {
      this.openConversations(conversation?.archivedState());
    });
    amplify.subscribe(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT, this.openPreferencesAccount);
    amplify.subscribe(WebAppEvents.PREFERENCES.MANAGE_DEVICES, this.openPreferencesDevices);
    amplify.subscribe(WebAppEvents.PREFERENCES.SHOW_AV, this.openPreferencesAudioVideo);
    amplify.subscribe(WebAppEvents.SEARCH.SHOW, this.openStartUI);
    amplify.subscribe(WebAppEvents.SHORTCUT.NEXT, this.goToNext);
    amplify.subscribe(WebAppEvents.SHORTCUT.PREV, this.goToPrevious);
    amplify.subscribe(WebAppEvents.SHORTCUT.ARCHIVE, this.clickToArchive);
    amplify.subscribe(WebAppEvents.SHORTCUT.DELETE, this.clickToClear);
    amplify.subscribe(WebAppEvents.SHORTCUT.NOTIFICATIONS, this.changeNotificationSetting);
    amplify.subscribe(WebAppEvents.SHORTCUT.SILENCE, this.changeNotificationSetting); // todo: deprecated - remove when user base of wrappers version >= 3.4 is large enough
  };

  readonly answerCall = (conversationEntity: Conversation): void => {
    const call = this.callingRepository.findCall(conversationEntity.qualifiedId);

    if (!call) {
      return;
    }

    if (call.isConference && !this.callingRepository.supportsConferenceCalling) {
      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
        text: {
          message: `${t('modalConferenceCallNotSupportedMessage')} ${t('modalConferenceCallNotSupportedJoinMessage')}`,
          title: t('modalConferenceCallNotSupportedHeadline'),
        },
      });
    } else {
      this.callingViewModel.callActions.answer(call);
    }
  };

  readonly changeNotificationSetting = () => {
    if (this.isProAccount()) {
      const {rightSidebar} = useAppMainState.getState();
      rightSidebar.goTo(PanelState.NOTIFICATIONS, {entity: this.conversationState.activeConversation()});
    } else {
      this.clickToToggleMute();
    }
  };

  readonly goToNext = () => {
    this.iterateActiveItem(true);
  };

  readonly goToPrevious = () => {
    this.iterateActiveItem(false);
  };

  onKeyDownListView = (keyboardEvent: KeyboardEvent) => {
    const {currentModalId} = usePrimaryModalState.getState();
    const {currentTab} = useSidebarStore.getState();

    // don't switch view for primary modal(ex: preferences->set status->modal opened)
    // when user press escape, only close the modal and stay within the preference screen
    if (
      isEscapeKey(keyboardEvent) &&
      currentModalId === null &&
      ![SidebarTabs.PREFERENCES, SidebarTabs.CELLS].includes(currentTab)
    ) {
      const newState = this.isActivatedAccount() ? ListState.CONVERSATIONS : ListState.TEMPORARY_GUEST;
      this.switchList(newState);
    }
  };

  private readonly iterateActiveItem = (reverse = false) => {
    const {listState} = useAppState.getState();
    const isStatePreferences = listState === ListState.PREFERENCES;

    return isStatePreferences ? this.iterateActivePreference(reverse) : this.iterateActiveConversation(reverse);
  };

  private readonly iterateActiveConversation = (reverse: boolean) => {
    const {contentState} = useAppState.getState();

    const isStateRequests = contentState === ContentState.CONNECTION_REQUESTS;
    const activeConversationItem = isStateRequests
      ? ContentState.CONNECTION_REQUESTS
      : this.conversationState.activeConversation();
    const nextItem = iterateItem(this.visibleListItems(), activeConversationItem, reverse);
    const isConnectionRequestItem = nextItem === ContentState.CONNECTION_REQUESTS;

    if (isConnectionRequestItem) {
      return this.contentViewModel.switchContent(ContentState.CONNECTION_REQUESTS);
    }

    if (nextItem) {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextItem, {});
    }
  };

  private readonly iterateActivePreference = (reverse: boolean) => {
    const {contentState} = useAppState.getState();
    let activePreference = contentState;
    const isDeviceDetails = activePreference === ContentState.PREFERENCES_DEVICE_DETAILS;

    if (isDeviceDetails) {
      activePreference = ContentState.PREFERENCES_DEVICES;
    }

    const nextPreference = iterateItem(this.visibleListItems(), activePreference, reverse) as ContentState;

    if (nextPreference) {
      this.contentViewModel.switchContent(nextPreference);
    }
  };

  private switchListAndSetTab = (listState: ListState, tab: SidebarTabs) => {
    useSidebarStore.getState().setCurrentTab(tab);
    this.switchList(listState);
  };

  openPreferencesAccount = async (): Promise<void> => {
    await this.teamRepository.getTeam();

    this.switchListAndSetTab(ListState.PREFERENCES, SidebarTabs.PREFERENCES);

    this.contentViewModel.switchContent(ContentState.PREFERENCES_ACCOUNT);
  };

  readonly openPreferencesDevices = (): void => {
    this.switchListAndSetTab(ListState.PREFERENCES, SidebarTabs.PREFERENCES);

    return this.contentViewModel.switchContent(ContentState.PREFERENCES_DEVICES);
  };

  readonly openPreferencesAbout = (): void => {
    this.switchListAndSetTab(ListState.PREFERENCES, SidebarTabs.PREFERENCES);

    return this.contentViewModel.switchContent(ContentState.PREFERENCES_ABOUT);
  };

  readonly openPreferencesAudioVideo = (): void => {
    this.switchListAndSetTab(ListState.PREFERENCES, SidebarTabs.PREFERENCES);

    return this.contentViewModel.switchContent(ContentState.PREFERENCES_AV);
  };

  readonly openPreferencesOptions = (): void => {
    this.switchListAndSetTab(ListState.PREFERENCES, SidebarTabs.PREFERENCES);

    return this.contentViewModel.switchContent(ContentState.PREFERENCES_OPTIONS);
  };

  readonly openStartUI = (): void => {
    this.switchList(ListState.START_UI);
  };

  readonly switchList = (newListState: ListState, loadPreviousContent = true): void => {
    const {listState} = useAppState.getState();
    const isStateChange = listState !== newListState;

    if (isStateChange) {
      this.hideList();
      this.updateList(newListState, loadPreviousContent);
      this.showList(newListState);
    }
  };

  readonly openConversations = (archive = false): void => {
    const {currentTab, setCurrentTab} = useSidebarStore.getState();
    const newState = this.isActivatedAccount()
      ? archive
        ? ListState.ARCHIVE
        : ListState.CONVERSATIONS
      : ListState.TEMPORARY_GUEST;
    this.switchList(newState, false);
    setCurrentTab(archive ? SidebarTabs.ARCHIVES : currentTab);
  };

  private readonly hideList = (): void => {
    document.removeEventListener('keydown', this.onKeyDownListView);
  };

  private readonly showList = (newListState: ListState): void => {
    const {setListState} = useAppState.getState();

    setListState(newListState);
    this.lastUpdate(Date.now());

    document.addEventListener('keydown', this.onKeyDownListView);
  };

  private readonly updateList = (newListState: ListState, loadPreviousContent: boolean): void => {
    switch (newListState) {
      case ListState.PREFERENCES:
        this.contentViewModel.switchContent(ContentState.PREFERENCES_ACCOUNT);
        break;
      case ListState.TEMPORARY_GUEST:
      case ListState.CONVERSATIONS:
        if (loadPreviousContent) {
          this.contentViewModel.loadPreviousContent();
        }
    }
  };

  readonly showTemporaryGuest = (): void => {
    this.switchList(ListState.TEMPORARY_GUEST);
    const conversationEntity = this.conversationState.getMostRecentConversation();
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, {});
  };

  readonly onContextMenu = (
    conversationEntity: Conversation,
    event: MouseEvent | React.MouseEvent<Element, MouseEvent>,
  ): void => {
    const entries = [];

    if (conversationEntity.isMutable()) {
      const notificationsShortcut = Shortcut.getShortcutTooltip(ShortcutType.NOTIFICATIONS);

      if (this.isProAccount()) {
        entries.push({
          click: () => this.clickToOpenNotificationSettings(conversationEntity),
          label: t('conversationsPopoverNotificationSettings'),
          title: t('tooltipConversationsNotifications', {shortcut: notificationsShortcut}),
        });
      } else {
        const label = conversationEntity.showNotificationsNothing()
          ? t('conversationsPopoverNotify')
          : t('conversationsPopoverSilence');
        const title = conversationEntity.showNotificationsNothing()
          ? t('tooltipConversationsNotify', {shortcut: notificationsShortcut})
          : t('tooltipConversationsSilence', {shortcut: notificationsShortcut});

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
          label: t('conversationsPopoverRemoveFrom', {name: customLabel.name}, {}, true),
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
        title: t('tooltipConversationsArchive', {shortcut}),
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

    if (!conversationEntity.isGroupOrChannel()) {
      const userEntity = conversationEntity.firstUserEntity();
      const canBlock = userEntity && (userEntity.isConnected() || userEntity.isRequest());
      const canUnblock = userEntity && userEntity.isBlocked();

      if (canBlock) {
        entries.push({
          click: () => this.clickToBlock(conversationEntity),
          label: t('conversationsPopoverBlock'),
        });
      } else if (canUnblock) {
        entries.push({
          click: () => this.clickToUnblock(conversationEntity),
          label: t('conversationsPopoverUnblock'),
        });
      }
    }

    if (conversationEntity.isLeavable()) {
      entries.push({
        click: () => this.clickToLeave(conversationEntity),
        label: conversationEntity.isChannel() ? t('channelsPopoverLeave') : t('groupsPopoverLeave'),
        identifier: 'conversation-leave',
      });
    }

    if (
      Config.getConfig().FEATURE.ENABLE_REMOVE_GROUP_CONVERSATION &&
      conversationEntity.isGroupOrChannel() &&
      conversationEntity.isSelfUserRemoved()
    ) {
      entries.push({
        click: () => this.actionsViewModel.removeConversation(conversationEntity),
        label: t('conversationsPopoverDeleteForMe'),
      });
    }

    showContextMenu({event, entries, identifier: 'conversation-list-options-menu'});
  };

  readonly clickToArchive = (conversationEntity = this.conversationState.activeConversation()): void => {
    if (this.isActivatedAccount()) {
      this.actionsViewModel.archiveConversation(conversationEntity);
    }
  };

  clickToBlock = async (conversationEntity: Conversation): Promise<void> => {
    const userEntity = conversationEntity.firstUserEntity();

    if (!userEntity) {
      return;
    }

    await this.actionsViewModel.blockUser(userEntity);
  };

  clickToUnblock = async (conversationEntity: Conversation): Promise<void> => {
    const userEntity = conversationEntity.firstUserEntity();
    if (!userEntity) {
      return;
    }
    await this.actionsViewModel.unblockUser(userEntity);
  };

  readonly clickToCancelRequest = (conversationEntity: Conversation): void => {
    const userEntity = conversationEntity.firstUserEntity();
    const hideConversation = this.shouldHideConversation(conversationEntity);
    const nextConversationEntity = this.conversationRepository.getNextConversation(conversationEntity);

    this.actionsViewModel.cancelConnectionRequest(userEntity, hideConversation, nextConversationEntity);
  };

  readonly clickToClear = (conversationEntity = this.conversationState.activeConversation()): void => {
    this.actionsViewModel.clearConversation(conversationEntity);
  };

  readonly clickToLeave = (conversationEntity: Conversation): void => {
    this.actionsViewModel.leaveConversation(conversationEntity);
  };

  readonly clickToToggleMute = (conversationEntity = this.conversationState.activeConversation()): void => {
    this.actionsViewModel.toggleMuteConversation(conversationEntity);
  };

  readonly clickToOpenNotificationSettings = (
    conversationEntity = this.conversationState.activeConversation(),
  ): void => {
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, {openNotificationSettings: true});
  };

  readonly clickToUnarchive = (conversationEntity: Conversation): void => {
    this.conversationRepository.unarchiveConversation(conversationEntity, true, 'manual un-archive').then(() => {
      if (!this.conversationState.archivedConversations().length) {
        this.switchList(ListState.CONVERSATIONS);
      }
    });
  };

  private readonly shouldHideConversation = (conversationEntity: Conversation): boolean => {
    const {listState} = useAppState.getState();
    const isStateConversations = listState === ListState.CONVERSATIONS;
    const isActiveConversation = this.conversationState.isActiveConversation(conversationEntity);

    return isStateConversations && isActiveConversation;
  };
}
