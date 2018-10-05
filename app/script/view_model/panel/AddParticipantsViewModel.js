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

z.viewModel.panel.AddParticipantsViewModel = class AddParticipantsViewModel extends z.viewModel.panel
  .BasePanelViewModel {
  static get STATE() {
    return {
      ADD_PEOPLE: 'AddParticipantsViewModel.STATE.ADD_PEOPLE',
      ADD_SERVICE: 'AddParticipantsViewModel.STATE.ADD_SERVICE',
    };
  }

  constructor(params) {
    super(params);

    this.conversationRepository = this.repositories.conversation;
    this.integrationRepository = this.repositories.integration;
    this.searchRepository = params.repositories.search;
    this.teamRepository = this.repositories.team;
    this.userRepository = this.repositories.user;

    this.logger = new z.util.Logger('z.viewModel.panel.AddParticipantsViewModel', z.config.LOGGER.OPTIONS);

    this.isTeam = this.teamRepository.isTeam;
    this.selfUser = this.userRepository.self;
    this.services = this.integrationRepository.services;
    this.teamUsers = this.teamRepository.teamUsers;
    this.teamMembers = this.teamRepository.teamMembers;

    this.isInitialServiceSearch = ko.observable(true);
    this.searchInput = ko.observable('');
    this.selectedContacts = ko.observableArray([]);
    this.selectedService = ko.observable();
    this.state = ko.observable(AddParticipantsViewModel.STATE.ADD_PEOPLE);

    this.isTeamOnly = ko.pureComputed(() => this.activeConversation() && this.activeConversation().isTeamOnly());

    this.showIntegrations = ko.pureComputed(() => {
      if (this.activeConversation()) {
        const firstUserEntity = this.activeConversation().firstUserEntity();
        const hasBotUser = firstUserEntity && firstUserEntity.isService;
        const allowIntegrations = this.activeConversation().is_group() || hasBotUser;
        return this.isTeam() && allowIntegrations && this.activeConversation().inTeam() && !this.isTeamOnly();
      }
    });
    this.isTeamManager = ko.pureComputed(() => this.isTeam() && this.selfUser().isTeamManager());

    this.enableAddAction = ko.pureComputed(() => this.selectedContacts().length > 0);

    this.isStateAddPeople = ko.pureComputed(() => this.state() === AddParticipantsViewModel.STATE.ADD_PEOPLE);
    this.isStateAddService = ko.pureComputed(() => this.state() === AddParticipantsViewModel.STATE.ADD_SERVICE);

    this.contacts = ko.pureComputed(() => {
      const activeConversation = this.activeConversation();
      let userEntities = [];

      if (!activeConversation) {
        return userEntities;
      }

      if (this.isTeam()) {
        userEntities = this.isTeamOnly()
          ? this.teamMembers().sort((userA, userB) => {
              return z.util.StringUtil.sortByPriority(userA.first_name(), userB.first_name());
            })
          : this.teamUsers();
      } else {
        userEntities = this.userRepository.connected_users();
      }

      return userEntities.filter(userEntity => {
        return !activeConversation.participating_user_ids().find(id => userEntity.id === id);
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

  getElementId() {
    return 'add-participants';
  }

  clickOnAddPeople() {
    this.state(AddParticipantsViewModel.STATE.ADD_PEOPLE);
  }

  clickOnAddService() {
    this.state(AddParticipantsViewModel.STATE.ADD_SERVICE);
    this.searchServices(this.searchInput());
  }

  clickOnSelectService(serviceEntity) {
    this.selectedService(serviceEntity);
    this.navigateTo(z.viewModel.PanelViewModel.STATE.GROUP_PARTICIPANT_SERVICE, {
      addMode: true,
      entity: serviceEntity,
    });
  }

  clickToAddParticipants() {
    this._addMembers();
    this.onGoBack();
  }

  clickOpenManageServices() {
    const path = `${z.config.URL_PATH.MANAGE_SERVICES}?utm_source=client_landing&utm_term=desktop`;
    z.util.SanitizationUtil.safeWindowOpen(z.util.URLUtil.buildUrl(z.util.URLUtil.TYPE.TEAM_SETTINGS, path));
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.OPENED_MANAGE_TEAM);
  }

  initView() {
    this.state(AddParticipantsViewModel.STATE.ADD_PEOPLE);
    this.selectedContacts.removeAll();
    this.selectedService(undefined);
    this.searchInput('');
    this.isInitialServiceSearch(true);
  }

  searchServices(query) {
    if (this.isStateAddService()) {
      this.integrationRepository
        .searchForServices(this.searchInput(), this.searchInput)
        .then(() => this.isInitialServiceSearch(false));
    }
  }

  _addMembers() {
    const activeConversation = this.activeConversation();
    const userEntities = this.selectedContacts().slice();

    this.conversationRepository.addMembers(activeConversation, userEntities).then(() => {
      const attributes = {
        method: 'add',
        user_num: userEntities.length,
      };

      const isTeamConversation = !!this.activeConversation().team_id;
      if (isTeamConversation) {
        const participants = z.tracking.helpers.getParticipantTypes(userEntities, false);

        Object.assign(attributes, {
          guest_num: participants.guests,
          is_allow_guests: activeConversation.isGuestRoom(),
          temporary_guest_num: participants.temporaryGuests,
          user_num: participants.users,
        });
      }

      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.ADD_PARTICIPANTS, attributes);
    });
  }
};
