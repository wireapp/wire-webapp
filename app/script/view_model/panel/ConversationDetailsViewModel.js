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

z.viewModel.panel.ConversationDetailsViewModel = class ConversationDetailsViewModel extends z.viewModel.panel
  .BasePanelViewModel {
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

    this.conversationRepository = this.repositories.conversation;
    this.integrationRepository = this.repositories.integration;
    this.searchRepository = params.repositories.search;
    this.teamRepository = this.repositories.team;

    this.logger = new z.util.Logger('z.viewModel.panel.ConversationDetailsViewModel', z.config.LOGGER.OPTIONS);

    this.isActivatedAccount = this.mainViewModel.isActivatedAccount;
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

    this.isSingleUserMode = ko.pureComputed(() => {
      return this.activeConversation()
        ? this.activeConversation().is_one2one() || this.activeConversation().is_request()
        : false;
    });

    this.isActiveParticipant = ko.pureComputed(() => {
      return this.activeConversation() && this.activeConversation().isActiveParticipant();
    });

    this.isNameEditable = ko.pureComputed(() => {
      return this.activeConversation()
        ? this.activeConversation().is_group() && this.activeConversation().isActiveParticipant()
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
      return this.isSingleUserMode() && this.firstParticipant() && this.firstParticipant().isService;
    });

    this.showActionAddParticipants = ko.pureComputed(() => {
      return this.activeConversation() && this.activeConversation().is_group();
    });

    this.showActionBlock = ko.pureComputed(() => {
      if (this.isSingleUserMode() && this.firstParticipant()) {
        return this.firstParticipant().is_connected() || this.firstParticipant().is_request();
      }
    });

    this.showActionCreateGroup = ko.pureComputed(() => {
      return this.activeConversation() && this.activeConversation().is_one2one() && !this.isServiceMode();
    });

    this.showActionCancelRequest = ko.pureComputed(() => {
      return this.activeConversation() && this.activeConversation().is_request();
    });

    this.showActionClear = ko.pureComputed(() => {
      return this.activeConversation()
        ? !this.activeConversation().is_request() && !this.activeConversation().is_cleared()
        : false;
    });

    this.showActionLeave = ko.pureComputed(() => {
      return this.activeConversation()
        ? this.activeConversation().is_group() && !this.activeConversation().removed_from_conversation()
        : false;
    });

    this.showActionGuestOptions = ko.pureComputed(() => {
      return this.activeConversation() && this.activeConversation().inTeam();
    });

    this.showActionTimedMessages = ko.pureComputed(() => {
      return this.activeConversation()
        ? this.activeConversation().is_group() && !this.activeConversation().isGuest()
        : false;
    });

    this.showSectionOptions = ko.pureComputed(() => this.showActionGuestOptions() || this.showActionTimedMessages());

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

    this.timedMessagesText = ko.pureComputed(() => {
      const conversation = this.activeConversation();
      const hasMessageTimeSet = conversation && conversation.messageTimer() && conversation.hasGlobalMessageTimer();
      return hasMessageTimeSet
        ? z.util.TimeUtil.formatDuration(conversation.messageTimer()).text
        : z.l10n.text(z.string.ephemeralUnitsNone);
    });

    const addPeopleShortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.ADD_PEOPLE);
    this.addPeopleTooltip = ko.pureComputed(() => {
      return z.l10n.text(z.string.tooltipConversationDetailsAddPeople, addPeopleShortcut);
    });

    this.shouldUpdateScrollbar = ko
      .computed(() => this.serviceParticipants() && this.userParticipants() && this.isVisible())
      .extend({notify: 'always', rateLimit: {method: 'notifyWhenChangesStop', timeout: 0}});

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
    if (this.isNameEditable()) {
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
};
