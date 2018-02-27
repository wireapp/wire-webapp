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

z.viewModel.panel.AppParticipantsViewModel = class AppParticipantsViewModel {
  static get CONFIG() {
    return {
      ADD_STATES: [AppParticipantsViewModel.STATE.ADD_PEOPLE, AppParticipantsViewModel.STATE.ADD_SERVICE],
      SERVICE_STATES: [
        AppParticipantsViewModel.STATE.SERVICE_CONFIRMATION,
        AppParticipantsViewModel.STATE.SERVICE_DETAILS,
      ],
    };
  }

  static get STATE() {
    return {
      ADD_PEOPLE: 'AppParticipantsViewModel.STATE.ADD_PEOPLE',
      ADD_SERVICE: 'AppParticipantsViewModel.STATE.ADD_SERVICE',
      SERVICE_CONFIRMATION: 'AppParticipantsViewModel.STATE.SERVICE_CONFIRMATION',
      SERVICE_DETAILS: 'AppParticipantsViewModel.STATE.SERVICE_DETAILS',
    };
  }

  constructor(mainViewModel, panelViewModel, repositories) {
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.panel.AppParticipantsViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = this.conversationRepository.active_conversation;

    this.activeAddState = ko.pureComputed(() => AppParticipantsViewModel.CONFIG.ADD_STATES.includes(this.state()));
    this.activeServiceState = ko.pureComputed(() => {
      return AppParticipantsViewModel.CONFIG.SERVICE_STATES.includes(this.state());
    });

    this.stateAddPeople = ko.pureComputed(() => this.state() === AppParticipantsViewModel.STATE.ADD_PEOPLE);
    this.stateAddService = ko.pureComputed(() => this.state() === AppParticipantsViewModel.STATE.ADD_SERVICE);
    this.stateParticipants = ko.pureComputed(() => this.state() === AppParticipantsViewModel.STATE.PARTICIPANTS);
    this.stateServiceConfirmation = ko.pureComputed(() => {
      return this.state() === AppParticipantsViewModel.STATE.SERVICE_CONFIRMATION;
    });
    this.stateServiceDetails = ko.pureComputed(() => {
      return this.state() === AppParticipantsViewModel.STATE.SERVICE_DETAILS;
    });

    this.enableIntegrations = this.integrationRepository.enableIntegrations;
    this.showIntegrations = ko.pureComputed(() => {
      const firstUserEntity = this.conversationEntity().firstUserEntity();
      const hasBotUser = firstUserEntity && firstUserEntity.isBot;
      const allowIntegrations = this.conversationEntity().is_group() || hasBotUser;
      return this.enableIntegrations() && allowIntegrations && !this.isTeamOnly();
    });

    this.searchInput = ko.observable('');
    this.searchInput.subscribe(searchInput => this.searchServices(searchInput));
    this.isSearching = ko.pureComputed(() => this.searchInput().length);

    this.selectedContacts = ko.observableArray([]);
    this.contacts = ko.pureComputed(() => {
      let userEntities = [];

      if (!this.isTeam()) {
        userEntities = this.userRepository.connected_users();
      }

      if (this.isTeamOnly()) {
        userEntities = this.teamMembers().sort((userA, userB) => {
          return z.util.StringUtil.sort_by_priority(userA.first_name(), userB.first_name());
        });
      } else {
        userEntities = this.teamUsers();
      }

      return userEntities.filter(userEntity => {
        return !this.conversationEntity.participating_user_ids().find(id => userEntity.id === id);
      });
    });

    this.isTeam = this.teamRepository.isTeam;
    this.team = this.teamRepository.team;
    this.teamUsers = this.teamRepository.teamUsers;
    this.teamMembers = this.teamRepository.teamMembers;

    this.isTeamOnly = ko.pureComputed(() => this.conversationEntity() && this.conversationEntity.isTeamOnly());

    this.services = this.integrationRepository.services;

    this.showServiceRemove = ko.pureComputed(() => {
      return this.stateServiceDetails() && !this.conversationEntity().is_guest() && this.selectedIsInConversation();
    });
  }

  clickOnAddService() {
    this.state(ConversationDetailsViewModel.STATE.ADD_SERVICE);
    this.searchServices(this.searchInput());
  }

  clickOnCloseAdding() {
    this.resetView();
  }

  clickOnSelectService(serviceEntity) {
    this.groupMode(true);
    this.selectedService(serviceEntity);
    this.state(ConversationDetailsViewModel.STATE.SERVICE_CONFIRMATION);

    this.integrationRepository.getProviderNameForService(serviceEntity);
  }

  clickToAddMembers() {
    if (this.conversationEntity().is_group()) {
      this.conversationRepository.addMembers(this.conversationEntity(), this.selectedContacts());
    }
    this.resetView();
  }

  clickToAddService() {
    this.integrationRepository
      .addService(this.conversationEntity(), this.selectedService(), 'conversation_details')
      .then(() => this.resetView());
  }

  resetView() {
    this.state(ConversationDetailsViewModel.STATE.PARTICIPANTS);
    this.selectedContacts.removeAll();
    this.searchInput('');
    this.selectedParticipant(undefined);
  }

  clickOnCreateGroup() {
    if (this.conversationEntity().is_group()) {
      this.state(ConversationDetailsViewModel.STATE.ADD_PEOPLE);
      return $('.participants-search').addClass('participants-search-show');
    }

    amplify.publish(z.event.WebApp.CONVERSATION.CREATE_GROUP, 'conversation_details', this.selectedParticipant());
  }

  searchServices(query) {
    if (this.stateAddService()) {
      this.integrationRepository.searchForServices(query, this.searchInput);
    }
  }
};
