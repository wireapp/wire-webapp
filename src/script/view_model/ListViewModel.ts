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

import {CONV_TYPE} from '@wireapp/avs';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {isEscapeKey} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import type {ActionsViewModel} from './ActionsViewModel';
import {CallingViewModel} from './CallingViewModel';
import type {MainViewModel, ViewModelRepositories} from './MainViewModel';

import type {CallingRepository} from '../calling/CallingRepository';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import {ConversationState} from '../conversation/ConversationState';
import type {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';
import {ContentState, ListState, useAppState} from '../page/useAppState';
import {PropertiesRepository} from '../properties/PropertiesRepository';
import {SearchRepository} from '../search/SearchRepository';
import type {TeamRepository} from '../team/TeamRepository';
import {TeamState} from '../team/TeamState';
import {showContextMenu} from '../ui/ContextMenu';
import {showLabelContextMenu} from '../ui/LabelContextMenu';
import {Shortcut} from '../ui/Shortcut';
import {ShortcutType} from '../ui/ShortcutType';
import {UserState} from '../user/UserState';

export class ListViewModel {
  private readonly userState: UserState;
  private readonly teamState: TeamState;
  private readonly conversationState: ConversationState;

  readonly isActivatedAccount: ko.PureComputed<boolean>;
  readonly lastUpdate: ko.Observable<number>;
  readonly isFederated: boolean;
  readonly repositories: ViewModelRepositories;

  public readonly mainViewModel: MainViewModel;
  public readonly conversationRepository: ConversationRepository;
  public readonly propertiesRepository: PropertiesRepository;
  private readonly callingRepository: CallingRepository;
  public readonly teamRepository: TeamRepository;
  public readonly searchRepository: SearchRepository;
  private readonly actionsViewModel: ActionsViewModel;
  public readonly callingViewModel: CallingViewModel;
  private readonly isProAccount: ko.PureComputed<boolean>;
  public readonly selfUser: ko.Observable<User>;

  constructor(mainViewModel: MainViewModel, repositories: ViewModelRepositories) {
    this.userState = container.resolve(UserState);
    this.teamState = container.resolve(TeamState);
    this.conversationState = container.resolve(ConversationState);

    this.mainViewModel = mainViewModel;
    this.isFederated = mainViewModel.isFederated;
    this.repositories = repositories;
    this.conversationRepository = repositories.conversation;
    this.callingRepository = repositories.calling;
    this.teamRepository = repositories.team;
    this.propertiesRepository = repositories.properties;
    this.searchRepository = repositories.search;

    this.actionsViewModel = mainViewModel.actions;
    this.callingViewModel = mainViewModel.calling;

    this.isActivatedAccount = this.userState.isActivatedAccount;
    this.isProAccount = this.teamState.isTeam;
    this.selfUser = this.userState.self;

    // State
    this.lastUpdate = ko.observable();

    this._initSubscriptions();
  }

  private readonly _initSubscriptions = () => {
    amplify.subscribe(WebAppEvents.CONVERSATION.SHOW, this.openConversations);
    amplify.subscribe(WebAppEvents.PREFERENCES.MANAGE_ACCOUNT, this.openPreferencesAccount);
    amplify.subscribe(WebAppEvents.PREFERENCES.MANAGE_DEVICES, this.openPreferencesDevices);
    amplify.subscribe(WebAppEvents.PREFERENCES.SHOW_AV, this.openPreferencesAudioVideo);
    amplify.subscribe(WebAppEvents.SEARCH.SHOW, this.openStartUI);
  };

  readonly answerCall = (conversationEntity: Conversation): void => {
    const call = this.callingRepository.findCall(conversationEntity.qualifiedId);

    if (!call) {
      return;
    }

    if (call.conversationType === CONV_TYPE.CONFERENCE && !this.callingRepository.supportsConferenceCalling) {
      PrimaryModal.show(PrimaryModal.type.ACKNOWLEDGE, {
        text: {
          message: `${t('modalConferenceCallNotSupportedMessage')} ${t('modalConferenceCallNotSupportedJoinMessage')}`,
          title: t('modalConferenceCallNotSupportedHeadline'),
        },
      });
    } else {
      this.callingRepository.answerCall(call);
    }
  };

  onKeyDownListView = (keyboardEvent: KeyboardEvent) => {
    if (isEscapeKey(keyboardEvent)) {
      const newState = this.isActivatedAccount() ? ListState.CONVERSATIONS : ListState.TEMPORARY_GUEST;
      this.switchList(newState);
    }
  };

  openPreferencesAccount = async (): Promise<void> => {
    await this.teamRepository.getTeam();

    this.switchList(ListState.PREFERENCES);
  };

  readonly openPreferencesDevices = (): void => {
    this.switchList(ListState.PREFERENCES);
  };

  readonly openPreferencesAbout = (): void => {
    this.switchList(ListState.PREFERENCES);
  };

  readonly openPreferencesAudioVideo = (): void => {
    this.switchList(ListState.PREFERENCES);
  };

  readonly openPreferencesOptions = (): void => {
    this.switchList(ListState.PREFERENCES);
  };

  readonly openStartUI = (): void => {
    this.switchList(ListState.START_UI);
  };

  readonly switchList = (newListState: ListState, respectLastState = true): void => {
    const {listState} = useAppState.getState();
    const isStateChange = listState !== newListState;

    if (isStateChange) {
      this.hideList();
      this.updateList(newListState, respectLastState);
      this.showList(newListState);
    }
  };

  readonly openConversations = (): void => {
    const newState = this.isActivatedAccount() ? ListState.CONVERSATIONS : ListState.TEMPORARY_GUEST;
    this.switchList(newState, false);
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

  private readonly updateList = (newListState: ListState, respectLastState: boolean): void => {
    switch (newListState) {
      case ListState.PREFERENCES:
        const {setContentState} = useAppState.getState();
        setContentState(ContentState.PREFERENCES_ACCOUNT);
        break;
      default:
        if (respectLastState) {
          // TODO: Will be moved in ListViewModel refactor
          amplify.publish('SWITCH_PREVIOUS_CONTENT');
        }
    }
  };

  readonly showTemporaryGuest = (): void => {
    this.switchList(ListState.TEMPORARY_GUEST);
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
    if (this.isActivatedAccount() && conversationEntity) {
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
    if (conversationEntity) {
      this.actionsViewModel.clearConversation(conversationEntity);
    }
  };

  readonly clickToLeave = (conversationEntity: Conversation): void => {
    this.actionsViewModel.leaveConversation(conversationEntity);
  };

  readonly clickToToggleMute = (conversationEntity = this.conversationState.activeConversation()): void => {
    if (conversationEntity) {
      this.actionsViewModel.toggleMuteConversation(conversationEntity);
    }
  };

  readonly clickToOpenNotificationSettings = (
    conversationEntity = this.conversationState.activeConversation(),
  ): void => {
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity, {openNotificationSettings: true});
  };

  readonly clickToUnarchive = (conversationEntity: Conversation): void => {
    this.conversationRepository.unarchiveConversation(conversationEntity, true, 'manual un-archive').then(() => {
      if (!this.conversationState.conversations_archived().length) {
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
