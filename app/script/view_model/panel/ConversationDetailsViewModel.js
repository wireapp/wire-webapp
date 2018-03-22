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
    this.clickOnShowService = this.clickOnShowService.bind(this);
    this.clickOnShowUser = this.clickOnShowUser.bind(this);

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
        const userAvailability = this.firstParticipant() && this.firstParticipant().availability();
        const availabilitySetToNone = userAvailability === z.user.AvailabilityType.NONE;

        if (!availabilitySetToNone) {
          return z.user.AvailabilityMapper.nameFromType(userAvailability);
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

    this.firstParticipant = ko.pureComputed(() => {
      return this.conversationEntity() && this.conversationEntity().firstUserEntity();
    });
    this.isSingleUserMode = ko.pureComputed(() => {
      if (this.hasConversation()) {
        return this.conversationEntity().is_one2one() || this.conversationEntity().is_request();
      }
    });
    this.userName = ko.pureComputed(() => (this.firstParticipant() ? this.firstParticipant().username() : ''));

    this.isGuest = ko.pureComputed(() => {
      return this.isSingleUserMode() && this.firstParticipant() && this.firstParticipant().isGuest();
    });

    this.isActiveParticipant = ko.pureComputed(() => {
      return this.conversationEntity() ? this.conversationEntity().isActiveParticipant() : false;
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
      if (this.isSingleUserMode() && this.firstParticipant()) {
        return this.firstParticipant().is_connected() || this.firstParticipant().is_request();
      }
    });
    this.showActionCreateGroup = ko.pureComputed(() => this.conversationEntity().is_one2one());
    this.showActionCancelRequest = ko.pureComputed(() => this.conversationEntity().is_request());
    this.showActionClear = ko.pureComputed(() => {
      return !this.conversationEntity().is_request() && !this.conversationEntity().is_cleared();
    });
    this.showActionDevices = ko.pureComputed(() => {
      if (this.conversationEntity().is_one2one() && this.firstParticipant()) {
        return this.firstParticipant().is_connected() || this.firstParticipant().isTeamMember();
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
      .extend({notify: 'always', rateLimit: {method: 'notifyWhenChangesStop', timeout: 0}});

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
    amplify.publish(z.event.WebApp.CONVERSATION.CREATE_GROUP, 'conversation_details', this.firstParticipant());
  }

  clickOnDevices() {
    this.panelViewModel.showParticipantDevices(this.firstParticipant());
  }

  clickOnGuestOptions() {
    this.panelViewModel.switchState(z.viewModel.PanelViewModel.STATE.GUEST_OPTIONS);
  }

  clickOnShowUser(userEntity) {
    this.panelViewModel.showGroupParticipantUser(userEntity);
  }

  clickOnShowService(serviceEntity) {
    this.panelViewModel.showGroupParticipantService(serviceEntity);
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
