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

// Conversation service for all conversation calls to the backend REST API.
z.conversation.ConversationService = class ConversationService {
  static get CONFIG() {
    return {
      URL_CONVERSATIONS: '/conversations',
    };
  }

  /**
   * Construct a new Conversation Service.
   * @param {BackendClient} client - Client for the API calls
   * @param {StorageService} storage_service - Service for all storage interactions
   */
  constructor(client, storage_service) {
    this.client = client;
    this.storage_service = storage_service;
    this.logger = new z.util.Logger('z.conversation.ConversationService', z.config.LOGGER.OPTIONS);
  }

  //##############################################################################
  // Create conversations
  //##############################################################################

  /**
   * Create a new conversation.
   *
   * @note Supply at least 2 user IDs! Do not include the requestor
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createGroupConversation
   *
   * @param {Array<string>} user_ids - IDs of users (excluding the requestor) to be part of the conversation
   * @param {string} name - User defined name for the Conversation (optional)
   * @param {string} team_id - ID of team conversation belongs to
   * @returns {Promise} Resolves when the conversation was created
   */
  create_conversation(user_ids, name, team_id) {
    const payload = {
      name: name,
      users: user_ids,
    };

    if (team_id) {
      payload.team = {
        managed: false,
        teamid: team_id,
      };
    }

    return this.client.send_json({
      data: payload,
      type: 'POST',
      url: this.client.create_url(ConversationService.CONFIG.URL_CONVERSATIONS),
    });
  }

  //##############################################################################
  // Get conversations
  //##############################################################################

  /**
   * Retrieves paged meta information about the conversations of a user.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversations
   *
   * @param {number} [limit=100] - Number of results to return (default 100, max 500)
   * @param {string} conversation_id - Conversation ID to start from
   * @returns {Promise} Resolves with the conversation information
   */
  get_conversations(limit = 100, conversation_id) {
    return this.client.send_request({
      data: {
        size: limit,
        start: conversation_id,
      },
      type: 'GET',
      url: this.client.create_url(ConversationService.CONFIG.URL_CONVERSATIONS),
    });
  }

  /**
   * Retrieves all the conversations of a user.
   * @param {number} [limit=500] - Number of results to return (default 500, max 500)
   * @returns {Promise} Resolves with the conversation information
   */
  get_all_conversations(limit = 500) {
    let all_conversations = [];

    const _get_conversations = conversation_id => {
      return this.get_conversations(limit, conversation_id).then(({conversations, has_more}) => {
        if (conversations.length) {
          all_conversations = all_conversations.concat(conversations);
        }

        if (has_more) {
          return _get_conversations(conversations.pop().id);
        }

        return all_conversations;
      });
    };

    return _get_conversations();
  }

  /**
   * Get a conversation by ID.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversation
   *
   * @param {string} conversation_id - ID of conversation to get
   * @returns {Promise} Resolves with the server response
   */
  get_conversation_by_id(conversation_id) {
    return this.client.send_request({
      type: 'GET',
      url: this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}`),
    });
  }

  /**
   * Update conversation properties.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversation
   *
   * @param {string} conversation_id - ID of conversation to rename
   * @param {string} name - New conversation name
   * @returns {Promise} Resolves with the server response
   */
  update_conversation_properties(conversation_id, name) {
    return this.client.send_json({
      data: {
        name: name,
      },
      type: 'PUT',
      url: this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}`),
    });
  }

  /**
   * Update self membership properties.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateSelf
   *
   * @param {string} conversation_id - ID of conversation to update
   * @param {Object} payload - Updated properties
   * @returns {Promise} Resolves with the server response
   */
  update_member_properties(conversation_id, payload) {
    return this.client.send_json({
      data: payload,
      type: 'PUT',
      url: this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}/self`),
    });
  }

  //##############################################################################
  // Send events
  //##############################################################################

  /**
   * Remove bot from conversation.
   *
   * @param {string} conversation_id - ID of conversation to remove bot from
   * @param {string} bot_user_id - ID of bot to be removed from the the conversation
   * @returns {Promise} Resolves with the server response
   */
  delete_bots(conversation_id, bot_user_id) {
    return this.client.send_request({
      type: 'DELETE',
      url: this.client.create_url(
        `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}/bots/${bot_user_id}`
      ),
    });
  }

  /**
   * Remove member from conversation.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/removeMember
   *
   * @param {string} conversation_id - ID of conversation to remove member from
   * @param {string} user_id - ID of member to be removed from the the conversation
   * @returns {Promise} Resolves with the server response
   */
  delete_members(conversation_id, user_id) {
    return this.client.send_request({
      type: 'DELETE',
      url: this.client.create_url(
        `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}/members/${user_id}`
      ),
    });
  }

  /**
   * Add a bot to an existing conversation.
   *
   * @param {string} conversation_id - ID of conversation to add users to
   * @param {string} provider_id - ID of bot provider
   * @param {string} service_id - ID of service provider
   * @returns {Promise} Resolves with the server response
   */
  post_bots(conversation_id, provider_id, service_id) {
    return this.client.send_json({
      data: {
        provider: provider_id,
        service: service_id,
      },
      type: 'POST',
      url: this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}/bots`),
    });
  }

  /**
   * Post an encrypted message to a conversation.
   *
   * @note If "recipients" are not specified you will receive a list of all missing OTR recipients (user-client-map).
   * @note Options for the precondition check on missing clients are:
   *   'false' - all clients, 'Array<String>' - only clients of listed users, 'true' - force sending
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/postOtrMessage
   * @example How to send "recipients" payload
   * "recipients": {
   *   "<user-id>": {
   *     "<client-id>": "<base64-encoded-encrypted-content>"
   *   }
   * }
   *
   * @param {string} conversation_id - ID of conversation to send message in
   * @param {Object} payload - Payload to be posted
   * @param {Object} payload.recipients - Map with per-recipient data
   * @param {string} payload.sender - Client ID of the sender
   * @param {Array<string>|boolean} precondition_option - Level that backend checks for missing clients
   * @returns {Promise} Promise that resolve when the message was sent
   */
  post_encrypted_message(conversation_id, payload, precondition_option) {
    let url = this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}/otr/messages`);

    if (_.isArray(precondition_option)) {
      url = `${url}?report_missing=${precondition_option.join(',')}`;
    } else if (precondition_option) {
      url = `${url}?ignore_missing=true`;
    }

    return this.client.send_json({
      data: payload,
      type: 'POST',
      url: url,
    });
  }

  /**
   * Add users to an existing conversation.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/addMembers
   *
   * @param {string} conversation_id - ID of conversation to add users to
   * @param {Array<string>} user_ids - IDs of users to be added to the conversation
   * @returns {Promise} Resolves with the server response
   */
  post_members(conversation_id, user_ids) {
    return this.client.send_json({
      data: {
        users: user_ids,
      },
      type: 'POST',
      url: this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}/members`),
    });
  }

  //##############################################################################
  // Database interactions
  //##############################################################################

  /**
   * Deletes a conversation entity from the local database.
   * @param {string} conversation_id - ID of conversation to be deleted
   * @returns {Promise} Resolves when the entity was deleted
   */
  delete_conversation_from_db(conversation_id) {
    return this.storage_service
      .delete(z.storage.StorageService.OBJECT_STORE.CONVERSATIONS, conversation_id)
      .then(primary_key => {
        this.logger.info(`State of conversation '${primary_key}' was deleted`);
        return primary_key;
      });
  }

  /**
   * Delete a message from a conversation. Duplicates are delete as well.
   *
   * @param {string} conversation_id - ID of conversation to remove message from
   * @param {string} message_id - ID of the actual message
   * @returns {Promise} Resolves with the number of deleted records
   */
  delete_message_from_db(conversation_id, message_id) {
    return this.storage_service.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('conversation')
      .equals(conversation_id)
      .and(record => record.id === message_id)
      .delete();
  }

  /**
   * Delete a message from a conversation with the given primary.
   *
   * @param {string} primary_key - ID of the actual message
   * @returns {Promise} Resolves with the number of deleted records
   */
  delete_message_with_key_from_db(primary_key) {
    return this.storage_service.db[z.storage.StorageService.OBJECT_STORE.EVENTS].delete(primary_key);
  }

  /**
   * Delete all message of a conversation.
   * @param {string} conversation_id - Delete messages for this conversation
   * @param {string} [iso_date] - Date in ISO string format as upper bound which messages should be removed
   * @returns {Promise} Resolves when the message was deleted
   */
  delete_messages_from_db(conversation_id, iso_date) {
    return this.storage_service.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('conversation')
      .equals(conversation_id)
      .filter(record => !iso_date || iso_date >= record.time)
      .delete();
  }

  /**
   * Get active conversations from database.
   * @returns {Promise} Resolves with active conversations
   */
  get_active_conversations_from_db() {
    const min_date = new Date();
    min_date.setDate(min_date.getDate() - 30);

    return this.storage_service.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('time')
      .between(min_date.toISOString(), new Date().toISOString())
      .toArray()
      .then(events => {
        const conversations = events.reduce((accumulated, event) => {
          if (accumulated[event.conversation]) {
            accumulated[event.conversation] = accumulated[event.conversation] + 1;
          } else {
            accumulated[event.conversation] = 1;
          }

          return accumulated;
        }, {});

        return Object.keys(conversations).sort((id_a, id_b) => conversations[id_b] - conversations[id_a]);
      });
  }

  /**
   * Loads conversation states from the local database.
   * @returns {Promise} Resolves with all the stored conversation states
   */
  load_conversation_states_from_db() {
    return this.storage_service.get_all(z.storage.StorageService.OBJECT_STORE.CONVERSATIONS);
  }

  /**
   * Load conversation event.
   *
   * @param {string} conversation_id - ID of conversation
   * @param {string} message_id - ID of message to retrieve
   * @returns {Promise} Resolves with the stored record
   */
  load_event_from_db(conversation_id, message_id) {
    return this.storage_service.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('conversation')
      .equals(conversation_id)
      .filter(record => message_id && record.id === message_id)
      .first()
      .catch(error => {
        this.logger.error(`Failed to get event for conversation '${conversation_id}': ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Get events with given category.
   *
   * @param {string} conversation_id - ID of conversation to add users to
   * @param {MessageCategory} category_min - Minimum message category
   * @param {MessageCategory} [category_max=z.message.MessageCategory.LIKED] - Maximum message category
   * @returns {Promise} Resolves with matching events
   */
  load_events_with_category_from_db(conversation_id, category_min, category_max = z.message.MessageCategory.LIKED) {
    return this.storage_service.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('[conversation+category]')
      .between([conversation_id, category_min], [conversation_id, category_max], true, true)
      .sortBy('time');
  }

  /**
   * Load conversation events by event type.
   * @param {Array<strings>} event_types - Array of event types to match
   * @returns {Promise} Resolves with the retrieved records
   */
  load_events_with_types(event_types) {
    return this.storage_service.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('type')
      .anyOf(event_types)
      .sortBy('time');
  }

  /**
   * Load conversation events starting from the upper bound going back in history
   *  until either limit or lower bound is reached.
   *
   * @param {string} conversation_id - ID of conversation
   * @param {Date} [lower_bound=new Date(0)] - Load from this date (included)
   * @param {Date} [upper_bound=new Date()] - Load until this date (excluded)
   * @param {number} [limit=Number.MAX_SAFE_INTEGER] - Amount of events to load
   * @returns {Promise} Resolves with the retrieved records
   */
  load_preceding_events_from_db(
    conversation_id,
    lower_bound = new Date(0),
    upper_bound = new Date(),
    limit = Number.MAX_SAFE_INTEGER
  ) {
    if (!_.isDate(lower_bound) || !_.isDate(upper_bound)) {
      throw new Error(
        `Lower bound (${typeof lower_bound}) and upper bound (${typeof upper_bound}) must be of type 'Date'.`
      );
    } else if (lower_bound.getTime() > upper_bound.getTime()) {
      throw new Error(
        `Lower bound (${lower_bound.getTime()}) cannot be greater than upper bound (${upper_bound.getTime()}).`
      );
    }

    return this.storage_service.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('[conversation+time]')
      .between([conversation_id, lower_bound.toISOString()], [conversation_id, upper_bound.toISOString()], true, false)
      .reverse()
      .limit(limit)
      .toArray()
      .catch(error => {
        this.logger.error(
          `Failed to load events for conversation '${conversation_id}' from database: '${error.message}'`
        );
        throw error;
      });
  }

  /**
   * Load conversation events starting from the upper bound to the present until the limit is reached
   *
   * @param {string} conversation_id - ID of conversation
   * @param {Date} upper_bound - Load until this date (excluded)
   * @param {number} [limit=Number.MAX_SAFE_INTEGER] - Amount of events to load
   * @param {boolean} [include_upper_bound=true] - Should upper bound be part of the message
   * @returns {Promise} Resolves with the retrieved records
   */
  load_subsequent_events_from_db(
    conversation_id,
    upper_bound,
    limit = Number.MAX_SAFE_INTEGER,
    include_upper_bound = true
  ) {
    if (!_.isDate(upper_bound)) {
      throw new Error(`Upper bound (${typeof upper_bound}) must be of type 'Date'.`);
    }

    return this.storage_service.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('[conversation+time]')
      .between(
        [conversation_id, upper_bound.toISOString()],
        [conversation_id, new Date().toISOString()],
        include_upper_bound,
        true
      )
      .limit(limit)
      .toArray();
  }

  /**
   * Save an unencrypted conversation event.
   * @param {Object} event - JSON event to be stored
   * @returns {Promise} Resolves with the stored record
   */
  save_event(event) {
    event.category = z.message.MessageCategorization.category_from_event(event);
    return this.storage_service.save(z.storage.StorageService.OBJECT_STORE.EVENTS, undefined, event).then(() => event);
  }

  /**
   * Update an unencrypted conversation event.
   * @param {Object} event - JSON event to be stored
   * @returns {Promise} Resolves with the updated record
   */
  update_event(event) {
    return this.storage_service
      .update(z.storage.StorageService.OBJECT_STORE.EVENTS, event.primary_key, event)
      .then(() => event);
  }

  /**
   * Saves a list of conversation records in the local database.
   * @param {Array<Conversation>} conversations - Conversation entity
   * @returns {Promise<Array>} Resolves with a list of conversation records
   */
  save_conversations_in_db(conversations) {
    const keys = conversations.map(conversation => conversation.id);
    return this.storage_service.db[z.storage.StorageService.OBJECT_STORE.CONVERSATIONS]
      .bulkPut(conversations, keys)
      .then(() => conversations);
  }

  /**
   * Saves a conversation entity in the local database.
   * @param {Conversation} conversation_et - Conversation entity
   * @returns {Promise} Resolves with the conversation entity
   */
  save_conversation_state_in_db(conversation_et) {
    const conversationData = conversation_et.serialize();

    return this.storage_service
      .save(z.storage.StorageService.OBJECT_STORE.CONVERSATIONS, conversation_et.id, conversationData)
      .then(primary_key => {
        this.logger.info(`State of conversation '${primary_key}' was stored`, conversationData);
        return conversation_et;
      });
  }

  /**
   * Search for text in given conversation.
   *
   * @param {string} conversation_id - ID of conversation to add users to
   * @param {string} query - will be checked in against all text messages
   * @returns {Promise} Resolves with the matching events
   */
  search_in_conversation(conversation_id, query) {
    const category_min = z.message.MessageCategory.TEXT;
    const category_max =
      z.message.MessageCategory.TEXT | z.message.MessageCategory.LINK | z.message.MessageCategory.LINK_PREVIEW;

    return this.load_events_with_category_from_db(conversation_id, category_min, category_max).then(events => {
      return events.filter(({data: event_data}) => z.search.FullTextSearch.search(event_data.content, query));
    });
  }

  /**
   * Update asset as uploaded in database.
   *
   * @param {string} primary_key - Primary key used to find an event in the database
   * @param {Object} event_json - Updated event asset data
   * @returns {Promise} Resolves when the message was updated in database
   */
  update_asset_as_uploaded_in_db(primary_key, event_json) {
    return this.storage_service.load(z.storage.StorageService.OBJECT_STORE.EVENTS, primary_key).then(record => {
      if (record) {
        const {data: asset_data, time} = event_json;

        record.data.id = asset_data.id;
        record.data.key = asset_data.key;
        record.data.otr_key = asset_data.otr_key;
        record.data.sha256 = asset_data.sha256;
        record.data.status = z.assets.AssetTransferState.UPLOADED;
        record.data.token = asset_data.token;
        record.status = z.message.StatusType.SENT;
        record.time = time;

        return this.storage_service
          .update(z.storage.StorageService.OBJECT_STORE.EVENTS, primary_key, record)
          .then(() => this.logger.info('Updated asset message_et (uploaded)', primary_key));
      }

      this.logger.warn('Did not find message to update asset (uploaded)', primary_key);
    });
  }

  /**
   * Update asset as failed in database.
   *
   * @param {string} primary_key - Primary key used to find an event in the database
   * @param {string} reason - Failure reason
   * @returns {Promise} Resolves when the message was updated in database
   */
  update_asset_as_failed_in_db(primary_key, reason) {
    return this.storage_service.load(z.storage.StorageService.OBJECT_STORE.EVENTS, primary_key).then(record => {
      if (record) {
        record.data.reason = reason;
        record.data.status = z.assets.AssetTransferState.UPLOAD_FAILED;

        return this.storage_service
          .update(z.storage.StorageService.OBJECT_STORE.EVENTS, primary_key, record)
          .then(() => {
            this.logger.info('Updated asset message_et (failed)', primary_key);
            return record;
          });
      }

      this.logger.warn('Did not find message to update asset (failed)', primary_key);
    });
  }

  /**
   * Update a message in the database.
   *
   * @param {Message} message_et - Message event to update in the database
   * @param {Object} [changes={}] - Changes to update message with
   * @param {string} conversation_id - ID of conversation
   * @returns {Promise} Resolves when the message was updated in database
   */
  update_message_in_db(message_et, changes = {}, conversation_id) {
    return Promise.resolve(message_et.primary_key).then(primary_key => {
      if (Object.keys(changes).length) {
        if (changes.version) {
          return this.storage_service.db.transaction('rw', z.storage.StorageService.OBJECT_STORE.EVENTS, () => {
            return this.load_event_from_db(conversation_id, message_et.id).then(record => {
              let custom_data;

              if (record) {
                const database_version = record.version || 1;

                if (changes.version === database_version + 1) {
                  return this.storage_service.update(
                    z.storage.StorageService.OBJECT_STORE.EVENTS,
                    primary_key,
                    changes
                  );
                }

                custom_data = {
                  database_version: database_version,
                  update_version: changes.version,
                };
              }

              Raygun.send('Failed sequential database update', custom_data);
              throw new z.storage.StorageError(z.storage.StorageError.TYPE.NON_SEQUENTIAL_UPDATE);
            });
          });
        }

        return this.storage_service.update(z.storage.StorageService.OBJECT_STORE.EVENTS, primary_key, changes);
      }

      throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.NO_CHANGES);
    });
  }
};
