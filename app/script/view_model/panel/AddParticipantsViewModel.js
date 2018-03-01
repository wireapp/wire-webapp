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
    };
  }

  static get STATE() {
    return {
      ADD_PEOPLE: 'AppParticipantsViewModel.STATE.ADD_PEOPLE',
      ADD_SERVICE: 'AppParticipantsViewModel.STATE.ADD_SERVICE',
      CONFIRMATION: 'AppParticipantsViewModel.STATE.CONFIRMATION',
    };
  }

  constructor(mainViewModel, panelViewModel, repositories) {
    this.mainViewModel = mainViewModel;
    this.panelViewModel = panelViewModel;

    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;

    this.logger = new z.util.Logger('z.viewModel.panel.AppParticipantsViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.isTeam = this.teamRepository.isTeam;
    this.isVisible = this.panelViewModel.addParticipantsVisible;
    this.panelState = this.panelViewModel.panelState;
    this.services = this.integrationRepository.services;
    this.showIntegrations = this.panelViewModel.showIntegrations;
    this.teamUsers = this.teamRepository.teamUsers;
    this.teamMembers = this.teamRepository.teamMembers;

    this.searchInput = ko.observable('');
    this.selectedContacts = ko.observableArray([]);
    this.selectedService = ko.observable();
    this.state = ko.observable(AppParticipantsViewModel.STATE.ADD_PEOPLE);

    this.activeAddState = ko.pureComputed(() => AppParticipantsViewModel.CONFIG.ADD_STATES.includes(this.state()));
    this.stateAddPeople = ko.pureComputed(() => this.state() === AppParticipantsViewModel.STATE.ADD_PEOPLE);
    this.stateAddService = ko.pureComputed(() => this.state() === AppParticipantsViewModel.STATE.ADD_SERVICE);

    this.stateConfirmation = ko.pureComputed(() => this.state() === AppParticipantsViewModel.STATE.CONFIRMATION);

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

    this.isSearching = ko.pureComputed(() => this.searchInput().length);
    this.isTeamOnly = ko.pureComputed(() => this.conversationEntity() && this.conversationEntity.isTeamOnly());

    this.participantsHeaderText = ko.pureComputed(() => 'Placeholder');
    this.searchInput.subscribe(searchInput => this.searchServices(searchInput));
  }

  clickOnAddService() {
    this.state(AppParticipantsViewModel.STATE.ADD_SERVICE);
    this.searchServices(this.searchInput());
  }

  clickOnBack() {
    this._switchToConversationDetails();
  }

  clickOnClose() {
    this.mainViewModel.closePanel();
    this._resetView();
  }

  clickOnSelectService(serviceEntity) {
    this.selectedService(serviceEntity);
    this.state(AppParticipantsViewModel.STATE.CONFIRMATION);

    this.integrationRepository.getProviderNameForService(serviceEntity);
  }

  clickToAddMembers() {
    this.conversationRepository.addMembers(this.conversationEntity(), this.selectedContacts());
    this._switchToConversationDetails();
  }

  clickToAddService() {
    this.integrationRepository.addService(this.conversationEntity(), this.selectedService(), 'conversation_details');
    this._switchToConversationDetails();
  }

  searchServices(query) {
    if (this.stateAddService()) {
      this.integrationRepository.searchForServices(query, this.searchInput);
    }
  }

  _resetView() {
    this.state(AppParticipantsViewModel.STATE.ADD_PEOPLE);
    this.selectedContacts.removeAll();
    this.selectedService(undefined);
    this.searchInput('');
  }

  _switchToConversationDetails() {
    this.panelViewModel.switchState(z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS);
    this._resetView();
  }
};
