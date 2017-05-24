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
window.z.conversation = z.conversation || {};

// Conversation repository for all conversation interactions with the conversation service
z.conversation.ConversationRepository = class ConversationRepository {
  /**
   * Construct a new Conversation Repository.
   *
   * @param {ConversationService} conversation_service - Backend REST API conversation service implementation
   * @param {AssetService} asset_service - Backend REST API asset service implementation
   * @param {UserRepository} user_repository - Repository for all user and connection interactions
   * @param {GiphyRepository} giphy_repository - Repository for Giphy GIFs
   * @param {CryptographyRepository} cryptography_repository - Repository for all cryptography interactions
   * @param {LinkPreviewRepository} link_repository - Repository for link previews
   */
  constructor(conversation_service, asset_service, user_repository, giphy_repository, cryptography_repository, link_repository) {
    this.conversation_service = conversation_service;
    this.asset_service = asset_service;
    this.user_repository = user_repository;
    this.giphy_repository = giphy_repository;
    this.cryptography_repository = cryptography_repository;
    this.link_repository = link_repository;
    this.logger = new z.util.Logger('z.conversation.ConversationRepository', z.config.LOGGER.OPTIONS);

    this.conversation_mapper = new z.conversation.ConversationMapper();
    this.event_mapper = new z.conversation.EventMapper(this.asset_service, this.user_repository);
    this.verification_state_handler = new z.conversation.ConversationVerificationStateHandler(this);

    this.active_conversation = ko.observable();
    this.conversations = ko.observableArray([]);

    this.block_event_handling = true;
    this.fetching_conversations = {};

    this.self_conversation = ko.pureComputed(() => {
      if (this.user_repository.self()) {
        return this._find_conversation_by_id(this.user_repository.self().id);
      }
    });

    this.filtered_conversations = ko.pureComputed(() => {
      return this.conversations().filter(function(conversation_et) {
        const states_to_filter = [
          z.user.ConnectionStatus.BLOCKED,
          z.user.ConnectionStatus.CANCELLED,
          z.user.ConnectionStatus.PENDING,
        ];

        if (conversation_et.is_self() || states_to_filter.includes(conversation_et.connection().status())) {
          return false;
        }

        return !(conversation_et.is_cleared() && conversation_et.removed_from_conversation());
      });
    });

    this.sorted_conversations = ko.pureComputed(() => {
      return this.filtered_conversations().sort(z.util.sort_groups_by_last_event);
    });

    this.receiving_queue = new z.util.PromiseQueue({name: 'ConversationRepository.Receiving'});
    this.sending_queue = new z.util.PromiseQueue({name: 'ConversationRepository.Sending', paused: true});

    // @note Only use the client request queue as to unblock if not blocked by event handling or the cryptographic order of messages will be ruined and sessions might be deleted
    this.conversation_service.client.request_queue_blocked_state.subscribe((state) => {
      const request_queue_blocked = state !== z.service.RequestQueueBlockedState.NONE;
      this.sending_queue.pause(request_queue_blocked || this.block_event_handling);
    });

    this.conversations_archived = ko.observableArray([]);
    this.conversations_call = ko.observableArray([]);
    this.conversations_cleared = ko.observableArray([]);
    this.conversations_unarchived = ko.observableArray([]);

    this._init_subscriptions();
  }

  _init_state_updates() {
    ko.computed(() => {
      const archived = [];
      const calls = [];
      const cleared = [];
      const unarchived = [];

      this.sorted_conversations().forEach(function(conversation_et) {
        if (conversation_et.has_active_call()) {
          calls.push(conversation_et);
        } else if (conversation_et.is_cleared()) {
          cleared.push(conversation_et);
        } else if (conversation_et.is_archived()) {
          archived.push(conversation_et);
        } else {
          unarchived.push(conversation_et);
        }
      });

      this.conversations_archived(archived);
      this.conversations_call(calls);
      this.conversations_cleared(cleared);
      this.conversations_unarchived(unarchived);
    });
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.CONVERSATION.ASSET.CANCEL, this.cancel_asset_upload.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.EVENT_FROM_BACKEND, this.push_to_receiving_queue.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.timeout_ephemeral_message.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.MAP_CONNECTION, this.map_connection.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.MISSED_EVENTS, this.on_missed_events.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.PERSIST_STATE, this.save_conversation_state_in_db.bind(this));
    amplify.subscribe(z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, this.set_notification_handling_state.bind(this));
    amplify.subscribe(z.event.WebApp.USER.UNBLOCKED, this.unblocked_user.bind(this));
  }


  //##############################################################################
  // Conversation service interactions
  //##############################################################################

  /**
   * Create a new conversation.
   * @note Supply at least 2 user IDs! Do not include the requestor
   *
   * @param {Array<string>} user_ids - IDs of users (excluding the requestor) to be part of the conversation
   * @param {string} name - User defined name for the Conversation (optional)
   * @returns {Promise} Resolves when the conversation was created
   */
  create_new_conversation(user_ids, name) {
    return this.conversation_service.create_conversation(user_ids, name)
      .then((response) => {
        return this._on_create({conversation: response.id, data: response});
      });
  }

  /**
   * Get a conversation from the backend.
   * @param {string} conversation_id - Conversation to be retrieved from the backend
   * @returns {Promise} Resolve with the conversation entity
   */
  fetch_conversation_by_id(conversation_id) {
    if (this.fetching_conversations.hasOwnProperty(conversation_id)) {
      return new Promise((resolve, reject) => {
        this.fetching_conversations[conversation_id].push({reject_fn: reject, resolve_fn: resolve});
      });
    }

    this.fetching_conversations[conversation_id] = [];

    return this.conversation_service.get_conversation_by_id(conversation_id)
      .then((response) => {
        const conversation_et = this.conversation_mapper.map_conversation(response);

        this.logger.info(`Fetched conversation '${conversation_id}' from backend`);
        this.save_conversation(conversation_et);

        this.fetching_conversations[conversation_id].forEach(function({resolve_fn}) {
          resolve_fn(conversation_et);
        });
        delete this.fetching_conversations[conversation_id];

        return conversation_et;
      })
      .catch(() => {
        const error = new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.NOT_FOUND);

        this.fetching_conversations[conversation_id].forEach(function({reject_fn}) {
          reject_fn(error);
        });
        delete this.fetching_conversations[conversation_id];

        throw error;
      });
  }

  get_conversations() {
    return this.conversation_service.load_conversation_states_from_db()
      .then((local_conversations) => {
        return this.conversation_service.get_all_conversations()
          .catch((error) => {
            return this.logger.error(`Failed to get all conversations from backend: ${error.message}`);
          })
          .then((remote_conversations = []) => {
            if (remote_conversations.length) {
              return Promise.resolve(this.conversation_mapper.merge_conversations(local_conversations, remote_conversations))
                .then((merged_conversations) => this.conversation_service.save_conversations_in_db(merged_conversations));
            }

            return local_conversations;
          });
      })
      .then((conversations) => {
        this.save_conversations(this.conversation_mapper.map_conversations(conversations));
        amplify.publish(z.event.WebApp.CONVERSATION.LOADED_STATES);
        return this.conversations();
      });
  }

  /**
   * Get Message with given ID from the database.
   *
   * @param {Conversation} conversation_et - Conversation message belongs to
   * @param {string} message_id - ID of message
   * @returns {Promise} Resolves with the message
   */
  get_message_in_conversation_by_id(conversation_et, message_id) {
    const message_et = conversation_et.get_message_by_id(message_id);
    if (message_et) {
      return Promise.resolve(message_et);
    }

    return this.conversation_service.load_event_from_db(conversation_et.id, message_id)
      .then((event) => {
        if (event) {
          return this.event_mapper.map_json_event(event, conversation_et);
        }
        throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND);
      });
  }

  /**
   * Get preceding messages starting with the given message.
   * @param {Conversation} conversation_et - Respective conversation
   * @returns {Promise} Resolves with the message
   */
  get_preceding_messages(conversation_et) {
    conversation_et.is_pending(true);

    const first_message = conversation_et.get_first_message();
    const upper_bound = first_message ? new Date(first_message.timestamp()) : new Date();

    return this.conversation_service.load_preceding_events_from_db(conversation_et.id, new Date(0), upper_bound, z.config.MESSAGES_FETCH_LIMIT)
      .then((events) => {
        if (events.length < z.config.MESSAGES_FETCH_LIMIT) {
          conversation_et.has_further_messages(false);
        }

        return this._add_events_to_conversation(events, conversation_et);
      })
      .then(function(mapped_messages) {
        conversation_et.is_pending(false);
        return mapped_messages;
      });
  }

  /**
   * Get specified message and load number preceding and subsequent messages defined by padding.
   *
   * @param {Conversation} conversation_et - Conversation entity
   * @param {Message} message_et - Message entity
   * @param {number} [padding=15] - Padding
   * @returns {Promise} Resolves with the message
  */
  get_messages_with_offset(conversation_et, message_et, padding = 15) {
    const message_date = new Date(message_et.timestamp());

    conversation_et.is_pending(true);

    return Promise.all([
      this.conversation_service.load_preceding_events_from_db(conversation_et.id, new Date(0), message_date, padding),
      this.conversation_service.load_subsequent_events_from_db(conversation_et.id, message_date, padding, true),
    ])
    .then(([older_events, newer_events]) => {
      return this._add_events_to_conversation(older_events.concat(newer_events), conversation_et);
    })
    .then(function(mapped_messages) {
      conversation_et.is_pending(false);
      return mapped_messages;
    });
  }

  /**
   * Get subsequent messages starting with the given message.
   *
   * @param {Conversation} conversation_et - Conversation entity
   * @param {Message} message_et - Message entity
   * @param {boolean} include_message - Include given message in the results
   * @returns {Promise} Resolves with the messages
   */
  get_subsequent_messages(conversation_et, message_et, include_message) {
    const message_date = new Date(message_et.timestamp());
    conversation_et.is_pending(true);

    return this.conversation_service.load_subsequent_events_from_db(conversation_et.id, message_date, z.config.MESSAGES_FETCH_LIMIT, include_message)
      .then((events) => {
        return this._add_events_to_conversation(events, conversation_et);
      })
      .then(function(mapped_messages) {
        conversation_et.is_pending(false);
        return mapped_messages;
      });
  }

  /**
   * Get messages for given category. Category param acts as lower bound.
   *
   * @param {Conversation} conversation_et - Conversation entity
   * @param {MessageCategory} [category=z.message.MessageCategory.NONE] - Message category
   * @returns {Promise} Array of message entities
   */
  get_events_for_category(conversation_et, category = z.message.MessageCategory.NONE) {
    return this.conversation_service.load_events_with_category_from_db(conversation_et.id, category)
      .then((events) => {
        const message_ets = this.event_mapper.map_json_events(events, conversation_et);
        return Promise.all(message_ets.map((message_et) => this._update_user_ets(message_et)));
      });
  }

  /**
   * Search for given text in conversation.
   *
   * @param {Conversation} conversation_et - Conversation entity
   * @param {string} query - Query strings
   * @returns {Promise} Array of message entities
   */
  search_in_conversation(conversation_et, query) {
    if (query.length === 0) {
      return Promise.resolve([]);
    }

    return this.conversation_service.search_in_conversation(conversation_et.id, query)
      .then((events) => {
        const message_ets = this.event_mapper.map_json_events(events, conversation_et);
        return Promise.all(message_ets.map((message_et) => this._update_user_ets(message_et)));
      })
      .then((message_ets) => [message_ets, query]);
  }

  /**
   * Get conversation unread events.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to start from
   * @returns {undefined} No return value
   */
  _get_unread_events(conversation_et) {
    const first_message = conversation_et.get_first_message();
    const upper_bound = first_message ? new Date(first_message.timestamp()) : new Date();
    const lower_bound = new Date(conversation_et.last_read_timestamp());

    if (lower_bound < upper_bound) {
      conversation_et.is_pending(true);

      return this.conversation_service.load_preceding_events_from_db(conversation_et.id, lower_bound, upper_bound)
        .then((events) => {
          if (events.length) {
            this._add_events_to_conversation(events, conversation_et);
          }
          conversation_et.is_pending(false);
        })
        .catch((error) => {
          this.logger.info(`Could not load unread events for conversation: ${conversation_et.id}`, error);
        });
    }
  }

  /**
   * Update conversation with a user you just unblocked
   * @param {User} user_et - User you unblocked
   * @returns {undefined} No return value
   */
  unblocked_user(user_et) {
    this.get_one_to_one_conversation(user_et)
      .then((conversation_et) => conversation_et.status(z.conversation.ConversationStatus.PAST_MEMBER));
  }

  /**
   * Get users and events for conversations.
   *
   * @note To reduce the number of backend calls we merge the user IDs of all conversations first.
   * @param {Array<Conversation>} conversation_ets - Array of conversation entities to be updated
   * @returns {undefined} No return value
   */
  update_conversations(conversation_ets) {
    const user_ids = _.flatten(conversation_ets.map((conversation_et) => conversation_et.participating_user_ids()));

    this.user_repository.get_users_by_id(user_ids)
      .then(() => {
        conversation_ets.forEach((conversation_et) => this._fetch_users_and_events(conversation_et));
      });
  }

  /**
   * Map users to conversations without any backend requests.
   * @param {Array<Conversation>} conversation_ets - Array of conversation entities to be updated
   * @returns {undefined} No return value
   */
  update_conversations_offline(conversation_ets) {
    conversation_ets.map((conversation_et) => this.update_participating_user_ets(conversation_et, true));
  }


  //##############################################################################
  // Repository interactions
  //##############################################################################

  /**
   * Find a local conversation by ID.
   * @param {string} conversation_id - ID of conversation to get
   * @returns {Promise} Resolves with the conversation entity
   */
  find_conversation_by_id(conversation_id) {
    return Promise.resolve()
      .then(() => {
        if (!conversation_id) {
          throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.NO_CONVERSATION_ID);
        }

        const conversation_et = this._find_conversation_by_id(conversation_id);
        if (conversation_et) {
          return conversation_et;
        }

        throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.NOT_FOUND);
      });
  }

  /**
   * Check for conversation locally.
   * @param {string} conversation_id - ID of conversation to get
   * @returns {Conversation} Conversation is locally available
   */
  _find_conversation_by_id(conversation_id) {
    for (const conversation of this.conversations()) {
      if (conversation.id === conversation_id) {
        return conversation;
      }
    }
  }

  get_all_users_in_conversation(conversation_id) {
    return this.get_conversation_by_id_async(conversation_id)
      .then((conversation_et) => {
        return [this.user_repository.self()].concat(conversation_et.participating_user_ets());
      });
  }

  /**
   * Check for conversation locally.
   *
   * @deprecated
   * @note Deprecated legacy method, remove when last dependencies in wrapper has been removed
   * @param {string} conversation_id - ID of conversation to get
   * @returns {Conversation} Conversation is locally available
   */
  get_conversation_by_id(conversation_id) {
    return this._find_conversation_by_id(conversation_id);
  }

  /**
   * Check for conversation locally and fetch it from the server otherwise.
   * @param {string} conversation_id - ID of conversation to get
   * @returns {Promise} Resolves with the Conversation
   */
  get_conversation_by_id_async(conversation_id) {
    return this.find_conversation_by_id(conversation_id)
      .catch((error) => {
        if (error.type === z.conversation.ConversationError.TYPE.NOT_FOUND) {
          return this.fetch_conversation_by_id(conversation_id);
        }

        throw error;
      })
      .catch((error) => {
        if (error.type !== z.conversation.ConversationError.TYPE.NOT_FOUND) {
          this.logger.log(this.logger.levels.ERROR, `Failed to get conversation '${conversation_id}': ${error.message}`, error);
        }

        throw error;
      });
  }

  /**
   * Get group conversations by name.
   *
   * @param {string} query - Query to be searched in group conversation names
   * @param {boolean} is_username - Query string is username
   * @returns {Array<Conversation>} Matching group conversations
   */
  get_groups_by_name(query, is_username) {
    return this.sorted_conversations()
      .filter(function(conversation_et) {
        if (!conversation_et.is_group()) {
          return false;
        }

        if (is_username) {
          if (z.util.StringUtil.compare_transliteration(conversation_et.display_name(), `@${query}`)) {
            return true;
          }

          for (const user_et of conversation_et.participating_user_ets()) {
            if (z.util.StringUtil.starts_with(user_et.username(), query)) {
              return true;
            }
          }
        } else {
          if (z.util.StringUtil.compare_transliteration(conversation_et.display_name(), query)) {
            return true;
          }

          for (const user_et of conversation_et.participating_user_ets()) {
            if (z.util.StringUtil.compare_transliteration(user_et.name(), query)) {
              return true;
            }
          }
        }
        return false;
      })
      .sort(function(conversation_a, conversation_b) {
        const sort_query = is_username ? `@${query}` : query;
        return z.util.StringUtil.sort_by_priority(conversation_a.display_name(), conversation_b.display_name(), sort_query);
      });
  }

  /**
   * Get the next unarchived conversation.
   * @param {Conversation} conversation_et - Conversation to start from
   * @returns {Conversation} Next conversation
   */
  get_next_conversation(conversation_et) {
    return z.util.ArrayUtil.get_next_item(this.conversations_unarchived(), conversation_et);
  }

  /**
   * Get unarchived conversation with the most recent event.
   * @returns {Conversation} Most recent conversation
   */
  get_most_recent_conversation() {
    if (this.conversations_unarchived()) {
      return this.conversations_unarchived()[0];
    }
  }

  /**
   * Returns a list of sorted conversation ids based on the number of messages in the last 30 days.
   * @returns {Promise} Resolve with the most active conversations
   */
  get_most_active_conversations() {
    return this.conversation_service.get_active_conversations_from_db()
      .then((conversation_ids) => {
        return conversation_ids
          .map((conversation_id) => this._find_conversation_by_id(conversation_id))
          .filter((conversation_et) => conversation_et);
      });
  }

  /**
   * Get conversation with a user.
   * @param {User} user_et - User entity for whom to get the conversation
   * @returns {Promise} Resolves with the conversation with requested user
   */
  get_one_to_one_conversation(user_et) {
    for (const conversation_et of this.conversations()) {
      if ([z.conversation.ConversationType.ONE2ONE, z.conversation.ConversationType.CONNECT].includes(conversation_et.type())) {
        if (user_et.id === conversation_et.participating_user_ids()[0]) {
          return Promise.resolve(conversation_et);
        }
      }
    }

    return this.fetch_conversation_by_id(user_et.connection().conversation_id)
      .then((conversation_et) => {
        conversation_et.connection(user_et.connection());
        return this.update_participating_user_ets(conversation_et);
      });
  }

  /**
   * Check whether conversation is currently displayed.
   * @param {Conversation} conversation_et - Conversation to be saved
   * @returns {boolean} Is the conversation active
   */
  is_active_conversation(conversation_et) {
    if (this.active_conversation()) {
      return this.active_conversation().id === conversation_et.id;
    }
  }

  /**
   * Check whether message has been read.
   *
   * @param {string} conversation_id - Conversation ID
   * @param {string} message_id - Message ID
   * @returns {Promise} Resolves with true if message is marked as read
   */
  is_message_read(conversation_id, message_id) {
    if (!conversation_id || !message_id) {
      return Promise.resolve(false);
    }

    return this.get_conversation_by_id_async(conversation_id)
      .then((conversation_et) => {
        return this.get_message_in_conversation_by_id(conversation_et, message_id)
          .then((message_et) => conversation_et.last_read_timestamp() >= message_et.timestamp());
      })
      .catch(function(error) {
        if (error.type === z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          return true;
        }

        throw error;
      });
  }

  initialize_connections(connections_ets) {
    this.map_connections(connections_ets)
      .then(() => {
        this.logger.info('Updating group participants offline');
        this._init_state_updates();
        this.update_conversations_offline(this.conversations_unarchived());
        this.update_conversations_offline(this.conversations_archived());
        this.update_conversations_offline(this.conversations_cleared());
      });
  }

  /**
   * Maps user connection to the corresponding conversation.
   *
   * @note If there is no conversation it will request it from the backend
   * @param {Connection} connection_et - Connections
   * @param {boolean} [show_conversation=false] - Open the new conversation
   * @returns {Promise} Resolves when connection was mapped return value
   */
  map_connection(connection_et, show_conversation = false) {
    return this.find_conversation_by_id(connection_et.conversation_id)
      .catch((error) => {
        if (error.type !== z.conversation.ConversationError.TYPE.NOT_FOUND) {
          throw error;
        }

        if (connection_et.is_connected() || connection_et.is_outgoing_request()) {
          return this.fetch_conversation_by_id(connection_et.conversation_id);
        }

        throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.NOT_FOUND);
      })
      .then((conversation_et) => {
        conversation_et.connection(connection_et);

        if (connection_et.is_connected()) {
          conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        }

        this.update_participating_user_ets(conversation_et)
          .then(function(updated_conversation_et) {
            if (show_conversation) {
              amplify.publish(z.event.WebApp.CONVERSATION.SHOW, updated_conversation_et);
            }
          });

        return conversation_et;
      })
      .catch(function(error) {
        if (error.type !== z.conversation.ConversationError.TYPE.NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Maps user connections to the corresponding conversations.
   * @param {Array<Connection>} connection_ets - Connections entities
   * @returns {Promise} Resolves when connections have been mapped
   */
  map_connections(connection_ets) {
    this.logger.info(`Mapping '${connection_ets.length}' user connection(s) to conversations`, connection_ets);
    return Promise.all(connection_ets.map((connection_et) => this.map_connection(connection_et)));
  }

  /**
   * Mark conversation as read.
   * @param {Conversation} conversation_et - Conversation to be marked as read
   * @returns {undefined} No return value
   */
  mark_as_read(conversation_et) {
    if (this.block_event_handling || conversation_et === undefined) {
      return;
    }

    if (conversation_et.unread_event_count() === 0) {
      return;
    }

    const last_message = conversation_et.get_last_message();
    if (!last_message || last_message.type === z.event.Backend.CONVERSATION.MEMBER_UPDATE) {
      return;
    }

    this._update_last_read_timestamp(conversation_et);

    amplify.publish(z.event.WebApp.SYSTEM_NOTIFICATION.REMOVE_READ);
  }

  /**
   * Save a conversation in the repository.
   * @param {Conversation} conversation_et - Conversation to be saved in the repository
   * @returns {Promise} Resolves when conversation was saved
   */
  save_conversation(conversation_et) {
    return this.find_conversation_by_id(conversation_et.id)
      .catch((error) => {
        if (error.type !== z.conversation.ConversationError.TYPE.NOT_FOUND) {
          throw error;
        }

        this.conversations.push(conversation_et);
        return this.save_conversation_state_in_db(conversation_et);
      });
  }

  /**
   * Persists a conversation state in the database.
   * @param {Conversation} conversation_et - Conversation of which the state should be persisted
   * @returns {Promise} Resolves when conversation was saved
   */
  save_conversation_state_in_db(conversation_et) {
    return this.conversation_service.save_conversation_state_in_db(conversation_et);
  }

  /**
   * Save conversations in the repository.
   * @param {Array<Conversation>} conversation_ets - Conversations to be saved in the repository
   * @returns {undefined} No return value
   */
  save_conversations(conversation_ets) {
    z.util.ko_array_push_all(this.conversations, conversation_ets);
  }

  /**
   * Set the notification handling state.
   *
   * @note Temporarily do not unarchive conversations when handling the notification stream
   * @param {z.event.NOTIFICATION_HANDLING_STATE} handling_state - State of the notifications stream handling
   * @returns {undefined} No return value
   */
  set_notification_handling_state(handling_state) {
    const updated_handling_state = handling_state !== z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET;

    if (this.block_event_handling !== updated_handling_state) {
      this.block_event_handling = updated_handling_state;
      this.sending_queue.pause(this.block_event_handling);
      this.logger.info(`Block handling of conversation events: ${this.block_event_handling}`);
    }
  }

  /**
   * Update participating users in a conversation.
   *
   * @param {Conversation} conversation_et - Conversation to be updated
   * @param {boolean} [offline=false] - Should we only look for cached contacts
   * @returns {Promise} Resolves when users have been updated
   */
  update_participating_user_ets(conversation_et, offline = false) {
    return this.user_repository.get_users_by_id(conversation_et.participating_user_ids(), offline)
      .then((user_ets) => {
        conversation_et.self = this.user_repository.self();
        conversation_et.participating_user_ets(user_ets);
        return conversation_et;
      });
  }


  //##############################################################################
  // Send events
  //##############################################################################

  /**
   * Add a bot to an existing conversation.
   *
   * @param {Conversation} conversation_et - Conversation to add bot to
   * @param {string} provider_id - ID of bot provider
   * @param {string} service_id - ID of service provider
   * @returns {Promise} Resolves when bot was added
   */
  add_bot(conversation_et, provider_id, service_id) {
    return this.conversation_service.post_bots(conversation_et.id, provider_id, service_id)
      .then((response) => {
        amplify.publish(z.event.WebApp.EVENT.INJECT, response.event);
        this.logger.debug(`Successfully added bot to conversation '${conversation_et.display_name()}'`, response);
      });
  }

  /**
   * Add users to an existing conversation.
   *
   * @param {Conversation} conversation_et - Conversation to add users to
   * @param {Array<string>} user_ids - IDs of users to be added to the conversation
   * @returns {Promise} Resolves when members were added
   */
  add_members(conversation_et, user_ids) {
    return this.conversation_service.post_members(conversation_et.id, user_ids)
      .then((response) => amplify.publish(z.event.WebApp.EVENT.INJECT, response))
      .catch(function(error_response) {
        if (error_response.label === z.service.BackendClientError.LABEL.TOO_MANY_MEMBERS) {
          amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.TOO_MANY_MEMBERS, {
            data: {
              max: z.config.MAXIMUM_CONVERSATION_SIZE,
              open_spots: Math.max(0, z.config.MAXIMUM_CONVERSATION_SIZE - (conversation_et.number_of_participants() + 1)),
            },
          });
        }
      });
  }

  /**
   * Clear conversation content and archive the conversation.
   *
   * @note According to spec we archive a conversation when we clear it.
   * It will be unarchived once it is opened through search. We use the archive flag to distinguish states.
   *
   * @param {Conversation} conversation_et - Conversation to clear
   * @param {boolean} [leave=false] - Should we leave the conversation before clearing the content?
   * @returns {Promise} No return value
   */
  clear_conversation(conversation_et, leave = false) {
    const next_conversation_et = this.get_next_conversation(conversation_et);
    const promise = leave ? this.leave_conversation(conversation_et, next_conversation_et) : Promise.resolve();
    return promise
      .then(() => {
        this._update_cleared_timestamp(conversation_et);
        this._delete_messages(conversation_et);
        amplify.publish(z.event.WebApp.CONVERSATION.SHOW, next_conversation_et);
      });
  }

  /**
   * Update cleared of conversation using timestamp.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to update
   * @returns {undefined} No return value
   */
  _update_cleared_timestamp(conversation_et) {
    const cleared_timestamp = conversation_et.last_event_timestamp();

    if (conversation_et.set_timestamp(cleared_timestamp, z.conversation.ConversationUpdateType.CLEARED_TIMESTAMP)) {
      const message_content = new z.proto.Cleared(conversation_et.id, cleared_timestamp);
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.CLEARED, message_content);

      this.send_generic_message_to_conversation(this.self_conversation().id, generic_message)
        .then(() => {
          this.logger.info(`Cleared conversation '${conversation_et.id}' on '${new Date(cleared_timestamp).toISOString()}'`);
        });
    }
  }

  /**
   * Leave conversation.
   *
   * @param {Conversation} conversation_et - Conversation to leave
   * @param {Conversation} next_conversation_et - Next conversation in list
   * @returns {Promise} Resolves when the conversation was left
   */
  leave_conversation(conversation_et, next_conversation_et) {
    return this.conversation_service.delete_members(conversation_et.id, this.user_repository.self().id)
      .then((response) => {
        amplify.publish(z.event.WebApp.EVENT.INJECT, response);
        return this._on_member_leave(conversation_et, response);
      })
      .then(() => {
        return this.archive_conversation(conversation_et, next_conversation_et);
      });
  }

  /**
   * Remove bot from conversation.
   *
   * @param {Conversation} conversation_et - Conversation to remove member from
   * @param {string} bot_user_id - ID of bot to be removed from the conversation
   * @returns {Promise} Resolves when bot was removed from the conversation
   */
  remove_bot(conversation_et, bot_user_id) {
    return this.conversation_service.delete_bots(conversation_et.id, bot_user_id)
      .then(function(response) {
        if (response) {
          amplify.publish(z.event.WebApp.EVENT.INJECT, response);
          return response;
        }
      });
  }

  /**
   * Remove member from conversation.
   *
   * @param {Conversation} conversation_et - Conversation to remove member from
   * @param {string} user_id - ID of member to be removed from the conversation
   * @returns {Promise} Resolves when member was removed from the conversation
   */
  remove_member(conversation_et, user_id) {
    return this.conversation_service.delete_members(conversation_et.id, user_id)
      .then(function(response) {
        if (response) {
          amplify.publish(z.event.WebApp.EVENT.INJECT, response);
          return response;
        }
      });
  }

  /**
   * Remove participant from conversation.
   *
   * @param {Conversation} conversation_et - Conversation to remove participant from
   * @param {User} user_et - User to be removed from the conversation
   * @returns {Promise} Resolves when participant was removed from the conversation
   */
  remove_participant(conversation_et, user_et) {
    if (user_et.is_bot) {
      return this.remove_bot(conversation_et, user_et.id);
    }

    return this.remove_member(conversation_et, user_et.id);
  }

  /**
   * Rename conversation.
   *
   * @param {Conversation} conversation_et - Conversation to rename
   * @param {string} name - New conversation name
   * @returns {Promise} Resolves when conversation was renamed
   */
  rename_conversation(conversation_et, name) {
    return this.conversation_service.update_conversation_properties(conversation_et.id, name)
      .then((response) => {
        if (response) {
          amplify.publish(z.event.WebApp.EVENT.INJECT, response);
          return response;
        }
      });
  }

  reset_session(user_id, client_id, conversation_id) {
    this.logger.info(`Resetting session with client '${client_id}' of user '${user_id}'.`);

    return this.cryptography_repository.delete_session(user_id, client_id)
      .then((session_id) => {
        if (session_id) {
          this.logger.info(`Deleted session with client '${client_id}' of user '${user_id}'.`);
        } else {
          this.logger.warn('No local session found to delete.');
        }

        return this.send_session_reset(user_id, client_id, conversation_id);
      })
      .catch((error) => {
        this.logger.warn(`Failed to reset session for client '${client_id}' of user '${user_id}': ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Send a specific GIF to a conversation.
   *
   * @param {Conversation} conversation_et - Conversation to send message in
   * @param {string} url - URL of giphy image
   * @param {string} tag - tag tag used for gif search
   * @returns {Promise} Resolves when the gif was posted
   */
  send_gif(conversation_et, url, tag) {
    if (!tag) {
      tag = z.localization.Localizer.get_text(z.string.extensions_giphy_random);
    }

    const message = z.localization.Localizer.get_text({
      id: z.string.extensions_giphy_message,
      replace: {
        content: tag,
        placeholder: '%tag',
      },
    });

    return z.util.load_url_blob(url)
      .then((blob) => {
        this.send_text(message, conversation_et);
        return this.upload_images(conversation_et, [blob]);
      });
  }

  /**
   * Toggle a conversation between silence and notify.
   * @param {Conversation} conversation_et - Conversation to rename
   * @returns {Promise} Resolves when the muted stated was toggled
   */
  toggle_silence_conversation(conversation_et) {
    if (!conversation_et) {
      return Promise.reject(new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND));
    }

    let payload;
    if (conversation_et.is_muted()) {
      payload = {
        otr_muted: false,
        otr_muted_ref: new Date().toISOString(),
      };
    } else {
      payload = {
        otr_muted: true,
        otr_muted_ref: new Date(conversation_et.last_event_timestamp()).toISOString(),
      };
    }

    return this.conversation_service.update_member_properties(conversation_et.id, payload)
      .then(() => {
        const response = {
          data: payload,
        };

        this._on_member_update(conversation_et, response);
        this.logger.info(`Toggle silence to '${payload.otr_muted}' for conversation '${conversation_et.id}' on '${payload.otr_muted_ref}'`);
        return response;
      })
      .catch((error) => {
        const reject_error = new Error(`Conversation '${conversation_et.id}' could not be muted: ${error.code}`);
        this.logger.warn(reject_error.message, error);
        throw reject_error;
      });
  }

  /**
   * Archive a conversation.
   *
   * @param {Conversation} conversation_et - Conversation to rename
   * @param {Conversation} next_conversation_et - Next conversation to potentially switch to
   * @returns {Promise} Resolves when the conversation was archived
   */
  archive_conversation(conversation_et, next_conversation_et) {
    if (!conversation_et) {
      return Promise.reject(new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND));
    }

    const payload = {
      otr_archived: true,
      otr_archived_ref: new Date(conversation_et.last_event_timestamp()).toISOString(),
    };

    return this.conversation_service.update_member_properties(conversation_et.id, payload)
      .catch((error) => {
        this.logger.error(`Conversation '${conversation_et.id}' could not be archived: ${error.code}\r\nPayload: ${JSON.stringify(payload)}`, error);
        if (error.code !== z.service.BackendClientError.STATUS_CODE.NOT_FOUND) {
          throw error;
        }
      })
      .then(() => {
        this._on_member_update(conversation_et, {data: payload}, next_conversation_et);
        this.logger.info(`Archived conversation '${conversation_et.id}' locally on '${payload.otr_archived_ref}'`);
      });
  }

  /**
   * Un-archive a conversation.
   * @param {Conversation} conversation_et - Conversation to unarchive
   * @returns {Promise} Resolves when the conversation was unarchived
   */
  unarchive_conversation(conversation_et) {
    if (!conversation_et) {
      return Promise.reject(new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND));
    }

    const payload = {
      otr_archived: false,
      otr_archived_ref: new Date(conversation_et.last_event_timestamp()).toISOString(),
    };

    return this.conversation_service.update_member_properties(conversation_et.id, payload)
      .catch((error) => {
        this.logger.error(`Conversation '${conversation_et.id}' could not be unarchived: ${error.code}`);
        if (error.code !== z.service.BackendClientError.STATUS_CODE.NOT_FOUND) {
          throw error;
        }
      })
      .then(() => {
        this._on_member_update(conversation_et, {data: payload});
        this.logger.info(`Unarchived conversation '${conversation_et.id}' on '${payload.otr_archived_ref}'`);
      });

  }

  /**
   * Update last read of conversation using timestamp.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to update
   * @returns {undefined} No return value
   */
  _update_last_read_timestamp(conversation_et) {
    const last_message = conversation_et.get_last_message();
    const timestamp = last_message ? last_message.timestamp() : undefined;

    if (timestamp && conversation_et.set_timestamp(timestamp, z.conversation.ConversationUpdateType.LAST_READ_TIMESTAMP)) {
      const message_content = new z.proto.LastRead(conversation_et.id, conversation_et.last_read_timestamp());
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.LAST_READ, message_content);

      this.send_generic_message_to_conversation(this.self_conversation().id, generic_message)
        .then(() => {
          this.logger.info(`Marked conversation '${conversation_et.id}' as read on '${new Date(timestamp).toISOString()}'`);
        })
        .catch((error) => {
          this.logger.error(`Error (${error.label}): ${error.message}`);
          error = new Error('Event response is undefined');
          Raygun.send(error, {source: 'Sending encrypted last read'});
        });
    }
  }


  //##############################################################################
  // Send encrypted events
  //##############################################################################

  send_asset_remotedata(conversation_et, file, nonce) {
    let generic_message;

    return this.get_message_in_conversation_by_id(conversation_et, nonce)
      .then((message_et) => {
        const asset_et = message_et.get_first_asset();

        asset_et.uploaded_on_this_client(true);
        return this.asset_service.upload_asset(file, null, function(xhr) {
          xhr.upload.onprogress = (event) => asset_et.upload_progress(Math.round((event.loaded / event.total) * 100));
          asset_et.upload_cancel = () => xhr.abort();
        });
      })
      .then((asset) => {
        generic_message = new z.proto.GenericMessage(nonce);
        generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

        if (conversation_et.ephemeral_timer()) {
          generic_message = this._wrap_in_ephemeral_message(generic_message, conversation_et.ephemeral_timer());
        }

        return this.send_generic_message_to_conversation(conversation_et.id, generic_message);
      })
      .then(() => {
        const asset_data = conversation_et.ephemeral_timer() ? generic_message.ephemeral.asset : generic_message.asset;
        const event = this._construct_otr_event(conversation_et.id, z.event.Backend.CONVERSATION.ASSET_ADD);

        event.data.otr_key = asset_data.uploaded.otr_key;
        event.data.sha256 = asset_data.uploaded.sha256;
        event.data.key = asset_data.uploaded.asset_id;
        event.data.token = asset_data.uploaded.asset_token;
        event.id = nonce;

        return this._on_asset_upload_complete(conversation_et, event);
      });
  }

  /**
   * Send asset metadata message to specified conversation.
   *
   * @param {Conversation} conversation_et - Conversation that should receive the file
   * @param {File} file - File to send
   * @returns {Promise} Resolves when the asset metadata was sent
   */
  send_asset_metadata(conversation_et, file) {
    return z.assets.AssetMetaDataBuilder.build_metadata(file)
      .then(function(metadata) {
        const asset = new z.proto.Asset();

        if (z.assets.AssetMetaDataBuilder.is_audio(file)) {
          asset.set('original', new z.proto.Asset.Original(file.type, file.size, file.name, null, null, metadata));
        } else if (z.assets.AssetMetaDataBuilder.is_video(file)) {
          asset.set('original', new z.proto.Asset.Original(file.type, file.size, file.name, null, metadata));
        } else if (z.assets.AssetMetaDataBuilder.is_image(file)) {
          asset.set('original', new z.proto.Asset.Original(file.type, file.size, file.name, metadata));
        } else {
          asset.set('original', new z.proto.Asset.Original(file.type, file.size, file.name));
        }

        return asset;
      })
      .then((asset) => {
        let generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
        generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

        if (conversation_et.ephemeral_timer()) {
          generic_message = this._wrap_in_ephemeral_message(generic_message, conversation_et.ephemeral_timer());
        }

        return this._send_and_inject_generic_message(conversation_et, generic_message);
      })
      .catch((error) => {
        this.logger.warn(`Failed to upload metadata for asset in conversation ${conversation_et.id}: ${error.message}`, error);

        if (error.type === z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          throw error;
        }
      });
  }

  /**
   * Send asset preview message to specified conversation.
   *
   * @param {Conversation} conversation_et - Conversation that should receive the preview
   * @param {File} file - File to generate preview from
   * @param {string} message_id - Message ID of the message to generate a preview for
   * @returns {Promise} Resolves when the asset preview was sent
   */
  send_asset_preview(conversation_et, file, message_id) {
    return poster(file)
      .then((image_blob) => {
        if (!image_blob) {
          throw Error('No image available');
        }

        return this.asset_service.upload_asset(image_blob)
          .then((uploaded_image_asset) => {
            const asset = new z.proto.Asset();
            asset.set('preview', new z.proto.Asset.Preview(image_blob.type, image_blob.size, uploaded_image_asset.uploaded));

            const generic_message = new z.proto.GenericMessage(message_id);
            generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

            return this._send_and_inject_generic_message(conversation_et, generic_message);
          });
      })
      .catch((error) => {
        this.logger.info(`No preview for asset '${message_id}' in conversation uploaded ${conversation_et.id}`, error);
      });
  }

  /**
   * Send asset upload failed message to specified conversation.
   *
   * @param {Conversation} conversation_et - Conversation that should receive the file
   * @param {string} nonce - ID of the metadata message
   * @param {z.assets.AssetUploadFailedReason} [reason=z.assets.AssetUploadFailedReason.FAILED] - Cause for the failed upload (optional)
   * @returns {Promise} Resolves when the asset failure was sent
   */
  send_asset_upload_failed(conversation_et, nonce, reason = z.assets.AssetUploadFailedReason.FAILED) {
    const reason_proto = reason === z.assets.AssetUploadFailedReason.CANCELLED ? z.proto.Asset.NotUploaded.CANCELLED : z.proto.Asset.NotUploaded.FAILED;
    const asset = new z.proto.Asset();
    asset.set('not_uploaded', reason_proto);

    const generic_message = new z.proto.GenericMessage(nonce);
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

    return this._send_and_inject_generic_message(conversation_et, generic_message);
  }

  /**
   * Send confirmation for a content message in specified conversation.
   *
   * @param {Conversation} conversation_et - Conversation that content message was received in
   * @param {Message} message_et - Message for which to acknowledge receipt
   * @returns {undefined} No return value
   */
  send_confirmation_status(conversation_et, message_et) {
    if (!message_et.user().is_me && conversation_et.is_one2one() && z.event.EventTypeHandling.CONFIRM.includes(message_et.type)) {
      const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.CONFIRMATION, new z.proto.Confirmation(message_et.id, z.proto.Confirmation.Type.DELIVERED));

      this.sending_queue.push(() => {
        return this.create_user_client_map(conversation_et.id, true, [message_et.user().id])
          .then((user_client_map) => {
            return this._send_generic_message(conversation_et.id, generic_message, user_client_map, [message_et.user().id], false);
          });
      });
    }
  }

  /**
   * Send e-call message in specified conversation.
   *
   * @param {Conversation} conversation_et - Conversation to send e-call message to
   * @param {ECallMessage} e_call_message_et - E-call message
   * @param {Object} user_client_map - Contains the intended recipient users and clients
   * @param {Array<string>|boolean} precondition_option - Optional level that backend checks for missing clients
   * @returns {Promise} Resolves when the confirmation was sent
   */
  send_e_call(conversation_et, e_call_message_et, user_client_map, precondition_option) {
    const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.CALLING, new z.proto.Calling(e_call_message_et.to_content_string()));

    return this.sending_queue.push(() => {
      return this._send_generic_message(conversation_et.id, generic_message, user_client_map, precondition_option);
    })
    .then(() => {
      const initiating_call_message = [
        z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_START,
        z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP,
      ];

      if (initiating_call_message.includes(e_call_message_et.type)) {
        return this._track_completed_media_action(conversation_et, generic_message, e_call_message_et);
      }
    });
  }

  /**
   * Sends image asset in specified conversation using v3 api.
   *
   * @param {Conversation} conversation_et - Conversation to send image in
   * @param {File|Blob} image - Image
   * @returns {Promise} Resolves when the image was sent
   */
  send_image_asset(conversation_et, image) {
    return this.asset_service.upload_image_asset(image)
      .then((asset) => {
        let generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
        generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

        if (conversation_et.ephemeral_timer()) {
          generic_message = this._wrap_in_ephemeral_message(generic_message, conversation_et.ephemeral_timer());
        }

        return this._send_and_inject_generic_message(conversation_et, generic_message)
        .then(() => {
          this._track_completed_media_action(conversation_et, generic_message);
        });
      })
      .catch((error) => {
        this.logger.error(`Failed to upload otr asset for conversation ${conversation_et.id}: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Send knock in specified conversation.
   * @param {Conversation} conversation_et - Conversation to send knock in
   * @returns {Promise} Resolves after sending the knock
   */
  send_knock(conversation_et) {
    let generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.KNOCK, new z.proto.Knock(false));

    if (conversation_et.ephemeral_timer()) {
      generic_message = this._wrap_in_ephemeral_message(generic_message, conversation_et.ephemeral_timer());
    }

    return this._send_and_inject_generic_message(conversation_et, generic_message)
      .catch((error) => {
        if (error.type !== z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          this.logger.error(`Error while sending knock: ${error.message}`, error);
          throw error;
        }
      });
  }

  /**
   * Send link preview in specified conversation.
   *
   * @param {string} message - Plain text message that possibly contains link
   * @param {Conversation} conversation_et - Conversation that should receive the message
   * @param {z.protobuf.GenericMessage} generic_message - GenericMessage of containing text or edited message
   * @returns {Promise} Resolves after sending the message
   */
  send_link_preview(message, conversation_et, generic_message) {
    return this.link_repository.get_link_preview_from_string(message)
      .then((link_preview) => {
        if (link_preview) {
          switch (generic_message.content) {
            case z.cryptography.GENERIC_MESSAGE_TYPE.EPHEMERAL:
              generic_message.ephemeral.text.link_preview.push(link_preview);
              break;
            case z.cryptography.GENERIC_MESSAGE_TYPE.EDITED:
              generic_message.edited.text.link_preview.push(link_preview);
              break;
            case z.cryptography.GENERIC_MESSAGE_TYPE.TEXT:
              generic_message.text.link_preview.push(link_preview);
              break;
            default:
              break;
          }

          return this._send_and_inject_generic_message(conversation_et, generic_message);
        }
      });
  }

  /**
   * Send location message in specified conversation.
   *
   * @param {Conversation} conversation_et - Conversation that should receive the message
   * @param {number} longitude - Longitude of the location
   * @param {number} latitude - Latitude of the location
   * @param {string} name - Name of the location
   * @param {number} zoom - Zoom factor for the map (Google Maps)
   * @returns {Promise} Resolves after sending the location
   */
  send_location(conversation_et, longitude, latitude, name, zoom) {
    const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.LOCATION, new z.proto.Location(longitude, latitude, name, zoom));
    return this.send_generic_message_to_conversation(conversation_et.id, generic_message);
  }

  /**
   * Send edited message in specified conversation.
   *
   * @param {string} message - Edited plain text message
   * @param {Message} original_message_et - Original message entity
   * @param {Conversation} conversation_et - Conversation entity
   * @returns {Promise} Resolves after sending the message
   */
  send_message_edit(message, original_message_et, conversation_et) {
    if (original_message_et.get_first_asset().text === message) {
      return Promise.reject(new Error('Edited message equals original message'));
    }

    const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.EDITED, new z.proto.MessageEdit(original_message_et.id, new z.proto.Text(message)));

    return this._send_and_inject_generic_message(conversation_et, generic_message, false)
      .then(() => {
        this._track_edit_message(conversation_et, original_message_et);
        return this.send_link_preview(message, conversation_et, generic_message);
      })
      .catch((error) => {
        if (error.type !== z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          this.logger.error(`Error while editing message: ${error.message}`, error);
          throw error;
        }
      });
  }

  /**
   * Toggle like status of message.
   *
   * @param {Conversation} conversation_et - Conversation entity
   * @param {Message} message_et - Message to react to
   * @param {boolean} button - Source of toggle
   * @returns {undefined} No return value
   */
  toggle_like(conversation_et, message_et, button) {
    if (!conversation_et.removed_from_conversation()) {
      const reaction = message_et.is_liked() ? z.message.ReactionType.NONE : z.message.ReactionType.LIKE;
      message_et.is_liked(!message_et.is_liked());

      window.setTimeout(() => {
        this.send_reaction(conversation_et, message_et, reaction);
        this._track_reaction(conversation_et, message_et, reaction, button);
      }, 100);
    }
  }

  /**
   * Send reaction to a content message in specified conversation.
   * @param {Conversation} conversation_et - Conversation to send reaction in
   * @param {Message} message_et - Message to react to
   * @param {z.message.ReactionType} reaction - Reaction
   * @returns {Promise} Resolves after sending the reaction
   */
  send_reaction(conversation_et, message_et, reaction) {
    const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.REACTION, new z.proto.Reaction(reaction, message_et.id));

    return this._send_and_inject_generic_message(conversation_et, generic_message);
  }

  /**
   * Sending a message to the remote end of a session reset.
   *
   * @note When we reset a session then we must inform the remote client about this action. It sends a ProtocolBuffer message
   *  (which will not be rendered in the view)  to the remote client. This message only needs to be sent to the affected
   *  remote client, therefore we force the message sending.
   *
   * @param {string} user_id - User ID
   * @param {string} client_id - Client ID
   * @param {string} conversation_id - Conversation ID
   * @returns {Promise} Resolves after sending the session reset
   */
  send_session_reset(user_id, client_id, conversation_id) {
    const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.CLIENT_ACTION, z.proto.ClientAction.RESET_SESSION);

    const user_client_map = {};
    user_client_map[user_id] = [client_id];

    return this._send_generic_message(conversation_id, generic_message, user_client_map, true)
      .then((response) => {
        this.logger.info(`Sent info about session reset to client '${client_id}' of user '${user_id}'`);
        return response;
      })
      .catch((error) => {
        this.logger.error(`Sending conversation reset failed: ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Send text message in specified conversation.
   *
   * @param {string} message - Plain text message
   * @param {Conversation} conversation_et - Conversation that should receive the message
   * @returns {Promise} Resolves after sending the message
   */
  send_text(message, conversation_et) {
    let generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text(message));

    if (conversation_et.ephemeral_timer()) {
      generic_message = this._wrap_in_ephemeral_message(generic_message, conversation_et.ephemeral_timer());
    }

    return this._send_and_inject_generic_message(conversation_et, generic_message)
      .then(() => generic_message);
  }

  /**
   * Send text message with link preview in specified conversation.
   *
   * @param {string} message - Plain text message
   * @param {Conversation} conversation_et - Conversation that should receive the message
   * @returns {Promise} Resolves after sending the message
   */
  send_text_with_link_preview(message, conversation_et) {
    return this.send_text(message, conversation_et)
      .then((generic_message) => {
        return this.send_link_preview(message, conversation_et, generic_message);
      })
      .catch((error) => {
        if (error.type !== z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          this.logger.error(`Error while sending text message: ${error.message}`, error);
          throw error;
        }
      });
  }

  /**
   * Construct event payload.
   *
   * @private
   * @param {string} conversation_id - Conversation ID
   * @param {z.event.Backend} event_type - Event type
   * @returns {Object} Event payload
   */
  _construct_otr_event(conversation_id, event_type) {
    return {
      conversation: conversation_id,
      data: {},
      from: this.user_repository.self().id,
      status: z.message.StatusType.SENDING,
      time: new Date().toISOString(),
      type: event_type,
    };
  }

  /**
   * Map a user client maps.
   *
   * @private
   * @param {Object} user_client_map - User client map
   * @param {Function} client_fn - Function to be executed on clients first
   * @param {Function} user_fn - Function to be executed on users at the end
   * @returns {Array} Function array
   */
  _map_user_client_map(user_client_map, client_fn, user_fn) {
    const result = [];
    const user_ids = Object.keys(user_client_map);

    user_ids.forEach(function(user_id) {
      if (user_client_map.hasOwnProperty(user_id)) {
        const client_ids = user_client_map[user_id];

        if (_.isFunction(client_fn)) {
          client_ids.forEach((function(client_id) {
            result.push(client_fn(user_id, client_id));
          }));
        }

        if (_.isFunction(user_fn)) {
          result.push(user_fn(user_id));
        }
      }
    });

    return result;
  }

  /**
   * Wraps generic message in ephemeral message.
   *
   * @param {z.proto.GenericMessage} generic_message - Message to be wrapped
   * @param {number} millis - Expire time in milliseconds
   * @returns {z.proto.Message} New proto message
   */
  _wrap_in_ephemeral_message(generic_message, millis) {
    const ephemeral = new z.proto.Ephemeral();
    ephemeral.set('expire_after_millis', millis);
    ephemeral.set(generic_message.content, generic_message[generic_message.content]);

    generic_message = new z.proto.GenericMessage(generic_message.message_id);
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.EPHEMERAL, ephemeral);
    return generic_message;
  }


  //##############################################################################
  // Send Generic Messages
  //##############################################################################

  /**
   * Create a user client map for a given conversation.
   *
   * @param {string} conversation_id - Conversation ID
   * @param {boolean} [skip_own_clients=false] - True, if other own clients should be skipped (to not sync messages on own clients)
   * @param {Array<string>} user_ids - Optionally the intended recipient users
   * @returns {Promise} Resolves with a user client map
   */
  create_user_client_map(conversation_id, skip_own_clients = false, user_ids) {
    return this.get_all_users_in_conversation(conversation_id)
      .then(function(user_ets) {
        const user_client_map = {};

        for (const user_et of user_ets) {
          if (!(skip_own_clients && user_et.is_me)) {
            if (user_ids && user_ids.includes(user_et.id)) {
              continue;
            }

            user_client_map[user_et.id] = user_et.devices().map((client_et) => client_et.id);
          }
        }

        return user_client_map;
      });
  }

  send_generic_message_to_conversation(conversation_id, generic_message) {
    return this.sending_queue.push(() => {
      const skip_own_clients = generic_message.content === z.cryptography.GENERIC_MESSAGE_TYPE.EPHEMERAL;

      return this.create_user_client_map(conversation_id, skip_own_clients)
      .then((user_client_map) => {
        let precondition_option;

        if (skip_own_clients) {
          precondition_option = Object.keys(user_client_map);
        }

        return this._send_generic_message(conversation_id, generic_message, user_client_map, precondition_option);
      });
    });
  }

  _send_and_inject_generic_message(conversation_et, generic_message, sync_timestamp = true) {
    return Promise.resolve()
      .then(() => {
        if (conversation_et.removed_from_conversation()) {
          throw new Error('Cannot send message to conversation you are not part of');
        }

        const optimistic_event = this._construct_otr_event(conversation_et.id, z.event.Backend.CONVERSATION.MESSAGE_ADD);
        return this.cryptography_repository.cryptography_mapper.map_generic_message(generic_message, optimistic_event);
      })
      .then((mapped_event) => {
        if (z.event.EventTypeHandling.STORE.includes(mapped_event.type)) {
          return this.conversation_service.save_event(mapped_event);
        }

        return mapped_event;
      })
      .then((saved_event) => {
        if (generic_message.content === z.cryptography.GENERIC_MESSAGE_TYPE.KNOCK) {
          amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.OUTGOING_PING);
        }

        this.on_conversation_event(saved_event, z.event.EventRepository.NOTIFICATION_SOURCE.INJECTED);

        return this.send_generic_message_to_conversation(conversation_et.id, generic_message)
          .then((payload) => {
            if (z.event.EventTypeHandling.STORE.includes(saved_event.type)) {
              const backend_timestamp = sync_timestamp ? payload.time : undefined;
              this._update_message_sent_status(conversation_et, saved_event.id, backend_timestamp);
            }

            return this._track_completed_media_action(conversation_et, generic_message);
          })
          .then(() => saved_event);
      });
  }

  /**
   * Update message as sent in db and view.
   *
   * @param {Conversation} conversation_et - Conversation entity
   * @param {string} message_id - ID of message
   * @param {number} event_time - If defined it will update event timestamp
   * @returns {Promise} Resolves when sent status was updated
   */
  _update_message_sent_status(conversation_et, message_id, event_time) {
    return this.get_message_in_conversation_by_id(conversation_et, message_id)
      .then((message_et) => {
        const changes = {
          status: z.message.StatusType.SENT,
        };
        message_et.status(z.message.StatusType.SENT);

        if (event_time) {
          message_et.timestamp(new Date(event_time).getTime());
          changes.time = event_time;
        }

        return this.conversation_service.update_message_in_db(message_et, changes);
      });
  }

  /**
   * Send encrypted external message
   *
   * @param {string} conversation_id - Conversation ID
   * @param {z.protobuf.GenericMessage} generic_message - Generic message to be sent as external message
   * @param {Object} user_client_map - Optional object containing recipient users and their clients
   * @param {Array<string>|boolean} precondition_option - Optional level that backend checks for missing clients
   * @param {boolean} [native_push=true] - Optional if message should enforce native push
   * @returns {Promise} Resolves after sending the external message
   */
  _send_external_generic_message(conversation_id, generic_message, user_client_map, precondition_option, native_push = true) {
    this.logger.info(`Sending external message of type '${generic_message.content}'`, generic_message);

    return z.assets.AssetCrypto.encrypt_aes_asset(generic_message.toArrayBuffer())
      .then(({key_bytes, sha256, cipher_text}) => {
        const generic_message_external = new z.proto.GenericMessage(z.util.create_random_uuid());
        generic_message_external.set('external', new z.proto.External(new Uint8Array(key_bytes), new Uint8Array(sha256)));

        return this.cryptography_repository.encrypt_generic_message(user_client_map, generic_message_external)
          .then((payload) => {
            payload.data = z.util.array_to_base64(cipher_text);
            payload.native_push = native_push;
            return this._send_encrypted_message(conversation_id, generic_message, payload, precondition_option);
          });
      })
      .catch((error) => {
        this.logger.info('Failed sending external message', error);
        throw error;
      });
  }

  /**
   * Sends a generic message to a conversation.
   *
   * @private
   * @param {string} conversation_id - Conversation ID
   * @param {z.protobuf.GenericMessage} generic_message - Protobuf message to be encrypted and send
   * @param {Object} user_client_map - Optional object containing recipient users and their clients
   * @param {Array<string>|boolean} precondition_option - Optional level that backend checks for missing clients
   * @param {boolean} [native_push=true] - Optional if message should enforce native push
   * @returns {Promise} Resolves when the message was sent
   */
  _send_generic_message(conversation_id, generic_message, user_client_map, precondition_option, native_push = true) {
    return this._should_send_as_external(conversation_id, generic_message)
      .then((send_as_external) => {
        if (send_as_external) {
          return this._send_external_generic_message(conversation_id, generic_message, user_client_map, precondition_option, native_push);
        }

        return this.cryptography_repository.encrypt_generic_message(user_client_map, generic_message)
          .then((payload) => {
            payload.native_push = native_push;
            return this._send_encrypted_message(conversation_id, generic_message, payload, precondition_option);
          });
      })
      .catch((error) => {
        if (error.code === z.service.BackendClientError.STATUS_CODE.REQUEST_TOO_LARGE) {
          return this._send_external_generic_message(conversation_id, generic_message, user_client_map, precondition_option, native_push);
        }

        throw error;
      });
  }

  /**
   * Sends otr message to a conversation.
   *
   * @private
   * @note Options for the precondition check on missing clients are:
   *   'false' - all clients, 'Array<String>' - only clients of listed users, 'true' - force sending
   *
   * @param {string} conversation_id - Conversation ID
   * @param {z.protobuf.GenericMessage} generic_message - Protobuf message to be encrypted and send
   * @param {Object} payload - Payload
   * @param {Array<string>|boolean} precondition_option - Level that backend checks for missing clients
   * @returns {Promise} Promise that resolves after sending the encrypted message
   */
  _send_encrypted_message(conversation_id, generic_message, payload, precondition_option = false) {
    this.logger.info(`Sending encrypted '${generic_message.content}' message to conversation '${conversation_id}'`, payload);

    return this._grant_outgoing_message(conversation_id, generic_message)
      .then(() => {
        return this.conversation_service.post_encrypted_message(conversation_id, payload, precondition_option);
      })
      .then((response) => {
        this._handle_client_mismatch(conversation_id, response);
        return response;
      })
      .catch((error) => {
        if (!error.missing) {
          throw error;
        }

        let updated_payload;
        return this._handle_client_mismatch(conversation_id, error, generic_message, payload)
          .then((payload_with_missing_clients) => {
            updated_payload = payload_with_missing_clients;
            return this._grant_outgoing_message(conversation_id, generic_message, Object.keys(error.missing));
          })
          .then(() => {
            this.logger.info(`Sending updated encrypted '${generic_message.content}' message to conversation '${conversation_id}'`, updated_payload);
            return this.conversation_service.post_encrypted_message(conversation_id, updated_payload, true);
          });
      });
  }

  _grant_outgoing_message(conversation_id, generic_message, user_ids) {
    if (['cleared', 'confirmation', 'deleted', 'lastRead'].includes(generic_message.content)) {
      return Promise.resolve();
    }

    const consent_type = generic_message.content === z.cryptography.GENERIC_MESSAGE_TYPE.CALLING ? z.ViewModel.MODAL_CONSENT_TYPE.OUTGOING_CALL : z.ViewModel.MODAL_CONSENT_TYPE.MESSAGE;
    return this.grant_message(conversation_id, consent_type, user_ids);
  }

  grant_message(conversation_id, consent_type, user_ids) {
    return this.get_conversation_by_id_async(conversation_id)
      .then((conversation_et) => {
        if (conversation_et.verification_state() === z.conversation.ConversationVerificationState.DEGRADED) {
          return new Promise((resolve, reject) => {
            let send_anyway = false;

            if (!user_ids) {
              user_ids = conversation_et
                .get_users_with_unverified_clients()
                .map((user_et) => user_et.id);
            }

            return this.user_repository.get_users_by_id(user_ids)
              .then(function(user_ets) {
                amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.NEW_DEVICE, {
                  action() {
                    send_anyway = true;
                    conversation_et.verification_state(z.conversation.ConversationVerificationState.UNVERIFIED);

                    if (consent_type === z.ViewModel.MODAL_CONSENT_TYPE.INCOMING_CALL) {
                      amplify.publish(z.event.WebApp.CALL.STATE.JOIN, conversation_et.id);
                    }

                    resolve();
                  },
                  close() {
                    if (!send_anyway) {
                      if (consent_type === z.ViewModel.MODAL_CONSENT_TYPE.OUTGOING_CALL) {
                        amplify.publish(z.event.WebApp.CALL.STATE.DELETE, conversation_et.id);
                      }

                      reject(new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION));
                    }
                  },
                  data: {
                    consent_type: consent_type,
                    user_ets: user_ets,
                  },
                });
              });
          });
        }
      });
  }

  /**
   * Estimate whether message should be send as type external.
   *
   * @private
   * @param {string} conversation_id - Conversation ID
   * @param {z.protobuf.GenericMessage} generic_message - Generic message that will be send
   * @returns {boolean} Is payload likely to be too big so that we switch to type external?
   */
  _should_send_as_external(conversation_id, generic_message) {
    return this.get_conversation_by_id_async(conversation_id)
      .then(function(conversation_et) {
        const estimated_number_of_clients = conversation_et.number_of_participants() * 4;
        const message_in_bytes = new Uint8Array(generic_message.toArrayBuffer()).length;
        const estimated_payload_in_bytes = estimated_number_of_clients * message_in_bytes;

        return (estimated_payload_in_bytes / 1024) > 200;
      });
  }

  /**
   * Post images to a conversation.
   *
   * @param {Conversation} conversation_et - Conversation to post the images
   * @param {Array|FileList} images - Images
   * @returns {undefined} No return value
   */
  upload_images(conversation_et, images) {
    if (this._can_upload_assets_to_conversation(conversation_et)) {
      [...images].forEach((image) => this.send_image_asset(conversation_et, image));
    }
  }

  /**
   * Post files to a conversation.
   *
   * @param {Conversation} conversation_et - Conversation to post the files
   * @param {Array|FileList} files - files
   * @returns {undefined} No return value
   */
  upload_files(conversation_et, files) {
    if (this._can_upload_assets_to_conversation(conversation_et)) {
      [...files].forEach((file) => this.upload_file(conversation_et, file));
    }
  }

  /**
   * Post file to a conversation using v3
   *
   * @param {Conversation} conversation_et - Conversation to post the file
   * @param {Object} file - File object
   * @returns {Promise} Resolves when file was uploaded
   */
  upload_file(conversation_et, file) {
    let message_id;

    const upload_started = Date.now();
    const tracking_data = {
      size_bytes: file.size,
      size_mb: z.util.bucket_values((file.size / 1024 / 1024), [0, 5, 10, 15, 20, 25]),
      type: z.util.get_file_extension(file.name),
    };
    const conversation_type = z.tracking.helpers.get_conversation_type(conversation_et);
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_INITIATED,
      $.extend(tracking_data, {conversation_type}));

    return this.send_asset_metadata(conversation_et, file)
      .then(({id}) => {
        message_id = id;
        return this.send_asset_preview(conversation_et, file, message_id);
      })
      .then(() => {
        return this.send_asset_remotedata(conversation_et, file, message_id);
      })
      .then(() => {
        const upload_duration = (Date.now() - upload_started) / 1000;

        this.logger.info(`Finished to upload asset for conversation'${conversation_et.id} in ${upload_duration}`);
        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_SUCCESSFUL,
          $.extend(tracking_data, {time: upload_duration}));
      })
      .catch((error) => {
        if (error.type === z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          throw error;
        }

        amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.FILE.UPLOAD_FAILED, tracking_data);
        this.logger.error(`Failed to upload asset for conversation '${conversation_et.id}': ${error.message}`, error);
        return this.get_message_in_conversation_by_id(conversation_et, message_id)
          .then((message_et) => {
            this.send_asset_upload_failed(conversation_et, message_et.id);
            return this.update_message_as_upload_failed(message_et);
          });
      });
  }

  /**
   * Delete message for everyone.
   *
   * @param {Conversation} conversation_et - Conversation to delete message from
   * @param {Message} message_et - Message to delete
   * @param {Array<string>|boolean} precondition_option - Optional level that backend checks for missing clients
   * @returns {Promise} Resolves when message was deleted
   */
  delete_message_everyone(conversation_et, message_et, precondition_option) {
    return Promise.resolve()
      .then(() => {
        if (!message_et.user().is_me && !message_et.ephemeral_expires()) {
          throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_USER);
        }

        const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
        generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.DELETED, new z.proto.MessageDelete(message_et.id));

        return this.sending_queue.push(() => {
          return this.create_user_client_map(conversation_et.id, false, precondition_option)
            .then((user_client_map) => {
              return this._send_generic_message(conversation_et.id, generic_message, user_client_map, precondition_option);
            });
        });
      })
      .then(() => {
        return this._track_delete_message(conversation_et, message_et, z.tracking.attribute.DeleteType.EVERYWHERE);
      })
      .then(() => {
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, message_et.id);
        return this._delete_message_by_id(conversation_et, message_et.id);
      })
      .catch((error) => {
        this.logger.info(`Failed to send delete message for everyone with id '${message_et.id}' for conversation '${conversation_et.id}'`, error);
        throw error;
      });
  }

  /**
   * Delete message on your own clients.
   *
   * @param {Conversation} conversation_et - Conversation to delete message from
   * @param {Message} message_et - Message to delete
   * @returns {Promise} Resolves when message was deleted
   */
  delete_message(conversation_et, message_et) {
    return Promise.resolve()
      .then(() => {
        const generic_message = new z.proto.GenericMessage(z.util.create_random_uuid());
        generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.HIDDEN, new z.proto.MessageHide(conversation_et.id, message_et.id));

        return this.send_generic_message_to_conversation(this.self_conversation().id, generic_message);
      })
      .then(() => {
        return this._track_delete_message(conversation_et, message_et, z.tracking.attribute.DeleteType.LOCAL);
      })
      .then(() => {
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, message_et.id);
        return this._delete_message_by_id(conversation_et, message_et.id);
      })
      .catch((error) => {
        this.logger.info(`Failed to send delete message with id '${message_et.id}' for conversation '${conversation_et.id}'`, error);
        throw error;
      });
  }

  /**
   * Check the remaining lifetime for a given ephemeral message.
   * @param {Message} message_et - Message to check
   * @returns {undefined} No return value
   */
  check_ephemeral_timer(message_et) {
    switch (message_et.ephemeral_status()) {
      case z.message.EphemeralStatusType.TIMED_OUT:
        this.timeout_ephemeral_message(message_et);
        break;
      case z.message.EphemeralStatusType.ACTIVE:
        message_et.start_ephemeral_timer();
        break;
      case z.message.EphemeralStatusType.INACTIVE:
        message_et.start_ephemeral_timer();
        this.conversation_service.update_message_in_db(message_et, {ephemeral_expires: message_et.ephemeral_expires(), ephemeral_started: message_et.ephemeral_started()});
        break;
      default:
        this.logger.warn(`Ephemeral message of unsupported type: ${message_et.type}`);
    }
  }

  timeout_ephemeral_message(message_et) {
    if (!message_et.is_expired()) {
      this.get_conversation_by_id_async(message_et.conversation_id)
        .then((conversation_et) => {
          if (message_et.user().is_me) {
            switch (false) {
              case !message_et.has_asset_text():
                return this._obfuscate_text_message(conversation_et, message_et.id);
              case !message_et.is_ping():
                return this._obfuscate_ping_message(conversation_et, message_et.id);
              case !message_et.has_asset():
                return this._obfuscate_asset_message(conversation_et, message_et.id);
              case !message_et.has_asset_image():
                return this._obfuscate_image_message(conversation_et, message_et.id);
              default:
                return this.logger.warn(`Ephemeral message of unsupported type: ${message_et.type}`);
            }
          }

          if (conversation_et.is_group()) {
            const user_ids = _.union([this.user_repository.self().id], [message_et.from]);
            return this.delete_message_everyone(conversation_et, message_et, user_ids);
          }

          return this.delete_message_everyone(conversation_et, message_et);
        });
    }
  }

  _obfuscate_asset_message(conversation_et, message_id) {
    return this.get_message_in_conversation_by_id(conversation_et, message_id)
      .then((message_et) => {
        const asset = message_et.get_first_asset();
        message_et.ephemeral_expires(true);

        return this.conversation_service.update_message_in_db(message_et, {
          data: {
            content_type: asset.file_type,
            info: {
              nonce: message_et.nonce,
            },
            meta: {},
          },
          ephemeral_expires: true,
        });
      })
      .then(() => {
        this.logger.info(`Obfuscated asset message '${message_id}'`);
      });
  }

  _obfuscate_image_message(conversation_et, message_id) {
    return this.get_message_in_conversation_by_id(conversation_et, message_id)
      .then((message_et) => {
        const asset = message_et.get_first_asset();
        message_et.ephemeral_expires(true);

        return this.conversation_service.update_message_in_db(message_et, {
          data: {
            info: {
              height: asset.height,
              nonce: message_et.nonce,
              tag: 'medium',
              width: asset.width,
            },
          },
          ephemeral_expires: true,
        });
      })
      .then(() => {
        this.logger.info(`Obfuscated image message '${message_id}'`);
      });
  }

  _obfuscate_text_message(conversation_et, message_id) {
    return this.get_message_in_conversation_by_id(conversation_et, message_id)
      .then((message_et) => {
        const asset = message_et.get_first_asset();
        const obfuscated = new z.entity.Text(message_et.id);
        obfuscated.previews(asset.previews());
        if (obfuscated.previews().length === 0) {
          obfuscated.text = z.util.StringUtil.obfuscate(asset.text);
        }

        message_et.assets([obfuscated]);
        message_et.ephemeral_expires(true);

        return this.conversation_service.update_message_in_db(message_et, {
          data: {
            content: obfuscated.text,
            nonce: obfuscated.id,
          },
          ephemeral_expires: true,
        });
      })
      .then(() => {
        this.logger.info(`Obfuscated text message '${message_id}'`);
      });
  }

  _obfuscate_ping_message(conversation_et, message_id) {
    return this.get_message_in_conversation_by_id(conversation_et, message_id)
      .then((message_et) => {
        message_et.ephemeral_expires(true);
        return this.conversation_service.update_message_in_db(message_et, {ephemeral_expires: true});
      })
      .then(() => {
        this.logger.info(`Obfuscated ping message '${message_id}'`);
      });
  }

  /**
   * Can user upload assets to conversation.
   * @param {Conversation} conversation_et - Conversation to check
   * @returns {boolean} Can assets be uploaded
   */
  _can_upload_assets_to_conversation(conversation_et) {
    if (!conversation_et || conversation_et.is_request() || conversation_et.removed_from_conversation()) {
      return false;
    }

    if (conversation_et.is_one2one() && !conversation_et.connection().is_connected) {
      return false;
    }

    return true;
  }

  /**
   * Count number of pending uploads
   * @returns {number} Number of pending uploads
   */
  get_number_of_pending_uploads() {
    return this.conversations().reduce((sum, conversation_et) => sum + conversation_et.get_number_of_pending_uploads()
    , 0);
  }


  //##############################################################################
  // Event callbacks
  //##############################################################################

  /**
   * Listener for incoming events.
   *
   * @param {Object} event_json - JSON data for event
   * @param {z.event.EventRepository.NOTIFICATION_SOURCE} source - Source of event
   * @returns {Promise} Resolves when event was handled
   */
  on_conversation_event(event_json, source = z.event.EventRepository.NOTIFICATION_SOURCE.STREAM) {
    if (!event_json) {
      return Promise.reject(new Error('Conversation Repository Event Handling: Event missing'));
    }

    const {conversation: conversation_id, type} = event_json;
    this.logger.info(`»» Event: '${type}'`, {event_json: JSON.stringify(event_json), event_object: event_json});

    // Ignore 'conversation.member-join if we join a 1to1 conversation (accept a connection request)
    if (type === z.event.Backend.CONVERSATION.MEMBER_JOIN) {
      const connection_et = this.user_repository.get_connection_by_conversation_id(conversation_id);
      if (connection_et && connection_et.status() === z.user.ConnectionStatus.PENDING) {
        return Promise.resolve();
      }
    }

    // Handle conversation create event separately
    if (type === z.event.Backend.CONVERSATION.CREATE) {
      return this._on_create(event_json);
    }

    // Check if conversation was archived
    let previously_archived;
    return this.get_conversation_by_id_async(conversation_id)
      .then((conversation_et) => {
        previously_archived = conversation_et.is_archived();

        switch (type) {
          case z.event.Backend.CONVERSATION.MEMBER_JOIN:
            return this._on_member_join(conversation_et, event_json);
          case z.event.Backend.CONVERSATION.MEMBER_LEAVE:
            return this._on_member_leave(conversation_et, event_json);
          case z.event.Backend.CONVERSATION.MEMBER_UPDATE:
            return this._on_member_update(conversation_et, event_json);
          case z.event.Backend.CONVERSATION.MESSAGE_ADD:
            return this._on_message_add(conversation_et, event_json);
          case z.event.Backend.CONVERSATION.RENAME:
            return this._on_rename(conversation_et, event_json);
          case z.event.Client.CONVERSATION.ASSET_UPLOAD_COMPLETE:
            return this._on_asset_upload_complete(conversation_et, event_json);
          case z.event.Client.CONVERSATION.ASSET_UPLOAD_FAILED:
            return this._on_asset_upload_failed(conversation_et, event_json);
          case z.event.Client.CONVERSATION.ASSET_PREVIEW:
            return this._on_asset_preview(conversation_et, event_json);
          case z.event.Client.CONVERSATION.CONFIRMATION:
            return this._on_confirmation(conversation_et, event_json);
          case z.event.Client.CONVERSATION.MESSAGE_DELETE:
            return this._on_message_deleted(conversation_et, event_json);
          case z.event.Client.CONVERSATION.MESSAGE_HIDDEN:
            return this._on_message_hidden(event_json);
          case z.event.Client.CONVERSATION.REACTION:
            return this._on_reaction(conversation_et, event_json);
          default:
            return this._on_add_event(conversation_et, event_json);
        }
      })
      .then((return_value) => {
        if (_.isObject(return_value)) {
          const {conversation_et, message_et} = return_value;

          const event_from_stream = source === z.event.EventRepository.NOTIFICATION_SOURCE.STREAM;
          if (message_et && !event_from_stream && !this.block_event_handling) {
            amplify.publish(z.event.WebApp.SYSTEM_NOTIFICATION.NOTIFY, conversation_et, message_et);
          }

          const event_from_web_socket = source === z.event.EventRepository.NOTIFICATION_SOURCE.WEB_SOCKET;
          if (conversation_et && event_from_web_socket) {
            // Un-archive it also on the backend side
            if (previously_archived && !conversation_et.is_archived()) {
              this.logger.info(`Un-archiving conversation '${conversation_et.id}' with new event`);
              return this.unarchive_conversation(conversation_et);
            }
          }
        }
      });
  }

  /**
   * Add missed events message to conversations.
   * @returns {undefined} No return value
   */
  on_missed_events() {
    this.filtered_conversations()
      .filter((conversation_et) => !conversation_et.removed_from_conversation())
      .forEach((conversation_et) => amplify.publish(z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_missed(conversation_et, this.user_repository.self())));
  }

  /**
   * Push to receiving queue.
   * @param {Object} event_json - JSON data for event
   * @param {z.event.EventRepository.NOTIFICATION_SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  push_to_receiving_queue(event_json, source) {
    this.receiving_queue.push(() => this.on_conversation_event(event_json, source));
  }

  /**
   * A message or ping received in a conversation.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to add the event to
   * @param {Object} event_json - JSON data of 'conversation.message-add' or 'conversation.knock' event
   * @returns {Promise} Resolves when event was handled
   */
  _on_add_event(conversation_et, event_json) {
    return this._add_event_to_conversation(event_json, conversation_et)
      .then((message_et) => {
        this.send_confirmation_status(conversation_et, message_et);
        return {conversation_et: conversation_et, message_et: message_et};
      });
  }

  /**
   * An asset preview was send.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to add the event to
   * @param {Object} event_json - JSON data of 'conversation.asset-upload-failed' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_asset_preview(conversation_et, event_json) {
    return this.get_message_in_conversation_by_id(conversation_et, event_json.id)
      .then((message_et) => {
        return this.update_message_with_asset_preview(conversation_et, message_et, event_json.data);
      })
      .catch((error) => {
        if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          throw error;
        }

        this.logger.error(`Asset preview: Could not find message with id '${event_json.id}'`, event_json);
      });
  }

  /**
   * An asset was uploaded.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to add the event to
   * @param {Object} event_json - JSON data of 'conversation.asset-upload-complete' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_asset_upload_complete(conversation_et, event_json) {
    return this.get_message_in_conversation_by_id(conversation_et, event_json.id)
      .then((message_et) => {
        return this.update_message_as_upload_complete(conversation_et, message_et, event_json.data);
      })
      .catch((error) => {
        if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          throw error;
        }

        return this.logger.error(`Upload complete: Could not find message with id '${event_json.id}'`, event_json);
      });
  }

  /**
   * An asset failed.
   * @private
   * @param {Conversation} conversation_et - Conversation to add the event to
   * @param {Object} event_json - JSON data of 'conversation.asset-upload-failed' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_asset_upload_failed(conversation_et, event_json) {
    return this.get_message_in_conversation_by_id(conversation_et, event_json.id)
      .then((message_et) => {
        if (event_json.data.reason === z.assets.AssetUploadFailedReason.CANCELLED) {
          return this._delete_message_by_id(conversation_et, message_et.id);
        }

        return this.update_message_as_upload_failed(message_et);
      })
      .catch((error) => {
        if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          throw error;
        }

        return this.logger.error(`Upload failed: Could not find message with id '${event_json.id}'`, event_json);
      });
  }

  /**
   * Received confirmation of message.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation entity that a message was reacted upon in
   * @param {Object} event_json - JSON data of 'conversation.confirmation' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_confirmation(conversation_et, event_json) {
    return this.get_message_in_conversation_by_id(conversation_et, event_json.data.message_id)
     .then((message_et) => {
       const was_updated = message_et.update_status(event_json.data.status);

       if (was_updated) {
         return this.conversation_service.update_message_in_db(message_et, {status: message_et.status()});
       }
     })
     .catch((error) => {
       if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
         this.logger.info(`Failed to handle status update of a message in conversation '${conversation_et.id}'`, error);
         throw error;
       }
     });
  }

  /**
   * A conversation was created.
   *
   * @private
   * @param {Object} event_json - JSON data of 'conversation.create' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_create(event_json) {
    return this.find_conversation_by_id(event_json.conversation)
      .catch((error) => {
        if (error.type !== z.conversation.ConversationError.TYPE.NOT_FOUND) {
          throw error;
        }

        return this.update_participating_user_ets(this.conversation_mapper.map_conversation(event_json))
          .then((conversation_et) => {
            return this.save_conversation(conversation_et);
          })
          .then((conversation_et) => {
            return this._prepare_conversation_create_notification(conversation_et);
          });
      });
  }

  /**
   * User were added to a group conversation.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to add users to
   * @param {Object} event_json - JSON data of 'conversation.member-join' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_member_join(conversation_et, event_json) {
    const event_data = event_json.data;

    event_data.user_ids.forEach((user_id) => {
      if (user_id !== this.user_repository.self().id && !conversation_et.participating_user_ids().includes(user_id)) {
        conversation_et.participating_user_ids.push(user_id);
      }
    });

    // Self user joins again
    if (event_json.data.user_ids.includes(this.user_repository.self().id)) {
      conversation_et.status(z.conversation.ConversationStatus.CURRENT_MEMBER);
    }

    return this.update_participating_user_ets(conversation_et)
      .then(() => {
        return this._add_event_to_conversation(event_json, conversation_et);
      })
      .then((message_et) => {
        this.verification_state_handler.on_member_joined(conversation_et, event_json.data.user_ids);
        return {conversation_et: conversation_et, message_et: message_et};
      });
  }

  /**
   * Members of a group conversation were removed or left.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to remove users from
   * @param {Object} event_json - JSON data of 'conversation.member-leave' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_member_leave(conversation_et, event_json) {
    return this._add_event_to_conversation(event_json, conversation_et)
      .then((message_et) => {
        message_et.user_ets().forEach((user_et) => {
          if (user_et.is_me) {
            conversation_et.status(z.conversation.ConversationStatus.PAST_MEMBER);
            if (conversation_et.call()) {
              amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, conversation_et.id, z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE);
            }
          } else {
            conversation_et.participating_user_ids.remove(user_et.id);
            if (conversation_et.call()) {
              amplify.publish(z.event.WebApp.CALL.STATE.PARTICIPANT_LEFT, conversation_et.id, user_et.id);
            }
          }
        });

        return this.update_participating_user_ets(conversation_et)
          .then(() => {
            this.verification_state_handler.on_member_left(conversation_et, message_et.user_ids());
            return {conversation_et: conversation_et, message_et: message_et};
          });
      });
  }

  /**
   * Membership properties for a conversation were updated.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation entity that will be updated
   * @param {Object} event_json - JSON data of 'conversation.member-update' event
   * @param {Conversation} [next_conversation_et] - Next conversation in list
   * @returns {Promise} Resolves when the event was handled
   */
  _on_member_update(conversation_et, event_json, next_conversation_et) {
    const previously_archived = conversation_et.is_archived();

    if (!next_conversation_et) {
      next_conversation_et = this.get_next_conversation(conversation_et);
    }

    this.conversation_mapper.update_self_status(conversation_et, event_json.data);

    if (previously_archived && !conversation_et.is_archived()) {
      return this._fetch_users_and_events(conversation_et);
    } else if (conversation_et.is_archived()) {
      amplify.publish(z.event.WebApp.CONVERSATION.SWITCH, conversation_et, next_conversation_et);
    }
  }

  /**
   * A text message received in a conversation.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to add the event to
   * @param {Object} event_json - JSON data of 'conversation.message-add'
   * @returns {Promise} Resolves when the event was handled
   */
  _on_message_add(conversation_et, event_json) {
    return Promise.resolve()
      .then(() => {
        if (event_json.data.previews.length) {
          return this._update_link_preview(conversation_et, event_json);
        }

        if (event_json.data.replacing_message_id) {
          return this._update_edited_message(conversation_et, event_json);
        }

        return event_json;
      })
      .then((updated_event_json) => {
        return this._on_add_event(conversation_et, updated_event_json);
      })
      .catch(function(error) {
        if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * A hide message received in a conversation.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to add the event to
   * @param {Object} event_json - JSON data of 'conversation.message-delete'
   * @returns {Promise} Resolves when the event was handled
   */
  _on_message_deleted(conversation_et, event_json) {
    return this.get_message_in_conversation_by_id(conversation_et, event_json.data.message_id)
      .then((message_to_delete_et) => {
        if (message_to_delete_et.ephemeral_expires()) {
          return;
        }

        if (event_json.from !== message_to_delete_et.from) {
          throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_USER);
        }

        if (event_json.from !== this.user_repository.self().id) {
          return this._add_delete_message(conversation_et.id, event_json.id, event_json.time, message_to_delete_et);
        }
      })
      .then(() => {
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, event_json.data.message_id);
        return this._delete_message_by_id(conversation_et, event_json.data.message_id);
      })
      .catch((error) => {
        if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          this.logger.info(`Failed to delete message for conversation '${conversation_et.id}'`, error);
          throw error;
        }
      });
  }

  /**
   * A hide message received in a conversation.
   *
   * @private
   * @param {Object} event_json - JSON data of 'conversation.message-hidden'
   * @returns {Promise} Resolves when the event was handled
   */
  _on_message_hidden(event_json) {
    const {data: event_data, from} = event_json;
    if (from !== this.user_repository.self().id) {
      return Promise.reject(new Error('Cannot hide message: Sender is not self user'));
    }

    return this.get_conversation_by_id_async(event_data.conversation_id)
      .then((conversation_et) => {
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, event_data.message_id);
        return this._delete_message_by_id(conversation_et, event_data.message_id);
      })
      .catch((error) => {
        this.logger.info(`Failed to delete message '${event_data.message_id}' for conversation '${event_data.conversation_id}'`, error);
        throw error;
      });
  }

  /**
   * Someone reacted to a message.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation entity that a message was reacted upon in
   * @param {Object} event_json - JSON data of 'conversation.reaction' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_reaction(conversation_et, event_json) {
    return this.get_message_in_conversation_by_id(conversation_et, event_json.data.message_id)
      .then((message_et) => {
        const changes = message_et.update_reactions(event_json);

        if (changes) {
          this.logger.debug(`Updating reactions to message '${event_json.data.message_id}' in conversation '${conversation_et.id}'`, event_json);
          return this._update_user_ets(message_et)
            .then((updated_message_et) => {
              this.conversation_service.update_message_in_db(updated_message_et, changes, conversation_et.id);
              return this._prepare_reaction_notification(conversation_et, updated_message_et, event_json);
            });
        }
      })
      .catch((error) => {
        if (error.type === z.storage.StorageError.TYPE.NON_SEQUENTIAL_UPDATE) {
          Raygun.send('Failed sequential database update');
        }

        if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          this.logger.error(`Failed to handle reaction to message '${event_json.data.message_id}' in conversation '${conversation_et.id}'`, {error, event: event_json});
          throw error;
        }
      });
  }

  /**
   * A conversation was renamed.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation entity that will be renamed
   * @param {Object} event_json - JSON data of 'conversation.rename' event
   * @returns {Promise} Resolves when the event was handled
   */
  _on_rename(conversation_et, event_json) {
    return this._add_event_to_conversation(event_json, conversation_et)
      .then((message_et) => {
        this.conversation_mapper.update_properties(conversation_et, event_json.data);
        return {conversation_et: conversation_et, message_et: message_et};
      });
  }


  //##############################################################################
  // Private
  //##############################################################################

  /**
   * Convert a JSON event into an entity and add it to a given conversation.
   *
   * @private
   * @param {Object} json - Event data
   * @param {Conversation} conversation_et - Conversation entity the event will be added to
   * @returns {Promise} Promise that resolves with the message entity for the event
   */
  _add_event_to_conversation(json, conversation_et) {
    return this._update_user_ets(this.event_mapper.map_json_event(json, conversation_et, true))
      .then((message_et) => {
        if (conversation_et) {
          conversation_et.add_message(message_et);
        }

        return message_et;
      });
  }

  /**
   * Convert multiple JSON events into entities and add them to a given conversation.
   *
   * @private
   * @param {Array} events - Event data
   * @param {Conversation} conversation_et - Conversation entity the events will be added to
   * @param {boolean} [prepend=true] - Should existing messages be prepended
   * @returns {Promise} Resolves with an array of mapped messages
   */
  _add_events_to_conversation(events, conversation_et, prepend = true) {
    return Promise.resolve()
      .then(() => {
        const message_ets = this.event_mapper.map_json_events(events, conversation_et, true);
        return Promise.all(message_ets.map((message_et) => this._update_user_ets(message_et)));
      })
      .then(function(message_ets) {
        if (prepend && conversation_et.messages().length) {
          conversation_et.prepend_messages(message_ets);
        } else {
          conversation_et.add_messages(message_ets);
        }

        return message_ets;
      });
  }

  /**
   * Fetch all unread events and users of a conversation.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation fetch events and users for
   * @returns {undefined} No return value
   */
  _fetch_users_and_events(conversation_et) {
    if (!conversation_et.is_loaded() && !conversation_et.is_pending()) {
      this.update_participating_user_ets(conversation_et);
      this._get_unread_events(conversation_et);
    }
  }

  /**
   * Forward the 'conversation.create' event to the SystemNotification repository for browser and audio notifications.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation that was created
   * @returns {Promise} Resolves when the notification was prepared
   */
  _prepare_conversation_create_notification(conversation_et) {
    return this.user_repository.get_user_by_id(conversation_et.creator)
      .then(function(user_et) {
        const message_et = new z.entity.MemberMessage();
        message_et.user(user_et);
        message_et.member_message_type = z.message.SystemMessageType.CONVERSATION_CREATE;
        return {conversation_et: conversation_et, message_et: message_et};
      });
  }

  /**
   * Forward the reaction event to the SystemNotification repository for browser and audio notifications.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation that event was received in
   * @param {Message} message_et - Message that has been reacted upon
   * @param {Object} event_json -] JSON data of received reaction event
   * @returns {Promise} Resolves when the notification was prepared
   */
  _prepare_reaction_notification(conversation_et, message_et, event_json) {
    const {data: event_data, from} = event_json;

    if (event_data.reaction && message_et.from === this.user_repository.self().id) {
      return this.user_repository.get_user_by_id(from)
        .then(function(user_et) {
          const reaction_message_et = new z.entity.Message(message_et.id, z.message.SuperType.REACTION);
          reaction_message_et.user(user_et);
          reaction_message_et.reaction = event_data.reaction;
          return {conversation_et: conversation_et, message_et: reaction_message_et};
        });
    }

    return Promise.resolve({conversation_et: conversation_et});
  }

  /**
   * Updates the user entities that are part of a message.
   *
   * @private
   * @param {Message} message_et - Message to be updated
   * @returns {Promise} Resolves when users have been update
   */
  _update_user_ets(message_et) {
    return this.user_repository.get_user_by_id(message_et.from)
      .then((user_et) => {
        message_et.user(user_et);

        if (message_et.is_member() || message_et.user_ets) {
          return this.user_repository.get_users_by_id(message_et.user_ids())
            .then(function(user_ets) {
              message_et.user_ets(user_ets);
              return message_et;
            });
        }

        if (message_et.reactions) {
          const user_ids = Object.keys(message_et.reactions());

          message_et.reactions_user_ets.removeAll();
          if (user_ids.length) {
            return this.user_repository.get_users_by_id(user_ids)
              .then(function(user_ets) {
                message_et.reactions_user_ets(user_ets);
                return message_et;
              });
          }
        }

        if (message_et.has_asset_text()) {
          message_et.assets().forEach(function(asset_et) {
            if (asset_et.is_text()) {
              asset_et.theme_color = message_et.user().accent_color();
            }
          });
        }

        return message_et;
      });
  }

  /**
   * Cancel asset upload.
   * @param {Message} message_et - Message on which the cancel was initiated
   * @returns {undefined} No return value
   */
  cancel_asset_upload(message_et) {
    this.send_asset_upload_failed(this.active_conversation(), message_et.id, z.assets.AssetUploadFailedReason.CANCELLED);
  }

  /**
   * Handle client mismatch response from backend.
   *
   * @note As part of 412 or general response when sending encrypted message
   * @param {string} conversation_id - ID of conversation message was sent int
   * @param {Object} client_mismatch - Client mismatch object containing client user maps for deleted, missing and obsolete clients
   * @param {z.proto.GenericMessage} generic_message - Optionally the GenericMessage that was sent
   * @param {Object} payload - Optionally the initial payload that was sent resulting in a 412
   * @returns {Promise} Resolve when mistmatch was handled
   */
  _handle_client_mismatch(conversation_id, client_mismatch, generic_message, payload) {
    return Promise.resolve()
      .then(() => {
        return this._handle_client_mismatch_redundant(client_mismatch.redundant, payload, conversation_id);
      })
      .then((updated_payload) => {
        return this._handle_client_mismatch_deleted(client_mismatch.deleted, updated_payload);
      })
      .then((updated_payload) => {
        return this._handle_client_mismatch_missing(client_mismatch.missing, updated_payload, generic_message);
      });
  }

  /**
   * Handle the deleted client mismatch.
   *
   * @note Contains clients of which the backend is sure that they should not be recipient of a message and verified they no longer exist.
   * @private
   *
   * @param {Object} user_client_map - User client map containing redundant clients
   * @param {Object} payload - Optional payload of the failed request
   * @returns {Promise} Resolves with the updated payload
   */
  _handle_client_mismatch_deleted(user_client_map, payload) {
    if (_.isEmpty(user_client_map)) {
      return Promise.resolve(payload);
    }
    this.logger.debug(`Message contains deleted clients of '${Object.keys(user_client_map).length}' users`, user_client_map);

    const _remove_deleted_client = (user_id, client_id) => {
      if (payload) {
        delete payload.recipients[user_id][client_id];
      }
      return this.user_repository.remove_client_from_user(user_id, client_id);
    };

    const _remove_deleted_user = function(user_id) {
      if (payload && !Object.keys(payload.recipients[user_id]).length) {
        return delete payload.recipients[user_id];
      }
    };

    return Promise.all(this._map_user_client_map(user_client_map, _remove_deleted_client, _remove_deleted_user))
      .then(() => {
        this.verification_state_handler.on_client_removed(Object.keys(user_client_map));
        return payload;
      });
  }

  /**
   * Handle the missing client mismatch.
   *
   * @private
   * @param {Object} user_client_map - User client map containing redundant clients
   * @param {Object} payload - Optional payload of the failed request
   * @param {z.proto.GenericMessage} generic_message - Protobuffer message to be sent
   * @returns {Promise} Resolves with the updated payload
   */
  _handle_client_mismatch_missing(user_client_map, payload, generic_message) {
    if (!payload || _.isEmpty(user_client_map)) {
      return Promise.resolve(payload);
    }
    this.logger.debug(`Message is missing clients of '${Object.keys(user_client_map).length}' users`, user_client_map);

    return this.cryptography_repository.encrypt_generic_message(user_client_map, generic_message, payload)
      .then((updated_payload) => {
        payload = updated_payload;

        const _add_missing_client = (user_id, client_id) => {
          return this.user_repository.add_client_to_user(user_id, new z.client.Client({id: client_id}));
        };

        return Promise.all(this._map_user_client_map(user_client_map, _add_missing_client));
      })
      .then(() => {
        this.verification_state_handler.on_client_add(Object.keys(user_client_map));
        return payload;
      });
  }

  /**
   * Handle the redundant client mismatch.

   * @note Contains clients of which the backend is sure that they should not be recipient of a message but cannot say whether they exist.
   *   Normally only contains clients of users no longer participating in a conversation.
   *   Sometimes clients of the self user are listed. Thus we cannot remove the payload for all the clients of a user without checking.
   * @private
   *
   * @param {Object} user_client_map - User client map containing redundant clients
   * @param {Object} payload - Optional payload of the failed request
   * @param {string} conversation_id - ID of conversation the message was sent in
   * @returns {Promise} Resolves with the updated payload
  */
  _handle_client_mismatch_redundant(user_client_map, payload, conversation_id) {
    if (_.isEmpty(user_client_map)) {
      return Promise.resolve(payload);
    }
    this.logger.debug(`Message contains redundant clients of '${Object.keys(user_client_map).length}' users`, user_client_map);

    return this.get_conversation_by_id_async(conversation_id)
      .catch(function(error) {
        if (error.type !== z.conversation.ConversationError.TYPE.NOT_FOUND) {
          throw error;
        }
      })
      .then((conversation_et) => {
        const _remove_redundant_client = function(user_id, client_id) {
          if (payload) {
            delete payload.recipients[user_id][client_id];
          }
        };

        const _remove_redundant_user = function(user_id) {
          if (conversation_et && conversation_et.is_group()) {
            conversation_et.participating_user_ids.remove(user_id);
          }

          if (payload && !Object.keys(payload.recipients[user_id]).length) {
            return delete payload.recipients[user_id];
          }
        };

        return Promise.all(this._map_user_client_map(user_client_map, _remove_redundant_client, _remove_redundant_user))
          .then(() => {
            if (conversation_et) {
              this.update_participating_user_ets(conversation_et);
            }

            return payload;
          });
      });
  }

  /**
   * Delete message from UI and database. Primary key is used to delete message in database.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation that contains the message
   * @param {Message} message_et - Message to delete
   * @returns {Promise} Resolves when message was deleted
   */
  _delete_message(conversation_et, message_et) {
    conversation_et.remove_message_by_id(message_et.id);
    return this.conversation_service.delete_message_with_key_from_db(message_et.primary_key);
  }

  /**
   * Delete message from UI and database. Primary key is used to delete message in database.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation that contains the message
   * @param {string} message_id - ID of message to delete
   * @returns {Promise} Resolves when message was deleted
   */
  _delete_message_by_id(conversation_et, message_id) {
    conversation_et.remove_message_by_id(message_id);
    return this.conversation_service.delete_message_from_db(conversation_et.id, message_id);
  }

  /**
   * Delete messages from UI an database.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation that contains the message
   * @returns {Promise} Resolves when messages were deleted
   */
  _delete_messages(conversation_et) {
    conversation_et.remove_messages();
    return this.conversation_service.delete_messages_from_db(conversation_et.id);
  }

  /**
   * Add delete message to conversation.
   *
   * @private
   * @param {string} conversation_id - ID of conversation
   * @param {string} message_id - ID of message
   * @param {string} time - ISO 8601 formatted time string
   * @param {Message} message_et - Message to delete
   * @returns {undefined} No return value
   */
  _add_delete_message(conversation_id, message_id, time, message_et) {
    amplify.publish(z.event.WebApp.EVENT.INJECT, z.conversation.EventBuilder.build_delete(conversation_id, message_id, time, message_et));
  }


  //##############################################################################
  // Message updates
  //##############################################################################

  /**
   * Update asset in UI and DB as failed
   * @param {Message} message_et - Message to update
   * @returns {Promise} Resolve when message was updated
   */
  update_message_as_upload_failed(message_et) {
    const asset_et = message_et.get_first_asset();

    asset_et.status(z.assets.AssetTransferState.UPLOAD_FAILED);
    asset_et.upload_failed_reason(z.assets.AssetUploadFailedReason.FAILED);

    return this.conversation_service.update_asset_as_failed_in_db(message_et.primary_key);
  }

  /**
   * Update asset in UI and DB as completed.
   *
   * @param {Conversation} conversation_et - Conversation that contains the message
   * @param {Message} message_et - Message to update
   * @param {Object} asset_data - Uploaded asset information
   * @param {number} asset_data.id - ID of asset
   * @param {Uint8Array} asset_data.otr_key - AES key
   * @param {Uint8Array} asset_data.sha256 - Hash of the encrypted asset
   * @returns {Promise} Resolve when message was updated
   */
  update_message_as_upload_complete(conversation_et, message_et, asset_data) {
    const {id, key, otr_key, sha256, token} = asset_data;
    const asset_et = message_et.get_first_asset();

    let resource;
    if (key) {
      resource = z.assets.AssetRemoteData.v3(key, otr_key, sha256, token);
    } else {
      resource = z.assets.AssetRemoteData.v2(conversation_et.id, id, otr_key, sha256);
    }

    asset_et.original_resource(resource);
    asset_et.status(z.assets.AssetTransferState.UPLOADED);

    return this.conversation_service.update_asset_as_uploaded_in_db(message_et.primary_key, asset_data);
  }

  /**
   * Update asset in UI and DB with preview
   *
   * @param {Conversation} conversation_et - Conversation that contains the message
   * @param {Message} message_et - Message to update
   * @param {Object} asset_data - Updated asset information
   * @param {number} asset_data.id - ID of asset
   * @param {Uint8Array} asset_data.otr_key - AES key
   * @param {Uint8Array} asset_data.sha256 - Hash of the encrypted asset
   * @returns {Promise} Resolve when message was updated
   */
  update_message_with_asset_preview(conversation_et, message_et, asset_data) {
    const {id, key, otr_key, sha256, token} = asset_data;
    const asset_et = message_et.get_first_asset();

    let resource;
    if (key) {
      resource = z.assets.AssetRemoteData.v3(key, otr_key, sha256, token, true);
    } else {
      resource = z.assets.AssetRemoteData.v2(conversation_et.id, id, otr_key, sha256, true);
    }

    asset_et.preview_resource(resource);
    return this.conversation_service.update_asset_preview_in_db(message_et.primary_key, asset_data);
  }

  /**
   * Update edited message with timestamp from the original message and delete original.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation of edited message
   * @param {JSON} event_json - Edit message event
   * @returns {Promise} Resolves with the updated event_json
   */
  _update_edited_message(conversation_et, event_json) {
    const {data: event_data, from, id, time} = event_json;

    return this.get_message_in_conversation_by_id(conversation_et, event_data.replacing_message_id)
      .then((original_message_et) => {
        if (from !== original_message_et.from) {
          throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_USER);
        }

        if (!original_message_et.timestamp()) {
          throw new TypeError('Missing timestamp');
        }

        event_json.edited_time = time;
        event_json.time = new Date(original_message_et.timestamp()).toISOString();
        this._delete_message_by_id(conversation_et, id);
        this._delete_message_by_id(conversation_et, event_data.replacing_message_id);
        this.conversation_service.save_event(event_json);
        return event_json;
      });
  }

  /**
   * Update link preview message.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation of updated message
   * @param {JSON} event_json - Link preview message event
   * @returns {Promise} Resolves with the updated event_json
   */
  _update_link_preview(conversation_et, event_json) {
    return this.get_message_in_conversation_by_id(conversation_et, event_json.id)
      .then((original_message_et) => {
        const first_asset = original_message_et.get_first_asset();

        if (!first_asset.previews().length) {
          return this._delete_message(conversation_et, original_message_et);
        }
      })
      .then(() => event_json);
  }


  //##############################################################################
  // Tracking helpers
  //##############################################################################

  /**
   * Track generic messages for media actions.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation entity
   * @param {z.protobuf.GenericMessage} generic_message - Protobuf message
   * @param {ECallMessage} e_call_message_et - Optional e-call message
   * @returns {undefined} No return value
   */
  _track_completed_media_action(conversation_et, generic_message, e_call_message_et) {
    let ephemeral_time, is_ephemeral, message, message_content_type;

    if (generic_message.content === z.cryptography.GENERIC_MESSAGE_TYPE.EPHEMERAL) {
      message = generic_message.ephemeral;
      message_content_type = generic_message.ephemeral.content;
      is_ephemeral = true;
      ephemeral_time = generic_message.ephemeral.expire_after_millis / 1000;
    } else {
      message = generic_message;
      message_content_type = generic_message.content;
      is_ephemeral = false;
    }

    let action_type;
    switch (message_content_type) {
      case 'asset': {
        if (message.asset.original !== null) {
          action_type = message.asset.original.image !== null ? 'photo' : 'file';
        }
        break;
      }

      case 'calling': {
        const {props: properties} = e_call_message_et;
        action_type = properties.videosend === z.calling.enum.PROPERTY_STATE.TRUE ? 'video_call' : 'audio_call';
        break;
      }

      case 'image': {
        action_type = 'photo';
        break;
      }

      case 'knock': {
        action_type = 'ping';
        break;
      }

      case 'text': {
        if (!message.text.link_preview.length) {
          action_type = 'text';
        }
        break;
      }

      default:
        break;
    }

    if (action_type) {
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.MEDIA.COMPLETED_MEDIA_ACTION, {
        action: action_type,
        conversation_type: z.tracking.helpers.get_conversation_type(conversation_et),
        ephemeral_time: is_ephemeral ? ephemeral_time : undefined,
        is_ephemeral: is_ephemeral,
        with_bot: conversation_et.is_with_bot(),
      });
    }
  }

  /**
   * Track delete action.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation entity
   * @param {Message} message_et - Message entity
   * @param {z.tracking.attribute.DeleteType} method - Deletion method
   * @returns {undefined} No return value
   */
  _track_delete_message(conversation_et, message_et, method) {
    const seconds_since_message_creation = Math.round((Date.now() - message_et.timestamp()) / 1000);

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.DELETED_MESSAGE, {
      conversation_type: z.tracking.helpers.get_conversation_type(conversation_et),
      method: method,
      time_elapsed: z.util.bucket_values(seconds_since_message_creation, [0, 60, 300, 600, 1800, 3600, 86400]),
      time_elapsed_action: seconds_since_message_creation,
      type: z.tracking.helpers.get_message_type(message_et),
    });
  }

  /**
   * Track edit action.
   *
   * @param {Conversation} conversation_et - Conversation entity
   * @param {Message} message_et - Message that was edited
   * @returns {undefined} No return value
   */
  _track_edit_message(conversation_et, message_et) {
    const seconds_since_message_creation = Math.round((Date.now() - message_et.timestamp()) / 1000);

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.EDITED_MESSAGE, {
      conversation_type: z.tracking.helpers.get_conversation_type(conversation_et),
      time_elapsed: z.util.bucket_values(seconds_since_message_creation, [0, 60, 300, 600, 1800, 3600, 86400]),
      time_elapsed_action: seconds_since_message_creation,
    });
  }

  /**
   * Track reaction action.
   *
   * @param {Conversation} conversation_et - Conversation entity
   * @param {Message} message_et - Message that was reacted tp
   * @param {z.message.ReactionType} reaction - Type of reaction
   * @param {boolean} [button=true] - Button source of reaction
   * @returns {undefined} No return value
   */
  _track_reaction(conversation_et, message_et, reaction, button = true) {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.REACTED_TO_MESSAGE, {
      action: reaction ? 'like' : 'unlike',
      conversation_type: z.tracking.helpers.get_conversation_type(conversation_et),
      method: button ? 'button' : 'menu',
      reacted_to_last_message: conversation_et.get_last_message() === message_et,
      type: z.tracking.helpers.get_message_type(message_et),
      user: message_et.user().is_me ? 'sender' : 'receiver',
      with_bot: conversation_et.is_with_bot(),
    });
  }
};
