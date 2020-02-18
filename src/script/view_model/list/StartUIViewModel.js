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

import {debounce} from 'underscore';

import {getLogger} from 'Util/Logger';
import {safeWindowOpen} from 'Util/SanitizationUtil';

import {UserlistMode} from 'Components/userList';

import {getManageTeamUrl, getManageServicesUrl} from '../../externalRoute';
import {Config} from '../../Config';
import {User} from '../../entity/User';
import {generatePermissionHelpers} from '../../user/UserPermission';
import {validateHandle} from '../../user/UserHandleGenerator';
import {ParticipantAvatar} from 'Components/participantAvatar';
import {WebAppEvents} from '../../event/WebApp';
import {EventName} from '../../tracking/EventName';
import {SearchRepository} from '../../search/SearchRepository';

class StartUIViewModel {
  static get STATE() {
    return {
      ADD_PEOPLE: 'StartUIViewModel.STATE.ADD_PEOPLE',
      ADD_SERVICE: 'StartUIViewModel.STATE.ADD_SERVICE',
    };
  }

  /**
   * @param {MainViewModel} mainViewModel Main view model
   * @param {z.viewModel.ListViewModel} listViewModel List view model
   * @param {Object} repositories Object containing all repositories
   */
  constructor(mainViewModel, listViewModel, repositories) {
    this.clickOnClose = this.clickOnClose.bind(this);
    this.clickOnContact = this.clickOnContact.bind(this);
    this.alreadyClickedOnContact = {};
    this.clickOnConversation = this.clickOnConversation.bind(this);
    this.clickOnOther = this.clickOnOther.bind(this);
    this.handleSearchInput = this.handleSearchInput.bind(this);

    this.mainViewModel = mainViewModel;
    this.listViewModel = listViewModel;
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.propertiesRepository = repositories.properties;
    this.searchRepository = repositories.search;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;
    this.logger = getLogger('z.viewModel.list.StartUIViewModel');
    this.brandName = Config.getConfig().BRAND_NAME;
    this.UserlistMode = UserlistMode;
    this.ParticipantAvatar = ParticipantAvatar;

    this.actionsViewModel = this.mainViewModel.actions;

    this.selfUser = this.userRepository.self;

    this.isTeam = this.teamRepository.isTeam;
    this.teamName = this.teamRepository.teamName;
    this.teamSize = this.teamRepository.teamSize;

    this.state = ko.observable(StartUIViewModel.STATE.ADD_PEOPLE);
    this.isVisible = ko.pureComputed(() => listViewModel.state() === z.viewModel.ListViewModel.STATE.START_UI);

    this.peopleTabActive = ko.pureComputed(() => this.state() === StartUIViewModel.STATE.ADD_PEOPLE);

    this.submittedSearch = false;

    this.search = debounce(query => {
      this._clearSearchResults();
      if (this.peopleTabActive()) {
        return this._searchPeople(query);
      }

      this.integrationRepository.searchForServices(query, this.searchInput);
    }, 300);

    this.searchInput = ko.observable('');
    this.searchInput.subscribe(this.search);
    this.isSearching = ko.pureComputed(() => this.searchInput().length);
    this.showMatches = ko.observable(false);
    const {canInviteTeamMembers, canSearchUnconnectedUsers} = generatePermissionHelpers();
    this.showOnlyConnectedUsers = ko.pureComputed(() => !canSearchUnconnectedUsers(this.selfUser().teamRole()));

    // User lists
    this.contacts = ko.pureComputed(() => {
      if (this.showMatches()) {
        return this.matchedUsers();
      }

      if (this.showOnlyConnectedUsers()) {
        return this.conversationRepository.connectedUsers();
      }

      if (this.isTeam()) {
        const connectedUsers = this.conversationRepository.connectedUsers();
        const teamUsersWithoutPartners = this.teamRepository
          .teamUsers()
          .filter(user => connectedUsers.includes(user) || this.teamRepository.isSelfConnectedTo(user.id));

        return teamUsersWithoutPartners;
      }

      return this.userRepository.connected_users();
    });

    this.matchedUsers = ko.observableArray([]);
    this.services = this.integrationRepository.services;
    this.topUsers = ko.observableArray([]);

    this.searchResults = {
      contacts: ko.observableArray([]),
      groups: ko.observableArray([]),
      others: ko.observableArray([]),
    };

    // View states
    this.hasSearchResults = ko.pureComputed(() => {
      const {contacts, groups, others} = this.searchResults;
      return contacts().length || groups().length || others().length;
    });

    this.showContent = ko.pureComputed(() => this.showContacts() || this.showMatches() || this.showSearchResults());
    this.showCreateGuestRoom = ko.pureComputed(() => this.isTeam());
    this.showInvitePeople = ko.pureComputed(() => !this.isTeam());

    this.showNoContacts = ko.pureComputed(() => !this.isTeam() && !this.showContent());
    this.showInviteMember = ko.pureComputed(
      () => canInviteTeamMembers(this.selfUser().teamRole()) && this.teamSize() === 1,
    );

    this.showContacts = ko.pureComputed(() => this.contacts().length);

    this.showNoMatches = ko.pureComputed(() => {
      const isTeamOrMatch = this.isTeam() || this.showMatches();
      return isTeamOrMatch && !this.showInviteMember() && !this.showContacts() && !this.showSearchResults();
    });
    this.showNoSearchResults = ko.pureComputed(() => {
      return !this.showMatches() && this.showSearchResults() && !this.hasSearchResults() && this.isSearching();
    });

    this.showSearchResults = ko.pureComputed(() => {
      const shouldShowResults = this.hasSearchResults() || this.isSearching();
      if (!shouldShowResults) {
        this._clearSearchResults();
      }
      return shouldShowResults;
    });
    this.showSpinner = ko.observable(false);
    this.showTopPeople = ko.pureComputed(() => !this.isTeam() && this.topUsers().length && !this.showMatches());

    this.serviceConversations = ko.observable([]);

    this.isInitialServiceSearch = ko.observable(true);

    this.manageTeamUrl = getManageTeamUrl('client_landing');
    this.manageServicesUrl = getManageServicesUrl('client_landing');

    this.shouldUpdateScrollbar = ko
      .computed(() => this.listViewModel.lastUpdate())
      .extend({notify: 'always', rateLimit: 500});

    this.shouldUpdateServiceScrollbar = ko
      .computed(() => this.serviceConversations())
      .extend({notify: 'always', rateLimit: 500});
  }

  clickOnClose() {
    this._closeList();
  }

  async clickOnContact(userEntity) {
    if (this.alreadyClickedOnContact[userEntity.id] === true) {
      return;
    }
    this.alreadyClickedOnContact[userEntity.id] = true;
    await this.actionsViewModel.open1to1Conversation(userEntity);
    this._closeList();
    delete this.alreadyClickedOnContact[userEntity.id];
  }

  clickOnConversation(conversationEntity) {
    return this.actionsViewModel.openGroupConversation(conversationEntity).then(() => this._closeList());
  }

  clickOnCreateGroup() {
    amplify.publish(WebAppEvents.CONVERSATION.CREATE_GROUP, 'start_ui');
  }

  clickOnCreateGuestRoom() {
    this.conversationRepository.createGuestRoom().then(conversationEntity => {
      amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity);
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.GUEST_ROOMS.GUEST_ROOM_CREATION);
    });
  }

  clickOpenManageTeam() {
    if (this.manageTeamUrl) {
      safeWindowOpen(this.manageTeamUrl);
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.SETTINGS.OPENED_MANAGE_TEAM);
    }
  }

  clickOpenManageServices() {
    if (this.manageServicesUrl) {
      safeWindowOpen(this.manageServicesUrl);
      amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.SETTINGS.OPENED_MANAGE_TEAM);
    }
  }

  clickOnOther(participantEntity, event) {
    const isUser = participantEntity instanceof User;
    if (isUser && participantEntity.isOutgoingRequest()) {
      return this.clickOnContact(participantEntity);
    }
    if (isUser) {
      return this.mainViewModel.content.userModal.showUser(participantEntity.id);
    }
    return this.mainViewModel.content.serviceModal.showService(participantEntity);
  }

  clickOnShowPeople() {
    this.updateList(StartUIViewModel.STATE.ADD_PEOPLE);
  }

  clickOnShowServices() {
    this.updateList(StartUIViewModel.STATE.ADD_SERVICE);
  }

  handleSearchInput() {
    if (!this.submittedSearch && this.isSearching()) {
      const [matchingContact] = this.searchResults.contacts();
      if (matchingContact) {
        this.submittedSearch = true;
        return this.clickOnContact(matchingContact).then(() => (this.submittedSearch = false));
      }

      const [matchingGroup] = this.searchResults.groups();
      if (matchingGroup) {
        return this.clickOnConversation(matchingGroup);
      }
    }
  }

  resetView() {
    this.showMatches(false);
    this.showSpinner(false);

    this.state(StartUIViewModel.STATE.ADD_PEOPLE);
    this.searchInput('');
  }

  updateList(state = StartUIViewModel.STATE.ADD_PEOPLE) {
    this.showSpinner(false);

    // Clean up
    this._clearSearchResults();
    $('user-input input').focus();

    this.state(state);
    const isAddingPeople = state === StartUIViewModel.STATE.ADD_PEOPLE;
    if (isAddingPeople) {
      return this._updatePeopleList();
    }
    this._updateServicesList();
  }

  _closeList() {
    $('user-input input').blur();

    amplify.publish(WebAppEvents.SEARCH.HIDE);
    this.listViewModel.switchList(z.viewModel.ListViewModel.STATE.CONVERSATIONS);

    this.resetView();
  }

  _updatePeopleList() {
    if (!this.isTeam()) {
      this.getTopPeople().then(userEntities => this.topUsers(userEntities));
    }
    this._searchPeople(this.searchInput());
  }

  _updateServicesList() {
    this.isInitialServiceSearch(true);
    this.integrationRepository
      .searchForServices(this.searchInput(), this.searchInput)
      .then(() => this.isInitialServiceSearch(false));
  }

  //##############################################################################
  // Data sources
  //##############################################################################

  getTopPeople() {
    return this.conversationRepository
      .get_most_active_conversations()
      .then(conversationEntities => {
        return conversationEntities
          .filter(conversationEntity => conversationEntity.is1to1())
          .slice(0, 6)
          .map(conversationEntity => conversationEntity.participating_user_ids()[0]);
      })
      .then(userIds => this.userRepository.get_users_by_id(userIds))
      .then(userEntities => userEntities.filter(userEntity => !userEntity.isBlocked()));
  }

  clickToShowInviteModal = () => this.mainViewModel.content.inviteModal.show();

  //##############################################################################
  // Search
  //##############################################################################

  _clearSearchResults() {
    this.searchResults.groups.removeAll();
    this.searchResults.contacts.removeAll();
    this.searchResults.others.removeAll();
    this.services.removeAll();
  }

  _searchPeople(query) {
    const normalizedQuery = SearchRepository.normalizeQuery(query);
    if (normalizedQuery) {
      this.showMatches(false);

      // Contacts, groups and others
      const trimmedQuery = query.trim();
      const isHandle = trimmedQuery.startsWith('@') && validateHandle(normalizedQuery);
      if (!this.showOnlyConnectedUsers()) {
        this.searchRepository
          .search_by_name(normalizedQuery, isHandle)
          .then(userEntities => {
            const isCurrentQuery = normalizedQuery === SearchRepository.normalizeQuery(this.searchInput());
            if (isCurrentQuery) {
              this.searchResults.others(userEntities);
            }
          })
          .catch(error => this.logger.error(`Error searching for contacts: ${error.message}`, error));
      }

      const allLocalUsers = this.isTeam() ? this.teamRepository.teamUsers() : this.userRepository.connected_users();

      const localSearchSources = this.showOnlyConnectedUsers()
        ? this.conversationRepository.connectedUsers()
        : allLocalUsers;

      const SEARCHABLE_FIELDS = SearchRepository.CONFIG.SEARCHABLE_FIELDS;
      const searchFields = isHandle ? [SEARCHABLE_FIELDS.USERNAME] : undefined;

      const contactResults = this.searchRepository.searchUserInSet(normalizedQuery, localSearchSources, searchFields);
      const connectedUsers = this.conversationRepository.connectedUsers();
      const filteredResults = contactResults.filter(user => {
        return (
          connectedUsers.includes(user) ||
          this.teamRepository.isSelfConnectedTo(user.id) ||
          user.username() === normalizedQuery
        );
      });

      this.searchResults.contacts(filteredResults);

      this.searchResults.groups(this.conversationRepository.getGroupsByName(normalizedQuery, isHandle));
    }
  }

  dispose() {
    this.renderAvatarComputed.dispose();
  }
}

export {StartUIViewModel};
