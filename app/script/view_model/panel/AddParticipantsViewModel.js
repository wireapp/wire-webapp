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
  static get STATE() {
    return {
      ADD_PEOPLE: 'AppParticipantsViewModel.STATE.ADD_PEOPLE',
      ADD_SERVICE: 'AppParticipantsViewModel.STATE.ADD_SERVICE',
      CONFIRMATION: 'AppParticipantsViewModel.STATE.CONFIRMATION',
    };
  }

  constructor(mainViewModel, panelViewModel, repositories) {
    this.panelViewModel = panelViewModel;

    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;

    this.logger = new z.util.Logger('z.viewModel.panel.AppParticipantsViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.isTeam = this.teamRepository.isTeam;
    this.isTeamOnly = this.panelViewModel.isTeamOnly;
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

    this.enableAddAction = ko.pureComputed(() => this.selectedContacts().length > 0 || this.selectedService());

    this.isAddState = ko.pureComputed(() => this.isStateAddPeople() || this.isStateAddService());
    this.isConfirmAddingState = ko.pureComputed(() => this.isStateAddPeople() || this.isStateConfirmation());
    this.isServiceState = ko.pureComputed(() => this.isStateAddService() || this.isStateConfirmation());

    this.isStateAddPeople = ko.pureComputed(() => this.state() === AppParticipantsViewModel.STATE.ADD_PEOPLE);
    this.isStateAddService = ko.pureComputed(() => this.state() === AppParticipantsViewModel.STATE.ADD_SERVICE);
    this.isStateConfirmation = ko.pureComputed(() => this.state() === AppParticipantsViewModel.STATE.CONFIRMATION);

    this.contacts = ko.pureComputed(() => {
      const conversationEntity = this.conversationEntity();
      let userEntities = [];

      if (!conversationEntity) {
        return userEntities;
      }

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
        return !conversationEntity.participating_user_ids().find(id => userEntity.id === id);
      });
    });

    this.isSearching = ko.pureComputed(() => this.searchInput().length);
    this.headerText = ko.pureComputed(() => {
      const stringSelector = this.selectedContacts().length
        ? z.string.addParticipantsHeaderWithCounter
        : z.string.addParticipantsHeader;
      return z.l10n.text(stringSelector, {number: this.selectedContacts().length});
    });

    this.shouldUpdateScrollbar = ko
      .computed(() => (this.contacts() || this.searchInput()) && this.isVisible())
      .extend({notify: 'always', rateLimit: 500});

    this.searchInput.subscribe(searchInput => this.searchServices(searchInput));
    this.clickOnSelectService = this.clickOnSelectService.bind(this);
  }

  clickOnAddPeople() {
    this.state(AppParticipantsViewModel.STATE.ADD_PEOPLE);
  }

  clickOnAddService() {
    this.state(AppParticipantsViewModel.STATE.ADD_SERVICE);
    this.searchServices(this.searchInput());
  }

  clickOnBack() {
    this._switchToConversationDetails();
  }

  clickOnClose() {
    this.panelViewModel.closePanel().then(() => this.resetView());
  }

  clickOnSelectService(serviceEntity) {
    this.selectedService(serviceEntity);
    this.state(AppParticipantsViewModel.STATE.CONFIRMATION);

    this.integrationRepository.getProviderNameForService(serviceEntity);
  }

  clickToAddParticipants() {
    if (this.isStateConfirmation()) {
      this._addService();
    } else {
      this._addMembers();
    }

    this._switchToConversationDetails();
  }

  resetView() {
    this.state(AppParticipantsViewModel.STATE.ADD_PEOPLE);
    this.selectedContacts.removeAll();
    this.selectedService(undefined);
    this.searchInput('');
  }

  searchServices(query) {
    if (this.isStateAddService()) {
      this.integrationRepository.searchForServices(query, this.searchInput);
    }
  }

  _addMembers() {
    const conversationEntity = this.conversationEntity();
    const userEntities = this.selectedContacts().slice();

    this.conversationRepository.addMembers(conversationEntity, userEntities).then(() => {
      const attributes = {
        method: 'add',
        user_num: userEntities.length,
      };

      const isTeamConversation = !!this.conversationEntity().team_id;
      if (isTeamConversation) {
        const participants = z.tracking.helpers.getParticipantTypes(userEntities, false);

        Object.assign(attributes, {
          guest_num: participants.guests,
          is_allow_guests: conversationEntity.isGuestRoom(),
          temporary_guest_num: participants.temporaryGuests,
          user_num: participants.users,
        });
      }

      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.ADD_PARTICIPANTS, attributes);
    });
  }

  _addService() {
    this.integrationRepository.addService(this.conversationEntity(), this.selectedService(), 'conversation_details');
  }

  _switchToConversationDetails() {
    this.panelViewModel.switchState(z.viewModel.PanelViewModel.STATE.CONVERSATION_DETAILS, false, true);
    this.resetView();
  }
};
