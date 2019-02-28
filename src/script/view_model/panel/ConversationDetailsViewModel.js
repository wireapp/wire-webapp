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

import Logger from 'utils/Logger';

/* eslint-disable no-unused-vars */
import receiptModeToggle from 'components/receiptModeToggle';
/* eslint-enable no-unused-vars */
import BasePanelViewModel from './BasePanelViewModel';
import {t} from 'utils/LocalizerUtil';
import TimeUtil from 'utils/TimeUtil';

import '../../components/panel/panelActions';

export default class ConversationDetailsViewModel extends BasePanelViewModel {
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

    this.actionsViewModel = mainViewModel.actions;

    this.logger = new Logger('z.viewModel.panel.ConversationDetailsViewModel', z.config.LOGGER.OPTIONS);

    this.isActivatedAccount = this.userRepository.isActivatedAccount;
    this.isTeam = this.teamRepository.isTeam;

    this.isTeamOnly = ko.pureComputed(() => this.activeConversation() && this.activeConversation().isTeamOnly());

    this.serviceParticipants = ko.observableArray();
    this.userParticipants = ko.observableArray();
    this.showAllUsersCount = ko.observable(0);
    this.selectedService = ko.observable();

    ko.computed(() => {
      if (this.activeConversation()) {
        this.serviceParticipants.removeAll();
        this.userParticipants.removeAll();

        this.activeConversation()
          .participating_user_ets()
          .map(userEntity => {
            if (userEntity.isService) {
              return this.serviceParticipants.push(userEntity);
            }
            this.userParticipants.push(userEntity);
          });

        const userCount = this.userParticipants().length;
        const exceedsMaxUserCount = userCount > ConversationDetailsViewModel.CONFIG.MAX_USERS_VISIBLE;
        if (exceedsMaxUserCount) {
          this.userParticipants.splice(ConversationDetailsViewModel.CONFIG.REDUCED_USERS_COUNT);
        }
        this.showAllUsersCount(exceedsMaxUserCount ? userCount : 0);
      }
    });

    this.firstParticipant = ko.pureComputed(() => {
      return this.activeConversation() && this.activeConversation().firstUserEntity();
    });

    this.isSingleUserMode = conversationEntity => {
      return conversationEntity && (conversationEntity.is1to1() || conversationEntity.isRequest());
    };

    this.isActiveGroupParticipant = ko.pureComputed(() => {
      return this.activeConversation()
        ? this.activeConversation().isGroup() && this.activeConversation().isActiveParticipant()
        : false;
    });

    this.isVerified = ko.pureComputed(() => {
      return this.activeConversation()
        ? this.activeConversation().verification_state() === z.conversation.ConversationVerificationState.VERIFIED
        : false;
    });

    this.isEditingName = ko.observable(false);

    this.isEditingName.subscribe(isEditing => {
      if (isEditing) {
        return window.setTimeout(() => $('.conversation-details__name--input').focus(), 0);
      }
      const name = $('.conversation-details__name--input');
      $('.conversation-details__name').css('height', `${name.height()}px`);
    });

    this.isServiceMode = ko.pureComputed(() => {
      return (
        this.isSingleUserMode(this.activeConversation()) && this.firstParticipant() && this.firstParticipant().isService
      );
    });

    this.showTopActions = ko.pureComputed(() => this.isActiveGroupParticipant() || this.showSectionOptions());

    this.showActionAddParticipants = this.isActiveGroupParticipant;

    this.showActionMute = ko.pureComputed(() => {
      return this.activeConversation() && this.activeConversation().isMutable() && !this.isTeam();
    });

    this.showOptionGuests = ko.pureComputed(() => {
      return this.isActiveGroupParticipant() && this.activeConversation().inTeam();
    });

    this.showOptionReadReceipts = ko.pureComputed(() => this.activeConversation().inTeam());

    this.hasReceiptsEnabled = ko.pureComputed(() => {
      return this.conversationRepository.expectReadReceipt(this.activeConversation());
    });

    this.hasAdvancedNotifications = ko.pureComputed(() => {
      return this.activeConversation() && this.activeConversation().isMutable() && this.isTeam();
    });

    this.showOptionNotificationsGroup = ko.pureComputed(() => {
      return this.hasAdvancedNotifications() && this.activeConversation().isGroup();
    });

    this.showOptionNotifications1To1 = ko.pureComputed(() => {
      return this.hasAdvancedNotifications() && !this.activeConversation().isGroup();
    });

    this.showOptionTimedMessages = this.isActiveGroupParticipant;

    this.showSectionOptions = ko.pureComputed(() => {
      return this.showOptionGuests() || this.showOptionNotificationsGroup() || this.showOptionTimedMessages();
    });

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
      return this.activeConversation()
        ? z.conversation.NotificationSetting.getText(this.activeConversation().notificationState())
        : '';
    });

    this.timedMessagesText = ko.pureComputed(() => {
      if (this.activeConversation()) {
        const hasTimer = this.activeConversation().messageTimer() && this.activeConversation().hasGlobalMessageTimer();
        if (hasTimer) {
          return TimeUtil.formatDuration(this.activeConversation().messageTimer()).text;
        }
      }
      return t('ephemeralUnitsNone');
    });

    const addPeopleShortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.ADD_PEOPLE);
    this.addPeopleTooltip = ko.pureComputed(() => {
      return t('tooltipConversationDetailsAddPeople', addPeopleShortcut);
    });

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
          icon: 'delete-icon',
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
        condition: () => conversationEntity.isLeavable(),
        item: {
          click: () => this.clickToLeave(),
          icon: 'leave-icon',
          identifier: 'do-leave',
          label: t('conversationDetailsActionLeave'),
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
    amplify.publish(z.event.WebApp.CONVERSATION.CREATE_GROUP, 'conversation_details', this.firstParticipant());
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

  clickToToggleMute() {
    this.actionsViewModel.toggleMuteConversation(this.activeConversation());
  }

  renameConversation(data, event) {
    if (this.activeConversation()) {
      const currentConversationName = this.activeConversation()
        .display_name()
        .trim();

      const newConversationName = z.util.StringUtil.removeLineBreaks(event.target.value.trim());

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
