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
    this.elementId = 'participants';
    this.mainViewModel = mainViewModel;
    this.panelViewModel = panelViewModel;

    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.panel.ConversationDetailsViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.enableIntegrations = this.integrationRepository.enableIntegrations;
    this.isTeam = this.teamRepository.isTeam;

    this.serviceParticipants = ko.observableArray();
    this.userParticipants = ko.observableArray();

    this.conversationEntity.subscribe(() => this.resetView());
    this.hasConversation = ko.pureComputed(() => Boolean(this.conversationEntity()));

    this.isTeamOnly = ko.pureComputed(() => this.conversationEntity() && this.conversationEntity().isTeamOnly());
    this.showIntegrations = ko.pureComputed(() => {
      if (this.hasConversation()) {
        const firstUserEntity = this.conversationEntity().firstUserEntity();
        const hasBotUser = firstUserEntity && firstUserEntity.isBot;
        const allowIntegrations = this.conversationEntity().is_group() || hasBotUser;
        return this.enableIntegrations() && allowIntegrations && !this.isTeamOnly();
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

    // Switch between div and input field to edit the conversation name
    this.isEditable = ko.pureComputed(() => !this.conversationEntity().removed_from_conversation());
    this.isEditing = ko.observable(false);
    this.isEditing.subscribe(value => {
      if (!value) {
        const name = $('.group-header .name span');
        return $('.group-header textarea').css('height', `${name.height()}px`);
      }
      $('.group-header textarea').val(this.conversationEntity().display_name());
    });

    this.addActionText = ko.pureComputed(() => {
      return this.showIntegrations() ? z.string.people_button_add : z.string.people_button_add_people;
    });

    this.shouldUpdateScrollbar = ko
      .computed(() => this.services() && this.selectedContacts() && this.stateAddPeople() && this.stateAddService())
      .extend({notify: 'always', rateLimit: 500});

    const shortcut = z.ui.Shortcut.get_shortcut_tooltip(z.ui.ShortcutType.ADD_PEOPLE);
    this.addPeopleTooltip = ko.pureComputed(() => {
      const identifier = this.showIntegrations() ? z.string.tooltip_people_add : z.string.tooltip_people_add_people;
      return z.l10n.text(identifier, shortcut);
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
    this.showGroupParticipant(userEntity);
  }

  clickToArchive() {
    this.conversationRepository.archive_conversation(this.conversationEntity());
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
  clickToToggleMuteState() {
    this.conversationRepository.toggle_silence_conversation(this.conversationEntity());
  }

  clickToEditGroupName() {
    if (this.isEditable()) {
      this.isEditing(true);
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

  renameConversation(data, event) {
    const currentConversationName = this.conversationEntity()
      .display_name()
      .trim();
    const newConversationName = z.util.StringUtil.remove_line_breaks(event.target.value.trim());

    if (newConversationName.length && newConversationName !== currentConversationName) {
      event.target.value = currentConversationName;
      this.isEditing(false);
      this.conversationRepository.rename_conversation(this.conversationEntity(), newConversationName);
    }
  }

  showGroupParticipant(userEntity) {
    this.panelViewModel.showGroupParticipant(userEntity);
  }
};
