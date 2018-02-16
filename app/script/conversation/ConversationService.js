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
   * @param {StorageService} storageService - Service for all storage interactions
   */
  constructor(client, storageService) {
    this.client = client;
    this.storageService = storageService;
    this.logger = new z.util.Logger('z.conversation.ConversationService', z.config.LOGGER.OPTIONS);
  }

  //##############################################################################
  // Create conversations
  //##############################################################################

  /**
   * Create a group conversation.
   *
   * @note Supply at least 2 user IDs! Do not include the requestor
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createGroupConversation
   *
   * @param {Array<string>} userIds - IDs of users (excluding the requestor) to be part of the conversation
   * @param {string} [name] - User defined name for the Conversation
   * @param {string} [teamId] - ID of team conversation belongs to
   * @returns {Promise} Resolves when the conversation was created
   */
  postConversations(userIds, name, teamId) {
    const payload = {
      name: name,
      users: userIds,
    };

    if (teamId) {
      payload.team = {
        managed: false,
        teamid: teamId,
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
   * @param {string} conversationId - Conversation ID to start from
   * @returns {Promise} Resolves with the conversation information
   */
  get_conversations(limit = 100, conversationId) {
    return this.client.send_request({
      data: {
        size: limit,
        start: conversationId,
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
    let allConversations = [];

    const _get_conversations = conversationId => {
      return this.get_conversations(limit, conversationId).then(({conversations, hasMore}) => {
        if (conversations.length) {
          allConversations = allConversations.concat(conversations);
        }

        if (hasMore) {
          return _get_conversations(conversations.pop().id);
        }

        return allConversations;
      });
    };

    return _get_conversations();
  }

  /**
   * Get a conversation by ID.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversation
   *
   * @param {string} conversationId - ID of conversation to get
   * @returns {Promise} Resolves with the server response
   */
  get_conversation_by_id(conversationId) {
    return this.client.send_request({
      type: 'GET',
      url: this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}`),
    });
  }

  /**
   * Update conversation properties.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversation
   *
   * @param {string} conversationId - ID of conversation to rename
   * @param {string} name - New conversation name
   * @returns {Promise} Resolves with the server response
   */
  update_conversation_properties(conversationId, name) {
    return this.client.send_json({
      data: {
        name: name,
      },
      type: 'PUT',
      url: this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}`),
    });
  }

  /**
   * Update self membership properties.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateSelf
   *
   * @param {string} conversationId - ID of conversation to update
   * @param {Object} payload - Updated properties
   * @returns {Promise} Resolves with the server response
   */
  update_member_properties(conversationId, payload) {
    return this.client.send_json({
      data: payload,
      type: 'PUT',
      url: this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/self`),
    });
  }

  //##############################################################################
  // Send events
  //##############################################################################

  /**
   * Remove bot from conversation.
   *
   * @param {string} conversationId - ID of conversation to remove bot from
   * @param {string} userId - ID of bot to be removed from the the conversation
   * @returns {Promise} Resolves with the server response
   */
  deleteBots(conversationId, userId) {
    return this.client.send_request({
      type: 'DELETE',
      url: this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/bots/${userId}`),
    });
  }

  /**
   * Remove member from conversation.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/removeMember
   *
   * @param {string} conversationId - ID of conversation to remove member from
   * @param {string} userId - ID of member to be removed from the the conversation
   * @returns {Promise} Resolves with the server response
   */
  deleteMembers(conversationId, userId) {
    return this.client.send_request({
      type: 'DELETE',
      url: this.client.create_url(
        `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/members/${userId}`
      ),
    });
  }

  /**
   * Add a bot to an existing conversation.
   *
   * @param {string} conversationId - ID of conversation to add users to
   * @param {string} providerId - ID of bot provider
   * @param {string} serviceId - ID of service provider
   * @returns {Promise} Resolves with the server response
   */
  postBots(conversationId, providerId, serviceId) {
    return this.client.send_json({
      data: {
        provider: providerId,
        service: serviceId,
      },
      type: 'POST',
      url: this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/bots`),
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
   * @param {string} conversationId - ID of conversation to send message in
   * @param {Object} payload - Payload to be posted
   * @param {Object} payload.recipients - Map with per-recipient data
   * @param {string} payload.sender - Client ID of the sender
   * @param {Array<string>|boolean} preconditionOption - Level that backend checks for missing clients
   * @returns {Promise} Promise that resolve when the message was sent
   */
  post_encrypted_message(conversationId, payload, preconditionOption) {
    let url = this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/otr/messages`);

    if (_.isArray(preconditionOption)) {
      url = `${url}?report_missing=${preconditionOption.join(',')}`;
    } else if (preconditionOption) {
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
   * @param {string} conversationId - ID of conversation to add users to
   * @param {Array<string>} userIds - IDs of users to be added to the conversation
   * @returns {Promise} Resolves with the server response
   */
  postMembers(conversationId, userIds) {
    return this.client.send_json({
      data: {
        users: userIds,
      },
      type: 'POST',
      url: this.client.create_url(`${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/members`),
    });
  }

  //##############################################################################
  // Database interactions
  //##############################################################################

  /**
   * Deletes a conversation entity from the local database.
   * @param {string} conversationId - ID of conversation to be deleted
   * @returns {Promise} Resolves when the entity was deleted
   */
  delete_conversation_from_db(conversationId) {
    return this.storageService
      .delete(z.storage.StorageService.OBJECT_STORE.CONVERSATIONS, conversationId)
      .then(primary_key => {
        this.logger.info(`State of conversation '${primary_key}' was deleted`);
        return primary_key;
      });
  }

  /**
   * Delete a message from a conversation. Duplicates are delete as well.
   *
   * @param {string} conversationId - ID of conversation to remove message from
   * @param {string} messageId - ID of the actual message
   * @returns {Promise} Resolves with the number of deleted records
   */
  delete_message_from_db(conversationId, messageId) {
    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('conversation')
      .equals(conversationId)
      .and(record => record.id === messageId)
      .delete();
  }

  /**
   * Delete a message from a conversation with the given primary.
   *
   * @param {string} primaryKey - ID of the actual message
   * @returns {Promise} Resolves with the number of deleted records
   */
  delete_message_with_key_from_db(primaryKey) {
    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.EVENTS].delete(primaryKey);
  }

  /**
   * Delete all message of a conversation.
   * @param {string} conversationId - Delete messages for this conversation
   * @param {string} [isoDate] - Date in ISO string format as upper bound which messages should be removed
   * @returns {Promise} Resolves when the message was deleted
   */
  delete_messages_from_db(conversationId, isoDate) {
    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('conversation')
      .equals(conversationId)
      .filter(record => !isoDate || isoDate >= record.time)
      .delete();
  }

  /**
   * Get active conversations from database.
   * @returns {Promise} Resolves with active conversations
   */
  get_active_conversations_from_db() {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 30);

    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('time')
      .between(minDate.toISOString(), new Date().toISOString())
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
    return this.storageService.getAll(z.storage.StorageService.OBJECT_STORE.CONVERSATIONS);
  }

  /**
   * Load conversation event.
   *
   * @param {string} conversationId - ID of conversation
   * @param {string} messageId - ID of message to retrieve
   * @returns {Promise} Resolves with the stored record
   */
  load_event_from_db(conversationId, messageId) {
    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('conversation')
      .equals(conversationId)
      .filter(record => messageId && record.id === messageId)
      .first()
      .catch(error => {
        this.logger.error(`Failed to get event for conversation '${conversationId}': ${error.message}`, error);
        throw error;
      });
  }

  /**
   * Get events with given category.
   *
   * @param {string} conversationId - ID of conversation to add users to
   * @param {MessageCategory} categoryMin - Minimum message category
   * @param {MessageCategory} [categoryMax=z.message.MessageCategory.LIKED] - Maximum message category
   * @returns {Promise} Resolves with matching events
   */
  load_events_with_category_from_db(conversationId, categoryMin, categoryMax = z.message.MessageCategory.LIKED) {
    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('[conversation+category]')
      .between([conversationId, categoryMin], [conversationId, categoryMax], true, true)
      .sortBy('time');
  }

  /**
   * Load conversation events by event type.
   * @param {Array<strings>} eventTypes - Array of event types to match
   * @returns {Promise} Resolves with the retrieved records
   */
  load_events_with_types(eventTypes) {
    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('type')
      .anyOf(eventTypes)
      .sortBy('time');
  }

  /**
   * Load conversation events starting from the upper bound going back in history
   *  until either limit or lower bound is reached.
   *
   * @param {string} conversationId - ID of conversation
   * @param {Date} [lowerBound=new Date(0)] - Load from this date (included)
   * @param {Date} [upperBound=new Date()] - Load until this date (excluded)
   * @param {number} [limit=Number.MAX_SAFE_INTEGER] - Amount of events to load
   * @returns {Promise} Resolves with the retrieved records
   */
  load_preceding_events_from_db(
    conversationId,
    lowerBound = new Date(0),
    upperBound = new Date(),
    limit = Number.MAX_SAFE_INTEGER
  ) {
    if (!_.isDate(lowerBound) || !_.isDate(upperBound)) {
      throw new Error(
        `Lower bound (${typeof lowerBound}) and upper bound (${typeof upperBound}) must be of type 'Date'.`
      );
    } else if (lowerBound.getTime() > upperBound.getTime()) {
      throw new Error(
        `Lower bound (${lowerBound.getTime()}) cannot be greater than upper bound (${upperBound.getTime()}).`
      );
    }

    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('[conversation+time]')
      .between([conversationId, lowerBound.toISOString()], [conversationId, upperBound.toISOString()], true, false)
      .reverse()
      .limit(limit)
      .toArray()
      .catch(error => {
        this.logger.error(
          `Failed to load events for conversation '${conversationId}' from database: '${error.message}'`
        );
        throw error;
      });
  }

  /**
   * Load conversation events starting from the upper bound to the present until the limit is reached
   *
   * @param {string} conversationId - ID of conversation
   * @param {Date} upperBound - Load until this date (excluded)
   * @param {number} [limit=Number.MAX_SAFE_INTEGER] - Amount of events to load
   * @param {boolean} [includeUpperBound=true] - Should upper bound be part of the message
   * @returns {Promise} Resolves with the retrieved records
   */
  load_subsequent_events_from_db(
    conversationId,
    upperBound,
    limit = Number.MAX_SAFE_INTEGER,
    includeUpperBound = true
  ) {
    if (!_.isDate(upperBound)) {
      throw new Error(`Upper bound (${typeof upperBound}) must be of type 'Date'.`);
    }

    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.EVENTS]
      .where('[conversation+time]')
      .between(
        [conversationId, upperBound.toISOString()],
        [conversationId, new Date().toISOString()],
        includeUpperBound,
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
    return this.storageService.save(z.storage.StorageService.OBJECT_STORE.EVENTS, undefined, event).then(() => event);
  }

  /**
   * Update an unencrypted conversation event.
   * @param {Object} event - JSON event to be stored
   * @returns {Promise} Resolves with the updated record
   */
  update_event(event) {
    return this.storageService
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
    return this.storageService.db[z.storage.StorageService.OBJECT_STORE.CONVERSATIONS]
      .bulkPut(conversations, keys)
      .then(() => conversations);
  }

  /**
   * Saves a conversation entity in the local database.
   * @param {Conversation} conversationEntity - Conversation entity
   * @returns {Promise} Resolves with the conversation entity
   */
  save_conversation_state_in_db(conversationEntity) {
    const conversationData = conversationEntity.serialize();

    return this.storageService
      .save(z.storage.StorageService.OBJECT_STORE.CONVERSATIONS, conversationEntity.id, conversationData)
      .then(primaryKey => {
        this.logger.info(`State of conversation '${primaryKey}' was stored`, conversationData);
        return conversationEntity;
      });
  }

  /**
   * Search for text in given conversation.
   *
   * @param {string} conversationId - ID of conversation to add users to
   * @param {string} query - will be checked in against all text messages
   * @returns {Promise} Resolves with the matching events
   */
  search_in_conversation(conversationId, query) {
    const categoryMin = z.message.MessageCategory.TEXT;
    const categoryMax =
      z.message.MessageCategory.TEXT | z.message.MessageCategory.LINK | z.message.MessageCategory.LINK_PREVIEW;

    return this.load_events_with_category_from_db(conversationId, categoryMin, categoryMax).then(events => {
      return events.filter(({data: event_data}) => z.search.FullTextSearch.search(event_data.content, query));
    });
  }

  /**
   * Update asset as uploaded in database.
   *
   * @param {string} primaryKey - Primary key used to find an event in the database
   * @param {Object} eventJson - Updated event asset data
   * @returns {Promise} Resolves when the message was updated in database
   */
  update_asset_as_uploaded_in_db(primaryKey, eventJson) {
    return this.storageService.load(z.storage.StorageService.OBJECT_STORE.EVENTS, primaryKey).then(record => {
      if (record) {
        const {data: asset_data, time} = eventJson;

        record.data.id = asset_data.id;
        record.data.key = asset_data.key;
        record.data.otr_key = asset_data.otr_key;
        record.data.sha256 = asset_data.sha256;
        record.data.status = z.assets.AssetTransferState.UPLOADED;
        record.data.token = asset_data.token;
        record.status = z.message.StatusType.SENT;
        record.time = time;

        return this.storageService
          .update(z.storage.StorageService.OBJECT_STORE.EVENTS, primaryKey, record)
          .then(() => this.logger.info('Updated asset message_et (uploaded)', primaryKey));
      }

      this.logger.warn('Did not find message to update asset (uploaded)', primaryKey);
    });
  }

  /**
   * Update asset as failed in database.
   *
   * @param {string} primaryKey - Primary key used to find an event in the database
   * @param {string} reason - Failure reason
   * @returns {Promise} Resolves when the message was updated in database
   */
  update_asset_as_failed_in_db(primaryKey, reason) {
    return this.storageService.load(z.storage.StorageService.OBJECT_STORE.EVENTS, primaryKey).then(record => {
      if (record) {
        record.data.reason = reason;
        record.data.status = z.assets.AssetTransferState.UPLOAD_FAILED;

        return this.storageService.update(z.storage.StorageService.OBJECT_STORE.EVENTS, primaryKey, record).then(() => {
          this.logger.info('Updated asset message_et (failed)', primaryKey);
          return record;
        });
      }

      this.logger.warn('Did not find message to update asset (failed)', primaryKey);
    });
  }

  /**
   * Update a message in the database.
   *
   * @param {Message} messageEt - Message event to update in the database
   * @param {Object} [changes={}] - Changes to update message with
   * @param {string} conversationId - ID of conversation
   * @returns {Promise} Resolves when the message was updated in database
   */
  update_message_in_db(messageEt, changes = {}, conversationId) {
    return Promise.resolve(messageEt.primary_key).then(primaryKey => {
      if (Object.keys(changes).length) {
        if (changes.version) {
          return this.storageService.db.transaction('rw', z.storage.StorageService.OBJECT_STORE.EVENTS, () => {
            return this.load_event_from_db(conversationId, messageEt.id).then(record => {
              let custom_data;

              if (record) {
                const database_version = record.version || 1;

                if (changes.version === database_version + 1) {
                  return this.storageService.update(z.storage.StorageService.OBJECT_STORE.EVENTS, primaryKey, changes);
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

        return this.storageService.update(z.storage.StorageService.OBJECT_STORE.EVENTS, primaryKey, changes);
      }

      throw new z.conversation.ConversationError(z.conversation.ConversationError.TYPE.NO_CHANGES);
    });
  }
};
