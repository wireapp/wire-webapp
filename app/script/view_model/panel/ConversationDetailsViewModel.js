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

'use strict';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.panel = z.viewModel.panel || {};

z.viewModel.panel.ConversationDetailsViewModel = class ConversationDetailsViewModel {
  constructor(mainViewModel, panelViewModel, repositories) {
    this.clickOnShowParticipant = this.clickOnShowParticipant.bind(this);

    this.elementId = 'conversation-details';
    this.mainViewModel = mainViewModel;
    this.panelViewModel = panelViewModel;

    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.panel.ConversationDetailsViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.isTeam = this.teamRepository.isTeam;
    this.isTeamOnly = this.panelViewModel.isTeamOnly;
    this.showIntegrations = this.panelViewModel.showIntegrations;

    this.serviceParticipants = ko.observableArray();
    this.userParticipants = ko.observableArray();

    this.hasConversation = ko.pureComputed(() => !!this.conversationEntity());
    this.isVisible = ko.pureComputed(() => this.hasConversation() && this.panelViewModel.conversationDetailsVisible());

    this.availabilityLabel = ko.pureComputed(() => {
      if (this.conversationEntity() || this.conversationEntity().is_one2one()) {
        const user = this.conversationEntity().firstUserEntity();
        const availabilitySetToNone = user.availability() === z.user.AvailabilityType.NONE;
        if (!availabilitySetToNone) {
          return z.user.AvailabilityMapper.nameFromType(user.availability());
        }
      }
    });

    ko.computed(() => {
      if (this.hasConversation()) {
        this.serviceParticipants.removeAll();
        this.userParticipants.removeAll();

        this.conversationEntity()
          .participating_user_ets()
          .sort((userA, userB) => z.util.StringUtil.sort_by_priority(userA.first_name(), userB.first_name()))
          .map(userEntity => {
            if (userEntity.isBot) {
              return this.serviceParticipants.push(userEntity);
            }
            this.userParticipants.push(userEntity);
          });
      }
    });

    this.isActiveParticipant = ko.pureComputed(() => {
      if (this.hasConversation()) {
        return !this.conversationEntity().removed_from_conversation() && !this.conversationEntity().is_guest();
      }
    });

    this.isNameEditable = ko.pureComputed(() => {
      if (this.hasConversation()) {
        return this.conversationEntity().is_group() && !this.conversationEntity().removed_from_conversation();
      }
    });

    this.isEditingName = ko.observable(false);
    this.isEditingName.subscribe(value => {
      if (!value) {
        const name = $('.group-header .name span');
        return $('.group-header textarea').css('height', `${name.height()}px`);
      }
      $('.group-header textarea').val(this.conversationEntity().display_name());
    });

    this.participantsUserText = ko.pureComputed(() => {
      const hasMultipleParticipants = this.userParticipants().length > 1;
      return hasMultipleParticipants
        ? z.string.conversationDetailsParticipantsUsersMany
        : z.string.conversationDetailsParticipantsUsersOne;
    });
    this.participantsServiceText = ko.pureComputed(() => {
      const hasMultipleParticipants = this.serviceParticipants().length > 1;
      return hasMultipleParticipants
        ? z.string.conversationDetailsParticipantsServicesMany
        : z.string.conversationDetailsParticipantsServicesOne;
    });
    this.guestOptionsText = ko.pureComputed(() => {
      return this.isTeamOnly() ? z.string.conversationDetailsGuestsOff : z.string.conversationDetailsGuestsOn;
    });

    this.shouldUpdateScrollbar = ko.computed(() => true).extend({notify: 'always', rateLimit: 500});

    const addPeopleshortcut = z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.ADD_PEOPLE);
    this.addPeopleTooltip = ko.pureComputed(() => {
      return z.l10n.text(z.string.tooltipPeopleAddPeople, addPeopleshortcut);
    });
  }

  clickOnAddParticipants() {
    this.panelViewModel.switchState(z.viewModel.PanelViewModel.STATE.ADD_PARTICIPANTS);
  }

  clickOnCreateGroup() {
    const userEntity = this.conversationEntity().firstUserEntity();
    amplify.publish(z.event.WebApp.CONVERSATION.CREATE_GROUP, 'conversation_details', userEntity);
  }

  clickOnGuestOptions() {
    this.panelViewModel.switchState(z.viewModel.PanelViewModel.STATE.GUEST_OPTIONS);
  }

  clickOnShowParticipant(userEntity) {
    this.panelViewModel.showGroupParticipant(userEntity);
  }

  clickToArchive() {
    this.conversationRepository.archive_conversation(this.conversationEntity());
  }

  clickToBlock() {
    const nextConversationEntity = this.conversationRepository.get_next_conversation(this.conversationEntity());
    const userEntity = this.conversationEntity().firstUserEntity();

    if (userEntity) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
        action: () => {
          this.userRepository.block_user(userEntity, nextConversationEntity);
        },
        text: {
          action: z.l10n.text(z.string.modalUserBlockAction),
          message: z.l10n.text(z.string.modalUserBlockMessage, userEntity.first_name()),
          title: z.l10n.text(z.string.modalUserBlockHeadline),
        },
      });
    }
  }

  clickToCancelRequest() {
    const nextConversationEntity = this.conversationRepository.get_next_conversation(this.conversationEntity());
    const userEntity = this.conversationEntity().firstUserEntity();

    if (userEntity) {
      amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
        action: () => this.userRepository.cancel_connection_request(userEntity, nextConversationEntity),
        text: {
          action: z.l10n.text(z.string.modalConnectCancelAction),
          message: z.l10n.text(z.string.modalConnectCancelMessage, userEntity.first_name()),
          secondary: z.l10n.text(z.string.modalConnectCancelSecondary),
          title: z.l10n.text(z.string.modalConnectCancelHeadline),
        },
      });
    }
  }

  clickToClear() {
    const conversationEntity = this.conversationEntity();
    const canLeaveConversation = conversationEntity.is_group() && !conversationEntity.removed_from_conversation();
    const modalType = canLeaveConversation
      ? z.viewModel.ModalsViewModel.TYPE.OPTION
      : z.viewModel.ModalsViewModel.TYPE.CONFIRM;

    amplify.publish(z.event.WebApp.WARNING.MODAL, modalType, {
      action: (leaveConversation = false) => {
        this.conversationRepository.clear_conversation(conversationEntity, leaveConversation);
      },
      text: {
        action: z.l10n.text(z.string.modalConversationClearAction),
        message: z.l10n.text(z.string.modalConversationClearMessage),
        option: z.l10n.text(z.string.modalConversationClearOption),
        title: z.l10n.text(z.string.modalConversationClearHeadline),
      },
    });
  }

  clickToEditGroupName() {
    if (this.isNameEditable()) {
      this.isEditingName(true);
    }
  }

  clickToLeave() {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => {
        this.conversationRepository.removeMember(this.conversationEntity(), this.userRepository.self().id);
      },
      text: {
        action: z.l10n.text(z.string.modalConversationLeaveAction),
        message: z.l10n.text(z.string.modalConversationLeaveMessage),
        title: z.l10n.text(z.string.modalConversationLeaveHeadline, this.conversationEntity().display_name()),
      },
    });
  }

  clickToToggleMute() {
    this.conversationRepository.toggle_silence_conversation(this.conversationEntity());
  }

  renameConversation(data, event) {
    const currentConversationName = this.conversationEntity()
      .display_name()
      .trim();

    const newConversationName = z.util.StringUtil.remove_line_breaks(event.target.value.trim());

    const hasNameChanged = newConversationName.length && newConversationName !== currentConversationName;
    if (hasNameChanged) {
      event.target.value = currentConversationName;
      this.isEditingName(false);
      this.conversationRepository.rename_conversation(this.conversationEntity(), newConversationName);
    }
  }
};
