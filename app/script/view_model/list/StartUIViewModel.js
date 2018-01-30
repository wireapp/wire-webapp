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
   * @param {string} element_id - HTML selector
   * @param {z.ViewModel.list.ListViewModel} list_view_model - List view model
   * @param {z.connect.ConnectRepository} connect_repository - Connect repository
   * @param {z.conversation.ConversationRepository} conversationRepository - Conversation repository
   * @param {z.integration.IntegrationRepository} integrationRepository - Integration repository
   * @param {z.properties.PropertiesRepository} properties_repository - Properties repository
   * @param {z.search.SearchRepository} search_repository - Search repository
   * @param {z.team.TeamRepository} team_repository - Team repository
   * @param {z.user.UserRepository} user_repository - User repository
   */
  constructor(
    element_id,
    list_view_model,
    connect_repository,
    conversationRepository,
    integrationRepository,
    properties_repository,
    search_repository,
    team_repository,
    user_repository
  ) {
    this.click_on_close = this.click_on_close.bind(this);
    this.click_on_group = this.click_on_group.bind(this);
    this.clickOnOther = this.clickOnOther.bind(this);
    this.clickOnAddServiceToConversation = this.clickOnAddServiceToConversation.bind(this);
    this.clickOnServiceConversation = this.clickOnServiceConversation.bind(this);
    this.clickOnCreateServiceConversation = this.clickOnCreateServiceConversation.bind(this);
    this.on_cancel_request = this.on_cancel_request.bind(this);
    this.on_submit_search = this.on_submit_search.bind(this);
    this.on_user_accept = this.on_user_accept.bind(this);
    this.on_user_connect = this.on_user_connect.bind(this);
    this.on_user_ignore = this.on_user_ignore.bind(this);
    this.on_user_open = this.on_user_open.bind(this);
    this.on_user_unblock = this.on_user_unblock.bind(this);

    this.list_view_model = list_view_model;
    this.connect_repository = connect_repository;
    this.conversationRepository = conversationRepository;
    this.integrationRepository = integrationRepository;
    this.propertiesRepository = properties_repository;
    this.search_repository = search_repository;
    this.team_repository = team_repository;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.ViewModel.list.StartUIViewModel', z.config.LOGGER.OPTIONS);

    this.user = this.user_repository.self;

    this.isTeam = this.team_repository.isTeam;
    this.teamName = this.team_repository.teamName;
    this.teamSize = this.team_repository.teamSize;

    this.submitted_search = false;

    this.state = ko.observable(StartUIViewModel.STATE.ADD_PEOPLE);
    this.state.subscribe(newState => this.updateList(newState));

    this.peopleTabActive = ko.pureComputed(() => this.state() === StartUIViewModel.STATE.ADD_PEOPLE);

    this.search = _.debounce(query => {
      this.clearSearchResults();
      if (this.peopleTabActive()) {
        return this._searchPeople(query);
      }

      this.integrationRepository.searchForServices(query, this.search_input);
    }, 300);

    this.searched_for_user = _.once(query => {
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONTACTS.ENTERED_SEARCH, {
        by_username_only: query.startsWith('@'),
        context: 'startui',
      });
    });

    this.search_input = ko.observable('');
    this.search_input.subscribe(this.search);
    this.selected_people = ko.observableArray([]);

    // User lists
    this.contacts = ko.pureComputed(() => {
      if (this.show_matches()) {
        return this.matched_users();
      }

      if (this.isTeam()) {
        return this.team_repository.teamUsers();
      }

      return this.user_repository.connected_users();
    });

    this.matched_users = ko.observableArray([]);
    this.top_users = ko.observableArray([]);

    this.search_results = {
      contacts: ko.observableArray([]),
      groups: ko.observableArray([]),
      others: ko.observableArray([]),
      services: this.integrationRepository.services,
    };

    // User properties
    this.has_created_conversation = ko.observable(false);

    // View states
    this.has_search_results = ko.pureComputed(() => {
      return (
        this.search_results.groups().length ||
        this.search_results.contacts().length ||
        this.search_results.others().length ||
        this.search_results.services().length
      );
    });

    this.enableIntegrations = this.integrationRepository.enableIntegrations;

    this.show_content = ko.pureComputed(() => {
      return this.show_contacts() || this.show_matches() || this.show_search_results();
    });

    this.show_contacts = ko.pureComputed(() => this.contacts().length);
    this.show_hint = ko.pureComputed(() => this.selected_people().length === 1 && !this.has_created_conversation());
    this.show_invite = ko.pureComputed(() => !this.isTeam());
    this.show_matches = ko.observable(false);

    this.show_no_contacts = ko.pureComputed(() => !this.isTeam() && !this.show_content());
    this.showMemberInvite = ko.pureComputed(() => {
      return this.user().isTeamOwner() && this.teamSize() === 1 && !this.show_contacts() && !this.show_search_results();
    });
    this.showNoMatches = ko.pureComputed(() => {
      const isTeamOrMatch = this.isTeam() || this.show_matches();
      return isTeamOrMatch && !this.showMemberInvite() && !this.show_contacts() && !this.show_search_results();
    });
    this.showNoSearchResults = ko.pureComputed(() => {
      return (
        !this.show_matches() && this.show_search_results() && !this.has_search_results() && this.search_input().length
      );
    });

    this.show_spinner = ko.observable(false);

    this.show_search_results = ko.pureComputed(() => {
      if (!this.selected_people().length && !this.search_input().length) {
        this.clearSearchResults();
        return false;
      }
      return this.has_search_results() || this.search_input().length;
    });

    this.show_top_people = ko.pureComputed(() => !this.isTeam() && this.top_users().length && !this.show_matches());

    // Invite bubble states
    this.show_invite_form = ko.observable(true);

    // Invite bubble
    this.invite_bubble = null;
    this.invite_message = ko.observable('');
    this.invite_message_selected = ko.observable(true);
    this.invite_hints = ko.pureComputed(() => {
      const meta_key = z.util.Environment.os.mac
        ? z.l10n.text(z.string.invite_meta_key_mac)
        : z.l10n.text(z.string.invite_meta_key_pc);

      if (this.invite_message_selected()) {
        return z.l10n.text(z.string.invite_hint_selected, meta_key);
      }
      return z.l10n.text(z.string.invite_hint_unselected, meta_key);
    });

    // Selected user bubble
    this.user_profile = ko.observable(null);
    this.userProfileIsService = ko.pureComputed(() => this.user_profile() instanceof z.integration.ServiceEntity);

    this.additionalBubbleClasses = ko.pureComputed(() => {
      const serviceBubbleClass = this.userProfileIsService() ? 'start-ui-service-bubble' : '';
      const serviceConversationClass = this.showServiceConversationList() ? '-conversation-list' : '';
      return `${serviceBubbleClass}${serviceConversationClass}`;
    });

    this.renderAvatar = ko.observable(false);
    this.renderAvatarComputed = ko.computed(() => {
      const hasUserId = Boolean(this.user_profile());

      // swap value to re-render avatar
      this.renderAvatar(false);
      window.setTimeout(() => this.renderAvatar(hasUserId), 0);
    });

    this.showServiceConversationList = ko.observable(false);
    this.serviceConversations = ko.observable([]);
    this.searchConversationInput = ko.observable('');
    this.searchConversationInput.subscribe(query => this._searchConversationsForServices(query));

    this.user_bubble = undefined;
    this.user_bubble_last_id = undefined;

    this.shouldUpdateScrollbar = ko
      .computed(() => {
        return this.list_view_model.last_update();
      })
      .extend({notify: 'always', rateLimit: 500});

    this.shouldUpdateServiceScrollbar = ko
      .computed(() => {
        return this.serviceConversations();
      })
      .extend({notify: 'always', rateLimit: 500});

    this._init_subscriptions();
  }

  _init_subscriptions() {
    this.update_properties = this.update_properties.bind(this);

    amplify.subscribe(z.event.WebApp.CONNECT.IMPORT_CONTACTS, this.import_contacts.bind(this));
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.HAS_CREATED_CONVERSATION, this.update_properties);
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.update_properties);
  }

  _searchConversationsForServices(query) {
    const normalizedQuery = z.search.SearchRepository.normalizeQuery(query);
    const conversationsForServices = this.conversationRepository
      .get_groups_by_name(normalizedQuery, false)
      .filter(conversationEntity => conversationEntity.team_id);
    this.serviceConversations(conversationsForServices);
  }

  _searchPeople(query) {
    const normalized_query = z.search.SearchRepository.normalizeQuery(query);
    if (normalized_query) {
      this.show_matches(false);

      // Contacts, groups and others
      const trimmed_query = query.trim();
      const is_handle = trimmed_query.startsWith('@') && z.user.UserHandleGenerator.validate_handle(normalized_query);

      this.search_repository
        .search_by_name(normalized_query, is_handle)
        .then(user_ets => {
          const is_current_query = normalized_query === z.search.SearchRepository.normalizeQuery(this.search_input());
          if (is_current_query) {
            this.search_results.others(user_ets);
          }
        })
        .catch(error => this.logger.error(`Error searching for contacts: ${error.message}`, error));

      if (this.isTeam()) {
        this.search_results.contacts(this.team_repository.searchForTeamUsers(normalized_query, is_handle));
      } else {
        this.search_results.contacts(this.user_repository.search_for_connected_users(normalized_query, is_handle));
      }

      this.search_results.groups(this.conversationRepository.get_groups_by_name(normalized_query, is_handle));
      this.searched_for_user(query);
    }
  }

  click_on_close() {
    this._close_list();
  }

  clickOnMemberInvite() {
    const path = `${z.config.URL_PATH.MANAGE_TEAM}?utm_source=client_landing&utm_term=desktop`;
    z.util.safe_window_open(z.util.URLUtil.build_url(z.util.URLUtil.TYPE.TEAM_SETTINGS, path));
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.OPENED_MANAGE_TEAM);
  }

  click_on_group(conversation_et) {
    const promise =
      conversation_et instanceof z.entity.User
        ? this.conversationRepository.get_1to1_conversation(conversation_et)
        : Promise.resolve(conversation_et);

    return promise.then(_conversation_et => {
      if (_conversation_et.is_archived()) {
        this.conversationRepository.unarchive_conversation(_conversation_et, 'opened conversation from search');
      }

      if (_conversation_et.is_cleared()) {
        _conversation_et.cleared_timestamp(0);
      }

      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, _conversation_et);
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.OPENED_CONVERSATION, {
        conversation_type: conversation_et.is_group() ? 'group' : 'one_to_one',
      });
      this._close_list();
      return _conversation_et;
    });
  }

  clickOnOther(userEntity, event) {
    this.showServiceConversationList(false);
    if (userEntity instanceof z.entity.User) {
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.SELECTED_USER_FROM_SEARCH, {
        connection_type: (() => {
          switch (userEntity.connection().status()) {
            case z.user.ConnectionStatus.ACCEPTED:
              return 'connected';
            case z.user.ConnectionStatus.UNKNOWN:
              return 'unconnected';
            case z.user.ConnectionStatus.PENDING:
              return 'pending_incoming';
            case z.user.ConnectionStatus.SENT:
              return 'pending_outgoing';
            default:
          }
        })(),
        context: 'startui',
      });
    }

    const create_bubble = element_id => {
      this.user_profile(userEntity);
      this.user_bubble_last_id = element_id;
      this.user_bubble = new zeta.webapp.module.Bubble({
        host_selector: `#${element.attr('id')}`,
        on_hide: () => {
          this.user_bubble = undefined;
          return (this.user_bubble_last_id = undefined);
        },
        on_show() {
          return $('.start-ui-user-bubble .user-profile-connect-message').focus();
        },
        scroll_selector: '.start-ui-list',
      });

      if (this.userProfileIsService()) {
        this.integrationRepository.getProviderNameForService(this.user_profile());
      }

      this.user_bubble.toggle();
    };

    // We clicked on the same bubble
    if (this.user_bubble && this.user_bubble_last_id === event.currentTarget.id) {
      this.user_bubble.toggle();
      return;
    }

    const element = $(event.currentTarget).attr({
      'data-bubble': '#start-ui-user-bubble',
      'data-placement': 'right-flex',
      id: Date.now(),
    });

    // Dismiss old bubble and wait with creating the new one when another bubble is open
    if (this.user_bubble) {
      this.user_bubble.hide();
      window.setTimeout(() => {
        create_bubble(element[0].id);
      }, z.motion.MotionDuration.LONG);
    } else {
      create_bubble(element[0].id);
    }
  }

  clickOnAddPeople() {
    this.state(StartUIViewModel.STATE.ADD_PEOPLE);
  }

  clickOnAddService() {
    this.state(StartUIViewModel.STATE.ADD_SERVICE);
  }

  clickOnAddServiceToConversation() {
    this._searchConversationsForServices('');
    this.showServiceConversationList(true);
  }

  clickOnServiceConversation(conversationEntity) {
    this.integrationRepository.addService(conversationEntity, this.user_profile(), 'start_ui').then(() => {
      this.click_on_group(conversationEntity);
    });
  }

  clickOnCreateServiceConversation() {
    this.integrationRepository.createConversationWithService(this.user_profile(), 'start_ui');
    if (this.user_bubble) {
      this.user_bubble.hide();
    }
  }

  updateList(state = StartUIViewModel.STATE.ADD_PEOPLE) {
    this.show_spinner(false);

    // Clean up
    this.selected_people.removeAll();
    this.clearSearchResults();
    this.user_profile(null);
    $('user-input input').focus();

    if (state === StartUIViewModel.STATE.ADD_PEOPLE) {
      return this._updatePeopleList();
    }
    this._updateServicesList();
  }

  _updatePeopleList() {
    if (!this.isTeam()) {
      this.get_top_people().then(user_ets => this.top_users(user_ets));
    }
  }

  _updateServicesList() {
    this.search(this.search_input());
  }

  _close_list() {
    $('user-input input').blur();

    amplify.publish(z.event.WebApp.SEARCH.HIDE);
    this.list_view_model.switch_list(z.ViewModel.list.LIST_STATE.CONVERSATIONS);

    if (this.user_bubble) {
      this.user_bubble.hide();
    }

    if (this.invite_bubble) {
      this.invite_bubble.hide();
    }

    this.show_matches(false);
    this.show_spinner(false);

    this.selected_people.removeAll();
    this.state(StartUIViewModel.STATE.ADD_PEOPLE);
    this.search_input('');
  }

  //##############################################################################
  // Data sources
  //##############################################################################

  get_top_people() {
    return this.conversationRepository
      .get_most_active_conversations()
      .then(conversation_ets => {
        return conversation_ets
          .filter(conversation_et => conversation_et.is_one2one())
          .slice(0, 9)
          .map(conversation_et => conversation_et.participating_user_ids()[0]);
      })
      .then(user_ids => this.user_repository.get_users_by_id(user_ids))
      .then(user_ets => user_ets.filter(user_et => !user_et.is_blocked()));
  }

  //##############################################################################
  // User bubble
  //##############################################################################

  on_user_accept(user_et) {
    this._close_list();
    this.user_repository.accept_connection_request(user_et, true);
  }

  on_user_connect(user_et) {
    this._close_list();

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.SENT_CONNECT_REQUEST, {
      context: 'startui',
    });
  }

  on_user_ignore(user_et) {
    this.user_repository.ignore_connection_request(user_et).then(() => {
      if (this.user_bubble) {
        this.user_bubble.hide();
      }
    });
  }

  on_user_open() {
    this._close_list();
  }

  on_user_unblock(user_et) {
    this._close_list();
    this.user_repository.unblock_user(user_et, true);
  }

  on_cancel_request() {
    if (this.user_bubble) {
      this.user_bubble.hide();
    }
  }

  //##############################################################################
  // Invite bubble
  //##############################################################################

  click_on_contacts_import() {
    if (this.invite_bubble) {
      this.invite_bubble.hide();
    }
    this.import_contacts(z.connect.ConnectSource.ICLOUD);
  }

  click_on_gmail_import() {
    if (this.invite_bubble) {
      this.invite_bubble.hide();
    }
    this.import_contacts(z.connect.ConnectSource.GMAIL);
  }

  click_on_import_form() {
    this.show_invite_form(false);
  }

  click_on_invite_form() {
    this.show_invite_form(true);
    this._focus_invite_form();
  }

  show_invite_bubble() {
    if (!this.invite_bubble) {
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.OPENED_GENERIC_INVITE_MENU, {
        context: 'banner',
      });

      const self = this.user_repository.self();

      if (self.username()) {
        this.invite_message(z.l10n.text(z.string.invite_message, `@${self.username()}`));
      } else {
        this.invite_message(z.l10n.text(z.string.invite_message_no_email));
      }

      this.invite_bubble = new zeta.webapp.module.Bubble({
        host_selector: '#invite-button',
        on_hide: () => {
          $('.invite-link-box .bg').removeClass('bg-animation');
          $('.invite-link-box .message').off('copy blur focus');
          this.invite_bubble = null;
          this.show_invite_form(true);
        },
        on_show: () => {
          if (this.show_invite_form()) {
            this._focus_invite_form();
          }
        },
        scroll_selector: '.start-ui-list',
      });

      this.invite_bubble.show();
    }
  }

  _focus_invite_form() {
    $('.invite-link-box .message')
      .on('copy', event => {
        $(event.currentTarget)
          .parent()
          .find('.bg')
          .addClass('bg-animation')
          .on(z.util.alias.animationend, _event => {
            if (_event.originalEvent.animationName === 'message-bg-fadeout') {
              $(this).off(z.util.alias.animationend);

              if (this.invite_bubble) {
                this.invite_bubble.hide();
              }
            }
          });
      })
      .on('blur', () => this.invite_message_selected(false))
      .on('click', event => {
        this.invite_message_selected(true);
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
  import_contacts(source) {
    this.connect_repository
      .getContacts(source)
      .then((user_ids = []) => this.user_repository.get_users_by_id(user_ids))
      .then(user_ets => {
        this.selected_people.removeAll();
        this.matched_users(user_ets);
        this.show_matches(true);
      })
      .catch(error => {
        if (error.type !== z.connect.ConnectError.TYPE.NO_CONTACTS) {
          this.logger.error(`Importing contacts from '${source}' failed: ${error.message}`, error);

          amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CONTACTS, {
            action: () => this.import_contacts(source),
          });
        }
      })
      .then(error => {
        this.show_spinner(false);
        this._track_import(source, error);
      });
  }

  _track_import(source, error) {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PREFERENCES.IMPORTED_CONTACTS, {
      outcome: error ? 'fail' : 'success',
      source: source,
    });
  }

  //##############################################################################
  // User Properties
  //##############################################################################

  update_properties() {
    const properties = this.propertiesRepository.properties;
    this.has_created_conversation(properties.has_created_conversation);

    return true;
  }

  //##############################################################################
  // Search
  //##############################################################################

  clearSearchResults() {
    this.search_results.groups.removeAll();
    this.search_results.contacts.removeAll();
    this.search_results.services.removeAll();
    this.search_results.others.removeAll();
  }

  on_submit_search(handle_search_input = true) {
    if (this.submitted_search) {
      return Promise.resolve();
    }

    if (handle_search_input && this.search_input().length) {
      const match_handled = this._handle_search_input();
      if (match_handled) {
        return Promise.resolve();
      }
    }

    switch (this.selected_people().length) {
      case 0: {
        return Promise.resolve();
      }

      case 1: {
        const [selected_user_et] = this.selected_people();
        return this._open_1to1_conversation(selected_user_et);
      }

      default: {
        const user_ids = this.selected_people().map(user_et => user_et.id);
        return this._open_group_conversation(user_ids);
      }
    }
  }

  on_audio_call() {
    this.on_submit_search(false).then(conversation_et => {
      if (conversation_et) {
        window.setTimeout(() => {
          amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, z.media.MediaType.AUDIO, conversation_et);
        }, 500);
      }
    });
  }

  on_photo(images) {
    this.on_submit_search(false).then(conversation_et => {
      if (conversation_et) {
        window.setTimeout(() => {
          amplify.publish(z.event.WebApp.CONVERSATION.IMAGE.SEND, images);
        }, 500);
      }
    });
  }

  on_video_call() {
    this.on_submit_search(false).then(conversation_et => {
      if (conversation_et) {
        window.setTimeout(() => {
          amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, z.media.MediaType.AUDIO_VIDEO, conversation_et);
        }, 500);
      }
    });
  }

  _handle_search_input() {
    for (const user_et of this.search_results.contacts()) {
      if (!this.selected_people().includes(user_et)) {
        this.selected_people.push(user_et);
        return true;
      }
    }

    const [matching_group] = this.search_results.groups();
    if (matching_group) {
      this.click_on_group(matching_group);
      return true;
    }

    return false;
  }

  _open_1to1_conversation(user_et) {
    this.submitted_search = true;

    return this.conversationRepository
      .get_1to1_conversation(user_et)
      .then(conversation_et => {
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.OPENED_CONVERSATION);
        this.click_on_group(conversation_et);
        this.submitted_search = false;
        return conversation_et;
      })
      .catch(error => {
        this.submitted_search = false;
        throw error;
      });
  }

  _open_group_conversation(user_ids) {
    this.submitted_search = true;

    return this.conversationRepository
      .create_new_conversation(user_ids, null)
      .then(conversationEntity => {
        this.submitted_search = false;

        if (conversationEntity) {
          this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.HAS_CREATED_CONVERSATION);
          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.CREATE_GROUP_CONVERSATION, {
            creationContext: 'search',
            numberOfParticipants: user_ids.length,
          });
          this.click_on_group(conversationEntity);
          return conversationEntity;
        }
      })
      .catch(error => {
        this.submitted_search = false;
        throw new Error(`Unable to create conversation: ${error.message}`);
      });
  }

  dispose() {
    this.renderAvatarComputed.dispose();
  }
};
