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

import {getManageTeamUrl, getManageServicesUrl} from '../../externalRoute';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.list = z.viewModel.list || {};

z.viewModel.list.StartUIViewModel = class StartUIViewModel {
  static get STATE() {
    return {
      ADD_PEOPLE: 'StartUIViewModel.STATE.ADD_PEOPLE',
      ADD_SERVICE: 'StartUIViewModel.STATE.ADD_SERVICE',
    };
  }

  /**
   * View model for the start UI.
   * @class z.viewModel.list.StartUIViewModel
   *
   * @param {z.viewModel.MainViewModel} mainViewModel - Main view model
   * @param {z.viewModel.ListViewModel} listViewModel - List view model
   * @param {Object} repositories - Object containing all repositories
   */
  constructor(mainViewModel, listViewModel, repositories) {
    this.clickOnClose = this.clickOnClose.bind(this);
    this.clickOnContact = this.clickOnContact.bind(this);
    this.clickOnConversation = this.clickOnConversation.bind(this);
    this.clickOnOther = this.clickOnOther.bind(this);
    this.clickToOpenService = this.clickToOpenService.bind(this);

    this.clickToAcceptInvite = this.clickToAcceptInvite.bind(this);
    this.clickToIgnoreInvite = this.clickToIgnoreInvite.bind(this);
    this.clickToSendRequest = this.clickToSendRequest.bind(this);
    this.clickToUnblock = this.clickToUnblock.bind(this);

    this.handleSearchInput = this.handleSearchInput.bind(this);

    this.mainViewModel = mainViewModel;
    this.listViewModel = listViewModel;
    this.connectRepository = repositories.connect;
    this.conversationRepository = repositories.conversation;
    this.integrationRepository = repositories.integration;
    this.propertiesRepository = repositories.properties;
    this.searchRepository = repositories.search;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;
    this.logger = new z.util.Logger('z.viewModel.list.StartUIViewModel', z.config.LOGGER.OPTIONS);

    this.actionsViewModel = this.mainViewModel.actions;

    this.selfUser = this.userRepository.self;

    this.isTeam = this.teamRepository.isTeam;
    this.teamName = this.teamRepository.teamName;
    this.teamSize = this.teamRepository.teamSize;

    this.state = ko.observable(StartUIViewModel.STATE.ADD_PEOPLE);

    this.peopleTabActive = ko.pureComputed(() => this.state() === StartUIViewModel.STATE.ADD_PEOPLE);

    this.submittedSearch = false;

    this.search = _.debounce(query => {
      this._clearSearchResults();
      if (this.peopleTabActive()) {
        return this._searchPeople(query);
      }

      this.integrationRepository.searchForServices(query, this.searchInput);
    }, 300);

    this.searchInput = ko.observable('');
    this.searchInput.subscribe(this.search);
    this.isSearching = ko.pureComputed(() => this.searchInput().length);

    // User lists
    this.contacts = ko.pureComputed(() => {
      if (this.showMatches()) {
        return this.matchedUsers();
      }

      return this.isTeam() ? this.teamRepository.teamUsers() : this.userRepository.connected_users();
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
    this.showContacts = ko.pureComputed(() => this.contacts().length);
    this.showCreateGuestRoom = ko.pureComputed(() => this.isTeam());
    this.showInvitePeople = ko.pureComputed(() => !this.isTeam());
    this.showMatches = ko.observable(false);

    this.showNoContacts = ko.pureComputed(() => !this.isTeam() && !this.showContent());
    this.showInviteMember = ko.pureComputed(() => this.selfUser().isTeamOwner() && this.teamSize() === 1);
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

    // Invite bubble states
    this.showInviteForm = ko.observable(true);

    // Invite bubble
    this.inviteBubble = null;

    this.inviteHint = ko.pureComputed(() => {
      const metaKey = z.util.Environment.os.mac
        ? z.l10n.text(z.string.inviteMetaKeyMac)
        : z.l10n.text(z.string.inviteMetaKeyPc);

      const stringId = this.inviteMessageSelected() ? z.string.inviteHintSelected : z.string.inviteHintUnselected;
      return z.l10n.text(stringId, metaKey);
    });
    this.inviteMessage = ko.pureComputed(() => {
      if (this.selfUser()) {
        const username = this.selfUser().username();
        return username
          ? z.l10n.text(z.string.inviteMessage, `@${username}`)
          : z.l10n.text(z.string.inviteMessageNoEmail);
      }
      return '';
    });
    this.inviteMessageSelected = ko.observable(true);

    // Selected user bubble
    this.userProfile = ko.observable(null);
    this.userProfileIsService = ko.pureComputed(() => this.userProfile() instanceof z.integration.ServiceEntity);

    this.additionalBubbleClasses = ko.pureComputed(() => {
      return this.userProfileIsService() ? 'start-ui-service-bubble' : '';
    });

    this.renderAvatar = ko.observable(false);
    this.renderAvatarComputed = ko.computed(() => {
      const hasUserId = !!this.userProfile();

      // swap value to re-render avatar
      this.renderAvatar(false);
      window.setTimeout(() => this.renderAvatar(hasUserId), 0);
    });

    this.serviceConversations = ko.observable([]);

    this.isTeamManager = ko.pureComputed(() => this.isTeam() && this.selfUser().isTeamManager());
    this.isInitialServiceSearch = ko.observable(true);

    this.userBubble = undefined;
    this.userBubbleLastId = undefined;

    this.manageTeamUrl = getManageTeamUrl('client_landing');
    this.manageServicesUrl = getManageServicesUrl('client_landing');

    this.shouldUpdateScrollbar = ko
      .computed(() => this.listViewModel.lastUpdate())
      .extend({notify: 'always', rateLimit: 500});

    this.shouldUpdateServiceScrollbar = ko
      .computed(() => this.serviceConversations())
      .extend({notify: 'always', rateLimit: 500});

    this._initSubscriptions();
  }

  _initSubscriptions() {
    amplify.subscribe(z.event.WebApp.CONNECT.IMPORT_CONTACTS, this.importContacts.bind(this));
  }

  clickOnClose() {
    this._closeList();
  }

  clickOnContact(userEntity) {
    return this.actionsViewModel.open1to1Conversation(userEntity).then(() => this._closeList());
  }

  clickOnConversation(conversationEntity) {
    return this.actionsViewModel.openGroupConversation(conversationEntity).then(() => this._closeList());
  }

  clickOnCreateGroup() {
    amplify.publish(z.event.WebApp.CONVERSATION.CREATE_GROUP, 'start_ui');
  }

  clickOnCreateGuestRoom() {
    this.conversationRepository.createGuestRoom().then(conversationEntity => {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.GUEST_ROOMS.GUEST_ROOM_CREATION);
    });
  }

  clickOpenManageTeam() {
    if (this.manageTeamUrl) {
      z.util.SanitizationUtil.safeWindowOpen(this.manageTeamUrl);
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.OPENED_MANAGE_TEAM);
    }
  }

  clickOpenManageServices() {
    if (this.manageServicesUrl) {
      z.util.SanitizationUtil.safeWindowOpen(this.manageServicesUrl);
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.OPENED_MANAGE_TEAM);
    }
  }

  clickOnOther(participantEntity, event) {
    const isUser = participantEntity instanceof z.entity.User;
    if (isUser && participantEntity.isOutgoingRequest()) {
      return this.clickOnContact(participantEntity);
    }

    const createBubble = elementId => {
      this.userProfile(participantEntity);
      this.userBubbleLastId = elementId;
      this.userBubble = new zeta.webapp.module.Bubble({
        host_selector: `#${element.attr('id')}`,
        on_hide: () => {
          this.userBubble = undefined;
          return (this.userBubbleLastId = undefined);
        },
        on_show: () => $('.start-ui-user-bubble .user-profile-connect-message').focus(),
        scroll_selector: '.start-ui-list',
      });

      if (this.userProfileIsService()) {
        this.integrationRepository.addProviderNameToParticipant(this.userProfile());
      }

      this.userBubble.toggle();
    };

    // We clicked on the same bubble
    const isCurrentBubble = this.userBubbleLastId === event.currentTarget.id;
    if (this.userBubble && isCurrentBubble) {
      return this.userBubble.toggle();
    }

    const element = $(event.currentTarget).attr({
      'data-bubble': '#start-ui-user-bubble',
      'data-placement': 'right-flex',
      id: Date.now(),
    });

    // Dismiss old bubble and wait with creating the new one when another bubble is open
    const timeout = this.userBubble ? z.motion.MotionDuration.LONG : 0;
    if (this.userBubble) {
      this.userBubble.hide();
    }
    window.setTimeout(() => createBubble(element[0].id), timeout);
  }

  clickOnShowPeople() {
    this.updateList(StartUIViewModel.STATE.ADD_PEOPLE);
  }

  clickOnShowServices() {
    this.updateList(StartUIViewModel.STATE.ADD_SERVICE);
  }

  clickToOpenService() {
    if (this.userBubble) {
      this.userBubble.hide();
    }

    this.actionsViewModel.open1to1ConversationWithService(this.userProfile());
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
    if (this.userBubble) {
      this.userBubble.hide();
    }

    if (this.inviteBubble) {
      this.inviteBubble.hide();
    }

    this.showMatches(false);
    this.showSpinner(false);

    this.state(StartUIViewModel.STATE.ADD_PEOPLE);
    this.searchInput('');
  }

  updateList(state = StartUIViewModel.STATE.ADD_PEOPLE) {
    this.showSpinner(false);

    // Clean up
    this._clearSearchResults();
    this.userProfile(null);
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

    amplify.publish(z.event.WebApp.SEARCH.HIDE);
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

  //##############################################################################
  // User bubble
  //##############################################################################

  clickToAcceptInvite(userEntity) {
    this._closeList();
    this.actionsViewModel.acceptConnectionRequest(userEntity, true);
  }

  clickToIgnoreInvite(userEntity) {
    this.actionsViewModel.ignoreConnectionRequest(userEntity).then(() => {
      if (this.userBubble) {
        this.userBubble.hide();
      }
    });
  }

  clickToSendRequest(userEntity) {
    this._closeList();
    this.actionsViewModel.sendConnectionRequest(userEntity, true);
  }

  clickToUnblock(userEntity) {
    this._closeList();
    this.actionsViewModel.unblockUser(userEntity, true);
  }

  //##############################################################################
  // Invite bubble
  //##############################################################################

  clickOnImportContacts() {
    this._importContacts(z.connect.ConnectSource.ICLOUD);
  }

  clickToCloseGenericInvite() {
    this.showInviteForm(false);
  }

  clickToShowGenericInvite() {
    this.showInviteForm(true);
    this._focusInviteForm();
  }

  clickToShowInviteBubble() {
    if (!this.inviteBubble) {
      this.inviteBubble = new zeta.webapp.module.Bubble({
        host_selector: '#invite-button',
        on_hide: () => {
          $('.invite-link-box .bg').removeClass('bg-animation');
          $('.invite-link-box .message').off('copy blur focus');
          this.inviteBubble = null;
          this.showInviteForm(true);
        },
        on_show: () => {
          if (this.showInviteForm()) {
            this._focusInviteForm();
          }
        },
        scroll_selector: '.start-ui-list',
      });

      this.inviteBubble.show();
    }
  }

  _importContacts(type) {
    if (this.inviteBubble) {
      this.inviteBubble.hide();
    }
    this.importContacts(type);
  }

  _focusInviteForm() {
    $('.invite-link-box .message')
      .on('copy', event => {
        $(event.currentTarget)
          .parent()
          .find('.bg')
          .addClass('bg-animation')
          .on(z.util.alias.animationend, _event => {
            if (_event.originalEvent.animationName === 'message-bg-fadeout') {
              $(this).off(z.util.alias.animationend);

              if (this.inviteBubble) {
                this.inviteBubble.hide();
              }
            }
          });
      })
      .on('blur', () => this.inviteMessageSelected(false))
      .on('click', event => {
        this.inviteMessageSelected(true);
        $(event.target).select();
      })
      .trigger('click');
  }

  //##############################################################################
  // Contacts import
  //##############################################################################

  /**
   * Connect with contacts.
   * @param {z.connect.ConnectSource} source - Source for the contacts import
   * @returns {undefined} No return value
   */
  importContacts(source) {
    this.connectRepository
      .getContacts(source)
      .then((userIds = []) => this.userRepository.get_users_by_id(userIds))
      .then(userEntities => {
        this.matchedUsers(userEntities);
        this.showMatches(true);
      })
      .catch(error => {
        const isNoContacts = error.type === z.error.ConnectError.TYPE.NO_CONTACTS;
        if (!isNoContacts) {
          this.logger.error(`Importing contacts from '${source}' failed: ${error.message}`, error);

          amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, {
            action: () => this.importContacts(source),
            text: {
              action: z.l10n.text(z.string.modalUploadContactsAction),
              message: z.l10n.text(z.string.modalUploadContactsMessage),
            },
          });
        }
      })
      .then(error => {
        this.showSpinner(false);
      });
  }

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
    const normalizedQuery = z.search.SearchRepository.normalizeQuery(query);
    if (normalizedQuery) {
      this.showMatches(false);

      // Contacts, groups and others
      const trimmedQuery = query.trim();
      const isHandle = trimmedQuery.startsWith('@') && z.user.UserHandleGenerator.validate_handle(normalizedQuery);

      this.searchRepository
        .search_by_name(normalizedQuery, isHandle)
        .then(userEntities => {
          const isCurrentQuery = normalizedQuery === z.search.SearchRepository.normalizeQuery(this.searchInput());
          if (isCurrentQuery) {
            this.searchResults.others(userEntities);
          }
        })
        .catch(error => this.logger.error(`Error searching for contacts: ${error.message}`, error));

      const localSearchSources = this.isTeam()
        ? this.teamRepository.teamUsers()
        : this.userRepository.connected_users();

      const SEARCHABLE_FIELDS = z.search.SearchRepository.CONFIG.SEARCHABLE_FIELDS;
      const searchFields = isHandle ? [SEARCHABLE_FIELDS.USERNAME] : undefined;

      const contactResults = this.searchRepository.searchUserInSet(normalizedQuery, localSearchSources, searchFields);

      this.searchResults.contacts(contactResults);
      this.searchResults.groups(this.conversationRepository.getGroupsByName(normalizedQuery, isHandle));
    }
  }

  dispose() {
    this.renderAvatarComputed.dispose();
  }
};
