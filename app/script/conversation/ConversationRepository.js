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
window.z.conversation = z.conversation || {};

// Conversation repository for all conversation interactions with the conversation service
z.conversation.ConversationRepository = class ConversationRepository {
  static get CONFIG() {
    return {
      CONFIRMATION_THRESHOLD: 7 * 24 * 60 * 60 * 1000,
      EXTERNAL_MESSAGE_THRESHOLD: 200 * 1024,
      GROUP: {
        MAX_NAME_LENGTH: 64,
        MAX_SIZE: 128,
      },
      STATE_EVENTS: [
        z.event.Backend.CONVERSATION.ACCESS_UPDATE,
        z.event.Backend.CONVERSATION.CODE_DELETE,
        z.event.Backend.CONVERSATION.CODE_UPDATE,
      ],
    };
  }

  static get CONSENT_TYPE() {
    return {
      INCOMING_CALL: 'incoming_call',
      MESSAGE: 'message',
      OUTGOING_CALL: 'outgoing_call',
    };
  }

  /**
   * Construct a new Conversation Repository.
   *
   * @param {ConversationService} conversation_service - Backend REST API conversation service implementation
   * @param {AssetService} asset_service - Backend REST API asset service implementation
   * @param {ClientRepository} client_repository - Repository for client interactions
   * @param {CryptographyRepository} cryptography_repository - Repository for all cryptography interactions
   * @param {GiphyRepository} giphy_repository - Repository for Giphy GIFs
   * @param {LinkPreviewRepository} link_repository - Repository for link previews
   * @param {TeamRepository} team_repository - Repository for teams
   * @param {UserRepository} user_repository - Repository for all user and connection interactions
   */
  constructor(
    conversation_service,
    asset_service,
    client_repository,
    cryptography_repository,
    giphy_repository,
    link_repository,
    team_repository,
    user_repository
  ) {
    this.conversation_service = conversation_service;
    this.asset_service = asset_service;
    this.client_repository = client_repository;
    this.cryptography_repository = cryptography_repository;
    this.giphy_repository = giphy_repository;
    this.link_repository = link_repository;
    this.team_repository = team_repository;
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.conversation.ConversationRepository', z.config.LOGGER.OPTIONS);

    this.conversation_mapper = new z.conversation.ConversationMapper();
    this.event_mapper = new z.conversation.EventMapper();
    this.verification_state_handler = new z.conversation.ConversationVerificationStateHandler(this);
    this.clientMismatchHandler = new z.conversation.ClientMismatchHandler(
      this,
      this.cryptography_repository,
      this.user_repository
    );

    this.active_conversation = ko.observable();
    this.conversations = ko.observableArray([]);

    this.timeOffset = 0;

    this.isTeam = this.team_repository.isTeam;
    this.isTeam.subscribe(() => this.map_guest_status_self());
    this.team = this.team_repository.team;

    this.selfUser = this.user_repository.self;

    this.block_event_handling = ko.observable(true);
    this.fetching_conversations = {};
    this.conversations_with_new_events = {};
    this.block_event_handling.subscribe(event_handling_state => {
      if (!event_handling_state) {
        this._check_changed_conversations();
      }
    });

    this.self_conversation = ko.pureComputed(() => {
      if (this.selfUser()) {
        return this._find_conversation_by_id(this.selfUser().id);
      }
    });

    this.filtered_conversations = ko.pureComputed(() => {
      return this.conversations().filter(conversation_et => {
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
      return this.filtered_conversations().sort(z.util.sortGroupsByLastEvent);
    });

    this.receiving_queue = new z.util.PromiseQueue({name: 'ConversationRepository.Receiving'});
    this.sending_queue = new z.util.PromiseQueue({name: 'ConversationRepository.Sending', paused: true});

    // @note Only use the client request queue as to unblock if not blocked by event handling or the cryptographic order of messages will be ruined and sessions might be deleted
    this.conversation_service.client.queue_state.subscribe(queue_state => {
      const queue_ready = queue_state === z.service.QUEUE_STATE.READY;
      this.sending_queue.pause(!queue_ready || this.block_event_handling());
    });

    this.conversations_archived = ko.observableArray([]);
    this.conversations_calls = ko.observableArray([]);
    this.conversations_cleared = ko.observableArray([]);
    this.conversations_unarchived = ko.observableArray([]);

    this.init_handled = 0;
    this.init_promise = undefined;
    this.init_total = 0;

    this._init_subscriptions();

    this.stateHandler = new z.conversation.ConversationStateHandler(this.conversation_service, this);
  }

  _init_state_updates() {
    ko.computed(() => {
      const conversations_archived = [];
      const conversations_calls = [];
      const conversations_cleared = [];
      const conversations_unarchived = [];

      this.sorted_conversations().forEach(conversation_et => {
        if (conversation_et.has_active_call()) {
          conversations_calls.push(conversation_et);
        } else if (conversation_et.is_cleared()) {
          conversations_cleared.push(conversation_et);
        } else if (conversation_et.is_archived()) {
          conversations_archived.push(conversation_et);
        } else {
          conversations_unarchived.push(conversation_et);
        }
      });

      this.conversations_archived(conversations_archived);
      this.conversations_calls(conversations_calls);
      this.conversations_cleared(conversations_cleared);
      this.conversations_unarchived(conversations_unarchived);
    });
  }

  _init_subscriptions() {
    amplify.subscribe(z.event.WebApp.CONVERSATION.ASSET.CANCEL, this.cancel_asset_upload.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.EVENT_FROM_BACKEND, this.onConversationEvent.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.timeout_ephemeral_message.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.MAP_CONNECTION, this.map_connection.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.MISSED_EVENTS, this.on_missed_events.bind(this));
    amplify.subscribe(z.event.WebApp.CONVERSATION.PERSIST_STATE, this.save_conversation_state_in_db.bind(this));
    amplify.subscribe(
      z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE,
      this.set_notification_handling_state.bind(this)
    );
    amplify.subscribe(z.event.WebApp.EVENT.UPDATE_TIME_OFFSET, this.update_time_offset.bind(this));
    amplify.subscribe(z.event.WebApp.TEAM.MEMBER_LEAVE, this.teamMemberLeave.bind(this));
    amplify.subscribe(z.event.WebApp.USER.UNBLOCKED, this.unblocked_user.bind(this));
  }

  /**
   * Remove obsolete conversations locally.
   * @returns {undefined} No return value
   */
  cleanup_conversations() {
    this.conversations().forEach(conversation_et => {
      if (conversation_et.is_group() && conversation_et.is_cleared() && conversation_et.removed_from_conversation()) {
        this.conversation_service.delete_conversation_from_db(conversation_et.id);
        this.delete_conversation(conversation_et.id);
      }
    });
  }

  //##############################################################################
  // Conversation service interactions
  //##############################################################################

  /**
   * Create a group conversation.
   * @note Do not include the requestor among the users
   *
   * @param {Array<z.entity.User>} userEntities - Users (excluding the requestor) to be part of the conversation
   * @param {string} [groupName] - Name for the conversation
   * @param {string} [accessState] - State for conversation access
   * @returns {Promise} Resolves when the conversation was created
   */
  createGroupConversation(userEntities, groupName, accessState) {
    const userIds = userEntities.map(userEntity => userEntity.id);
    const payload = {
      name: groupName,
      users: userIds,
    };

    if (this.team().id) {
      payload.team = {
        managed: false,
        teamid: this.team().id,
      };

      if (accessState) {
        let accessPayload;

        switch (accessState) {
          case z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM:
            accessPayload = {
              access: [z.conversation.ACCESS_MODE.INVITE, z.conversation.ACCESS_MODE.CODE],
              access_role: z.conversation.ACCESS_ROLE.NON_ACTIVATED,
            };
            break;
          case z.conversation.ACCESS_STATE.TEAM.TEAM_ONLY:
            accessPayload = {
              access: [z.conversation.ACCESS_MODE.INVITE],
              access_role: z.conversation.ACCESS_ROLE.TEAM,
            };
            break;
          default:
            break;
        }

        if (accessPayload) {
          Object.assign(payload, accessPayload);
        }
      }
    }

    return this.conversation_service
      .postConversations(payload)
      .then(response => this._onCreate({conversation: response.id, data: response}))
      .then(({conversationEntity}) => conversationEntity)
      .catch(error => this._handleConversationCreateError(error, userIds));
  }

  /**
   * Create a guest room.
   * @returns {Promise} Resolves with the conversation that was created
   */
  createGuestRoom() {
    const groupName = z.l10n.text(z.string.guestRoomConversationName);
    return this.createGroupConversation([], groupName, z.conversation.ACCESS_STATE.TEAM.GUEST_ROOM);
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

    return this.conversation_service
      .get_conversation_by_id(conversation_id)
      .then(response => {
        const conversation_et = this.map_conversations(response);

        this.logger.info(`Fetched conversation '${conversation_id}' from backend`);
        this.save_conversation(conversation_et);

        this.fetching_conversations[conversation_id].forEach(({resolve_fn}) => resolve_fn(conversation_et));
        delete this.fetching_conversations[conversation_id];

        return conversation_et;
      })
      .catch(() => {
        const errorType = z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        const error = new z.conversation.ConversationError(errorType);

        this.fetching_conversations[conversation_id].forEach(({reject_fn}) => reject_fn(error));
        delete this.fetching_conversations[conversation_id];

        throw error;
      });
  }

  get_conversations() {
    const remote_conversations_promise = this.conversation_service.get_all_conversations().catch(error => {
      this.logger.error(`Failed to get all conversations from backend: ${error.message}`);
    });

    return Promise.all([this.conversation_service.load_conversation_states_from_db(), remote_conversations_promise])
      .then(([local_conversations, remote_conversations = []]) => {
        if (remote_conversations.length) {
          const conversations = this.conversation_mapper.merge_conversations(local_conversations, remote_conversations);
          return this.conversation_service.save_conversations_in_db(conversations);
        }

        return local_conversations;
      })
      .then(conversations => this.map_conversations(conversations))
      .then(conversation_ets => {
        this.save_conversations(conversation_ets);
        this.update_conversations_offline();
        return this.conversations();
      });
  }

  updateConversationStates(conversationsData) {
    const handledConversationEntities = [];

    return Promise.resolve()
      .then(() => {
        const unknownConversations = [];

        conversationsData.forEach(conversationData => {
          const conversationEntity = this.conversations().find(({id}) => id === conversationData.id);

          if (conversationEntity) {
            const entity = this.conversation_mapper.update_self_status(conversationEntity, conversationData, true);
            return handledConversationEntities.push(entity);
          }

          unknownConversations.push(conversationData);
        });

        return unknownConversations.length ? this.map_conversations(unknownConversations) : [];
      })
      .then(conversationEntities => {
        if (conversationEntities.length) {
          this.save_conversations(conversationEntities);
        }
        conversationEntities = conversationEntities.concat(handledConversationEntities);

        const handledConversationData = conversationEntities.map(conversationEntity => conversationEntity.serialize());
        this.conversation_service.save_conversations_in_db(handledConversationData);
        return conversationEntities;
      });
  }

  /**
   * Get Message with given ID from the database.
   *
   * @param {Conversation} conversationEntity - Conversation message belongs to
   * @param {string} messageId - ID of message
   * @returns {Promise} Resolves with the message
   */
  get_message_in_conversation_by_id(conversationEntity, messageId) {
    const messageEntity = conversationEntity.get_message_by_id(messageId);
    if (messageEntity) {
      return Promise.resolve(messageEntity);
    }

    return this.conversation_service.load_event_from_db(conversationEntity.id, messageId).then(event => {
      if (event) {
        return this.event_mapper.mapJsonEvent(event, conversationEntity);
      }
      throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND);
    });
  }

  /**
   * Get preceding messages starting with the given message.
   * @param {Conversation} conversationEntity - Respective conversation
   * @returns {Promise} Resolves with the messages
   */
  getPrecedingMessages(conversationEntity) {
    conversationEntity.is_pending(true);

    const firstMessageEntity = conversationEntity.getFirstMessage();
    const upperBound = firstMessageEntity
      ? new Date(firstMessageEntity.timestamp())
      : new Date(conversationEntity.get_latest_timestamp(this.timeOffset) + 1);

    return this.conversation_service
      .load_preceding_events_from_db(conversationEntity.id, new Date(0), upperBound, z.config.MESSAGES_FETCH_LIMIT)
      .then(events => this._addPrecedingEventsToConversation(events, conversationEntity))
      .then(mappedMessageEntities => {
        conversationEntity.is_pending(false);
        return mappedMessageEntities;
      });
  }

  _addPrecedingEventsToConversation(events, conversationEntity) {
    const hasAdditionalMessages = events.length === z.config.MESSAGES_FETCH_LIMIT;

    return this._add_events_to_conversation(events, conversationEntity).then(mappedMessageEntities => {
      conversationEntity.hasAdditionalMessages(hasAdditionalMessages);

      if (!hasAdditionalMessages) {
        const firstMessage = conversationEntity.getFirstMessage();
        const checkCreationMessage = firstMessage && firstMessage.is_member() && firstMessage.isCreation();
        if (checkCreationMessage) {
          const groupCreationMessageIn1to1 = conversationEntity.is_one2one() && firstMessage.isGroupCreation();
          const one2oneConnectionMessageInGroup = conversationEntity.is_group() && firstMessage.isConnection();
          const wrongMessageTypeForConversation = groupCreationMessageIn1to1 || one2oneConnectionMessageInGroup;

          if (wrongMessageTypeForConversation) {
            this.delete_message(conversationEntity, firstMessage);
            conversationEntity.hasCreationMessage = false;
          } else {
            conversationEntity.hasCreationMessage = true;
          }
        }

        const addCreationMessage = !conversationEntity.hasCreationMessage;
        if (addCreationMessage) {
          this._addCreationMessage(conversationEntity, this.selfUser().isTemporaryGuest());
        }
      }

      return mappedMessageEntities;
    });
  }

  _addCreationMessage(conversationEntity, isTemporaryGuest, timestamp, eventSource) {
    conversationEntity.hasCreationMessage = true;
    const creationEvent = conversationEntity.is_group()
      ? z.conversation.EventBuilder.buildGroupCreation(conversationEntity, isTemporaryGuest, timestamp)
      : z.conversation.EventBuilder.build1to1Creation(conversationEntity);

    amplify.publish(z.event.WebApp.EVENT.INJECT, creationEvent, eventSource);
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
      .then(([older_events, newer_events]) =>
        this._add_events_to_conversation(older_events.concat(newer_events), conversation_et)
      )
      .then(mapped_messages => {
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

    return this.conversation_service
      .load_subsequent_events_from_db(conversation_et.id, message_date, z.config.MESSAGES_FETCH_LIMIT, include_message)
      .then(events => this._add_events_to_conversation(events, conversation_et))
      .then(mapped_messages => {
        conversation_et.is_pending(false);
        return mapped_messages;
      });
  }

  /**
   * Get messages for given category. Category param acts as lower bound.
   *
   * @param {Conversation} conversationEntity - Conversation entity
   * @param {MessageCategory} [category=z.message.MessageCategory.NONE] - Message category
   * @returns {Promise} Array of message entities
   */
  get_events_for_category(conversationEntity, category = z.message.MessageCategory.NONE) {
    return this.conversation_service
      .load_events_with_category_from_db(conversationEntity.id, category)
      .then(events => this.event_mapper.mapJsonEvents(events, conversationEntity))
      .then(messageEntities => this._updateMessagesUserEntities(messageEntities));
  }

  /**
   * Search for given text in conversation.
   *
   * @param {Conversation} conversationEntity - Conversation entity
   * @param {string} query - Query strings
   * @returns {Promise} Array of message entities
   */
  searchInConversation(conversationEntity, query) {
    if (!query.length) {
      return Promise.resolve({});
    }

    return this.conversation_service
      .search_in_conversation(conversationEntity.id, query)
      .then(events => this.event_mapper.mapJsonEvents(events, conversationEntity))
      .then(messageEntities => this._updateMessagesUserEntities(messageEntities))
      .then(messageEntities => ({messageEntities, query}));
  }

  /**
   * Get conversation unread events.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to start from
   * @returns {undefined} No return value
   */
  _get_unread_events(conversation_et) {
    const first_message = conversation_et.getFirstMessage();
    const lower_bound = new Date(conversation_et.last_read_timestamp());
    const upper_bound = first_message
      ? new Date(first_message.timestamp())
      : new Date(conversation_et.get_latest_timestamp(this.timeOffset) + 1);

    if (lower_bound < upper_bound) {
      conversation_et.is_pending(true);

      return this.conversation_service
        .load_preceding_events_from_db(conversation_et.id, lower_bound, upper_bound)
        .then(events => {
          if (events.length) {
            this._add_events_to_conversation(events, conversation_et);
          }
          conversation_et.is_pending(false);
        })
        .catch(error => {
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
    this.get_1to1_conversation(user_et).then(conversation_et =>
      conversation_et.status(z.conversation.ConversationStatus.CURRENT_MEMBER)
    );
  }

  /**
   * Update users and events for archived conversations currently visible.
   * @returns {undefined} No return value
   */
  update_conversations_archived() {
    this.updateConversations(this.conversations_archived());
  }

  /**
   * Map users to all conversations without any backend requests.
   * @returns {undefined} No return value
   */
  update_conversations_offline() {
    this.logger.info('Updating group participants offline');
    this.sorted_conversations().map(conversation_et => this.updateParticipatingUserEntities(conversation_et, true));
  }

  /**
   * Update users and events for all unarchived conversations.
   * @returns {undefined} No return value
   */
  update_conversations_unarchived() {
    this.updateConversations(this.conversations_unarchived());
  }

  /**
   * Get users and events for conversations.
   *
   * @note To reduce the number of backend calls we merge the user IDs of all conversations first.
   * @param {Array<Conversation>} conversationEntities - Array of conversation entities to be updated
   * @returns {undefined} No return value
   */
  updateConversations(conversationEntities) {
    const mapOfUserIds = conversationEntities.map(conversationEntity => conversationEntity.participating_user_ids());
    const userIds = _.flatten(mapOfUserIds);

    this.user_repository
      .get_users_by_id(userIds)
      .then(() => conversationEntities.forEach(conversationEntity => this._fetch_users_and_events(conversationEntity)));
  }

  //##############################################################################
  // Repository interactions
  //##############################################################################

  /**
   * Deletes a conversation from the repository.
   * @param {string} conversation_id - ID of conversation to be deleted from the repository
   * @returns {undefined} No return value
   */
  delete_conversation(conversation_id) {
    this.conversations.remove(conversation_et => conversation_et.id === conversation_id);
  }

  /**
   * Find a local conversation by ID.
   * @param {string} conversation_id - ID of conversation to get
   * @returns {Promise} Resolves with the conversation entity
   */
  find_conversation_by_id(conversation_id) {
    return Promise.resolve().then(() => {
      if (!conversation_id) {
        throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.NO_CONVERSATION_ID);
      }

      const conversation_et = this._find_conversation_by_id(conversation_id);
      if (conversation_et) {
        return conversation_et;
      }

      throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND);
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
    return this.get_conversation_by_id(conversation_id).then(conversation_et =>
      [this.selfUser()].concat(conversation_et.participating_user_ets())
    );
  }

  /**
   * Check for conversation locally and fetch it from the server otherwise.
   * @param {string} conversation_id - ID of conversation to get
   * @returns {Promise} Resolves with the Conversation
   */
  get_conversation_by_id(conversation_id) {
    if (!_.isString(conversation_id)) {
      const error = new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.NO_CONVERSATION_ID);
      return Promise.reject(error);
    }

    return this.find_conversation_by_id(conversation_id)
      .catch(error => {
        const isConversationNotFound = error.type === z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (isConversationNotFound) {
          return this.fetch_conversation_by_id(conversation_id);
        }

        throw error;
      })
      .catch(error => {
        const isConversationNotFound = error.type === z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          this.logger.error(`Failed to get conversation '${conversation_id}': ${error.message}`, error);
        }

        throw error;
      });
  }

  /**
   * Get group conversations by name.
   *
   * @param {string} query - Query to be searched in group conversation names
   * @param {boolean} is_handle - Query string is handle
   * @returns {Array<Conversation>} Matching group conversations
   */
  get_groups_by_name(query, is_handle) {
    return this.sorted_conversations()
      .filter(conversation_et => {
        if (!conversation_et.is_group()) {
          return false;
        }

        if (is_handle) {
          if (z.util.StringUtil.compareTransliteration(conversation_et.display_name(), `@${query}`)) {
            return true;
          }

          for (const user_et of conversation_et.participating_user_ets()) {
            if (z.util.StringUtil.startsWith(user_et.username(), query)) {
              return true;
            }
          }
        } else {
          if (z.util.StringUtil.compareTransliteration(conversation_et.display_name(), query)) {
            return true;
          }

          for (const user_et of conversation_et.participating_user_ets()) {
            if (z.util.StringUtil.compareTransliteration(user_et.name(), query)) {
              return true;
            }
          }
        }
        return false;
      })
      .sort((conversation_a, conversation_b) => {
        return z.util.StringUtil.sortByPriority(conversation_a.display_name(), conversation_b.display_name(), query);
      });
  }

  /**
   * Get the most recent event timestamp from any conversation.
   * @param {boolean} [increment=false] - Increment by one for unique timestamp
   * @returns {number} Timestamp value
   */
  getLatestEventTimestamp(increment = false) {
    const mostRecentConversation = this.getMostRecentConversation(true);
    if (mostRecentConversation) {
      const lastEventTimestamp = mostRecentConversation.last_event_timestamp();
      return lastEventTimestamp + (increment ? 1 : 0);
    }

    return 1;
  }

  /**
   * Get the next unarchived conversation.
   *
   * @param {Conversation} conversation_et - Conversation to start from
   * @returns {Conversation} Next conversation
   */
  get_next_conversation(conversation_et) {
    return z.util.ArrayUtil.getNextItem(this.conversations_unarchived(), conversation_et);
  }

  /**
   * Get unarchived conversation with the most recent event.
   * @param {boolean} [allConversations=false] - Search all conversations
   * @returns {Conversation} Most recent conversation
   */
  getMostRecentConversation(allConversations = false) {
    const [conversation_et] = allConversations ? this.sorted_conversations() : this.conversations_unarchived();
    return conversation_et;
  }

  /**
   * Returns a list of sorted conversation ids based on the number of messages in the last 30 days.
   * @returns {Promise} Resolve with the most active conversations
   */
  get_most_active_conversations() {
    return this.conversation_service.get_active_conversations_from_db().then(conversation_ids => {
      return conversation_ids
        .map(conversation_id => this._find_conversation_by_id(conversation_id))
        .filter(conversation_et => conversation_et);
    });
  }

  /**
   * Get conversation with a user.
   * @param {User} user_et - User entity for whom to get the conversation
   * @param {string} [team_id] - Team ID in which the conversation should be searched
   * @returns {Promise} Resolves with the conversation with requested user
   */
  get_1to1_conversation(user_et, team_id = this.team().id) {
    for (const conversation_et of this.conversations()) {
      const with_expected_user = user_et.id === conversation_et.participating_user_ids()[0];

      if (with_expected_user) {
        if (team_id && user_et.isTeamMember()) {
          const active_1to1_conversation = conversation_et.is_one2one() && !conversation_et.removed_from_conversation();
          const in_team = team_id === conversation_et.team_id;

          if (active_1to1_conversation && in_team) {
            return Promise.resolve(conversation_et);
          }
        } else if (conversation_et.is_one2one() || conversation_et.is_request()) {
          return Promise.resolve(conversation_et);
        }
      }
    }

    if (team_id) {
      return this.createGroupConversation([user_et]);
    }

    return this.fetch_conversation_by_id(user_et.connection().conversation_id)
      .then(conversation_et => {
        conversation_et.connection(user_et.connection());
        return this.updateParticipatingUserEntities(conversation_et);
      })
      .catch(error => {
        const isConversationNotFound = error.type === z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          throw error;
        }
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

    return this.get_conversation_by_id(conversation_id)
      .then(conversation_et => {
        return this.get_message_in_conversation_by_id(conversation_et, message_id).then(
          message_et => conversation_et.last_read_timestamp() >= message_et.timestamp()
        );
      })
      .catch(error => {
        const messageNotFound = error.type === z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND;
        if (messageNotFound) {
          return true;
        }

        throw error;
      });
  }

  initialize_conversations() {
    this._init_state_updates();
    this.init_total = this.receiving_queue.getLength();

    if (this.init_total > 5) {
      this.logger.log(`Handling '${this.init_total}' additional messages on app start`);
      return new Promise((resolve, reject) => (this.init_promise = {reject_fn: reject, resolve_fn: resolve}));
    }
  }

  joinConversationWithCode(key, code) {
    return this.conversation_service.postConversationJoin(key, code).then(response => {
      if (response) {
        return this._onCreate(response);
      }
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
    const {conversation_id} = connection_et;

    return this.find_conversation_by_id(conversation_id)
      .catch(error => {
        const isConversationNotFound = error.type === z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          throw error;
        }

        if (connection_et.is_connected() || connection_et.is_outgoing_request()) {
          return this.fetch_conversation_by_id(conversation_id);
        }

        throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND);
      })
      .then(conversation_et => {
        conversation_et.connection(connection_et);

        if (connection_et.is_connected()) {
          conversation_et.type(z.conversation.ConversationType.ONE2ONE);
        }

        this.updateParticipatingUserEntities(conversation_et).then(updated_conversation_et => {
          if (show_conversation) {
            amplify.publish(z.event.WebApp.CONVERSATION.SHOW, updated_conversation_et);
          }

          this.conversations.notifySubscribers();
        });

        return conversation_et;
      })
      .catch(error => {
        const isConversationNotFound = error.type === z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (!isConversationNotFound) {
          throw error;
        }
      });
  }

  /**
   * Maps user connections to the corresponding conversations.
   * @param {Array<Connection>} connection_ets - Connections entities
   * @returns {undefined} No return value
   */
  map_connections(connection_ets) {
    this.logger.info(`Mapping '${connection_ets.length}' user connection(s) to conversations`, connection_ets);
    connection_ets.map(connection_et => this.map_connection(connection_et));
  }

  /**
   * Map conversation payload.
   *
   * @param {JSON} payload - Payload to map
   * @param {number} [initial_timestamp=this.getLatestEventTimestamp()] - Initial server and event timestamp
   * @returns {z.entity.Conversation|Array<z.entity.Conversation>} Mapped conversation/s
   */
  map_conversations(payload, initial_timestamp = this.getLatestEventTimestamp()) {
    const conversation_data = payload.length ? payload : [payload];

    const conversation_ets = this.conversation_mapper.map_conversations(conversation_data, initial_timestamp);
    conversation_ets.forEach(conversation_et => this._handle_mapped_conversation(conversation_et));

    return payload.length ? conversation_ets : conversation_ets[0];
  }

  _handle_mapped_conversation(conversation_et) {
    this._mapGuestStatusSelf(conversation_et);
    conversation_et.self = this.selfUser();
    conversation_et.setStateChangePersistence(true);
  }

  map_guest_status_self() {
    this.filtered_conversations().forEach(conversation_et => this._mapGuestStatusSelf(conversation_et));

    if (this.isTeam()) {
      this.selfUser().inTeam(true);
      this.selfUser().isTeamMember(true);
    }
  }

  _mapGuestStatusSelf(conversationEntity) {
    const conversationTeamId = conversationEntity.team_id;
    const selfTeamId = this.team() && this.team().id;
    const isConversationGuest = !!(conversationTeamId && (!selfTeamId || selfTeamId !== conversationTeamId));
    conversationEntity.isGuest(isConversationGuest);
  }

  /**
   * Mark conversation as read.
   * @param {Conversation} conversation_et - Conversation to be marked as read
   * @returns {undefined} No return value
   */
  mark_as_read(conversation_et) {
    const has_unread_events = conversation_et && conversation_et.unread_event_count() !== 0;

    if (has_unread_events && !this.block_event_handling()) {
      this._update_last_read_timestamp(conversation_et);
      amplify.publish(z.event.WebApp.NOTIFICATION.REMOVE_READ);
    }
  }

  /**
   * Save a conversation in the repository.
   * @param {Conversation} conversation_et - Conversation to be saved in the repository
   * @returns {Promise} Resolves when conversation was saved
   */
  save_conversation(conversation_et) {
    return this.find_conversation_by_id(conversation_et.id).catch(error => {
      const isConversationNotFound = error.type === z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
      if (isConversationNotFound) {
        this.conversations.push(conversation_et);
        return this.save_conversation_state_in_db(conversation_et);
      }

      throw error;
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
    z.util.koArrayPushAll(this.conversations, conversation_ets);
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

    if (this.block_event_handling() !== updated_handling_state) {
      this.block_event_handling(updated_handling_state);
      this.sending_queue.pause(this.block_event_handling());
      this.logger.info(`Block handling of conversation events: ${this.block_event_handling()}`);
    }
  }

  /**
   * Update time offset.
   * @param {number} time_offset - Approximate time different to backend in milliseconds
   * @returns {undefined} No return value
   */
  update_time_offset(time_offset) {
    this.timeOffset = time_offset;
  }

  /**
   * Update participating users in a conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to be updated
   * @param {boolean} [offline=false] - Should we only look for cached contacts
   * @param {boolean} [updateGuests=false] - Update conversation guests
   * @returns {Promise} Resolves when users have been updated
   */
  updateParticipatingUserEntities(conversationEntity, offline = false, updateGuests = false) {
    return this.user_repository
      .get_users_by_id(conversationEntity.participating_user_ids(), offline)
      .then(userEntities => {
        userEntities.sort((userA, userB) => z.util.StringUtil.sortByPriority(userA.first_name(), userB.first_name()));
        conversationEntity.participating_user_ets(userEntities);

        if (updateGuests) {
          conversationEntity.updateGuests();
        }

        return conversationEntity;
      });
  }

  //##############################################################################
  // Send events
  //##############################################################################

  /**
   * Add a bot to an existing conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to add bot to
   * @param {string} providerId - ID of bot provider
   * @param {string} serviceId - ID of service provider
   * @returns {Promise} Resolves when bot was added
   */
  addBot(conversationEntity, providerId, serviceId) {
    return this.conversation_service
      .postBots(conversationEntity.id, providerId, serviceId)
      .then(response => {
        const event = response ? response.event : undefined;
        if (event) {
          amplify.publish(z.event.WebApp.EVENT.INJECT, response.event, z.event.EventRepository.SOURCE.BACKEND_RESPONSE);
          this.logger.debug(`Successfully added bot to conversation '${conversationEntity.display_name()}'`, response);
        }

        return event;
      })
      .catch(error => this._handleAddToConversationError(error, conversationEntity, [serviceId]));
  }

  /**
   * Add users to an existing conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to add users to
   * @param {Array<z.entity.User>} userEntities - Users to be added to the conversation
   * @returns {Promise} Resolves when members were added
   */
  addMembers(conversationEntity, userEntities) {
    const userIds = userEntities.map(userEntity => userEntity.id);

    return this.conversation_service
      .postMembers(conversationEntity.id, userIds)
      .then(response => {
        if (response) {
          amplify.publish(z.event.WebApp.EVENT.INJECT, response, z.event.EventRepository.SOURCE.BACKEND_RESPONSE);
        }
      })
      .catch(error => this._handleAddToConversationError(error, conversationEntity, userIds));
  }

  _handleAddToConversationError(error, conversationEntity, userIds) {
    switch (error.label) {
      case z.service.BackendClientError.LABEL.NOT_CONNECTED: {
        this._handleUsersNotConnected(userIds);
        break;
      }

      case z.service.BackendClientError.LABEL.BAD_GATEWAY:
      case z.service.BackendClientError.LABEL.SERVER_ERROR:
      case z.service.BackendClientError.LABEL.SERVICE_DISABLED:
      case z.service.BackendClientError.LABEL.TOO_MANY_BOTS: {
        const messageText = z.l10n.text(z.string.modalServiceUnavailableMessage);
        const titleText = z.l10n.text(z.string.modalServiceUnavailableHeadline);

        this._showModal(messageText, titleText);
        break;
      }

      case z.service.BackendClientError.LABEL.TOO_MANY_MEMBERS: {
        this._handleTooManyMembersError(conversationEntity.getNumberOfParticipants());
        break;
      }

      default: {
        throw error;
      }
    }
  }

  /**
   * Clear conversation content and archive the conversation.
   *
   * @note According to spec we archive a conversation when we clear it.
   * It will be unarchived once it is opened through search. We use the archive flag to distinguish states.
   *
   * @param {Conversation} conversation_et - Conversation to clear
   * @param {boolean} [leave_conversation=false] - Should we leave the conversation before clearing the content?
   * @returns {undefined} No return value
   */
  clear_conversation(conversation_et, leave_conversation = false) {
    const is_active_conversation = this.is_active_conversation(conversation_et);
    const next_conversation_et = this.get_next_conversation(conversation_et);

    if (leave_conversation) {
      conversation_et.status(z.conversation.ConversationStatus.PAST_MEMBER);
    }

    this._update_cleared_timestamp(conversation_et);
    this._clear_conversation(conversation_et);

    if (leave_conversation) {
      this.removeMember(conversation_et, this.selfUser().id);
    }

    if (is_active_conversation) {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, next_conversation_et);
    }
  }

  /**
   * Update cleared of conversation using timestamp.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to update
   * @returns {undefined} No return value
   */
  _update_cleared_timestamp(conversation_et) {
    const timestamp = conversation_et.get_last_known_timestamp(this.timeOffset);

    if (timestamp && conversation_et.set_timestamp(timestamp, z.conversation.TIMESTAMP_TYPE.CLEARED)) {
      const message_content = new z.proto.Cleared(conversation_et.id, timestamp);
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.CLEARED, message_content);

      this.send_generic_message_to_conversation(this.self_conversation().id, generic_message).then(() =>
        this.logger.info(`Cleared conversation '${conversation_et.id}' on '${new Date(timestamp).toISOString()}'`)
      );
    }
  }

  leaveGuestRoom() {
    if (this.selfUser().isTemporaryGuest()) {
      const conversationEntity = this.getMostRecentConversation();
      return this.conversation_service.deleteMembers(conversationEntity.id, this.selfUser().id);
    }
  }

  /**
   * Remove bot from conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to remove bot from
   * @param {z.entity.User} userId - ID of bot user to be removed from the conversation
   * @returns {Promise} Resolves when bot was removed from the conversation
   */
  removeBot(conversationEntity, userId) {
    return this.conversation_service.deleteBots(conversationEntity.id, userId).then(response => {
      const hasResponse = response && response.event;
      const event = hasResponse
        ? response.event
        : z.conversation.EventBuilder.buildMemberLeave(conversationEntity, userId, true, this.timeOffset);

      amplify.publish(z.event.WebApp.EVENT.INJECT, event, z.event.EventRepository.SOURCE.BACKEND_RESPONSE);
      return event;
    });
  }

  /**
   * Remove member from conversation.
   *
   * @param {Conversation} conversationEntity - Conversation to remove member from
   * @param {string} userId - ID of member to be removed from the conversation
   * @returns {Promise} Resolves when member was removed from the conversation
   */
  removeMember(conversationEntity, userId) {
    return this.conversation_service.deleteMembers(conversationEntity.id, userId).then(response => {
      const event = !!response
        ? response
        : z.conversation.EventBuilder.buildMemberLeave(conversationEntity, userId, true, this.timeOffset);

      amplify.publish(z.event.WebApp.EVENT.INJECT, event, z.event.EventRepository.SOURCE.BACKEND_RESPONSE);
      return event;
    });
  }

  /**
   * Rename conversation.
   *
   * @param {Conversation} conversation_et - Conversation to rename
   * @param {string} name - New conversation name
   * @returns {Promise} Resolves when conversation was renamed
   */
  rename_conversation(conversation_et, name) {
    return this.conversation_service.update_conversation_properties(conversation_et.id, name).then(response => {
      if (response) {
        amplify.publish(z.event.WebApp.EVENT.INJECT, response, z.event.EventRepository.SOURCE.BACKEND_RESPONSE);
        return response;
      }
    });
  }

  reset_session(user_id, client_id, conversation_id) {
    this.logger.info(`Resetting session with client '${client_id}' of user '${user_id}'.`);

    return this.cryptography_repository
      .deleteSession(user_id, client_id)
      .then(session_id => {
        if (session_id) {
          this.logger.info(`Deleted session with client '${client_id}' of user '${user_id}'.`);
        } else {
          this.logger.warn('No local session found to delete.');
        }

        return this.send_session_reset(user_id, client_id, conversation_id);
      })
      .catch(error => {
        this.logger.warn(
          `Failed to reset session for client '${client_id}' of user '${user_id}': ${error.message}`,
          error
        );
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
      tag = z.l10n.text(z.string.extensionsGiphyRandom);
    }

    return z.util.loadUrlBlob(url).then(blob => {
      this.send_text(z.l10n.text(z.string.extensionsGiphyMessage, tag), conversation_et);
      return this.upload_images(conversation_et, [blob]);
    });
  }

  /**
   * Team member was removed.
   * @param {string} teamId - ID of team that member was removed from
   * @param {string} userId - ID of leaving user
   * @param {Date} isoDate - Date of member removal
   * @returns {undefined} No return value
   */
  teamMemberLeave(teamId, userId, isoDate) {
    this.user_repository.get_user_by_id(userId).then(userEntity => {
      this.conversations()
        .filter(conversationEntity => {
          const conversationInTeam = conversationEntity.team_id === teamId;
          const userIsParticipant = conversationEntity.participating_user_ids().includes(userId);
          return conversationInTeam && userIsParticipant && !conversationEntity.removed_from_conversation();
        })
        .forEach(conversationEntity => {
          const leaveEvent = z.conversation.EventBuilder.buildTeamMemberLeave(conversationEntity, userEntity, isoDate);
          amplify.publish(z.event.WebApp.EVENT.INJECT, leaveEvent);
        });
    });
  }

  /**
   * Toggle a conversation between silence and notify.
   * @param {Conversation} conversation_et - Conversation to rename
   * @returns {Promise} Resolves when the muted stated was toggled
   */
  toggle_silence_conversation(conversation_et) {
    if (!conversation_et) {
      return Promise.reject(
        new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND)
      );
    }

    const payload = {
      otr_muted: !conversation_et.is_muted(),
      otr_muted_ref: new Date(conversation_et.get_last_known_timestamp(this.timeOffset)).toISOString(),
    };

    return this.conversation_service
      .update_member_properties(conversation_et.id, payload)
      .then(() => {
        const response = {
          data: payload,
          from: this.selfUser().id,
        };

        this._onMemberUpdate(conversation_et, response);
        this.logger.info(
          `Toggle silence to '${payload.otr_muted}' for conversation '${conversation_et.id}' on '${
            payload.otr_muted_ref
          }'`
        );
        return response;
      })
      .catch(error => {
        const reject_error = new Error(`Conversation '${conversation_et.id}' could not be muted: ${error.message}`);
        this.logger.warn(reject_error.message, error);
        throw reject_error;
      });
  }

  /**
   * Archive a conversation.
   *
   * @param {Conversation} conversation_et - Conversation to rename
   * @returns {Promise} Resolves when the conversation was archived
   */
  archive_conversation(conversation_et) {
    return this._toggleArchiveConversation(conversation_et, true, 'archiving');
  }

  /**
   * Un-archive a conversation.
   *
   * @param {Conversation} conversation_et - Conversation to unarchive
   * @param {string} trigger - Trigger for unarchive
   * @returns {Promise} Resolves when the conversation was unarchived
   */
  unarchive_conversation(conversation_et, trigger = 'unknown') {
    return this._toggleArchiveConversation(conversation_et, false, trigger);
  }

  _toggleArchiveConversation(conversationEntity, newState, trigger) {
    if (!conversationEntity) {
      const error = new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND);
      return Promise.reject(error);
    }

    const archiveTimestamp = conversationEntity.get_last_known_timestamp(this.timeOffset);
    const noStateChange = conversationEntity.is_archived() === newState;
    const noTimestampChange = conversationEntity.archived_timestamp() === archiveTimestamp;
    if (noStateChange && noTimestampChange) {
      return Promise.reject(new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.NO_CHANGES));
    }

    const payload = {
      otr_archived: newState,
      otr_archived_ref: new Date(archiveTimestamp).toISOString(),
    };

    const conversationId = conversationEntity.id;
    this.logger.info(`Conversation '${conversationId}' archive state change triggered by '${trigger}'`);

    const updatePromise = conversationEntity.removed_from_conversation()
      ? Promise.resolve()
      : this.conversation_service.update_member_properties(conversationId, payload).catch(error => {
          const logMessage = `Failed to change archived state of '${conversationId}' to '${newState}': ${error.code}`;
          this.logger.error(logMessage);

          const isNotFound = error.code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND;
          if (!isNotFound) {
            throw error;
          }
        });

    return updatePromise.then(() => {
      const response = {
        data: payload,
        from: this.selfUser().id,
      };

      this._onMemberUpdate(conversationEntity, response);
      const isoDate = payload.otr_archived_ref;
      const logMessage = `Updated conversation '${conversationId}' archive state to '${newState}' on '${isoDate}'`;
      this.logger.info(logMessage);
    });
  }

  _check_changed_conversations() {
    Object.keys(this.conversations_with_new_events).forEach(conversation_id => {
      if (this.conversations_with_new_events.hasOwnProperty(conversation_id)) {
        const conversation_et = this.conversations_with_new_events[conversation_id];
        if (conversation_et.should_unarchive()) {
          this.unarchive_conversation(conversation_et, 'event from notification stream');
        }
      }
    });

    this.conversations_with_new_events = {};
  }

  /**
   * Clears conversation content from view and the database.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation entity to delete
   * @param {number} [timestamp] - Optional timestamps for which messages to remove
   * @returns {undefined} No return value
   */
  _clear_conversation(conversation_et, timestamp) {
    this._deleteMessages(conversation_et, timestamp);

    if (conversation_et.removed_from_conversation()) {
      this.conversation_service.delete_conversation_from_db(conversation_et.id);
      this.delete_conversation(conversation_et.id);
    }
  }

  _handleConversationCreateError(error, userIds) {
    switch (error.label) {
      case z.service.BackendClientError.LABEL.CLIENT_ERROR:
        this._handleTooManyMembersError();
        break;
      case z.service.BackendClientError.LABEL.NOT_CONNECTED:
        this._handleUsersNotConnected(userIds);
        break;
      default:
        throw error;
    }
  }

  _handleTooManyMembersError(participants = 128) {
    const openSpots = ConversationRepository.CONFIG.GROUP.MAX_SIZE - participants;
    const substitutions = {number1: ConversationRepository.CONFIG.GROUP.MAX_SIZE, number2: Math.max(0, openSpots)};

    const messageText = z.l10n.text(z.string.modalConversationTooManyMembersMessage, substitutions);
    const titleText = z.l10n.text(z.string.modalConversationTooManyMembersHeadline);
    this._showModal(messageText, titleText);
  }

  _handleUsersNotConnected(userIds = []) {
    const [userID] = userIds;
    const userPromise = userIds.length === 1 ? this.user_repository.get_user_by_id(userID) : Promise.resolve();

    userPromise.then(userEntity => {
      const username = userEntity ? userEntity.first_name() : undefined;
      const messageStringId = username
        ? z.string.modalConversationNotConnectedMessageOne
        : z.string.modalConversationNotConnectedMessageMany;

      const messageText = z.l10n.text(messageStringId, username);
      const titleText = z.l10n.text(z.string.modalConversationNotConnectedHeadline);
      this._showModal(messageText, titleText);
    });
  }

  _showModal(messageText, titleText) {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        message: messageText,
        title: titleText,
      },
    });
  }

  /**
   * Update last read of conversation using timestamp.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation to update
   * @returns {undefined} No return value
   */
  _update_last_read_timestamp(conversationEntity) {
    const timestamp = conversationEntity.get_last_known_timestamp(this.timeOffset);
    const conversationId = conversationEntity.id;

    if (timestamp && conversationEntity.set_timestamp(timestamp, z.conversation.TIMESTAMP_TYPE.LAST_READ)) {
      const messageContent = new z.proto.LastRead(conversationId, conversationEntity.last_read_timestamp());
      const genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
      genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.LAST_READ, messageContent);

      this.send_generic_message_to_conversation(this.self_conversation().id, genericMessage)
        .then(() => {
          this.logger.info(`Marked conversation '${conversationId}' as read on '${new Date(timestamp).toISOString()}'`);
        })
        .catch(error => {
          const errorMessage = 'Failed to update last read timestamp';
          this.logger.error(`${errorMessage}: ${error.message}`, error);
          Raygun.send(new Error(errorMessage), {label: error.label, message: error.message});
        });
    }
  }

  //##############################################################################
  // Send encrypted events
  //##############################################################################

  send_asset_remotedata(conversationEntity, file, messageId) {
    let genericMessage;

    return this.get_message_in_conversation_by_id(conversationEntity, messageId)
      .then(messageEntity => {
        const assetEntity = messageEntity.get_first_asset();
        const retention = this.asset_service.getAssetRetention(this.selfUser(), conversationEntity);
        const options = {retention};

        assetEntity.uploaded_on_this_client(true);
        return this.asset_service.uploadAsset(file, options, xhr => {
          xhr.upload.onprogress = event => assetEntity.upload_progress(Math.round(event.loaded / event.total * 100));
          assetEntity.upload_cancel = () => xhr.abort();
        });
      })
      .then(asset => {
        genericMessage = new z.proto.GenericMessage(messageId);
        genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

        if (conversationEntity.ephemeral_timer()) {
          genericMessage = this._wrap_in_ephemeral_message(genericMessage, conversationEntity.ephemeral_timer());
        }

        return this.send_generic_message_to_conversation(conversationEntity.id, genericMessage);
      })
      .then(payload => {
        const {uploaded: assetData} = conversationEntity.ephemeral_timer()
          ? genericMessage.ephemeral.asset
          : genericMessage.asset;

        const data = {
          key: assetData.asset_id,
          otr_key: assetData.otr_key,
          sha256: assetData.sha256,
          token: assetData.asset_token,
        };

        const assetAddEvent = z.conversation.EventBuilder.buildAssetAdd(conversationEntity, data, this.timeOffset);

        assetAddEvent.id = messageId;
        assetAddEvent.time = payload.time;

        return this._on_asset_upload_complete(conversationEntity, assetAddEvent);
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
    return z.assets.AssetMetaDataBuilder.buildMetadata(file)
      .catch(error => {
        this.logger.warn(
          `Couldn't render asset preview from metadata. Asset might be corrupt: ${error.message}`,
          error
        );
        return undefined;
      })
      .then(metadata => {
        const asset = new z.proto.Asset();

        if (z.assets.AssetMetaDataBuilder.isAudio(file)) {
          asset.set('original', new z.proto.Asset.Original(file.type, file.size, file.name, null, null, metadata));
        } else if (z.assets.AssetMetaDataBuilder.isVideo(file)) {
          asset.set('original', new z.proto.Asset.Original(file.type, file.size, file.name, null, metadata));
        } else if (z.assets.AssetMetaDataBuilder.isImage(file)) {
          asset.set('original', new z.proto.Asset.Original(file.type, file.size, file.name, metadata));
        } else {
          asset.set('original', new z.proto.Asset.Original(file.type, file.size, file.name));
        }

        return asset;
      })
      .then(asset => {
        let generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
        generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

        if (conversation_et.ephemeral_timer()) {
          generic_message = this._wrap_in_ephemeral_message(generic_message, conversation_et.ephemeral_timer());
        }

        return this._send_and_inject_generic_message(conversation_et, generic_message);
      })
      .catch(error => {
        this.logger.warn(
          `Failed to upload metadata for asset in conversation '${conversation_et.id}': ${error.message}`,
          error
        );

        if (error.type === z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          throw error;
        }
      });
  }

  /**
   * Send asset preview message to specified conversation.
   *
   * @param {Conversation} conversationEntity - Conversation that should receive the preview
   * @param {File} file - File to generate preview from
   * @param {string} messageId - Message ID of the message to generate a preview for
   * @returns {Promise} Resolves when the asset preview was sent
   */
  sendAssetPreview(conversationEntity, file, messageId) {
    return poster(file)
      .then(imageBlob => {
        if (!imageBlob) {
          throw Error('No image available');
        }

        const retention = this.asset_service.getAssetRetention(this.selfUser(), conversationEntity);
        const options = {retention};

        return this.asset_service.uploadAsset(imageBlob, options).then(uploadedImageAsset => {
          const asset = new z.proto.Asset();
          const assetPreview = new z.proto.Asset.Preview(imageBlob.type, imageBlob.size, uploadedImageAsset.uploaded);
          asset.set('preview', assetPreview);

          const genericMessage = new z.proto.GenericMessage(messageId);
          genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

          return this._send_and_inject_generic_message(conversationEntity, genericMessage);
        });
      })
      .catch(error => {
        const message = `No preview for asset '${messageId}' in conversation '${conversationEntity.id}' uploaded `;
        this.logger.warn(message, error);
      });
  }

  /**
   * Send asset upload failed message to specified conversation.
   *
   * @param {Conversation} conversation_et - Conversation that should receive the file
   * @param {string} messageId - ID of the metadata message
   * @param {z.assets.AssetUploadFailedReason} [reason=z.assets.AssetUploadFailedReason.FAILED] - Cause for the failed upload (optional)
   * @returns {Promise} Resolves when the asset failure was sent
   */
  send_asset_upload_failed(conversation_et, messageId, reason = z.assets.AssetUploadFailedReason.FAILED) {
    const reason_proto =
      reason === z.assets.AssetUploadFailedReason.CANCELLED
        ? z.proto.Asset.NotUploaded.CANCELLED
        : z.proto.Asset.NotUploaded.FAILED;
    const asset = new z.proto.Asset();
    asset.set('not_uploaded', reason_proto);

    const generic_message = new z.proto.GenericMessage(messageId);
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
    const other_user_in_one2one = !message_et.user().is_me && conversation_et.is_one2one();
    const within_threshold =
      message_et.timestamp() >= Date.now() - ConversationRepository.CONFIG.CONFIRMATION_THRESHOLD;

    if (other_user_in_one2one && within_threshold && z.event.EventTypeHandling.CONFIRM.includes(message_et.type)) {
      const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
      const confirmation = new z.proto.Confirmation(z.proto.Confirmation.Type.DELIVERED, message_et.id);
      generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.CONFIRMATION, confirmation);

      this.sending_queue.push(() => {
        return this.create_recipients(conversation_et.id, true, [message_et.user().id]).then(recipients => {
          return this._sendGenericMessage(
            conversation_et.id,
            generic_message,
            recipients,
            [message_et.user().id],
            false
          );
        });
      });
    }
  }

  /**
   * Send call message in specified conversation.
   *
   * @param {Conversation} conversation_et - Conversation to send call message to
   * @param {z.calling.entities.CallMessageEntity} call_message_et - Content for call message
   * @param {Object} recipients - Contains the intended receiving users and clients
   * @param {Array<string>|boolean} precondition_option - Optional level that backend checks for missing clients
   * @returns {Promise} Resolves when the confirmation was sent
   */
  send_e_call(conversation_et, call_message_et, recipients, precondition_option) {
    const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
    generic_message.set(
      z.cryptography.GENERIC_MESSAGE_TYPE.CALLING,
      new z.proto.Calling(call_message_et.toContentString())
    );

    return this.sending_queue
      .push(() => {
        const recipients_promise = recipients
          ? Promise.resolve(recipients)
          : this.create_recipients(conversation_et.id, false);

        return recipients_promise.then(_recipients =>
          this._sendGenericMessage(conversation_et.id, generic_message, _recipients, precondition_option)
        );
      })
      .then(() => {
        const initiating_call_message = [
          z.calling.enum.CALL_MESSAGE_TYPE.GROUP_START,
          z.calling.enum.CALL_MESSAGE_TYPE.SETUP,
        ];

        if (initiating_call_message.includes(call_message_et.type)) {
          return this._track_contributed(conversation_et, generic_message, call_message_et);
        }
      })
      .catch(error => {
        if (error.type !== z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          throw error;
        }

        amplify.publish(z.event.WebApp.CALL.STATE.DELETE, conversation_et.id);
      });
  }

  /**
   * Sends image asset in specified conversation using v3 api.
   *
   * @param {Conversation} conversationEntity - Conversation to send image in
   * @param {File|Blob} image - Image
   * @returns {Promise} Resolves when the image was sent
   */
  send_image_asset(conversationEntity, image) {
    const retention = this.asset_service.getAssetRetention(this.selfUser(), conversationEntity);
    const options = {retention};

    return this.asset_service
      .uploadImageAsset(image, options)
      .then(asset => {
        let genericMessage = new z.proto.GenericMessage(z.util.createRandomUuid());
        genericMessage.set(z.cryptography.GENERIC_MESSAGE_TYPE.ASSET, asset);

        if (conversationEntity.ephemeral_timer()) {
          genericMessage = this._wrap_in_ephemeral_message(genericMessage, conversationEntity.ephemeral_timer());
        }

        return this._send_and_inject_generic_message(conversationEntity, genericMessage);
      })
      .catch(error => {
        const message = `Failed to upload otr asset for conversation ${conversationEntity.id}: ${error.message}`;
        this.logger.error(message, error);
        throw error;
      });
  }

  /**
   * Send knock in specified conversation.
   * @param {Conversation} conversation_et - Conversation to send knock in
   * @returns {Promise} Resolves after sending the knock
   */
  send_knock(conversation_et) {
    let generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.KNOCK, new z.proto.Knock(false));

    if (conversation_et.ephemeral_timer()) {
      generic_message = this._wrap_in_ephemeral_message(generic_message, conversation_et.ephemeral_timer());
    }

    return this._send_and_inject_generic_message(conversation_et, generic_message).catch(error => {
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
   * @param {z.proto.GenericMessage} generic_message - GenericMessage of containing text or edited message
   * @returns {Promise} Resolves after sending the message
   */
  send_link_preview(message, conversation_et, generic_message) {
    const message_id = generic_message.message_id;

    return this.link_repository
      .getLinkPreviewFromString(message)
      .then(link_preview => {
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

          return this.get_message_in_conversation_by_id(conversation_et, message_id);
        }
        this.logger.debug(
          `No link in or preview for message '${message_id}' in conversation '${conversation_et.id}' found`
        );
      })
      .then(message_et => {
        if (message_et) {
          const asset_et = message_et.get_first_asset();
          if (asset_et.text === message) {
            this.logger.debug(
              `Sending link preview for message '${message_id}' in conversation '${conversation_et.id}'`
            );
            return this._send_and_inject_generic_message(conversation_et, generic_message);
          }
          this.logger.debug(
            `Skipped sending link preview for changed message '${message_id}' in conversation '${conversation_et.id}'`
          );
        }
      })
      .catch(error => {
        if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          throw error;
        }
        this.logger.debug(
          `Skipped sending link preview for changed message '${message_id}' in conversation '${conversation_et.id}'`
        );
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
    const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
    generic_message.set(
      z.cryptography.GENERIC_MESSAGE_TYPE.LOCATION,
      new z.proto.Location(longitude, latitude, name, zoom)
    );
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

    const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
    generic_message.set(
      z.cryptography.GENERIC_MESSAGE_TYPE.EDITED,
      new z.proto.MessageEdit(original_message_et.id, new z.proto.Text(message))
    );

    return this._send_and_inject_generic_message(conversation_et, generic_message, false)
      .then(() => {
        if (z.util.Environment.desktop) {
          return this.send_link_preview(message, conversation_et, generic_message);
        }
      })
      .catch(error => {
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

      window.setTimeout(() => this.send_reaction(conversation_et, message_et, reaction), 100);
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
    const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.REACTION, new z.proto.Reaction(reaction, message_et.id));

    return this._send_and_inject_generic_message(conversation_et, generic_message);
  }

  /**
   * Sending a message to the remote end of a session reset.
   *
   * @note When we reset a session then we must inform the remote client about this action. It sends a ProtocolBuffer message
   *  (which will not be rendered in the view) to the remote client. This message only needs to be sent to the affected
   *  remote client, therefore we force the message sending.
   *
   * @param {string} user_id - User ID
   * @param {string} client_id - Client ID
   * @param {string} conversation_id - Conversation ID
   * @returns {Promise} Resolves after sending the session reset
   */
  send_session_reset(user_id, client_id, conversation_id) {
    const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.CLIENT_ACTION, z.proto.ClientAction.RESET_SESSION);

    const recipients = {};
    recipients[user_id] = [client_id];

    return this._sendGenericMessage(conversation_id, generic_message, recipients, true)
      .then(response => {
        this.logger.info(`Sent info about session reset to client '${client_id}' of user '${user_id}'`);
        return response;
      })
      .catch(error => {
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
    let generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
    generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.TEXT, new z.proto.Text(message));

    if (conversation_et.ephemeral_timer()) {
      generic_message = this._wrap_in_ephemeral_message(generic_message, conversation_et.ephemeral_timer());
    }

    return this._send_and_inject_generic_message(conversation_et, generic_message).then(() => generic_message);
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
      .then(generic_message => {
        if (z.util.Environment.desktop) {
          return this.send_link_preview(message, conversation_et, generic_message);
        }
      })
      .catch(error => {
        if (error.type !== z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          this.logger.error(`Error while sending text message: ${error.message}`, error);
          throw error;
        }
      });
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
  create_recipients(conversation_id, skip_own_clients = false, user_ids) {
    return this.get_all_users_in_conversation(conversation_id).then(user_ets => {
      const recipients = {};

      for (const user_et of user_ets) {
        if (!(skip_own_clients && user_et.is_me)) {
          if (user_ids && !user_ids.includes(user_et.id)) {
            continue;
          }

          recipients[user_et.id] = user_et.devices().map(client_et => client_et.id);
        }
      }

      return recipients;
    });
  }

  send_generic_message_to_conversation(conversation_id, generic_message) {
    return this.sending_queue.push(() => {
      const skip_own_clients = generic_message.content === z.cryptography.GENERIC_MESSAGE_TYPE.EPHEMERAL;

      return this.create_recipients(conversation_id, skip_own_clients).then(recipients => {
        const precondition_option = skip_own_clients ? Object.keys(recipients) : undefined;
        return this._sendGenericMessage(conversation_id, generic_message, recipients, precondition_option);
      });
    });
  }

  _send_and_inject_generic_message(conversation_et, generic_message, sync_timestamp = true) {
    return Promise.resolve()
      .then(() => {
        if (conversation_et.removed_from_conversation()) {
          throw new Error('Cannot send message to conversation you are not part of');
        }

        const optimistic_event = z.conversation.EventBuilder.buildMessageAdd(conversation_et, this.timeOffset);
        return this.cryptography_repository.cryptographyMapper.mapGenericMessage(generic_message, optimistic_event);
      })
      .then(message_mapped => {
        if (z.event.EventTypeHandling.STORE.includes(message_mapped.type)) {
          return this.conversation_service.save_event(message_mapped);
        }

        return message_mapped;
      })
      .then(message_stored => {
        if (generic_message.content === z.cryptography.GENERIC_MESSAGE_TYPE.KNOCK) {
          amplify.publish(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.OUTGOING_PING);
        }

        this._handleConversationEvent(message_stored, z.event.EventRepository.SOURCE.INJECTED);

        return this.send_generic_message_to_conversation(conversation_et.id, generic_message)
          .then(payload => {
            this._track_contributed(conversation_et, generic_message);

            const backend_iso_date = sync_timestamp ? payload.time : '';
            return this._update_message_as_sent(conversation_et, message_stored, backend_iso_date);
          })
          .then(() => message_stored);
      });
  }

  /**
   * Update message as sent in db and view.
   *
   * @param {Conversation} conversation_et - Conversation entity
   * @param {Object} event_json - Event object
   * @param {string} iso_date - If defined it will update event timestamp
   * @returns {Promise} Resolves when sent status was updated
   */
  _update_message_as_sent(conversation_et, event_json, iso_date) {
    return this.get_message_in_conversation_by_id(conversation_et, event_json.id)
      .then(message_et => {
        const changes = {
          status: z.message.StatusType.SENT,
        };
        message_et.status(z.message.StatusType.SENT);

        if (iso_date) {
          changes.time = iso_date;

          const timestamp = new Date(iso_date).getTime();
          if (!_.isNaN(timestamp)) {
            message_et.timestamp(timestamp);
            conversation_et.update_timestamp_server(timestamp, true);
            conversation_et.update_timestamps(message_et);
          }
        }

        if (z.event.EventTypeHandling.STORE.includes(message_et.type) || message_et.has_asset_image()) {
          return this.conversation_service.update_message_in_db(message_et, changes);
        }
      })
      .catch(error => {
        if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          throw error;
        }
      });
  }

  /**
   * Send encrypted external message
   *
   * @param {string} conversationId - Conversation ID
   * @param {z.proto.GenericMessage} genericMessage - Generic message to be sent as external message
   * @param {Object} recipients - Optional object containing recipient users and their clients
   * @param {Array<string>|boolean} preconditionOption - Optional level that backend checks for missing clients
   * @param {boolean} [nativePush=true] - Optional if message should enforce native push
   * @returns {Promise} Resolves after sending the external message
   */
  _sendExternalGenericMessage(conversationId, genericMessage, recipients, preconditionOption, nativePush = true) {
    this.logger.info(`Sending external message of type '${genericMessage.content}'`, genericMessage);

    return z.assets.AssetCrypto.encryptAesAsset(genericMessage.toArrayBuffer())
      .then(({cipherText, keyBytes, sha256}) => {
        const genericMessageExternal = new z.proto.GenericMessage(z.util.createRandomUuid());
        const externalMessage = new z.proto.External(new Uint8Array(keyBytes), new Uint8Array(sha256));
        genericMessageExternal.set('external', externalMessage);

        return this.cryptography_repository.encryptGenericMessage(recipients, genericMessageExternal).then(payload => {
          payload.data = z.util.arrayToBase64(cipherText);
          payload.native_push = nativePush;
          return this._sendEncryptedMessage(conversationId, genericMessage, payload, preconditionOption);
        });
      })
      .catch(error => {
        this.logger.info('Failed sending external message', error);
        throw error;
      });
  }

  /**
   * Sends a generic message to a conversation.
   *
   * @private
   * @param {string} conversationId - Conversation ID
   * @param {z.proto.GenericMessage} genericMessage - Protobuf message to be encrypted and send
   * @param {Object} recipients - Optional object containing recipient users and their clients
   * @param {Array<string>|boolean} preconditionOption - Optional level that backend checks for missing clients
   * @param {boolean} [nativePush=true] - Optional if message should enforce native push
   * @returns {Promise} Resolves when the message was sent
   */
  _sendGenericMessage(conversationId, genericMessage, recipients, preconditionOption, nativePush = true) {
    return this._grantOutgoingMessage(conversationId, genericMessage)
      .then(() => this._shouldSendAsExternal(conversationId, genericMessage))
      .then(sendAsExternal => {
        if (sendAsExternal) {
          return this._sendExternalGenericMessage(
            conversationId,
            genericMessage,
            recipients,
            preconditionOption,
            nativePush
          );
        }

        return this.cryptography_repository.encryptGenericMessage(recipients, genericMessage).then(payload => {
          payload.native_push = nativePush;
          return this._sendEncryptedMessage(conversationId, genericMessage, payload, preconditionOption);
        });
      })
      .catch(error => {
        const isRequestTooLarge = error.code === z.service.BackendClientError.STATUS_CODE.REQUEST_TOO_LARGE;
        if (isRequestTooLarge) {
          return this._sendExternalGenericMessage(
            conversationId,
            genericMessage,
            recipients,
            preconditionOption,
            nativePush
          );
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
   * @param {string} conversationId - Conversation ID
   * @param {z.proto.GenericMessage} genericMessage - Protobuf message to be encrypted and send
   * @param {Object} payload - Payload
   * @param {Array<string>|boolean} preconditionOption - Level that backend checks for missing clients
   * @returns {Promise} Promise that resolves after sending the encrypted message
   */
  _sendEncryptedMessage(conversationId, genericMessage, payload, preconditionOption = false) {
    const messageType = genericMessage.content;
    this.logger.info(`Sending '${messageType}' message to conversation '${conversationId}'`, payload);

    return this.conversation_service
      .post_encrypted_message(conversationId, payload, preconditionOption)
      .then(response => {
        this.clientMismatchHandler.onClientMismatch(response, genericMessage, payload, conversationId);
        return response;
      })
      .catch(error => {
        const isUnknownClient = error.label === z.service.BackendClientError.LABEL.UNKNOWN_CLIENT;
        if (isUnknownClient) {
          return this.client_repository.removeLocalClient();
        }

        if (!error.missing) {
          throw error;
        }

        let updatedPayload;
        return this.clientMismatchHandler
          .onClientMismatch(error, genericMessage, payload, conversationId)
          .then(payloadWithMissingClients => {
            updatedPayload = payloadWithMissingClients;

            const userIds = Object.keys(error.missing);
            return this._grantOutgoingMessage(conversationId, genericMessage, userIds);
          })
          .then(() => {
            this.logger.info(`Updated '${messageType}' message for conversation '${conversationId}'`, updatedPayload);
            return this.conversation_service.post_encrypted_message(conversationId, updatedPayload, true);
          });
      });
  }

  _grantOutgoingMessage(conversationId, genericMessage, userIds) {
    const allowedMessageTypes = ['cleared', 'confirmation', 'deleted', 'lastRead'];
    if (allowedMessageTypes.includes(genericMessage.content)) {
      return Promise.resolve();
    }

    const isCallingMessage = genericMessage.content === z.cryptography.GENERIC_MESSAGE_TYPE.CALLING;
    const consentType = isCallingMessage
      ? ConversationRepository.CONSENT_TYPE.OUTGOING_CALL
      : ConversationRepository.CONSENT_TYPE.MESSAGE;

    return this.grantMessage(conversationId, consentType, userIds, genericMessage.content);
  }

  grantMessage(conversationId, consentType, userIds, type) {
    return this.get_conversation_by_id(conversationId).then(conversationEntity => {
      const verificationState = conversationEntity.verification_state();
      const conversationDegraded = verificationState === z.conversation.ConversationVerificationState.DEGRADED;

      if (!conversationDegraded) {
        return false;
      }

      return new Promise((resolve, reject) => {
        let sendAnyway = false;

        if (!userIds) {
          userIds = conversationEntity.getUsersWithUnverifiedClients().map(userEntity => userEntity.id);
        }

        return this.user_repository
          .get_users_by_id(userIds)
          .then(userEntities => {
            let actionStringId;
            let messageStringId;
            let titleStringId;

            const hasMultipleUsers = userEntities > 1;
            if (hasMultipleUsers) {
              titleStringId = z.string.modalConversationNewDeviceHeadlineMany;
            } else {
              const [userEntity] = userEntities;

              if (userEntity) {
                titleStringId = userEntity.is_me
                  ? z.string.modalConversationNewDeviceHeadlineYou
                  : z.string.modalConversationNewDeviceHeadlineOne;
              } else {
                const log = `Granting message '${type}' in '${conversationId}' for '${consentType}' needs user ids`;
                this.logger.error(log);

                const error = new Error('Failed to grant outgoing message');
                const customData = {
                  consentType,
                  messageType: type,
                  participants: conversationEntity.getNumberOfParticipants(false),
                  verificationState,
                };

                Raygun.send(error, customData);

                reject(error);
              }
            }

            const userNames = z.util.LocalizerUtil.joinNames(userEntities, z.string.Declension.NOMINATIVE);
            const titleSubstitutions = z.util.StringUtil.capitalizeFirstChar(userNames);

            switch (consentType) {
              case ConversationRepository.CONSENT_TYPE.INCOMING_CALL: {
                actionStringId = z.string.modalConversationNewDeviceIncomingCallAction;
                messageStringId = z.string.modalConversationNewDeviceIncomingCallMessage;
                break;
              }

              case ConversationRepository.CONSENT_TYPE.OUTGOING_CALL: {
                actionStringId = z.string.modalConversationNewDeviceOutgoingCallAction;
                messageStringId = z.string.modalConversationNewDeviceOutgoingCallMessage;
                break;
              }

              default: {
                actionStringId = z.string.modalConversationNewDeviceAction;
                messageStringId = z.string.modalConversationNewDeviceMessage;
                break;
              }
            }

            amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
              action: () => {
                sendAnyway = true;
                conversationEntity.verification_state(z.conversation.ConversationVerificationState.UNVERIFIED);

                resolve(true);
              },
              close: () => {
                if (!sendAnyway) {
                  const errorType = z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION;
                  reject(new z.conversation.ConversationError(errorType));
                }
              },
              text: {
                action: z.l10n.text(actionStringId),
                message: z.l10n.text(messageStringId),
                title: z.l10n.text(titleStringId, titleSubstitutions),
              },
            });
          })
          .catch(reject);
      });
    });
  }

  /**
   * Estimate whether message should be send as type external.
   *
   * @private
   * @param {string} conversationId - Conversation ID
   * @param {z.proto.GenericMessage} genericMessage - Generic message that will be send
   * @returns {boolean} Is payload likely to be too big so that we switch to type external?
   */
  _shouldSendAsExternal(conversationId, genericMessage) {
    return this.get_conversation_by_id(conversationId).then(conversationEt => {
      const messageInBytes = new Uint8Array(genericMessage.toArrayBuffer()).length;
      const estimatedPayloadInBytes = conversationEt.getNumberOfClients() * messageInBytes;

      return estimatedPayloadInBytes > ConversationRepository.CONFIG.EXTERNAL_MESSAGE_THRESHOLD;
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
      Array.from(images).forEach(image => this.send_image_asset(conversation_et, image));
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
      Array.from(files).forEach(file => this.upload_file(conversation_et, file));
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

    return this.send_asset_metadata(conversation_et, file)
      .then(({id}) => {
        message_id = id;
        return this.sendAssetPreview(conversation_et, file, message_id);
      })
      .then(() => this.send_asset_remotedata(conversation_et, file, message_id))
      .then(() => {
        const upload_duration = (Date.now() - upload_started) / 1000;
        this.logger.info(`Finished to upload asset for conversation'${conversation_et.id} in ${upload_duration}`);
      })
      .catch(error => {
        if (error.type === z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
          throw error;
        }

        this.logger.error(`Failed to upload asset for conversation '${conversation_et.id}': ${error.message}`, error);
        return this.get_message_in_conversation_by_id(conversation_et, message_id).then(message_et => {
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
   * @param {Array<string>|boolean} [precondition_option] - Optional level that backend checks for missing clients
   * @returns {Promise} Resolves when message was deleted
   */
  delete_message_everyone(conversation_et, message_et, precondition_option) {
    return Promise.resolve()
      .then(() => {
        if (!message_et.user().is_me && !message_et.ephemeral_expires()) {
          throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_USER);
        }

        const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
        generic_message.set(z.cryptography.GENERIC_MESSAGE_TYPE.DELETED, new z.proto.MessageDelete(message_et.id));

        return this.sending_queue.push(() => {
          return this.create_recipients(conversation_et.id, false, precondition_option).then(recipients =>
            this._sendGenericMessage(conversation_et.id, generic_message, recipients, precondition_option)
          );
        });
      })
      .then(() => {
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, message_et.id);
        return this._delete_message_by_id(conversation_et, message_et.id);
      })
      .catch(error => {
        this.logger.info(
          `Failed to send delete message for everyone with id '${message_et.id}' for conversation '${
            conversation_et.id
          }'`,
          error
        );
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
        const generic_message = new z.proto.GenericMessage(z.util.createRandomUuid());
        generic_message.set(
          z.cryptography.GENERIC_MESSAGE_TYPE.HIDDEN,
          new z.proto.MessageHide(conversation_et.id, message_et.id)
        );

        return this.send_generic_message_to_conversation(this.self_conversation().id, generic_message);
      })
      .then(() => {
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, message_et.id);
        return this._delete_message_by_id(conversation_et, message_et.id);
      })
      .catch(error => {
        this.logger.info(
          `Failed to send delete message with id '${message_et.id}' for conversation '${conversation_et.id}'`,
          error
        );
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
        this.conversation_service.update_message_in_db(message_et, {
          ephemeral_expires: message_et.ephemeral_expires(),
          ephemeral_started: message_et.ephemeral_started(),
        });
        break;
      default:
        this.logger.warn(`Ephemeral message of unsupported type: ${message_et.type}`);
    }
  }

  timeout_ephemeral_message(message_et) {
    if (!message_et.is_expired()) {
      this.get_conversation_by_id(message_et.conversation_id).then(conversation_et => {
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
          const user_ids = _.union([this.selfUser().id], [message_et.from]);
          return this.delete_message_everyone(conversation_et, message_et, user_ids);
        }

        return this.delete_message_everyone(conversation_et, message_et);
      });
    }
  }

  _obfuscate_asset_message(conversation_et, message_id) {
    return this.get_message_in_conversation_by_id(conversation_et, message_id)
      .then(message_et => {
        const asset = message_et.get_first_asset();
        message_et.ephemeral_expires(true);

        return this.conversation_service.update_message_in_db(message_et, {
          data: {
            content_type: asset.file_type,
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
      .then(message_et => {
        const asset = message_et.get_first_asset();
        message_et.ephemeral_expires(true);

        return this.conversation_service.update_message_in_db(message_et, {
          data: {
            info: {
              height: asset.height,
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
      .then(message_et => {
        const asset = message_et.get_first_asset();
        const obfuscated_asset = new z.entity.Text(message_et.id);
        const obfuscated_previews = asset.previews().map(link_preview => {
          link_preview.obfuscate();
          const article = new z.proto.Article(link_preview.url, link_preview.title); // deprecated format
          return new z.proto.LinkPreview(link_preview.url, 0, article, link_preview.url, link_preview.title).encode64();
        });

        obfuscated_asset.text = z.util.StringUtil.obfuscate(asset.text);
        obfuscated_asset.previews(asset.previews());

        message_et.assets([obfuscated_asset]);
        message_et.ephemeral_expires(true);

        return this.conversation_service.update_message_in_db(message_et, {
          data: {
            content: obfuscated_asset.text,
            previews: obfuscated_previews,
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
      .then(message_et => {
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
    return this.conversations().reduce(
      (sum, conversation_et) => sum + conversation_et.get_number_of_pending_uploads(),
      0
    );
  }

  //##############################################################################
  // Event callbacks
  //##############################################################################

  /**
   * Listener for incoming events.
   *
   * @param {Object} eventJson - JSON data for event
   * @param {z.event.EventRepository.SOURCE} eventSource - Source of event
   * @returns {Promise} Resolves when event was handled
   */
  onConversationEvent(eventJson, eventSource = z.event.EventRepository.SOURCE.STREAM) {
    const logObject = {eventJson: JSON.stringify(eventJson), eventObject: eventJson};
    const logMessage = `»» Conversation Event: '${eventJson.type}' (Source: ${eventSource})`;
    this.logger.info(logMessage, logObject);

    const isStateEvent = ConversationRepository.CONFIG.STATE_EVENTS.includes(eventJson.type);
    if (isStateEvent) {
      return this.stateHandler.onConversationEvent(eventJson, eventSource);
    }

    return this._pushToReceivingQueue(eventJson, eventSource);
  }

  _handleConversationEvent(eventJson, eventSource = z.event.EventRepository.SOURCE.STREAM) {
    if (!eventJson) {
      return Promise.reject(new Error('Conversation Repository Event Handling: Event missing'));
    }

    const {conversation, data: eventData, type} = eventJson;
    const conversationId = (eventData && eventData.conversationId) || conversation;
    this.logger.info(`Handling event '${type}' in conversation '${conversationId}' (Source: ${eventSource})`);

    const inSelfConversation = conversationId === this.self_conversation() && this.self_conversation().id;
    if (inSelfConversation) {
      const typesInSelfConversation = [
        z.event.Backend.CONVERSATION.MEMBER_UPDATE,
        z.event.Client.CONVERSATION.MESSAGE_HIDDEN,
      ];

      const isExpectedType = typesInSelfConversation.includes(type);
      if (!isExpectedType) {
        const error = new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_CONVERSATION);
        return Promise.reject(error);
      }
    }

    const isConversationCreate = type === z.event.Backend.CONVERSATION.CREATE;
    const onEventPromise = isConversationCreate ? Promise.resolve() : this.get_conversation_by_id(conversationId);
    let previouslyArchived;

    return onEventPromise
      .then(conversationEntity => {
        if (conversationEntity) {
          // Check if conversation was archived
          previouslyArchived = conversationEntity.is_archived();

          const isBackendTimestamp = eventSource !== z.event.EventRepository.SOURCE.INJECTED;
          conversationEntity.update_timestamp_server(eventJson.server_time || eventJson.time, isBackendTimestamp);
        }

        switch (type) {
          case z.event.Backend.CONVERSATION.CREATE:
            return this._onCreate(eventJson, eventSource);
          case z.event.Backend.CONVERSATION.MEMBER_JOIN:
            return this._onMemberJoin(conversationEntity, eventJson);
          case z.event.Backend.CONVERSATION.MEMBER_LEAVE:
          case z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE:
            return this._onMemberLeave(conversationEntity, eventJson);
          case z.event.Backend.CONVERSATION.MEMBER_UPDATE:
            return this._onMemberUpdate(conversationEntity, eventJson);
          case z.event.Backend.CONVERSATION.RENAME:
            return this._onRename(conversationEntity, eventJson);
          case z.event.Client.CONVERSATION.ASSET_ADD:
            return this._on_asset_add(conversationEntity, eventJson);
          case z.event.Client.CONVERSATION.CONFIRMATION:
            return this._on_confirmation(conversationEntity, eventJson);
          case z.event.Client.CONVERSATION.GROUP_CREATION:
            return this._onGroupCreation(conversationEntity, eventJson);
          case z.event.Client.CONVERSATION.MESSAGE_ADD:
            return this._on_message_add(conversationEntity, eventJson);
          case z.event.Client.CONVERSATION.MESSAGE_DELETE:
            return this._onMessageDeleted(conversationEntity, eventJson);
          case z.event.Client.CONVERSATION.MESSAGE_HIDDEN:
            return this._onMessageHidden(eventJson);
          case z.event.Client.CONVERSATION.ONE2ONE_CREATION:
            return this._on1to1Creation(conversationEntity, eventJson);
          case z.event.Client.CONVERSATION.REACTION:
            return this._on_reaction(conversationEntity, eventJson);
          default:
            return this._onAddEvent(conversationEntity, eventJson);
        }
      })
      .then((entityObject = {}) => this._handledConversationEvent(entityObject, eventSource, previouslyArchived))
      .catch(error => {
        const isMessageNotFound = error.type === z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND;
        if (!isMessageNotFound) {
          throw error;
        }
      });
  }

  _handledConversationEvent(entityObject = {}, eventSource, previouslyArchived) {
    const {conversationEntity, messageEntity} = entityObject;

    if (conversationEntity) {
      const eventFromWebSocket = eventSource === z.event.EventRepository.SOURCE.WEB_SOCKET;
      const eventFromStream = eventSource === z.event.EventRepository.SOURCE.STREAM;

      if (messageEntity) {
        const isRemoteEvent = eventFromStream || eventFromWebSocket;

        if (isRemoteEvent) {
          this.send_confirmation_status(conversationEntity, messageEntity);
        }

        if (!eventFromStream) {
          amplify.publish(z.event.WebApp.NOTIFICATION.NOTIFY, messageEntity, undefined, conversationEntity);
        }
      }

      // Check if event needs to be un-archived
      if (previouslyArchived) {
        // Add to check for unarchive at the end of stream handling
        if (eventFromStream) {
          return (this.conversations_with_new_events[conversationEntity.id] = conversationEntity);
        }

        if (eventFromWebSocket && conversationEntity.should_unarchive()) {
          return this.unarchive_conversation(conversationEntity, 'event from WebSocket');
        }
      }
    }
  }

  /**
   * Push to receiving queue.
   * @param {Object} eventJson - JSON data for event
   * @param {z.event.EventRepository.SOURCE} source - Source of event
   * @returns {undefined} No return value
   */
  _pushToReceivingQueue(eventJson, source) {
    this.receiving_queue
      .push(() => this._handleConversationEvent(eventJson, source))
      .then(() => {
        if (this.init_promise) {
          const eventFromStream = source === z.event.EventRepository.SOURCE.STREAM;
          if (eventFromStream) {
            this.init_handled = this.init_handled + 1;
            if (this.init_handled % 5 === 0 || this.init_handled < 5) {
              const content = {
                handled: this.init_handled,
                total: this.init_total,
              };
              const progress = this.init_handled / this.init_total * 20 + 75;

              amplify.publish(z.event.WebApp.APP.UPDATE_PROGRESS, progress, z.string.initEvents, content);
            }
          }

          if (!this.receiving_queue.getLength() || !eventFromStream) {
            this.init_promise.resolve_fn();
            this.init_promise = undefined;
          }
        }
      })
      .catch(error => {
        if (this.init_promise) {
          this.init_promise.reject_fn(error);
          this.init_promise = undefined;
        } else {
          throw error;
        }
      });
  }

  /**
   * Add missed events message to conversations.
   * @returns {undefined} No return value
   */
  on_missed_events() {
    this.filtered_conversations()
      .filter(conversation_et => !conversation_et.removed_from_conversation())
      .forEach(conversation_et => {
        const missed_event = z.conversation.EventBuilder.buildMissed(conversation_et, this.timeOffset);
        amplify.publish(z.event.WebApp.EVENT.INJECT, missed_event);
      });
  }

  _on1to1Creation(conversationEntity, eventJson) {
    return this.event_mapper
      .mapJsonEvent(eventJson, conversationEntity)
      .then(messageEntity => this._updateMessageUserEntities(messageEntity))
      .then(messageEntity => {
        if (conversationEntity && messageEntity) {
          const firstUserEntity = conversationEntity.firstUserEntity();
          const isOutgoingRequest = firstUserEntity && firstUserEntity.is_outgoing_request();
          if (isOutgoingRequest) {
            messageEntity.memberMessageType = z.message.SystemMessageType.CONNECTION_REQUEST;
          }

          conversationEntity.add_message(messageEntity);
        }

        return {conversationEntity};
      });
  }

  /**
   * A message or ping received in a conversation.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation to add the event to
   * @param {Object} eventJson - JSON data of 'conversation.message-add' or 'conversation.knock' event
   * @returns {Promise} Resolves when event was handled
   */
  _onAddEvent(conversationEntity, eventJson) {
    return this._add_event_to_conversation(eventJson, conversationEntity).then(messageEntity => {
      return {conversationEntity, messageEntity};
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
      .then(message_et => this.update_message_as_upload_complete(conversation_et, message_et, event_json))
      .catch(error => {
        if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          throw error;
        }

        this.logger.error(`Upload complete: Could not find message with id '${event_json.id}'`, event_json);
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
    const event_data = event_json.data;

    return this.get_message_in_conversation_by_id(conversation_et, event_data.message_id)
      .then(message_et => {
        const was_updated = message_et.update_status(event_data.status);

        if (was_updated) {
          return this.conversation_service.update_message_in_db(message_et, {status: message_et.status()});
        }
      })
      .catch(error => {
        if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          this.logger.info(
            `Failed to handle status update of a message in conversation '${conversation_et.id}'`,
            error
          );
          throw error;
        }
      });
  }

  /**
   * A conversation was created.
   *
   * @private
   * @param {Object} eventJson - JSON data of 'conversation.create' event
   * @param {z.event.EventRepository.SOURCE} eventSource - Source of event
   * @returns {Promise} Resolves when the event was handled
   */
  _onCreate(eventJson, eventSource) {
    const {conversation: conversationId, data: eventData, time} = eventJson;
    const eventTimestamp = new Date(time).getTime();
    const initialTimestamp = _.isNaN(eventTimestamp) ? this.getLatestEventTimestamp(true) : eventTimestamp;

    return this.find_conversation_by_id(conversationId)
      .then(conversationEntity => {
        if (conversationEntity) {
          throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.NO_CHANGES);
        }
      })
      .catch(error => {
        const isConversationNotFound = error.type === z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
        if (isConversationNotFound) {
          return this.map_conversations(eventData, initialTimestamp);
        }

        throw error;
      })
      .then(conversationEntity => this.updateParticipatingUserEntities(conversationEntity))
      .then(conversationEntity => this.save_conversation(conversationEntity))
      .then(conversationEntity => {
        if (conversationEntity) {
          this._addCreationMessage(conversationEntity, false, initialTimestamp, eventSource);
          this.verification_state_handler.onConversationCreate(conversationEntity);
          return {conversationEntity};
        }
      })
      .catch(error => {
        const isNoChanges = error.type === z.conversation.ConversationError.TYPE.NO_CHANGES;
        if (!isNoChanges) {
          throw error;
        }
      });
  }

  _onGroupCreation(conversationEntity, eventJson) {
    return this.event_mapper
      .mapJsonEvent(eventJson, conversationEntity)
      .then(messageEntity => {
        const creatorId = conversationEntity.creator;
        const createdByParticipant = !!conversationEntity.participating_user_ids().find(userId => userId === creatorId);
        const createdBySelfUser = this.selfUser().id === creatorId && !conversationEntity.removed_from_conversation();

        const creatorIsParticipant = createdByParticipant || createdBySelfUser;
        if (!creatorIsParticipant) {
          messageEntity.memberMessageType = z.message.SystemMessageType.CONVERSATION_RESUME;
        }

        return this._updateMessageUserEntities(messageEntity);
      })
      .then(messageEntity => {
        if (conversationEntity && messageEntity) {
          conversationEntity.add_message(messageEntity);
        }

        return {conversationEntity, messageEntity};
      });
  }

  /**
   * User were added to a group conversation.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation to add users to
   * @param {Object} eventJson - JSON data of 'conversation.member-join' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onMemberJoin(conversationEntity, eventJson) {
    // Ignore if we join a 1to1 conversation (accept a connection request)
    const connectionEntity = this.user_repository.get_connection_by_conversation_id(conversationEntity.id);
    const isPendingConnection = connectionEntity && connectionEntity.status() === z.user.ConnectionStatus.PENDING;
    if (isPendingConnection) {
      return Promise.resolve();
    }

    const eventData = eventJson.data;

    eventData.user_ids.forEach(userId => {
      const isSelfUser = userId === this.selfUser().id;
      const isParticipatingUser = conversationEntity.participating_user_ids().includes(userId);
      if (!isSelfUser && !isParticipatingUser) {
        conversationEntity.participating_user_ids.push(userId);
      }
    });

    // Self user joins again
    const selfUserRejoins = eventData.user_ids.includes(this.selfUser().id);
    if (selfUserRejoins) {
      conversationEntity.status(z.conversation.ConversationStatus.CURRENT_MEMBER);
    }

    return this.updateParticipatingUserEntities(conversationEntity, false, true)
      .then(() => this._add_event_to_conversation(eventJson, conversationEntity))
      .then(messageEntity => {
        this.verification_state_handler.onMemberJoined(conversationEntity, eventData.user_ids);
        return {conversationEntity, messageEntity};
      });
  }

  /**
   * Members of a group conversation were removed or left.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation to remove users from
   * @param {Object} eventJson - JSON data of 'conversation.member-leave' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onMemberLeave(conversationEntity, eventJson) {
    const {data: eventData, from} = eventJson;
    const isFromSelf = from === this.selfUser().id;
    const removesSelfUser = eventData.user_ids.includes(this.selfUser().id);
    const selfLeavingClearedConversation = isFromSelf && removesSelfUser && conversationEntity.is_cleared();

    if (removesSelfUser) {
      conversationEntity.status(z.conversation.ConversationStatus.PAST_MEMBER);

      if (conversationEntity.call()) {
        const reason = z.calling.enum.TERMINATION_REASON.MEMBER_LEAVE;
        amplify.publish(z.event.WebApp.CALL.STATE.LEAVE, conversationEntity.id, reason);
      }

      if (this.selfUser().isTemporaryGuest()) {
        eventJson.from = this.selfUser().id;
      }
    }

    if (!selfLeavingClearedConversation) {
      return this._add_event_to_conversation(eventJson, conversationEntity)
        .then(messageEntity => {
          messageEntity
            .userEntities()
            .filter(userEntity => !userEntity.is_me)
            .forEach(userEntity => {
              conversationEntity.participating_user_ids.remove(userEntity.id);

              if (userEntity.isTemporaryGuest()) {
                userEntity.clearExpirationTimeout();
              }

              if (conversationEntity.call()) {
                amplify.publish(z.event.WebApp.CALL.STATE.REMOVE_PARTICIPANT, conversationEntity.id, userEntity.id);
              }
            });

          return this.updateParticipatingUserEntities(conversationEntity).then(() => messageEntity);
        })
        .then(messageEntity => {
          this.verification_state_handler.onMemberLeft(conversationEntity);

          if (isFromSelf && conversationEntity.removed_from_conversation()) {
            this.archive_conversation(conversationEntity);
          }

          return {conversationEntity, messageEntity};
        });
    }
  }

  /**
   * Membership properties for a conversation were updated.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation entity that will be updated
   * @param {Object} eventJson - JSON data of 'conversation.member-update' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onMemberUpdate(conversationEntity, eventJson) {
    const {conversation: conversationId, data: eventData, from} = eventJson;

    const isBackendEvent = eventData.otr_archived_ref || eventData.otr_muted_ref;
    const inSelfConversation = !this.self_conversation() || conversationId === this.self_conversation().id;
    if (!inSelfConversation && conversationId && !isBackendEvent) {
      throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_CONVERSATION);
    }

    const isFromSelf = !this.selfUser() || from === this.selfUser().id;
    if (!isFromSelf) {
      throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_USER);
    }

    const isActiveConversation = this.is_active_conversation(conversationEntity);
    const nextConversationEt = isActiveConversation ? this.get_next_conversation(conversationEntity) : undefined;
    const previouslyArchived = conversationEntity.is_archived();

    this.conversation_mapper.update_self_status(conversationEntity, eventData);

    if (previouslyArchived && !conversationEntity.is_archived()) {
      return this._fetch_users_and_events(conversationEntity);
    }

    if (conversationEntity.is_cleared()) {
      this._clear_conversation(conversationEntity, conversationEntity.cleared_timestamp());
    }

    if (isActiveConversation && (conversationEntity.is_archived() || conversationEntity.is_cleared())) {
      amplify.publish(z.event.WebApp.CONVERSATION.SHOW, nextConversationEt);
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
        const event_data = event_json.data;

        if (event_data.replacing_message_id) {
          return this._update_edited_message(conversation_et, event_json);
        }

        if (event_data.previews.length) {
          return this._update_link_preview(conversation_et, event_json);
        }

        return event_json;
      })
      .then(updated_event_json => {
        if (updated_event_json) {
          return this._onAddEvent(conversation_et, updated_event_json);
        }
      });
  }

  /**
   * An asset received in a conversation.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation to add the event to
   * @param {Object} event_json - JSON data of 'conversation.asset-add'
   * @returns {Promise} Resolves when the event was handled
   */
  _on_asset_add(conversation_et, event_json) {
    const {data: event_data, id: event_id} = event_json;

    return this.conversation_service
      .load_event_from_db(conversation_et.id, event_id)
      .then(stored_event => {
        if (stored_event) {
          // Ignore redundant event
          if (_.isEqual(stored_event, event_json)) {
            return;
          }

          if (event_data.status === z.assets.AssetTransferState.UPLOAD_FAILED) {
            const from_self = event_json.from === this.selfUser().id;
            const upload_failed = event_data.reason === z.assets.AssetUploadFailedReason.FAILED;

            if (from_self && upload_failed) {
              return this.conversation_service.update_asset_as_failed_in_db(
                stored_event.primary_key,
                event_data.reason
              );
            }

            return this._delete_message_by_id(conversation_et, event_json.id).then(() => undefined);
          }

          // only event data is relevant for updating
          const updated_event = $.extend(true, stored_event, {
            data: event_data,
          });

          return this.conversation_service.update_event(updated_event);
        }

        return this.conversation_service.save_event(event_json);
      })
      .then(event => {
        if (event) {
          conversation_et.remove_message_by_id(event_json.id);

          return this._onAddEvent(conversation_et, event).then(({messageEntity}) => {
            const first_asset = messageEntity.get_first_asset();
            if (first_asset.is_image() || first_asset.status() === z.assets.AssetTransferState.UPLOADED) {
              return {conversationEntity: conversation_et, messageEntity};
            }
          });
        }
      });
  }

  /**
   * A hide message received in a conversation.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation to add the event to
   * @param {Object} eventJson - JSON data of 'conversation.message-delete'
   * @returns {Promise} Resolves when the event was handled
   */
  _onMessageDeleted(conversationEntity, eventJson) {
    const {data: eventData, from, id: eventId, time} = eventJson;

    return this.get_message_in_conversation_by_id(conversationEntity, eventData.message_id)
      .then(deletedMessageEntity => {
        if (deletedMessageEntity.ephemeral_expires()) {
          return;
        }

        const isSameSender = from === deletedMessageEntity.from;
        if (!isSameSender) {
          throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_USER);
        }

        const isFromSelf = from === this.selfUser().id;
        if (!isFromSelf) {
          return this._addDeleteMessage(conversationEntity.id, eventId, time, deletedMessageEntity);
        }
      })
      .then(() => {
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, eventData.message_id);
        return this._delete_message_by_id(conversationEntity, eventData.message_id);
      })
      .catch(error => {
        const isNotFound = error.type === z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND;
        if (!isNotFound) {
          this.logger.info(`Failed to delete message for conversation '${conversationEntity.id}'`, error);
          throw error;
        }
      });
  }

  /**
   * A hide message received in a conversation.
   *
   * @private
   * @param {Object} eventJson - JSON data of 'conversation.message-hidden'
   * @returns {Promise} Resolves when the event was handled
   */
  _onMessageHidden(eventJson) {
    const {conversation: conversationId, data: eventData, from} = eventJson;

    return Promise.resolve()
      .then(() => {
        const inSelfConversation = !this.self_conversation() || conversationId === this.self_conversation().id;
        if (!inSelfConversation) {
          throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_CONVERSATION);
        }

        const isFromSelf = !this.selfUser() || from === this.selfUser().id;
        if (!isFromSelf) {
          throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_USER);
        }

        return this.get_conversation_by_id(eventData.conversation_id);
      })
      .then(conversationEntity => {
        amplify.publish(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, eventData.message_id);
        return this._delete_message_by_id(conversationEntity, eventData.message_id);
      })
      .catch(error => {
        this.logger.info(
          `Failed to delete message '${eventData.message_id}' for conversation '${eventData.conversation_id}'`,
          error
        );
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
    const event_data = event_json.data;

    return this.get_message_in_conversation_by_id(conversation_et, event_data.message_id)
      .then(message_et => {
        if (!message_et || !message_et.is_content()) {
          const type = message_et ? message_et.type : 'unknown';

          this.logger.error(
            `Message '${event_data.message_id}' in conversation '${conversation_et.id}' is of reactable type '${type}'`,
            message_et
          );
          throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.WRONG_TYPE);
        }

        const changes = message_et.update_reactions(event_json);
        if (changes) {
          this.logger.debug(
            `Updating reactions to message '${event_data.message_id}' in conversation '${conversation_et.id}'`,
            event_json
          );

          return this._updateMessageUserEntities(message_et).then(updated_message_et => {
            this.conversation_service.update_message_in_db(updated_message_et, changes, conversation_et.id);
            return this._prepareReactionNotification(conversation_et, updated_message_et, event_json);
          });
        }
      })
      .catch(error => {
        if (error.type !== z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND) {
          this.logger.error(
            `Failed to handle reaction to message '${event_data.message_id}' in conversation '${conversation_et.id}'`,
            {error, event: event_json}
          );
          throw error;
        }
      });
  }

  /**
   * A conversation was renamed.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation entity that will be renamed
   * @param {Object} eventJson - JSON data of 'conversation.rename' event
   * @returns {Promise} Resolves when the event was handled
   */
  _onRename(conversationEntity, eventJson) {
    return this._add_event_to_conversation(eventJson, conversationEntity).then(messageEntity => {
      this.conversation_mapper.update_properties(conversationEntity, eventJson.data);
      return {conversationEntity, messageEntity};
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
    return this.event_mapper
      .mapJsonEvent(json, conversation_et, true)
      .then(message_et => this._updateMessageUserEntities(message_et))
      .then(message_et => {
        if (conversation_et && message_et) {
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
   * @param {Conversation} conversationEntity - Conversation entity the events will be added to
   * @param {boolean} [prepend=true] - Should existing messages be prepended
   * @returns {Promise} Resolves with an array of mapped messages
   */
  _add_events_to_conversation(events, conversationEntity, prepend = true) {
    return this.event_mapper
      .mapJsonEvents(events, conversationEntity, true)
      .then(messageEntities => this._updateMessagesUserEntities(messageEntities))
      .then(messageEntities => {
        if (prepend && conversationEntity.messages().length) {
          conversationEntity.prepend_messages(messageEntities);
        } else {
          conversationEntity.add_messages(messageEntities);
        }

        return messageEntities;
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
      this.updateParticipatingUserEntities(conversation_et);
      this._get_unread_events(conversation_et);
    }
  }

  /**
   * Forward the reaction event to the Notification repository for browser and audio notifications.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation that event was received in
   * @param {Message} messageEntity - Message that has been reacted upon
   * @param {Object} eventJson -] JSON data of received reaction event
   * @returns {Promise} Resolves when the notification was prepared
   */
  _prepareReactionNotification(conversationEntity, messageEntity, eventJson) {
    const {data: event_data, from} = eventJson;

    const messageFromSelf = messageEntity.from === this.selfUser().id;
    if (messageFromSelf && event_data.reaction) {
      return this.user_repository.get_user_by_id(from).then(userEntity => {
        const reactionMessageEntity = new z.entity.Message(messageEntity.id, z.message.SuperType.REACTION);
        reactionMessageEntity.user(userEntity);
        reactionMessageEntity.reaction = event_data.reaction;
        return {conversationEntity, messageEntity: reactionMessageEntity};
      });
    }

    return Promise.resolve({conversationEntity});
  }

  _updateMessagesUserEntities(messageEntities) {
    return Promise.all(messageEntities.map(messageEntity => this._updateMessageUserEntities(messageEntity)));
  }

  /**
   * Updates the user entities that are part of a message.
   *
   * @private
   * @param {Message} messageEntity - Message to be updated
   * @returns {Promise} Resolves when users have been update
   */
  _updateMessageUserEntities(messageEntity) {
    return this.user_repository.get_user_by_id(messageEntity.from).then(userEntity => {
      messageEntity.user(userEntity);

      if (messageEntity.is_member() || messageEntity.userEntities) {
        return this.user_repository.get_users_by_id(messageEntity.userIds()).then(userEntities => {
          userEntities.sort((userA, userB) => z.util.StringUtil.sortByPriority(userA.first_name(), userB.first_name()));
          messageEntity.userEntities(userEntities);
          return messageEntity;
        });
      }

      if (messageEntity.reactions) {
        const userIds = Object.keys(messageEntity.reactions());

        messageEntity.reactions_user_ets.removeAll();
        if (userIds.length) {
          return this.user_repository.get_users_by_id(userIds).then(userEntities => {
            messageEntity.reactions_user_ets(userEntities);
            return messageEntity;
          });
        }
      }

      if (messageEntity.has_asset_text()) {
        messageEntity.assets().forEach(assetEntity => {
          if (assetEntity.is_text()) {
            assetEntity.theme_color = messageEntity.user().accent_color();
          }
        });
      }

      return messageEntity;
    });
  }

  /**
   * Cancel asset upload.
   * @param {Message} message_et - Message on which the cancel was initiated
   * @returns {undefined} No return value
   */
  cancel_asset_upload(message_et) {
    this.send_asset_upload_failed(
      this.active_conversation(),
      message_et.id,
      z.assets.AssetUploadFailedReason.CANCELLED
    );
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
   * Delete messages from UI and database.
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation that contains the message
   * @param {number} [timestamp] - Timestamp as upper bound which messages to remove
   * @returns {undefined} No return value
   */
  _deleteMessages(conversationEntity, timestamp) {
    conversationEntity.remove_messages(timestamp);
    conversationEntity.hasCreationMessage = false;

    const iso_date = timestamp ? new Date(timestamp).toISOString() : undefined;
    this.conversation_service.delete_messages_from_db(conversationEntity.id, iso_date);
  }

  /**
   * Add delete message to conversation.
   *
   * @private
   * @param {string} conversationId - ID of conversation
   * @param {string} messageId - ID of message
   * @param {string} time - ISO 8601 formatted time string
   * @param {Message} messageEntity - Message to delete
   * @returns {undefined} No return value
   */
  _addDeleteMessage(conversationId, messageId, time, messageEntity) {
    const deleteEvent = z.conversation.EventBuilder.buildDelete(conversationId, messageId, time, messageEntity);
    amplify.publish(z.event.WebApp.EVENT.INJECT, deleteEvent);
  }

  //##############################################################################
  // Message updates
  //##############################################################################

  /**
   * Update asset in UI and DB as failed
   * @param {Message} message_et - Message to update
   * @param {string} [reason=z.assets.AssetTransferState.UPLOAD_FAILED] - Failure reason
   * @returns {Promise} Resolve when message was updated
   */
  update_message_as_upload_failed(message_et, reason = z.assets.AssetTransferState.UPLOAD_FAILED) {
    if (message_et) {
      if (!message_et.is_content()) {
        throw new Error(`Tried to update wrong message type as upload failed '${message_et.super_type}'`);
      }

      const asset_et = message_et.get_first_asset();
      if (asset_et) {
        const is_proper_asset = asset_et.is_audio() || asset_et.is_file() || asset_et.is_video();
        if (!is_proper_asset) {
          throw new Error(`Tried to update message with wrong asset type as upload failed '${asset_et.type}'`);
        }

        asset_et.status(reason);
        asset_et.upload_failed_reason(z.assets.AssetUploadFailedReason.FAILED);
      }

      return this.conversation_service.update_asset_as_failed_in_db(message_et.primary_key, reason);
    }
  }

  /**
   * Update asset in UI and DB as completed.
   *
   * @param {Conversation} conversation_et - Conversation that contains the message
   * @param {Message} message_et - Message to update
   * @param {Object} event_json - Uploaded asset event information
   * @returns {Promise} Resolve when message was updated
   */
  update_message_as_upload_complete(conversation_et, message_et, event_json) {
    const {id, key, otr_key, sha256, token} = event_json.data;
    const asset_et = message_et.get_first_asset();

    let resource;
    if (key) {
      resource = z.assets.AssetRemoteData.v3(key, otr_key, sha256, token);
    } else {
      resource = z.assets.AssetRemoteData.v2(conversation_et.id, id, otr_key, sha256);
    }

    asset_et.original_resource(resource);
    asset_et.status(z.assets.AssetTransferState.UPLOADED);
    message_et.status(z.message.StatusType.SENT);

    return this.conversation_service.update_asset_as_uploaded_in_db(message_et.primary_key, event_json);
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

    return this.get_message_in_conversation_by_id(conversation_et, event_data.replacing_message_id).then(
      original_message_et => {
        const from_original_user = from === original_message_et.from;
        if (!from_original_user) {
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
      }
    );
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
    return this.conversation_service.load_event_from_db(conversation_et.id, event_json.id).then(stored_message => {
      if (stored_message) {
        this._delete_message(conversation_et, stored_message);
      }
      return event_json;
    });
  }

  //##############################################################################
  // Tracking helpers
  //##############################################################################

  /**
   * Track generic messages for media actions.
   *
   * @private
   * @param {Conversation} conversation_et - Conversation entity
   * @param {z.proto.GenericMessage} generic_message - Protobuf message
   * @param {z.calling.entities.CallMessageEntity} call_message_et - Optional call message
   * @returns {undefined} No return value
   */
  _track_contributed(conversation_et, generic_message, call_message_et) {
    let ephemeral_time;
    let message;
    let message_content_type;

    const is_ephemeral = generic_message.content === z.cryptography.GENERIC_MESSAGE_TYPE.EPHEMERAL;
    if (is_ephemeral) {
      message = generic_message.ephemeral;
      message_content_type = generic_message.ephemeral.content;
      ephemeral_time = generic_message.ephemeral.expire_after_millis / 1000;
    } else {
      message = generic_message;
      message_content_type = generic_message.content;
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
        const {properties} = call_message_et;
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
      const attributes = {
        action: action_type,
        conversation_type: z.tracking.helpers.get_conversation_type(conversation_et),
        ephemeral_time: is_ephemeral ? ephemeral_time : undefined,
        is_ephemeral: is_ephemeral,
        with_service: conversation_et.isWithBot(),
      };

      const isTeamConversation = !!conversation_et.team_id;
      if (isTeamConversation) {
        Object.assign(attributes, z.tracking.helpers.getGuestAttributes(conversation_et));
      }

      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONTRIBUTED, attributes);
    }
  }
};
