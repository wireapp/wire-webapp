/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.ViewModel = z.ViewModel || {};
window.z.ViewModel.list = z.ViewModel.list || {};

z.ViewModel.list.StartUIViewModel = class StartUIViewModel {
  static get STATE() {
    return {
      ADD_PEOPLE: 'StartUIViewModel.STATE.ADD_PEOPLE',
      ADD_SERVICE: 'StartUIViewModel.STATE.ADD_SERVICE',
    };
  }

  /**
   * View model for the start UI.
   * @class z.ViewModel.list.StartUIViewModel
   *
   * @param {string} elementId - HTML selector
   * @param {z.ViewModel.list.ListViewModel} listViewModel - List view model
   * @param {z.connect.ConnectRepository} connectRepository - Connect repository
   * @param {z.conversation.ConversationRepository} conversationRepository - Conversation repository
   * @param {z.integration.IntegrationRepository} integrationRepository - Integration repository
   * @param {z.properties.PropertiesRepository} propertiesRepository - Properties repository
   * @param {z.search.SearchRepository} searchRepository - Search repository
   * @param {z.team.TeamRepository} teamRepository - Team repository
   * @param {z.user.UserRepository} userRepository - User repository
   */
  constructor(
    elementId,
    listViewModel,
    connectRepository,
    conversationRepository,
    integrationRepository,
    propertiesRepository,
    searchRepository,
    teamRepository,
    userRepository
  ) {
    this.clickOnClose = this.clickOnClose.bind(this);
    this.clickOnConversation = this.clickOnConversation.bind(this);
    this.clickOnOther = this.clickOnOther.bind(this);
    this.clickToAddService = this.clickToAddService.bind(this);

    this.clickToAcceptInvite = this.clickToAcceptInvite.bind(this);
    this.clickToCancelRequest = this.clickToCancelRequest.bind(this);
    this.clickToIgnoreInvite = this.clickToIgnoreInvite.bind(this);
    this.clickToSendRequest = this.clickToSendRequest.bind(this);
    this.clickToShowConversation = this.clickToShowConversation.bind(this);
    this.clickToUnblock = this.clickToUnblock.bind(this);

    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.updateProperties = this.updateProperties.bind(this);

    this.listViewModel = listViewModel;
    this.connectRepository = connectRepository;
    this.conversationRepository = conversationRepository;
    this.integrationRepository = integrationRepository;
    this.propertiesRepository = propertiesRepository;
    this.searchRepository = searchRepository;
    this.teamRepository = teamRepository;
    this.userRepository = userRepository;
    this.logger = new z.util.Logger('z.ViewModel.list.StartUIViewModel', z.config.LOGGER.OPTIONS);

    this.selfUser = this.userRepository.self;

    this.isTeam = this.teamRepository.isTeam;
    this.teamName = this.teamRepository.teamName;
    this.teamSize = this.teamRepository.teamSize;

    this.state = ko.observable(StartUIViewModel.STATE.ADD_PEOPLE);
    this.state.subscribe(newState => this.updateList(newState));

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
    this.selectedPeople = ko.observableArray([]);

    // User lists
    this.contacts = ko.pureComputed(() => {
      if (this.showMatches()) {
        return this.matchedUsers();
      }

      if (this.isTeam()) {
        return this.teamRepository.teamUsers();
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

    // User properties
    this.hasCreatedConversation = ko.observable(false);

    // View states
    this.hasSearchResults = ko.pureComputed(() => {
      return (
        this.searchResults.groups().length || this.searchResults.contacts().length || this.searchResults.others().length
      );
    });

    this.enableIntegrations = this.integrationRepository.enableIntegrations;

    this.showContent = ko.pureComputed(() => this.showContacts() || this.showMatches() || this.showSearchResults());
    this.showContacts = ko.pureComputed(() => this.contacts().length);
    this.showGroupHint = ko.pureComputed(() => this.selectedPeople().length === 1 && !this.hasCreatedConversation());
    this.showInvitePeople = ko.pureComputed(() => !this.isTeam());
    this.showMatches = ko.observable(false);

    this.showNoContacts = ko.pureComputed(() => !this.isTeam() && !this.showContent());
    this.showInviteMember = ko.pureComputed(() => {
      return (
        this.selfUser().isTeamOwner() && this.teamSize() === 1 && !this.showContacts() && !this.showSearchResults()
      );
    });
    this.showNoMatches = ko.pureComputed(() => {
      const isTeamOrMatch = this.isTeam() || this.showMatches();
      return isTeamOrMatch && !this.showInviteMember() && !this.showContacts() && !this.showSearchResults();
    });
    this.showNoSearchResults = ko.pureComputed(() => {
      return !this.showMatches() && this.showSearchResults() && !this.hasSearchResults() && this.isSearching();
    });

    this.showSearchResults = ko.pureComputed(() => {
      if (!this.selectedPeople().length && !this.isSearching()) {
        this._clearSearchResults();
        return false;
      }
      return this.hasSearchResults() || this.isSearching();
    });
    this.showSpinner = ko.observable(false);
    this.showTopPeople = ko.pureComputed(() => !this.isTeam() && this.topUsers().length && !this.showMatches());

    // Invite bubble states
    this.showInviteForm = ko.observable(true);

    // Invite bubble
    this.inviteBubble = null;

    this.inviteHint = ko.pureComputed(() => {
      const metaKey = z.util.Environment.os.mac
        ? z.l10n.text(z.string.invite_meta_key_mac)
        : z.l10n.text(z.string.invite_meta_key_pc);

      if (this.inviteMessageSelected()) {
        return z.l10n.text(z.string.invite_hint_selected, metaKey);
      }
      return z.l10n.text(z.string.invite_hint_unselected, metaKey);
    });
    this.inviteMessage = ko.pureComputed(() => {
      if (this.selfUser()) {
        const username = this.selfUser().username();
        return username
          ? z.l10n.text(z.string.invite_message, `@${username}`)
          : z.l10n.text(z.string.invite_message_no_email);
      }
      return '';
    });
    this.inviteMessageSelected = ko.observable(true);

    // Selected user bubble
    this.userProfile = ko.observable(null);
    this.userProfileIsService = ko.pureComputed(() => this.userProfile() instanceof z.integration.ServiceEntity);

    this.additionalBubbleClasses = ko.pureComputed(() => {
      const serviceBubbleClass = this.userProfileIsService() ? 'start-ui-service-bubble' : '';
      const serviceConversationClass = this.showServiceConversationList() ? '-conversation-list' : '';
      return `${serviceBubbleClass}${serviceConversationClass}`;
    });

    this.renderAvatar = ko.observable(false);
    this.renderAvatarComputed = ko.computed(() => {
      const hasUserId = Boolean(this.userProfile());

      // swap value to re-render avatar
      this.renderAvatar(false);
      window.setTimeout(() => this.renderAvatar(hasUserId), 0);
    });

    this.serviceConversations = ko.observable([]);
    this.searchConversationInput = ko.observable('');
    this.searchConversationInput.subscribe(query => this._searchConversationsForServices(query));

    this.showServiceConversationList = ko.observable(false);

    this.userBubble = undefined;
    this.userBubbleLastId = undefined;

    this.shouldUpdateScrollbar = ko
      .computed(() => this.listViewModel.last_update())
      .extend({notify: 'always', rateLimit: 500});

    this.shouldUpdateServiceScrollbar = ko
      .computed(() => this.serviceConversations())
      .extend({notify: 'always', rateLimit: 500});

    this._initSubscriptions();
  }

  _initSubscriptions() {
    amplify.subscribe(z.event.WebApp.CONNECT.IMPORT_CONTACTS, this.importContacts.bind(this));
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.HAS_CREATED_CONVERSATION, this.updateProperties);
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.updateProperties);
  }

  clickOnAddService() {
    this._searchConversationsForServices('');
    this.showServiceConversationList(true);
  }

  clickOnAudioCall() {
    this._selectConversationForAction().then(conversationEntity => {
      if (conversationEntity) {
        window.setTimeout(() => {
          amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, z.media.MediaType.AUDIO, conversationEntity);
        }, 500);
      }
    });
  }

  clickOnClose() {
    this._closeList();
  }

  clickOnConversation(conversationEntity) {
    if (conversationEntity.is_archived()) {
      this.conversationRepository.unarchive_conversation(conversationEntity, 'opened conversation from search');
    }

    if (conversationEntity.is_cleared()) {
      conversationEntity.cleared_timestamp(0);
    }

    amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
    this._closeList();
    return conversationEntity;
  }

  clickOnInviteMember() {
    const path = `${z.config.URL_PATH.MANAGE_TEAM}?utm_source=client_landing&utm_term=desktop`;
    z.util.safe_window_open(z.util.URLUtil.build_url(z.util.URLUtil.TYPE.TEAM_SETTINGS, path));
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.OPENED_MANAGE_TEAM);
  }

  clickOnOther(userEntity, event) {
    this.showServiceConversationList(false);

    const createBubble = elementId => {
      this.userProfile(userEntity);
      this.userBubbleLastId = elementId;
      this.userBubble = new zeta.webapp.module.Bubble({
        host_selector: `#${element.attr('id')}`,
        on_hide: () => {
          this.userBubble = undefined;
          return (this.userBubbleLastId = undefined);
        },
        on_show() {
          return $('.start-ui-user-bubble .user-profile-connect-message').focus();
        },
        scroll_selector: '.start-ui-list',
      });

      if (this.userProfileIsService()) {
        this.integrationRepository.getProviderNameForService(this.userProfile());
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

  clickOnSendImages(images) {
    this._selectConversationForAction().then(conversationEntity => {
      if (conversationEntity) {
        window.setTimeout(() => {
          amplify.publish(z.event.WebApp.CONVERSATION.IMAGE.SEND, images);
        }, 500);
      }
    });
  }

  clickOnShowPeople() {
    this.state(StartUIViewModel.STATE.ADD_PEOPLE);
  }

  clickOnShowService() {
    this.state(StartUIViewModel.STATE.ADD_SERVICE);
  }

  clickOnVideoCall() {
    this._selectConversationForAction().then(conversationEntity => {
      if (conversationEntity) {
        window.setTimeout(() => {
          amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, z.media.MediaType.AUDIO_VIDEO, conversationEntity);
        }, 500);
      }
    });
  }

  clickToAddService(conversationEntity) {
    this.integrationRepository.addService(conversationEntity, this.userProfile(), 'start_ui').then(() => {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
    });
  }

  clickToCreateServiceConversation() {
    this.integrationRepository.createConversationWithService(this.userProfile(), 'start_ui');
    if (this.userBubble) {
      this.userBubble.hide();
    }
  }

  handleSearchInput() {
    if (this.submittedSearch) {
      return Promise.resolve();
    }

    if (this.isSearching()) {
      const matchHandled = this._handleSearchInput();
      if (matchHandled) {
        return Promise.resolve();
      }
    }

    this._selectConversationForAction();
  }

  updateList(state = StartUIViewModel.STATE.ADD_PEOPLE) {
    this.showSpinner(false);

    // Clean up
    this.selectedPeople.removeAll();
    this._clearSearchResults();
    this.userProfile(null);
    $('user-input input').focus();

    const isAddingPeople = state === StartUIViewModel.STATE.ADD_PEOPLE;
    if (isAddingPeople) {
      return this._updatePeopleList();
    }
    this._updateServicesList();
  }

  _closeList() {
    $('user-input input').blur();

    amplify.publish(z.event.WebApp.SEARCH.HIDE);
    this.listViewModel.switch_list(z.ViewModel.list.LIST_STATE.CONVERSATIONS);

    if (this.userBubble) {
      this.userBubble.hide();
    }

    if (this.inviteBubble) {
      this.inviteBubble.hide();
    }

    this.showMatches(false);
    this.showSpinner(false);

    this.selectedPeople.removeAll();
    this.state(StartUIViewModel.STATE.ADD_PEOPLE);
    this.searchInput('');
  }

  _updatePeopleList() {
    if (!this.isTeam()) {
      this.getTopPeople().then(userEntities => this.topUsers(userEntities));
    }
  }

  _updateServicesList() {
    this.search(this.searchInput());
  }

  //##############################################################################
  // Data sources
  //##############################################################################

  getTopPeople() {
    return this.conversationRepository
      .get_most_active_conversations()
      .then(conversationEntities => {
        return conversationEntities
          .filter(conversationEntity => conversationEntity.is_one2one())
          .slice(0, 9)
          .map(conversationEntity => conversationEntity.participating_user_ids()[0]);
      })
      .then(userIds => this.userRepository.get_users_by_id(userIds))
      .then(userEntities => userEntities.filter(userEntity => !userEntity.is_blocked()));
  }

  //##############################################################################
  // User bubble
  //##############################################################################

  clickToAcceptInvite(userEntity) {
    this._closeList();
    this.userRepository.accept_connection_request(userEntity, true);
  }

  clickToCancelRequest() {
    if (this.userBubble) {
      this.userBubble.hide();
    }
  }

  clickToIgnoreInvite(userEntity) {
    this.userRepository.ignore_connection_request(userEntity).then(() => {
      if (this.userBubble) {
        this.userBubble.hide();
      }
    });
  }

  clickToSendRequest() {
    this._closeList();
  }

  clickToShowConversation() {
    this._closeList();
  }

  clickToUnblock(userEntity) {
    this._closeList();
    this.userRepository.unblock_user(userEntity, true);
  }

  //##############################################################################
  // Invite bubble
  //##############################################################################

  clickOnImportContacts() {
    this._importContacts(z.connect.ConnectSource.ICLOUD);
  }

  clickOnImportGmail() {
    this._importContacts(z.connect.ConnectSource.GMAIL);
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
        this.selectedPeople.removeAll();
        this.matchedUsers(userEntities);
        this.showMatches(true);
      })
      .catch(error => {
        const isNoContacts = error.type === z.connect.ConnectError.TYPE.NO_CONTACTS;
        if (!isNoContacts) {
          this.logger.error(`Importing contacts from '${source}' failed: ${error.message}`, error);

          amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CONTACTS, {
            action: () => this.importContacts(source),
          });
        }
      })
      .then(error => {
        this.showSpinner(false);
      });
  }

  //##############################################################################
  // User Properties
  //##############################################################################

  updateProperties() {
    const properties = this.propertiesRepository.properties;
    this.hasCreatedConversation(properties.has_created_conversation);

    return true;
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

  _handleSearchInput() {
    for (const userEntity of this.searchResults.contacts()) {
      if (!this.selectedPeople().includes(userEntity)) {
        this.selectedPeople.push(userEntity);
        return true;
      }
    }

    const [matchingGroup] = this.searchResults.groups();
    if (matchingGroup) {
      this.clickOnConversation(matchingGroup);
      return true;
    }

    return false;
  }

  _selectConversationForAction() {
    switch (this.selectedPeople().length) {
      case 0: {
        return Promise.resolve();
      }

      case 1: {
        const [selectedUserEntity] = this.selectedPeople();
        return this._open1to1Conversation(selectedUserEntity);
      }

      default: {
        const userIds = this.selectedPeople().map(user_et => user_et.id);
        return this._openGroupConversation(userIds);
      }
    }
  }

  _open1to1Conversation(userEntity) {
    this.submittedSearch = true;

    return this.conversationRepository
      .get_1to1_conversation(userEntity)
      .then(conversationEntity => {
        this.clickOnConversation(conversationEntity);
        this.submittedSearch = false;
        return conversationEntity;
      })
      .catch(error => {
        this.submittedSearch = false;
        throw error;
      });
  }

  _openGroupConversation(userIds) {
    this.submittedSearch = true;

    return this.conversationRepository
      .createConversation(userIds, null)
      .then(conversationEntity => {
        this.submittedSearch = false;

        if (conversationEntity) {
          this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.HAS_CREATED_CONVERSATION);
          amplify.publish(z.event.WebApp.CONVERSATION.SHOW, conversationEntity);
          return conversationEntity;
        }
      })
      .catch(error => {
        this.submittedSearch = false;
        throw new Error(`Unable to create conversation: ${error.message}`);
      });
  }

  _searchConversationsForServices(query) {
    const normalizedQuery = z.search.SearchRepository.normalizeQuery(query);
    const conversationsForServices = this.conversationRepository
      .get_groups_by_name(normalizedQuery, false)
      .filter(conversationEntity => conversationEntity.team_id);
    this.serviceConversations(conversationsForServices);
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

      if (this.isTeam()) {
        this.searchResults.contacts(this.teamRepository.searchForTeamUsers(normalizedQuery, isHandle));
      } else {
        this.searchResults.contacts(this.userRepository.search_for_connected_users(normalizedQuery, isHandle));
      }

      this.searchResults.groups(this.conversationRepository.get_groups_by_name(normalizedQuery, isHandle));
    }
  }

  dispose() {
    this.renderAvatarComputed.dispose();
  }
};
