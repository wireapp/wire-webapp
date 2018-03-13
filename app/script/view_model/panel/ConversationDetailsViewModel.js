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

    this.actionsViewModel = this.mainViewModel.actions;
    this.conversationEntity = this.conversationRepository.active_conversation;
    this.isTeam = this.teamRepository.isTeam;
    this.isTeamOnly = this.panelViewModel.isTeamOnly;
    this.showIntegrations = this.panelViewModel.showIntegrations;

    this.serviceParticipants = ko.observableArray();
    this.userParticipants = ko.observableArray();

    this.hasConversation = ko.pureComputed(() => !!this.conversationEntity());
    this.isVisible = ko.pureComputed(() => this.hasConversation() && this.panelViewModel.conversationDetailsVisible());

    this.availabilityLabel = ko.pureComputed(() => {
      if (this.isVisible() && this.isTeam() && this.conversationEntity().is_one2one()) {
        const userEntity = this.conversationEntity().firstUserEntity();
        const availabilitySetToNone = userEntity.availability() === z.user.AvailabilityType.NONE;

        if (!availabilitySetToNone) {
          return z.user.AvailabilityMapper.nameFromType(userEntity.availability());
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

    this.isSingleUserMode = ko.pureComputed(() => {
      if (this.hasConversation()) {
        return this.conversationEntity().is_one2one() || this.conversationEntity().is_request();
      }
    });
    this.userName = ko.pureComputed(() => {
      if (this.hasConversation()) {
        const userEntity = this.conversationEntity().firstUserEntity();
        return userEntity.username();
      }
    });

    this.isGuest = ko.pureComputed(() => {
      return (
        this.hasConversation() &&
        this.isSingleUserMode() &&
        this.conversationEntity()
          .firstUserEntity()
          .is_guest()
      );
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

    this.isVerified = ko.pureComputed(() => {
      if (this.hasConversation()) {
        return this.conversationEntity().verification_state() === z.conversation.ConversationVerificationState.VERIFIED;
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

    this.showActionAddParticipants = ko.pureComputed(() => this.conversationEntity().is_group());
    this.showActionBlock = ko.pureComputed(() => {
      if (this.isSingleUserMode()) {
        const userEntity = this.conversationEntity().firstUserEntity();
        return userEntity.is_connected() || userEntity.is_request();
      }
    });
    this.showActionCreateGroup = ko.pureComputed(() => this.conversationEntity().is_one2one());
    this.showActionCancelRequest = ko.pureComputed(() => this.conversationEntity().is_request());
    this.showActionClear = ko.pureComputed(() => {
      return !this.conversationEntity().is_request() && !this.conversationEntity().is_cleared();
    });
    this.showActionDevices = ko.pureComputed(() => {
      if (this.conversationEntity().is_one2one()) {
        const userEntity = this.conversationEntity().firstUserEntity();
        return userEntity.is_connected() || userEntity.is_team_member();
      }
    });
    this.showActionGuestOptions = ko.pureComputed(() => this.conversationEntity().inTeam());
    this.showActionLeave = ko.pureComputed(() => {
      return this.conversationEntity().is_group() && !this.conversationEntity().removed_from_conversation();
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

    this.shouldUpdateScrollbar = ko
      .computed(() => this.serviceParticipants() && this.userParticipants() && this.isVisible())
      .extend({notify: 'always', rateLimit: 500});

    const addPeopleShortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.ADD_PEOPLE);
    this.addPeopleTooltip = ko.pureComputed(() => {
      return z.l10n.text(z.string.tooltipConversationDetailsAddPeople, addPeopleShortcut);
    });
  }

  clickOnAddParticipants() {
    this.panelViewModel.switchState(z.viewModel.PanelViewModel.STATE.ADD_PARTICIPANTS, false, true);
  }

  clickOnClose() {
    this.panelViewModel.closePanel();
  }

  clickOnCreateGroup() {
    const userEntity = this.conversationEntity().firstUserEntity();
    amplify.publish(z.event.WebApp.CONVERSATION.CREATE_GROUP, 'conversation_details', userEntity);
  }

  clickOnDevices() {
    const userEntity = this.conversationEntity().firstUserEntity();
    this.panelViewModel.showParticipantDevices(userEntity);
  }

  clickOnGuestOptions() {
    this.panelViewModel.switchState(z.viewModel.PanelViewModel.STATE.GUEST_OPTIONS);
  }

  clickOnShowParticipant(userEntity) {
    this.panelViewModel.showGroupParticipant(userEntity);
  }

  clickToArchive() {
    this.actionsViewModel.archiveConversation(this.conversationEntity());
  }

  clickToBlock() {
    const userEntity = this.conversationEntity().firstUserEntity();
    const nextConversationEntity = this.conversationRepository.get_next_conversation(this.conversationEntity());

    this.actionsViewModel.blockUser(userEntity, true, nextConversationEntity);
  }

  clickToCancelRequest() {
    const userEntity = this.conversationEntity().firstUserEntity();
    const nextConversationEntity = this.conversationRepository.get_next_conversation(this.conversationEntity());

    this.actionsViewModel.cancelConnectionRequest(userEntity, true, nextConversationEntity);
  }

  clickToClear() {
    this.actionsViewModel.clearConversation(this.conversationEntity());
  }

  clickToEditGroupName() {
    if (this.isNameEditable()) {
      this.isEditingName(true);
    }
  }

  clickToLeave() {
    this.actionsViewModel.leaveConversation(this.conversationEntity());
  }

  clickToToggleMute() {
    this.actionsViewModel.toggleMuteConversation(this.conversationEntity());
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
