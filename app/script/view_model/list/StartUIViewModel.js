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
  /**
   * View model for the start UI.
   *
   * @param {string} element_id - HTML selector
   * @param {z.ViewModel.list.ListViewModel} list_view_model - List view model
   * @param {z.connect.ConnectRepository} connect_repository - Connect repository
   * @param {z.conversation.ConversationRepository} conversation_repository - Conversation repository
   * @param {z.search.SearchRepository} search_repository - Search repository
   * @param {z.user.UserRepository} user_repository - User repository
   * @param {z.properties.PropertiesRepository} properties_repository - Properties repository
  */
  constructor(element_id, list_view_model, connect_repository, conversation_repository, search_repository, user_repository, properties_repository) {
    this.click_on_close = this.click_on_close.bind(this);
    this.click_on_group = this.click_on_group.bind(this);
    this.click_on_other = this.click_on_other.bind(this);

    this.on_user_accept = this.on_user_accept.bind(this);
    this.on_user_connect = this.on_user_connect.bind(this);
    this.on_user_ignore = this.on_user_ignore.bind(this);
    this.on_user_open = this.on_user_open.bind(this);
    this.on_user_unblock = this.on_user_unblock.bind(this);
    this.on_cancel_request = this.on_cancel_request.bind(this);

    this.list_view_model = list_view_model;
    this.connect_repository = connect_repository;
    this.conversation_repository = conversation_repository;
    this.search_repository = search_repository;
    this.user_repository = user_repository;
    this.properties_repository = properties_repository;
    this.logger = new z.util.Logger('z.ViewModel.list.StartUIViewModel', z.config.LOGGER.OPTIONS);

    this.search = _.debounce((query) => {
      this.clear_search_results();

      const normalized_query = z.search.SearchRepository.normalize_query(query);
      if (normalized_query) {
        // Contacts, groups and others
        const is_username = query.trim().startsWith('@');

        this.search_repository.search_by_name(normalized_query)
          .then((user_ets) => {
            if (normalized_query === z.search.SearchRepository.normalize_query(this.search_input())) {
              if (is_username) {
                user_ets = user_ets.filter((user_et) => z.util.StringUtil.starts_with(user_et.username(), normalized_query));
              }
              this.search_results.others(user_ets);
            }
          })
          .catch((error) => {
            this.logger.error(`Error searching for contacts: ${error.message}`, error);
          });
        this.search_results.contacts(this.user_repository.search_for_connected_users(normalized_query, is_username));
        this.search_results.groups(this.conversation_repository.get_groups_by_name(normalized_query, is_username));

        this.searched_for_user(query);
      }
    }, 300);

    this.searched_for_user = _.once(function(query) {
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONTACTS.ENTERED_SEARCH, {
        by_username_only: query.startsWith('@'),
        context: 'startui',
      });
    });

    this.user = this.user_repository.self;
    this.active_team = this.conversation_repository.active_team;
    this.active_team.subscribe((active_team) => {
      if (active_team) {
        this.team_members(active_team.members());
      }
    });

    this.search_input = ko.observable('');
    this.search_input.subscribe(this.search);
    this.selected_people = ko.observableArray([]);

    this.has_created_conversation = ko.observable(false);
    this.show_hint = ko.pureComputed(() => (this.selected_people().length === 1) && !this.has_created_conversation());

    this.group_hint_text = z.l10n.text(z.string.search_group_hint);

    // Results
    this.top_users = ko.observableArray([]);
    this.suggestions = ko.observableArray([]);
    this.connections = ko.observableArray([]);
    this.team_members = ko.observableArray([]);

    this.search_results = {
      contacts: ko.observableArray([]),
      groups: ko.observableArray([]),
      others: ko.observableArray([]),
    };

    // view states
    this.show_no_contacts_on_wire = ko.observable(false);
    this.is_searching = ko.observable(false);
    this.show_spinner = ko.observable(false);

    this.should_update_scrollbar = ko.computed(() => {
      return this.list_view_model.last_update();
    }).extend({notify: 'always', rateLimit: 500});

    this.has_uploaded_contacts = ko.observable(false);

    this.has_results = ko.pureComputed(() => {
      return this.search_results.groups().length || this.search_results.contacts().length || this.search_results.others().length;
    });

    this.show_connections = ko.pureComputed(() => !this.show_suggestions());

    this.show_invite = ko.pureComputed(() => {
      const no_connections_and_suggestions = !this.show_search_results() && !this.connections().length && !this.show_suggestions();
      const no_search_results = this.show_search_results() && !this.has_results() && !this.is_searching();

      return no_connections_and_suggestions || no_search_results;
    });

    this.show_invite_people = ko.pureComputed(() => this.is_personal_space());

    this.show_suggestions = ko.pureComputed(() => !!this.suggestions().length);

    this.show_search_results = ko.pureComputed(() => {
      if (!this.selected_people().length && !this.search_input().length) {
        this.clear_search_results();
        return false;
      }
      return this.has_results() || this.search_input().length;
    });

    this.is_personal_space = ko.pureComputed(() => {
      const team_et = this.active_team();
      if (team_et) {
        return !team_et.name();
      }
    });

    this.show_team_member = ko.pureComputed(() => {
      return !this.is_personal_space() && this.team_members().length;
    });

    this.show_top_people = ko.pureComputed(() => {
      return this.is_personal_space() && this.top_users().length;
    });

    // Invite bubble states
    this.show_invite_form = ko.observable(true);
    this.show_invite_form_only = ko.pureComputed(() => {
      if (this.has_uploaded_contacts()) {
        return true;
      }

      return !this.has_uploaded_contacts() && !this.show_top_people() && !this.show_suggestions();
    });

    // Selected user
    this.user_profile = ko.observable(null);
    this.user_bubble = null;

    // Invite bubble
    this.invite_bubble = null;
    this.invite_message = ko.observable('');
    this.invite_message_selected = ko.observable(true);
    this.invite_hints = ko.pureComputed(() => {
      const meta_key = z.util.Environment.os.mac ? z.l10n.text(z.string.invite_meta_key_mac) : z.l10n.text(z.string.invite_meta_key_pc);

      if (this.invite_message_selected()) {
        return z.localization.Localizer.get_text({
          id: z.string.invite_hint_selected,
          replace: [
            {
              content: meta_key,
              placeholder: '%meta_key',
            },
          ],
        });
      }
      return z.localization.Localizer.get_text({
        id: z.string.invite_hint_unselected,
        replace: [
          {
            content: meta_key,
            placeholder: '%meta_key',
          },
        ],
      });
    });

    this.invite_button_text = ko.pureComputed(() => {
      return z.l10n.text(this.show_invite_form_only() ? z.string.people_invite : z.string.people_bring_your_friends);
    });

    // Last open bubble
    this.user_bubble = undefined;
    this.user_bubble_last_id = undefined;

    this._init_subscriptions();
  }

  _init_subscriptions() {
    this.update_properties = this.update_properties.bind(this);

    amplify.subscribe(z.event.WebApp.CONNECT.IMPORT_CONTACTS, this.import_contacts.bind(this));
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.CONTACTS, this.update_properties);
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.HAS_CREATED_CONVERSATION, this.update_properties);
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.update_properties);
  }

  clear_search_results() {
    this.search_results.groups.removeAll();
    this.search_results.contacts.removeAll();
    this.search_results.others.removeAll();
    this.is_searching(false);
    this.show_no_contacts_on_wire(false);
  }

  click_on_close() {
    this._close_list();
  }

  _track_import(source, error) {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PREFERENCES.IMPORTED_CONTACTS, {
      outcome: error ? 'fail' : 'success',
      source: source,
    });
  }

  /**
   * Connect with contacts.
   * @param {z.connect.ConnectSource} source - Source for the contacts import
   * @returns {undefined} No return value
   */
  import_contacts(source) {
    let import_promise;
    this.show_spinner(true);

    if (source === z.connect.ConnectSource.GMAIL) {
      import_promise = this.connect_repository.get_google_contacts();
    } else if (source === z.connect.ConnectSource.ICLOUD) {
      import_promise = this.connect_repository.get_macos_contacts();
    }

    import_promise
      .then((response) => {
        return this._show_on_boarding_results(response);
      })
      .catch((error) => {
        if (error.type !== z.connect.ConnectError.TYPE.NO_CONTACTS) {
          this.logger.error(`Importing contacts from '${source}' failed: ${error.message}`, error);

          amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CONTACTS, {
            action: () => this.import_contacts(source),
          });
        }
      })
      .then((error) => {
        this.show_spinner(false);
        this._track_import(source, error);
      });
  }

  _show_on_boarding_results(response) {
    return this.search_repository.show_on_boarding(response)
      .then(({connections, suggestions}) => {
        this.connections(connections);
        this.suggestions(suggestions);
        return this.get_top_people();
      })
      .then((user_ets) => {
        this.top_users(user_ets);
        this.selected_people.removeAll();

        if (!this.suggestions().length && !this.connections().length) {
          if (this.top_users().length) {
            return this.suggestions(this.top_users());
          }

          return this.show_no_contacts_on_wire(true);
        }
      })
      .catch((error) => {
        this.logger.error(`Could not show the on-boarding results: ${error.message}`, error);
      });
  }

  update_list() {
    this.get_top_people().then((user_ets) => this.top_users(user_ets));
    this.get_connections().then((user_ets) => this.connections(user_ets));

    this.show_spinner(false);

    // Clean up
    this.suggestions.removeAll();
    this.selected_people.removeAll();
    this.clear_search_results();
    this.user_profile(null);
    $('user-input input').focus();
  }

  _close_list() {
    if (this.user_bubble) {
      this.user_bubble.hide();
    }

    if (this.invite_bubble) {
      this.invite_bubble.hide();
    }

    this.show_spinner(false);

    this.selected_people.removeAll();
    this.search_input('');
    $('user-input input').blur();

    amplify.publish(z.event.WebApp.SEARCH.HIDE);
    this.list_view_model.switch_list(z.ViewModel.list.LIST_STATE.CONVERSATIONS);
  }

  click_on_group(conversation_et) {
    const promise = conversation_et instanceof z.entity.User ? this.conversation_repository.get_one_to_one_conversation(conversation_et) : Promise.resolve(conversation_et);

    promise
      .then((_conversation_et) => {
        if (_conversation_et.is_archived()) {
          this.conversation_repository.unarchive_conversation(_conversation_et);
        }
        this._close_list();
        amplify.publish(z.event.WebApp.CONVERSATION.SHOW, _conversation_et);
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.OPENED_CONVERSATION, {
          conversation_type: conversation_et.is_group() ? 'group' : 'one_to_one',
        });
      });
  }

  click_on_other(user_et, event) {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.SELECTED_USER_FROM_SEARCH, {
      connection_type: (() => {
        switch (user_et.connection().status()) {
          case z.user.ConnectionStatus.ACCEPTED:
            return 'connected';
          case z.user.ConnectionStatus.UNKNOWN:
            return 'unconnected';
          case z.user.ConnectionStatus.PENDING:
            return 'pending_incoming';
          case z.user.ConnectionStatus.SENT:
            return 'pending_outgoing';
          default:
            return;
        }
      })(),
      context: 'startui',
    });

    const create_bubble = (element_id) => {
      this.user_profile(user_et);
      this.user_bubble_last_id = element_id;
      this.user_bubble = new zeta.webapp.module.Bubble({
        host_selector: `#${element.attr('id')}`,
        on_hide: () => {
          this.user_bubble = undefined;
          return this.user_bubble_last_id = undefined;
        },
        on_show() {
          return $('.start-ui-user-bubble .user-profile-connect-message').focus();
        },
        scroll_selector: '.start-ui-list',
      });

      this.user_bubble.toggle();
    };

    // We clicked on the same bubble
    if (this.user_bubble && (this.user_bubble_last_id === event.currentTarget.id)) {
      this.user_bubble.toggle();
      return;
    }

    const element = $(event.currentTarget)
      .attr({
        'data-bubble': '#start-ui-user-bubble',
        'data-placement': 'right-flex',
        'id': Date.now(),
      });

    // Dismiss old bubble and wait with creating the new one when another bubble is open
    if (this.user_bubble) {
      this.user_bubble.hide();
      window.setTimeout(function() {
        create_bubble(element[0].id);
      }, 550);
    } else {
      create_bubble(element[0].id);
    }
  }

  //##############################################################################
  // Data sources
  //##############################################################################

  get_top_people() {
    return this.conversation_repository.get_most_active_conversations()
      .then(function(conversation_ets) {
        return conversation_ets
          .filter((conversation_et) => conversation_et.is_one2one())
          .slice(0, 9)
          .map((conversation_et) => conversation_et.participating_user_ids()[0]);
      })
      .then((user_ids) => {
        return this.user_repository.get_users_by_id(user_ids);
      })
      .then((user_ets) => user_ets.filter((user_et) => !user_et.is_blocked()));
  }

  get_connections() {
    return Promise.resolve()
      .then(() => {
        return this.user_repository.users()
          .filter((user_et) => user_et.is_connected())
          .sort((user_a, user_b) => z.util.StringUtil.sort_by_priority(user_a.first_name(), user_b.first_name()));
      });
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
      common_users_count: user_et.mutual_friends_total(),
      context: 'startui',
    });
  }

  on_user_ignore(user_et) {
    this.user_repository.ignore_connection_request(user_et)
      .then(() => {
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
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.OPENED_GENERIC_INVITE_MENU, {context: 'banner'});

      const self = this.user_repository.self();

      if (self.email()) {
        this.invite_message(z.localization.Localizer.get_text({
          id: z.string.invite_message,
          replace: [
            {
              content: `@${self.username()}`,
              placeholder: '%username',
            },
          ]}));
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
      .on('copy', (event) => {
        $(event.currentTarget)
          .parent()
          .find('.bg')
          .addClass('bg-animation')
          .on(z.util.alias.animationend, (_event) => {
            if (_event.originalEvent.animationName === 'message-bg-fadeout') {
              $(this).off(z.util.alias.animationend);
              this.invite_bubble.hide();
            }
          });
      })
      .on('blur', () => this.invite_message_selected(false))
      .on('click', (event) => {
        this.invite_message_selected(true);
        $(event.target).select();
      })
      .trigger('click');
  }


  //##############################################################################
  // User Properties
  //##############################################################################

  update_properties() {
    const properties = this.properties_repository.properties;
    this.has_created_conversation(properties.has_created_conversation);

    const has_uploaded_contacts = properties.contact_import.google !== undefined || properties.contact_import.macos !== undefined;
    this.has_uploaded_contacts(has_uploaded_contacts);
    return true;
  }


  //##############################################################################
  // Header
  //##############################################################################

  on_submit_search() {
    if (!this.selected_people().length) {
      return Promise.resolve();
    }

    if (this.selected_people().length === 1) {
      return this.conversation_repository.get_one_to_one_conversation(this.selected_people()[0])
        .then((conversation_et) => {
          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONNECT.OPENED_CONVERSATION, {source: 'top_user'});
          this.click_on_group(conversation_et);
          return conversation_et;
        });
    }

    if (this.selected_people().length > 1) {
      const user_ids = this.selected_people().map((user_et) => user_et.id);

      return this.conversation_repository.create_new_conversation(user_ids, null)
        .then(({conversation_et}) => {
          this.properties_repository.save_preference(z.properties.PROPERTIES_TYPE.HAS_CREATED_CONVERSATION);
          amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.CREATE_GROUP_CONVERSATION, {
            creationContext: 'search',
            numberOfParticipants: user_ids.length,
          });
          this.click_on_group(conversation_et);
          return conversation_et;
        })
        .catch((error) => {
          this._close_list();
          throw new Error(`Unable to create conversation: ${error.message}`);
        });
    }

  }

  on_audio_call() {
    this.on_submit_search()
      .then(function(conversation_et) {
        if (conversation_et) {
          window.setTimeout(function() {
            amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, false, conversation_et);
          }, 500);
        }
      });
  }

  on_photo(images) {
    this.on_submit_search()
      .then(function(conversation_et) {
        if (conversation_et) {
          window.setTimeout(function() {
            amplify.publish(z.event.WebApp.CONVERSATION.IMAGE.SEND, images);
          }, 500);
        }
      });
  }

  on_video_call() {
    this.on_submit_search()
      .then(function(conversation_et) {
        if (conversation_et) {
          window.setTimeout(function() {
            amplify.publish(z.event.WebApp.CALL.STATE.TOGGLE, true, conversation_et);
          }, 500);
        }
      });
  }
};
