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
import {formatDuration} from 'Util/TimeUtil';
import {removeLineBreaks, sortByPriority} from 'Util/StringUtil';

import 'Components/receiptModeToggle';
import {BasePanelViewModel} from './BasePanelViewModel';

import {getNotificationText} from '../../conversation/NotificationSetting';
import {ConversationVerificationState} from '../../conversation/ConversationVerificationState';
import {WebAppEvents} from '../../event/WebApp';
import {Shortcut} from '../../ui/Shortcut';
import {ShortcutType} from '../../ui/ShortcutType';
import {ConversationRepository} from '../../conversation/ConversationRepository';

import 'Components/panel/panelActions';

export class ConversationDetailsViewModel extends BasePanelViewModel {
  static get CONFIG() {
    return {
      MAX_USERS_VISIBLE: 7,
      REDUCED_USERS_COUNT: 5,
    };
  }

  constructor(params) {
    super(params);
    this.clickOnShowService = this.clickOnShowService.bind(this);
    this.clickOnShowUser = this.clickOnShowUser.bind(this);
    this.updateConversationReceiptMode = this.updateConversationReceiptMode.bind(this);

    const {mainViewModel, repositories} = params;

    const {conversation, integration, search, team, user} = repositories;
    this.conversationRepository = conversation;
    this.integrationRepository = integration;
    this.searchRepository = search;
    this.teamRepository = team;
    this.userRepository = user;

    this.ConversationRepository = ConversationRepository;

    this.actionsViewModel = mainViewModel.actions;

    this.logger = getLogger('z.viewModel.panel.ConversationDetailsViewModel');

    this.isActivatedAccount = this.userRepository.isActivatedAccount;
    this.isTeam = this.teamRepository.isTeam;

    this.isTeamOnly = ko.pureComputed(() => this.activeConversation()?.isTeamOnly());

    this.serviceParticipants = ko.observableArray();
    this.userParticipants = ko.observableArray();
    this.showAllUsersCount = ko.observable(0);
    this.selectedService = ko.observable();

    const roleRepository = this.conversationRepository.conversationRoleRepository;

    ko.computed(() => {
      if (this.activeConversation()) {
        const users = [];
        const services = [];

        this.activeConversation()
          .participating_user_ets()
          .forEach(userEntity => {
            if (userEntity.isService) {
              return services.push(userEntity);
            }
            users.push(userEntity);
          });

        this.serviceParticipants(services);
        if (!this.activeConversation().removed_from_conversation()) {
          users.push(this.activeConversation().selfUser());
          users.sort((userA, userB) => sortByPriority(userA.first_name(), userB.first_name()));
        }

        const userCount = users.length;
        const exceedsMaxUserCount = userCount > ConversationDetailsViewModel.CONFIG.MAX_USERS_VISIBLE;
        this.showAllUsersCount(exceedsMaxUserCount ? userCount : 0);
        this.userParticipants(users);
      }
    });

    this.firstParticipant = ko.pureComputed(() => this.activeConversation()?.firstUserEntity());

    this.isSingleUserMode = conversationEntity => {
      return conversationEntity && (conversationEntity.is1to1() || conversationEntity.isRequest());
    };

    this.isActiveGroupParticipant = ko.pureComputed(() => {
      return !!(this.activeConversation()?.isGroup() && !this.activeConversation().removed_from_conversation());
    });

    this.isVerified = ko.pureComputed(() => {
      return this.activeConversation()?.verification_state() === ConversationVerificationState.VERIFIED;
    });

    this.isEditingName = ko.observable(false);

    this.isEditingName.subscribe(isEditing => {
      if (isEditing) {
        return window.setTimeout(() => $('.conversation-details__name--input').focus(), 0);
      }
      const name = $('.conversation-details__name--input');
      $('.conversation-details__name').css('height', `${name.height()}px`);
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

    this.isServiceMode.subscribe(isService => {
      if (isService) {
        const entity = this.firstParticipant();
        this.integrationRepository.getServiceFromUser(entity).then(serviceEntity => {
          this.selectedService(serviceEntity);
          this.integrationRepository.addProviderNameToParticipant(serviceEntity);
        });
      }
    });
  }

  getConversationActions(conversationEntity) {
    if (!conversationEntity) {
      return [];
    }
    const roleRepository = this.conversationRepository.conversationRoleRepository;

    const is1to1 = conversationEntity.is1to1();
    const isSingleUserMode = this.isSingleUserMode(conversationEntity);

    const allMenuElements = [
      {
        condition: () => z.userPermission().canCreateGroupConversation() && is1to1 && !this.isServiceMode(),
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

  getElementId() {
    return 'conversation-details';
  }

  clickOnAddParticipants() {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.ADD_PARTICIPANTS);
  }

  clickOnShowAll() {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.CONVERSATION_PARTICIPANTS);
  }

  clickOnCreateGroup() {
    amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'conversation_details', this.firstParticipant());
  }

  clickOnDevices() {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.PARTICIPANT_DEVICES, {entity: this.firstParticipant()});
  }

  clickOnGuestOptions() {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.GUEST_OPTIONS);
  }

  clickOnTimedMessages() {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.TIMED_MESSAGES);
  }

  clickOnNotifications() {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.NOTIFICATIONS);
  }

  clickOnShowUser(userEntity) {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.GROUP_PARTICIPANT_USER, {entity: userEntity});
  }

  clickOnShowService(serviceEntity) {
    this.navigateTo(z.viewModel.PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE, {entity: serviceEntity});
  }

  clickToArchive() {
    this.actionsViewModel.archiveConversation(this.activeConversation());
  }

  clickToBlock() {
    if (this.activeConversation()) {
      const userEntity = this.activeConversation().firstUserEntity();
      const nextConversationEntity = this.conversationRepository.get_next_conversation(this.activeConversation());

      this.actionsViewModel.blockUser(userEntity, true, nextConversationEntity);
    }
  }

  clickToCancelRequest() {
    if (this.activeConversation()) {
      const userEntity = this.activeConversation().firstUserEntity();
      const nextConversationEntity = this.conversationRepository.get_next_conversation(this.activeConversation());

      this.actionsViewModel.cancelConnectionRequest(userEntity, true, nextConversationEntity);
    }
  }

  clickToClear() {
    this.actionsViewModel.clearConversation(this.activeConversation());
  }

  clickToEditGroupName() {
    if (this.isActiveGroupParticipant()) {
      this.isEditingName(true);
    }
  }

  clickToLeave() {
    this.actionsViewModel.leaveConversation(this.activeConversation());
  }

  clickToDelete() {
    this.actionsViewModel.deleteConversation(this.activeConversation());
  }

  clickToToggleMute() {
    this.actionsViewModel.toggleMuteConversation(this.activeConversation());
  }

  renameConversation(data, event) {
    if (this.activeConversation()) {
      const currentConversationName = this.activeConversation()
        .display_name()
        .trim();

      const newConversationName = removeLineBreaks(event.target.value.trim());

      this.isEditingName(false);
      const hasNameChanged = newConversationName.length && newConversationName !== currentConversationName;
      if (hasNameChanged) {
        event.target.value = currentConversationName;
        this.conversationRepository.renameConversation(this.activeConversation(), newConversationName);
      }
    }
  }

  updateConversationReceiptMode(conversationEntity, receiptMode) {
    this.conversationRepository.updateConversationReceiptMode(conversationEntity, receiptMode);
  }
}
