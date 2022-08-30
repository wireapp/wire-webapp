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

import {CONV_TYPE} from '@wireapp/avs';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';
import {amplify} from 'amplify';
import {Runtime} from '@wireapp/commons';
import {container} from 'tsyringe';

import {t} from 'Util/LocalizerUtil';
import {iterateItem} from 'Util/ArrayUtil';
import {isEscapeKey} from 'Util/KeyboardUtil';

import {showContextMenu} from '../ui/ContextMenu';
import {showLabelContextMenu} from '../ui/LabelContextMenu';
import {Shortcut} from '../ui/Shortcut';
import {ShortcutType} from '../ui/ShortcutType';
import {ContentState, ContentViewModel} from './ContentViewModel';
import {ModalsViewModel} from './ModalsViewModel';
import {PanelViewModel} from './PanelViewModel';
import type {MainViewModel, ViewModelRepositories} from './MainViewModel';
import type {CallingRepository} from '../calling/CallingRepository';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {TeamRepository} from '../team/TeamRepository';
import type {ActionsViewModel} from './ActionsViewModel';
import type {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';
import {UserState} from '../user/UserState';
import {TeamState} from '../team/TeamState';
import {ConversationState} from '../conversation/ConversationState';
import {CallingViewModel} from './CallingViewModel';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {SearchRepository} from '../search/SearchRepository';

export enum ListState {
  ARCHIVE = 'ListViewModel.STATE.ARCHIVE',
  CONVERSATIONS = 'ListViewModel.STATE.CONVERSATIONS',
  PREFERENCES = 'ListViewModel.STATE.PREFERENCES',
  START_UI = 'ListViewModel.STATE.START_UI',
  TEMPORARY_GUEST = 'ListViewModel.STATE.TEMPORARY_GUEST',
}

export class ListViewModel {
  private readonly userState: UserState;
  private readonly teamState: TeamState;
  private readonly conversationState: ConversationState;

  readonly isActivatedAccount: ko.PureComputed<boolean>;
  readonly webappLoaded: ko.Observable<boolean>;
  readonly state: ko.Observable<string>;
  readonly lastUpdate: ko.Observable<number>;
  readonly isFederated: boolean;

  public readonly mainViewModel: MainViewModel;
  public readonly conversationRepository: ConversationRepository;
  public readonly propertiesRepository: PropertiesRepository;
  private readonly callingRepository: CallingRepository;
  public readonly teamRepository: TeamRepository;
  public readonly searchRepository: SearchRepository;
  private readonly actionsViewModel: ActionsViewModel;
  public readonly contentViewModel: ContentViewModel;
  public readonly callingViewModel: CallingViewModel;
  private readonly panelViewModel: PanelViewModel;
  private readonly isProAccount: ko.PureComputed<boolean>;
  public readonly selfUser: ko.Observable<User>;
  private readonly visibleListItems: ko.PureComputed<(string | Conversation)[]>;

  static get STATE() {
    return {
      ARCHIVE: ListState.ARCHIVE,
      CONVERSATIONS: ListState.CONVERSATIONS,
      PREFERENCES: ListState.PREFERENCES,
      START_UI: ListState.START_UI,
      TEMPORARY_GUEST: ListState.TEMPORARY_GUEST,
    };
  }

  constructor(mainViewModel: MainViewModel, repositories: ViewModelRepositories) {
    this.userState = container.resolve(UserState);
    this.teamState = container.resolve(TeamState);
    this.conversationState = container.resolve(ConversationState);

    this.mainViewModel = mainViewModel;
    this.isFederated = mainViewModel.isFederated;
    this.conversationRepository = repositories.conversation;
    this.callingRepository = repositories.calling;
    this.teamRepository = repositories.team;
    this.propertiesRepository = repositories.properties;
    this.searchRepository = repositories.search;

    this.actionsViewModel = mainViewModel.actions;
    this.contentViewModel = mainViewModel.content;
    this.panelViewModel = mainViewModel.panel;
    this.callingViewModel = mainViewModel.calling;

    this.isActivatedAccount = this.userState.isActivatedAccount;
    this.isProAccount = this.teamState.isTeam;
    this.selfUser = this.userState.self;

    // State
    this.state = ko.observable(ListViewModel.STATE.CONVERSATIONS);
    this.lastUpdate = ko.observable();
    this.webappLoaded = ko.observable(false);

    this.visibleListItems = ko.pureComputed(() => {
      const isStatePreferences = this.state() === ListViewModel.STATE.PREFERENCES;
      if (isStatePreferences) {
        const preferenceItems = [
          ContentViewModel.STATE.PREFERENCES_ACCOUNT,
          ContentViewModel.STATE.PREFERENCES_DEVICES,
          ContentViewModel.STATE.PREFERENCES_OPTIONS,
          ContentViewModel.STATE.PREFERENCES_AV,
        ];

        if (!Runtime.isDesktopApp()) {
          preferenceItems.push(ContentViewModel.STATE.PREFERENCES_ABOUT);
        }

        return preferenceItems;
      }

      const hasConnectRequests = !!this.userState.connectRequests().length;
      const states: (string | Conversation)[] = hasConnectRequests ? [ContentViewModel.STATE.CONNECTION_REQUESTS] : [];
      return states.concat(this.conversationState.conversations_unarchived());
    });

    this._initSubscriptions();
  }

  private readonly _initSubscriptions = () => {
    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, this.openConversations);
    amplify.subscribe(WebAppEvents.LIFECYCLE.LOADED, () => this.webappLoaded(true));
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
    if (call.conversationType === CONV_TYPE.CONFERENCE && !this.callingRepository.supportsConferenceCalling) {
      amplify.publish(WebAppEvents.WARNING.MODAL, ModalsViewModel.TYPE.ACKNOWLEDGE, {
        text: {
          message: `${t('modalConferenceCallNotSupportedMessage')} ${t('modalConferenceCallNotSupportedJoinMessage')}`,
          title: t('modalConferenceCallNotSupportedHeadline'),
        },
      });
    } else {
      this.callingRepository.answerCall(call);
    }
  };

  readonly changeNotificationSetting = () => {
    if (this.isProAccount()) {
      this.panelViewModel.togglePanel(PanelViewModel.STATE.NOTIFICATIONS, {
        entity: this.conversationState.activeConversation(),
      });
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
    if (isEscapeKey(keyboardEvent)) {
      const newState = this.isActivatedAccount()
        ? ListViewModel.STATE.CONVERSATIONS
        : ListViewModel.STATE.TEMPORARY_GUEST;
      this.switchList(newState);
    }
  };

  private readonly iterateActiveItem = (reverse = false) => {
    const isStatePreferences = this.state() === ListViewModel.STATE.PREFERENCES;
    return isStatePreferences ? this.iterateActivePreference(reverse) : this.iterateActiveConversation(reverse);
  };

  private readonly iterateActiveConversation = (reverse: boolean) => {
    const isStateRequests = this.contentViewModel.state() === ContentViewModel.STATE.CONNECTION_REQUESTS;
    const activeConversationItem = isStateRequests
      ? ContentViewModel.STATE.CONNECTION_REQUESTS
      : this.conversationState.activeConversation();

    const nextItem = iterateItem(this.visibleListItems(), activeConversationItem, reverse);

    const isConnectionRequestItem = nextItem === ContentViewModel.STATE.CONNECTION_REQUESTS;
    if (isConnectionRequestItem) {
      return this.contentViewModel.switchContent(ContentViewModel.STATE.CONNECTION_REQUESTS);
    }

    if (nextItem) {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextItem, {});
    }
  };

  private readonly iterateActivePreference = (reverse: boolean) => {
    let activePreference = this.contentViewModel.state();

    const isDeviceDetails = activePreference === ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS;
    if (isDeviceDetails) {
      activePreference = ContentViewModel.STATE.PREFERENCES_DEVICES;
    }

    const nextPreference = iterateItem(this.visibleListItems(), activePreference, reverse) as ContentState;
    if (nextPreference) {
      this.contentViewModel.switchContent(nextPreference);
    }
  };

  openPreferencesAccount = async (): Promise<void> => {
    await this.teamRepository.getTeam();

    this.switchList(ListViewModel.STATE.PREFERENCES);
    this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  };

  readonly openPreferencesDevices = (): void => {
    this.switchList(ListViewModel.STATE.PREFERENCES);
    return this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_DEVICES);
  };

  readonly openPreferencesAbout = (): void => {
    this.switchList(ListViewModel.STATE.PREFERENCES);
    return this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_ABOUT);
  };

  readonly openPreferencesAudioVideo = (): void => {
    this.switchList(ListViewModel.STATE.PREFERENCES);
    return this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_AV);
  };

  readonly openPreferencesOptions = (): void => {
    this.switchList(ListViewModel.STATE.PREFERENCES);
    return this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_OPTIONS);
  };

  readonly openStartUI = (): void => {
    this.switchList(ListViewModel.STATE.START_UI);
  };

  readonly switchList = (newListState: string, respectLastState = true): void => {
    const isStateChange = this.state() !== newListState;
    if (isStateChange) {
      this.hideList();
      this.updateList(newListState, respectLastState);
      this.showList(newListState);
    }
  };

  readonly openConversations = (): void => {
    const newState = this.isActivatedAccount()
      ? ListViewModel.STATE.CONVERSATIONS
      : ListViewModel.STATE.TEMPORARY_GUEST;
    this.switchList(newState, false);
  };

  private readonly hideList = (): void => {
    document.removeEventListener('keydown', this.onKeyDownListView);
  };

  private readonly showList = (newListState: string): void => {
    this.state(newListState);
    this.lastUpdate(Date.now());

    document.addEventListener('keydown', this.onKeyDownListView);
  };

  private readonly updateList = (newListState: string, respectLastState: boolean): void => {
    switch (newListState) {
      case ListViewModel.STATE.PREFERENCES:
        amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.PREFERENCES_ACCOUNT);
        break;
      default:
        if (respectLastState) {
          this.contentViewModel.switchPreviousContent();
        }
    }
  };

  readonly showTemporaryGuest = (): void => {
    this.switchList(ListViewModel.STATE.TEMPORARY_GUEST);
    const conversationEntity = this.conversationRepository.getMostRecentConversation();
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, {});
  };

  readonly onContextMenu = (conversationEntity: Conversation, event: MouseEvent): void => {
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

    showContextMenu(event, entries, 'conversation-list-options-menu');
  };

  readonly clickToArchive = (conversationEntity = this.conversationState.activeConversation()): void => {
    if (this.isActivatedAccount()) {
      this.actionsViewModel.archiveConversation(conversationEntity);
    }
  };

  clickToBlock = async (conversationEntity: Conversation): Promise<void> => {
    const userEntity = conversationEntity.firstUserEntity();
    const hideConversation = this.shouldHideConversation(conversationEntity);
    const nextConversationEntity = this.conversationRepository.getNextConversation(conversationEntity);
    await this.actionsViewModel.blockUser(userEntity, hideConversation, nextConversationEntity);
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
      if (!this.conversationState.conversations_archived().length) {
        this.switchList(ListViewModel.STATE.CONVERSATIONS);
      }
    });
  };

  private readonly shouldHideConversation = (conversationEntity: Conversation): boolean => {
    const isStateConversations = this.state() === ListViewModel.STATE.CONVERSATIONS;
    const isActiveConversation = this.conversationState.isActiveConversation(conversationEntity);

    return isStateConversations && isActiveConversation;
  };
}
