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

import ko from 'knockout';
import {amplify} from 'amplify';
import {RECEIPT_MODE} from '@wireapp/api-client/src/conversation/data/';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Logger, getLogger} from 'Util/Logger';
import {t} from 'Util/LocalizerUtil';
import {formatDuration} from 'Util/TimeUtil';
import {removeLineBreaks, sortUsersByPriority} from 'Util/StringUtil';

import {BasePanelViewModel, PanelViewModelProps} from './BasePanelViewModel';
import {getNotificationText} from '../../conversation/NotificationSetting';
import {ConversationVerificationState} from '../../conversation/ConversationVerificationState';
import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import type {IntegrationRepository} from '../../integration/IntegrationRepository';
import type {SearchRepository} from '../../search/SearchRepository';
import type {TeamRepository} from '../../team/TeamRepository';
import type {ActionsViewModel} from '../ActionsViewModel';
import type {ServiceEntity} from '../../integration/ServiceEntity';
import type {User} from '../../entity/User';
import type {Conversation} from '../../entity/Conversation';

import 'Components/receiptModeToggle';
import 'Components/panel/panelActions';
import {PanelViewModel} from '../PanelViewModel';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';
import {TeamState} from '../../team/TeamState';

export class ConversationDetailsViewModel extends BasePanelViewModel {
  private readonly userState: UserState;
  private readonly teamState: TeamState;

  conversationRepository: ConversationRepository;
  integrationRepository: IntegrationRepository;
  searchRepository: SearchRepository;
  teamRepository: TeamRepository;
  ConversationRepository: typeof ConversationRepository;
  actionsViewModel: ActionsViewModel;
  logger: Logger;
  isActivatedAccount: ko.PureComputed<boolean>;
  isTeam: ko.PureComputed<boolean>;
  isTeamOnly: ko.PureComputed<boolean>;
  serviceParticipants: ko.ObservableArray<ServiceEntity>;
  userParticipants: ko.ObservableArray<User>;
  showAllUsersCount: ko.Observable<number>;
  selectedService: ko.Observable<ServiceEntity>;
  isSelfVerified: ko.PureComputed<boolean>;
  firstParticipant: ko.PureComputed<User>;
  isActiveGroupParticipant: ko.PureComputed<boolean>;
  isVerified: ko.PureComputed<boolean>;
  isEditingName: ko.Observable<boolean>;
  isServiceMode: ko.PureComputed<boolean>;
  showTopActions: ko.PureComputed<boolean>;
  showSectionOptions: ko.PureComputed<boolean>;
  showActionAddParticipants: ko.PureComputed<boolean>;
  showActionMute: ko.PureComputed<boolean>;
  showOptionGuests: ko.PureComputed<boolean>;
  showOptionReadReceipts: ko.PureComputed<boolean>;
  hasReceiptsEnabled: ko.PureComputed<boolean>;
  hasAdvancedNotifications: ko.PureComputed<boolean>;
  showOptionNotificationsGroup: ko.PureComputed<boolean>;
  showOptionNotifications1To1: ko.PureComputed<boolean>;
  showOptionTimedMessages: ko.PureComputed<boolean>;
  canRenameGroup: ko.PureComputed<boolean>;
  participantsUserText: ko.PureComputed<string>;
  participantsServiceText: ko.PureComputed<string>;
  guestOptionsText: ko.PureComputed<string>;
  notificationStatusText: ko.PureComputed<string>;
  timedMessagesText: ko.PureComputed<string>;
  addPeopleTooltip: ko.PureComputed<string>;
  isSelfGroupAdmin: ko.PureComputed<boolean>;

  static get CONFIG() {
    return {
      MAX_USERS_VISIBLE: 7,
      REDUCED_USERS_COUNT: 5,
    };
  }

  constructor(params: PanelViewModelProps) {
    super(params);
    this.clickOnShowService = this.clickOnShowService.bind(this);
    this.clickOnShowUser = this.clickOnShowUser.bind(this);

    const {mainViewModel, repositories} = params;

    this.userState = container.resolve(UserState);
    this.teamState = container.resolve(TeamState);

    const {conversation, integration, search, team} = repositories;
    this.conversationRepository = conversation;
    this.integrationRepository = integration;
    this.searchRepository = search;
    this.teamRepository = team;

    this.ConversationRepository = ConversationRepository;

    this.actionsViewModel = mainViewModel.actions;

    this.logger = getLogger('ConversationDetailsViewModel');

    this.isActivatedAccount = this.userState.isActivatedAccount;
    this.isTeam = this.teamState.isTeam;

    this.isTeamOnly = ko.pureComputed(() => this.activeConversation()?.isTeamOnly());

    this.serviceParticipants = ko.observableArray();
    this.userParticipants = ko.observableArray();
    this.showAllUsersCount = ko.observable(0);
    this.selectedService = ko.observable();
    this.isSelfVerified = ko.pureComputed(() => this.userState.self()?.is_verified());

    const roleRepository = this.conversationRepository.conversationRoleRepository;

    ko.computed(() => {
      if (this.activeConversation()) {
        const users: User[] = [];
        const services: ServiceEntity[] = [];

        this.activeConversation()
          .participating_user_ets()
          .forEach((userEntity: ServiceEntity | User) => {
            if ((userEntity as User).isService) {
              return services.push(userEntity as ServiceEntity);
            }
            return users.push(userEntity as User);
          });

        this.serviceParticipants(services);
        if (!this.activeConversation().removed_from_conversation()) {
          users.push(this.activeConversation().selfUser());
          users.sort(sortUsersByPriority);
        }

        const userCount = users.length;
        const exceedsMaxUserCount = userCount > ConversationDetailsViewModel.CONFIG.MAX_USERS_VISIBLE;
        this.showAllUsersCount(exceedsMaxUserCount ? userCount : 0);
        this.userParticipants(users);
      }
    });

    this.firstParticipant = ko.pureComputed(() => this.activeConversation()?.firstUserEntity());

    this.isActiveGroupParticipant = ko.pureComputed(() => {
      return !!(this.activeConversation()?.isGroup() && !this.activeConversation().removed_from_conversation());
    });

    this.isVerified = ko.pureComputed(() => {
      return this.activeConversation()?.verification_state() === ConversationVerificationState.VERIFIED;
    });

    this.isEditingName = ko.observable(false);

    this.isEditingName.subscribe((isEditing: boolean) => {
      if (isEditing) {
        return window.setTimeout(() => $('.conversation-details__name--input').focus(), 0);
      }
      const name = $('.conversation-details__name--input');
      return $('.conversation-details__name').css('height', `${name.height()}px`);
    });

    this.isServiceMode = ko.pureComputed(
      () => this.isSingleUserMode(this.activeConversation()) && this.firstParticipant()?.isService,
    );

    this.showTopActions = ko.pureComputed(() => this.isActiveGroupParticipant() || this.showSectionOptions());

    this.showActionAddParticipants = ko.pureComputed(
      () => this.isActiveGroupParticipant() && roleRepository.canAddParticipants(this.activeConversation()),
    );

    this.showActionMute = ko.pureComputed(() => this.activeConversation()?.isMutable() && !this.isTeam());

    this.showOptionGuests = ko.pureComputed(() => {
      return (
        this.isActiveGroupParticipant() &&
        this.activeConversation().team_id &&
        roleRepository.canToggleGuests(this.activeConversation())
      );
    });

    this.showOptionReadReceipts = ko.pureComputed(
      () => !!this.activeConversation().team_id && roleRepository.canToggleReadReceipts(this.activeConversation()),
    );

    this.hasReceiptsEnabled = ko.pureComputed(() => {
      return this.conversationRepository.expectReadReceipt(this.activeConversation());
    });

    this.hasAdvancedNotifications = ko.pureComputed(() => this.activeConversation()?.isMutable() && this.isTeam());

    this.showOptionNotificationsGroup = ko.pureComputed(() => {
      return this.hasAdvancedNotifications() && this.activeConversation().isGroup();
    });

    this.showOptionNotifications1To1 = ko.pureComputed(() => {
      return this.hasAdvancedNotifications() && !this.activeConversation().isGroup();
    });

    this.showOptionTimedMessages = ko.pureComputed(
      () => this.isActiveGroupParticipant() && roleRepository.canToggleTimeout(this.activeConversation()),
    );

    this.showSectionOptions = ko.pureComputed(() => {
      return this.showOptionGuests() || this.showOptionNotificationsGroup() || this.showOptionTimedMessages();
    });

    this.canRenameGroup = ko.pureComputed(() => roleRepository.canRenameGroup(this.activeConversation()));

    this.participantsUserText = ko.pureComputed(() => {
      const hasMultipleParticipants = this.userParticipants().length > 1;
      return hasMultipleParticipants
        ? t('conversationDetailsParticipantsUsersMany')
        : t('conversationDetailsParticipantsUsersOne');
    });

    this.participantsServiceText = ko.pureComputed(() => {
      const hasMultipleParticipants = this.serviceParticipants().length > 1;
      return hasMultipleParticipants
        ? t('conversationDetailsParticipantsServicesMany')
        : t('conversationDetailsParticipantsServicesOne');
    });

    this.guestOptionsText = ko.pureComputed(() => {
      return this.isTeamOnly() ? t('conversationDetailsGuestsOff') : t('conversationDetailsGuestsOn');
    });

    this.notificationStatusText = ko.pureComputed(() => {
      return this.activeConversation() ? getNotificationText(this.activeConversation().notificationState()) : '';
    });

    this.timedMessagesText = ko.pureComputed(() => {
      if (this.activeConversation()) {
        const hasTimer = this.activeConversation().messageTimer() && this.activeConversation().hasGlobalMessageTimer();
        if (hasTimer) {
          return formatDuration(this.activeConversation().messageTimer()).text;
        }
      }
      return t('ephemeralUnitsNone');
    });

    const addPeopleShortcut = Shortcut.getShortcutTooltip(ShortcutType.ADD_PEOPLE);
    this.addPeopleTooltip = ko.pureComputed(() => {
      return t('tooltipConversationDetailsAddPeople', addPeopleShortcut);
    });

    this.isSelfGroupAdmin = ko.pureComputed(() =>
      this.conversationRepository.conversationRoleRepository.isSelfGroupAdmin(this.activeConversation()),
    );

    this.isServiceMode.subscribe(async (isService: boolean) => {
      if (isService) {
        const entity = this.firstParticipant();
        const serviceEntity = await this.integrationRepository.getServiceFromUser(entity);
        this.selectedService(serviceEntity);
        this.integrationRepository.addProviderNameToParticipant(serviceEntity);
      }
    });
  }

  isSingleUserMode = (conversationEntity: Conversation): boolean =>
    conversationEntity && (conversationEntity.is1to1() || conversationEntity.isRequest());

  getConversationActions(
    conversationEntity: Conversation,
  ): {click: () => void; icon: string; identifier: string; label: string}[] {
    if (!conversationEntity) {
      return [];
    }
    const roleRepository = this.conversationRepository.conversationRoleRepository;

    const is1to1 = conversationEntity.is1to1();
    const isSingleUserMode = this.isSingleUserMode(conversationEntity);

    const allMenuElements = [
      {
        condition: () => window.z.userPermission().canCreateGroupConversation() && is1to1 && !this.isServiceMode(),
        item: {
          click: () => this.clickOnCreateGroup(),
          icon: 'group-icon',
          identifier: 'go-create-group',
          label: t('conversationDetailsActionCreateGroup'),
        },
      },
      {
        condition: () => true,
        item: {
          click: () => this.clickToArchive(),
          icon: 'archive-icon',
          identifier: 'do-archive',
          label: t('conversationDetailsActionArchive'),
        },
      },
      {
        condition: () => conversationEntity.isRequest(),
        item: {
          click: () => this.clickToCancelRequest(),
          icon: 'close-icon',
          identifier: 'do-cancel-request',
          label: t('conversationDetailsActionCancelRequest'),
        },
      },
      {
        condition: () => conversationEntity.isClearable(),
        item: {
          click: () => this.clickToClear(),
          icon: 'eraser-icon',
          identifier: 'do-clear',
          label: t('conversationDetailsActionClear'),
        },
      },
      {
        condition: () => {
          const firstUser = conversationEntity.firstUserEntity();
          return isSingleUserMode && firstUser && (firstUser.isConnected() || firstUser.isRequest());
        },
        item: {
          click: () => this.clickToBlock(),
          icon: 'block-icon',
          identifier: 'do-block',
          label: t('conversationDetailsActionBlock'),
        },
      },
      {
        condition: () => conversationEntity.isLeavable() && roleRepository.canLeaveGroup(conversationEntity),
        item: {
          click: () => this.clickToLeave(),
          icon: 'leave-icon',
          identifier: 'do-leave',
          label: t('conversationDetailsActionLeave'),
        },
      },
      {
        condition: () =>
          !isSingleUserMode &&
          this.isTeam() &&
          roleRepository.canDeleteGroup(conversationEntity) &&
          conversationEntity.isCreatedBySelf(),
        item: {
          click: () => this.clickToDelete(),
          icon: 'delete-icon',
          identifier: 'do-delete',
          label: t('conversationDetailsActionDelete'),
        },
      },
    ];

    return allMenuElements.filter(menuElement => menuElement.condition()).map(menuElement => menuElement.item);
  }

  getElementId(): string {
    return 'conversation-details';
  }

  clickOnAddParticipants(): void {
    this.navigateTo(PanelViewModel.STATE.ADD_PARTICIPANTS);
  }

  clickOnShowAll(): void {
    this.navigateTo(PanelViewModel.STATE.CONVERSATION_PARTICIPANTS);
  }

  clickOnCreateGroup(): void {
    amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details', this.firstParticipant());
  }

  clickOnDevices(): void {
    this.navigateTo(PanelViewModel.STATE.PARTICIPANT_DEVICES, {entity: this.firstParticipant()});
  }

  clickOnGuestOptions(): void {
    this.navigateTo(PanelViewModel.STATE.GUEST_OPTIONS);
  }

  clickOnTimedMessages(): void {
    this.navigateTo(PanelViewModel.STATE.TIMED_MESSAGES);
  }

  clickOnNotifications(): void {
    this.navigateTo(PanelViewModel.STATE.NOTIFICATIONS);
  }

  clickOnShowUser(userEntity: User): void {
    this.navigateTo(PanelViewModel.STATE.GROUP_PARTICIPANT_USER, {entity: userEntity});
  }

  clickOnShowService(serviceEntity: ServiceEntity): void {
    this.navigateTo(PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE, {entity: serviceEntity});
  }

  clickToArchive(): void {
    this.actionsViewModel.archiveConversation(this.activeConversation());
  }

  clickToBlock(): void {
    if (this.activeConversation()) {
      const userEntity = this.activeConversation().firstUserEntity();
      const nextConversationEntity = this.conversationRepository.get_next_conversation(this.activeConversation());

      this.actionsViewModel.blockUser(userEntity, true, nextConversationEntity);
    }
  }

  clickToCancelRequest(): void {
    if (this.activeConversation()) {
      const userEntity = this.activeConversation().firstUserEntity();
      const nextConversationEntity = this.conversationRepository.get_next_conversation(this.activeConversation());

      this.actionsViewModel.cancelConnectionRequest(userEntity, true, nextConversationEntity);
    }
  }

  clickToClear(): void {
    this.actionsViewModel.clearConversation(this.activeConversation());
  }

  clickToEditGroupName(): void {
    if (this.isActiveGroupParticipant()) {
      this.isEditingName(true);
    }
  }

  clickToLeave(): void {
    this.actionsViewModel.leaveConversation(this.activeConversation());
  }

  clickToDelete(): void {
    this.actionsViewModel.deleteConversation(this.activeConversation());
  }

  clickToToggleMute(): void {
    this.actionsViewModel.toggleMuteConversation(this.activeConversation());
  }

  renameConversation(_: ConversationDetailsViewModel, event: KeyboardEvent): void {
    if (this.activeConversation()) {
      const target = event.target as HTMLInputElement;
      const currentConversationName = this.activeConversation().display_name().trim();

      const newConversationName = removeLineBreaks(target.value.trim());

      this.isEditingName(false);
      const hasNameChanged = newConversationName.length && newConversationName !== currentConversationName;
      if (hasNameChanged) {
        target.value = currentConversationName;
        this.conversationRepository.renameConversation(this.activeConversation(), newConversationName);
      }
    }
  }

  updateConversationReceiptMode = (conversationEntity: Conversation, receiptMode: RECEIPT_MODE): void => {
    this.conversationRepository.updateConversationReceiptMode(conversationEntity, {receipt_mode: receiptMode});
  };

  initView(): void {
    if (this.teamState.isTeam() && this.isSingleUserMode(this.activeConversation())) {
      this.teamRepository.updateTeamMembersByIds(this.teamState.team(), [this.firstParticipant().id], true);
    }
  }
}
