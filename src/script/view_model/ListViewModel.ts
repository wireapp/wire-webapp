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

import {t} from 'Util/LocalizerUtil';
import {iterateItem} from 'Util/ArrayUtil';
import {isEscapeKey} from 'Util/KeyboardUtil';

import {ArchiveViewModel} from './list/ArchiveViewModel';
import {ConversationListViewModel} from './list/ConversationListViewModel';
import {PreferencesListViewModel} from './list/PreferencesListViewModel';
import {StartUIViewModel} from './list/StartUIViewModel';
import {TakeoverViewModel} from './list/TakeoverViewModel';
import {TemporaryGuestViewModel} from './list/TemporaryGuestViewModel';

import {Context} from '../ui/ContextMenu';
import {showLabelContextMenu} from '../ui/LabelContextMenu';
import {Shortcut} from '../ui/Shortcut';
import {ShortcutType} from '../ui/ShortcutType';
import {ContentViewModel} from './ContentViewModel';
import {DefaultLabelIds} from '../conversation/ConversationLabelRepository';
import {ModalsViewModel} from './ModalsViewModel';
import {PanelViewModel} from './PanelViewModel';
import type {MainViewModel, ViewModelRepositories} from './MainViewModel';
import type {CallingRepository} from '../calling/CallingRepository';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {TeamRepository} from '../team/TeamRepository';
import type {ActionsViewModel} from './ActionsViewModel';
import type {Conversation} from '../entity/Conversation';
import type {ClientEntity} from '../client/ClientEntity';
import type {User} from '../entity/User';
import type {AssetRemoteData} from '../assets/AssetRemoteData';
import {Runtime} from '@wireapp/commons';
import {UserState} from '../user/UserState';
import {container} from 'tsyringe';
import {TeamState} from '../team/TeamState';
import {ConversationState} from '../conversation/ConversationState';

export class ListViewModel {
  private readonly userState: UserState;
  private readonly teamState: TeamState;
  private readonly conversationState: ConversationState;

  readonly preferences: PreferencesListViewModel;
  readonly takeover: TakeoverViewModel;
  readonly temporaryGuest: TemporaryGuestViewModel;
  readonly selfUserPicture: ko.PureComputed<AssetRemoteData | void>;
  readonly ModalType: typeof ListViewModel.MODAL_TYPE;
  readonly isActivatedAccount: ko.PureComputed<boolean>;
  readonly webappLoaded: ko.Observable<boolean>;
  readonly state: ko.Observable<string>;
  readonly lastUpdate: ko.Observable<number>;
  private readonly elementId: 'left-column';

  private readonly conversationRepository: ConversationRepository;
  private readonly callingRepository: CallingRepository;
  private readonly teamRepository: TeamRepository;
  private readonly actionsViewModel: ActionsViewModel;
  private readonly contentViewModel: ContentViewModel;
  private readonly panelViewModel: PanelViewModel;
  private readonly isProAccount: ko.PureComputed<boolean>;
  private readonly selfUser: ko.Observable<User>;
  private readonly modal: ko.Observable<string>;
  private readonly visibleListItems: ko.PureComputed<(string | Conversation)[]>;
  private readonly archive: ArchiveViewModel;
  private readonly conversations: ConversationListViewModel;
  private readonly start: StartUIViewModel;

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

  constructor(mainViewModel: MainViewModel, repositories: ViewModelRepositories) {
    this.userState = container.resolve(UserState);
    this.teamState = container.resolve(TeamState);
    this.conversationState = container.resolve(ConversationState);

    this.elementId = 'left-column';
    this.conversationRepository = repositories.conversation;
    this.callingRepository = repositories.calling;
    this.teamRepository = repositories.team;

    this.actionsViewModel = mainViewModel.actions;
    this.contentViewModel = mainViewModel.content;
    this.panelViewModel = mainViewModel.panel;

    this.isActivatedAccount = this.userState.isActivatedAccount;
    this.isProAccount = this.teamState.isTeam;
    this.selfUser = this.userState.self;

    this.ModalType = ListViewModel.MODAL_TYPE;

    // State
    this.state = ko.observable(ListViewModel.STATE.CONVERSATIONS);
    this.lastUpdate = ko.observable();
    this.modal = ko.observable();
    this.webappLoaded = ko.observable(false);

    this.selfUserPicture = ko.pureComputed((): AssetRemoteData | void => {
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

        if (!Runtime.isDesktopApp()) {
          preferenceItems.push(ContentViewModel.STATE.PREFERENCES_ABOUT);
        }

        return preferenceItems;
      }

      const hasConnectRequests = !!this.userState.connectRequests().length;
      const states: (string | Conversation)[] = hasConnectRequests ? [ContentViewModel.STATE.CONNECTION_REQUESTS] : [];
      return states.concat(this.conversationState.conversations_unarchived());
    });

    // Nested view models
    this.archive = new ArchiveViewModel(this, repositories.conversation, this.answerCall);
    this.conversations = new ConversationListViewModel(
      mainViewModel,
      this,
      this.answerCall,
      repositories.event,
      repositories.calling,
      repositories.conversation,
      repositories.preferenceNotification,
      repositories.properties,
    );
    this.preferences = new PreferencesListViewModel(this.contentViewModel, this, repositories.calling);
    this.start = new StartUIViewModel(
      mainViewModel,
      this,
      repositories.conversation,
      repositories.integration,
      repositories.search,
      repositories.team,
      repositories.user,
    );
    this.takeover = new TakeoverViewModel(this, repositories.user, repositories.conversation);
    this.temporaryGuest = new TemporaryGuestViewModel(mainViewModel, repositories.calling, repositories.team);

    this._initSubscriptions();

    ko.applyBindings(this, document.getElementById(this.elementId));
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

  answerCall = (conversationEntity: Conversation): void => {
    const call = this.callingRepository.findCall(conversationEntity.id);
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

  changeNotificationSetting = () => {
    if (this.isProAccount()) {
      this.panelViewModel.togglePanel(PanelViewModel.STATE.NOTIFICATIONS, undefined);
    } else {
      this.clickToToggleMute();
    }
  };

  goToNext = () => {
    this.iterateActiveItem(true);
  };

  goToPrevious = () => {
    this.iterateActiveItem(false);
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
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, nextItem);
    }
  };

  private readonly iterateActivePreference = (reverse: boolean) => {
    let activePreference = this.contentViewModel.state();

    const isDeviceDetails = activePreference === ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS;
    if (isDeviceDetails) {
      activePreference = ContentViewModel.STATE.PREFERENCES_DEVICES;
    }

    const nextPreference = iterateItem(this.visibleListItems(), activePreference, reverse) as string;
    if (nextPreference) {
      this.contentViewModel.switchContent(nextPreference);
    }
  };

  openPreferencesAccount = async (): Promise<void> => {
    await this.teamRepository.getTeam();

    if (this.isActivatedAccount()) {
      this.dismissModal();
    }

    this.switchList(ListViewModel.STATE.PREFERENCES);
    this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_ACCOUNT);
  };

  openPreferencesDevices = (deviceEntity?: ClientEntity): void => {
    this.switchList(ListViewModel.STATE.PREFERENCES);

    if (deviceEntity) {
      this.contentViewModel.preferencesDeviceDetails.device(deviceEntity);
      return this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS);
    }

    return this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_DEVICES);
  };

  openPreferencesAbout = (): void => {
    this.switchList(ListViewModel.STATE.PREFERENCES);
    return this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_ABOUT);
  };

  openPreferencesAudioVideo = (): void => {
    this.switchList(ListViewModel.STATE.PREFERENCES);
    return this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_AV);
  };

  openPreferencesOptions = (): void => {
    this.switchList(ListViewModel.STATE.PREFERENCES);
    return this.contentViewModel.switchContent(ContentViewModel.STATE.PREFERENCES_OPTIONS);
  };

  openStartUI = (): void => {
    this.switchList(ListViewModel.STATE.START_UI);
  };

  switchList = (newListState: string, respectLastState = true): void => {
    const isStateChange = this.state() !== newListState;
    if (isStateChange) {
      this.hideList();
      this.updateList(newListState, respectLastState);
      this.showList(newListState);
    }
  };

  openConversations = (): void => {
    const newState = this.isActivatedAccount()
      ? ListViewModel.STATE.CONVERSATIONS
      : ListViewModel.STATE.TEMPORARY_GUEST;
    this.switchList(newState, false);
  };

  private readonly hideList = (): void => {
    const stateIsStartUI = this.state() === ListViewModel.STATE.START_UI;
    if (stateIsStartUI) {
      this.start.resetView();
    }

    const listStateElementId = this.getElementIdOfList(this.state());
    $(`#${listStateElementId}`).removeClass('left-list-is-visible');
    $(document).off('keydown.listView');
  };

  private readonly showList = (newListState: string): void => {
    const listStateElementId = this.getElementIdOfList(newListState);
    $(`#${listStateElementId}`).addClass('left-list-is-visible');

    this.state(newListState);
    this.lastUpdate(Date.now());

    $(document).on('keydown.listView', keyboardEvent => {
      if (isEscapeKey((keyboardEvent as unknown) as KeyboardEvent)) {
        const newState = this.isActivatedAccount()
          ? ListViewModel.STATE.CONVERSATIONS
          : ListViewModel.STATE.TEMPORARY_GUEST;
        this.switchList(newState);
      }
    });
  };

  private readonly updateList = (newListState: string, respectLastState: boolean): void => {
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
  };

  private readonly getElementIdOfList = (listState: string) => {
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
  };

  dismissModal = (): void => {
    this.modal(undefined);
  };

  showTakeover = (): void => {
    this.modal(ListViewModel.MODAL_TYPE.TAKEOVER);
  };

  showTemporaryGuest = (): void => {
    this.switchList(ListViewModel.STATE.TEMPORARY_GUEST);
    this.modal(ListViewModel.MODAL_TYPE.TEMPORARY_GUEST);
    const conversationEntity = this.conversationRepository.getMostRecentConversation();
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity);
  };

  onContextMenu = (conversationEntity: Conversation, event: MouseEvent): void => {
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
  };

  clickToArchive = (conversationEntity = this.conversationState.activeConversation()): void => {
    if (this.isActivatedAccount()) {
      this.actionsViewModel.archiveConversation(conversationEntity);
    }
  };

  clickToBlock = async (conversationEntity: Conversation): Promise<void> => {
    const userEntity = conversationEntity.firstUserEntity();
    const hideConversation = this.shouldHideConversation(conversationEntity);
    const nextConversationEntity = this.conversationRepository.get_next_conversation(conversationEntity);
    await this.actionsViewModel.blockUser(userEntity, hideConversation, nextConversationEntity);
  };

  clickToCancelRequest = (conversationEntity: Conversation): void => {
    const userEntity = conversationEntity.firstUserEntity();
    const hideConversation = this.shouldHideConversation(conversationEntity);
    const nextConversationEntity = this.conversationRepository.get_next_conversation(conversationEntity);

    this.actionsViewModel.cancelConnectionRequest(userEntity, hideConversation, nextConversationEntity);
  };

  clickToClear = (conversationEntity = this.conversationState.activeConversation()): void => {
    this.actionsViewModel.clearConversation(conversationEntity);
  };

  clickToLeave = (conversationEntity: Conversation): void => {
    this.actionsViewModel.leaveConversation(conversationEntity);
  };

  clickToToggleMute = (conversationEntity = this.conversationState.activeConversation()): void => {
    this.actionsViewModel.toggleMuteConversation(conversationEntity);
  };

  clickToOpenNotificationSettings = (conversationEntity = this.conversationState.activeConversation()): void => {
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, {openNotificationSettings: true});
  };

  clickToUnarchive = (conversationEntity: Conversation): void => {
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
