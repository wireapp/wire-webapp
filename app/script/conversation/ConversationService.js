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
   * @param {BackendClient} backendClient - Client for the API calls
   * @param {EventService} eventService - Service that handles events
   * @param {StorageService} storageService - Service for all storage interactions
   */
  constructor(backendClient, eventService, storageService) {
    this.backendClient = backendClient;
    this.eventService = eventService;
    this.storageService = storageService;
    this.logger = new z.util.Logger('z.conversation.ConversationService', z.config.LOGGER.OPTIONS);

    this.CONVERSATION_STORE_NAME = z.storage.StorageSchemata.OBJECT_STORE.CONVERSATIONS;
    this.EVENT_STORE_NAME = z.storage.StorageSchemata.OBJECT_STORE.EVENTS;
  }

  //##############################################################################
  // Create conversations
  //##############################################################################

  /**
   * Create a group conversation.
   *
   * @note Do not include yourself as the requestor
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createGroupConversation
   *
   * @param {Object} payload - Payload object for group creation
   * @returns {Promise} Resolves when the conversation was created
   */
  postConversations(payload) {
    return this.backendClient.sendJson({
      data: payload,
      type: 'POST',
      url: ConversationService.CONFIG.URL_CONVERSATIONS,
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
  getConversations(limit = 100, conversation_id) {
    return this.backendClient.sendRequest({
      data: {
        size: limit,
        start: conversation_id,
      },
      type: 'GET',
      url: ConversationService.CONFIG.URL_CONVERSATIONS,
    });
  }

  /**
   * Retrieves all the conversations of a user.
   * @param {number} [limit=500] - Number of results to return (default 500, max 500)
   * @returns {Promise} Resolves with the conversation information
   */
  getAllConversations(limit = 500) {
    let allConversations = [];

    const _getConversations = conversationId => {
      return this.getConversations(limit, conversationId).then(({conversations, has_more: hasMore}) => {
        if (conversations.length) {
          allConversations = allConversations.concat(conversations);
        }

        return hasMore ? _getConversations(conversations.pop().id) : allConversations;
      });
    };

    return _getConversations();
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
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}`,
    });
  }

  /**
   * Update the conversation name.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversation
   *
   * @param {string} conversationId - ID of conversation to rename
   * @param {string} name - new name of the conversation
   * @returns {Promise} Resolves with the server response
   */
  updateConversationName(conversationId, name) {
    return this.backendClient.sendJson({
      data: {name},
      type: 'PUT',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}`,
    });
  }

  /**
   * Update the conversation message timer value.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversationMessageTimer
   *
   * @param {string} conversationId - ID of conversation to rename
   * @param {number} messageTimer - new message timer of the conversation
   * @returns {Promise} Resolves with the server response
   */
  updateConversationMessageTimer(conversationId, messageTimer) {
    return this.backendClient.sendJson({
      data: {message_timer: messageTimer},
      type: 'PUT',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/message-timer`,
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
    return this.backendClient.sendJson({
      data: payload,
      type: 'PUT',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}/self`,
    });
  }

  //##############################################################################
  // Conversation access
  //##############################################################################

  /**
   * Delete the conversation access code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/deleteConversationCode
   * @param {string} conversationId - ID of conversation to delete access code for
   * @returns {Promise} Resolves with the server response
   */
  deleteConversationCode(conversationId) {
    return this.backendClient.sendRequest({
      type: 'DELETE',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/code`,
    });
  }

  /**
   * Get the conversation access code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/getConversationCode
   * @param {string} conversationId - ID of conversation to get access code for
   * @returns {Promise} Resolves with the server response
   */
  getConversationCode(conversationId) {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/code`,
    });
  }

  /**
   * Request a conversation access code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createConversationCode
   * @param {string} conversationId - ID of conversation to request access code for
   * @returns {Promise} Resolves with the server response
   */
  postConversationCode(conversationId) {
    return this.backendClient.sendRequest({
      type: 'POST',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/code`,
    });
  }

  /**
   * Join a conversation using a code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/joinConversationByCode
   * @param {string} key - Conversation identifier
   * @param {string} code - Conversation access code
   * @returns {Promise} Resolves with the server response
   */
  postConversationJoin(key, code) {
    return this.backendClient.sendJson({
      data: {
        code: code,
        key: key,
      },
      type: 'POST',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/join`,
    });
  }

  /**
   * Update conversation access mode.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversationAccess
   *
   * @param {string} conversationId - ID of conversation
   * @param {Array<z.conversation.ACCESS_MODE>} accessModes - Conversation access mode
   * @param {z.conversation.ACCESS_ROLE} accessRole - Conversation access role
   * @returns {Promise} Resolves with the server response
   */
  putConversationAccess(conversationId, accessModes, accessRole) {
    return this.backendClient.sendJson({
      data: {
        access: accessModes,
        access_role: accessRole,
      },
      type: 'PUT',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/access`,
    });
  }

  //##############################################################################
  // Send events
  //##############################################################################

  /**
   * Remove service from conversation.
   *
   * @param {string} conversationId - ID of conversation to remove service from
   * @param {string} userId - ID of service to be removed from the the conversation
   * @returns {Promise} Resolves with the server response
   */
  deleteBots(conversationId, userId) {
    return this.backendClient.sendRequest({
      type: 'DELETE',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/bots/${userId}`,
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
    return this.backendClient.sendRequest({
      type: 'DELETE',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/members/${userId}`,
    });
  }

  /**
   * Add a service to an existing conversation.
   *
   * @param {string} conversationId - ID of conversation to add users to
   * @param {string} providerId - ID of service provider
   * @param {string} serviceId - ID of service
   * @returns {Promise} Resolves with the server response
   */
  postBots(conversationId, providerId, serviceId) {
    return this.backendClient.sendJson({
      data: {
        provider: providerId,
        service: serviceId,
      },
      type: 'POST',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/bots`,
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
   * @returns {Promise} Promise that resolves when the message was sent
   */
  post_encrypted_message(conversation_id, payload, precondition_option) {
    let url = `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}/otr/messages`;

    if (_.isArray(precondition_option)) {
      url = `${url}?report_missing=${precondition_option.join(',')}`;
    } else if (precondition_option) {
      url = `${url}?ignore_missing=true`;
    }

    return this.backendClient.sendJson({
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
    return this.backendClient.sendJson({
      data: {
        users: userIds,
      },
      type: 'POST',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/members`,
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
    return this.storageService.delete(this.CONVERSATION_STORE_NAME, conversation_id).then(primary_key => {
      this.logger.info(`State of conversation '${primary_key}' was deleted`);
      return primary_key;
    });
  }

  /**
   * Get active conversations from database.
   * @returns {Promise} Resolves with active conversations
   */
  get_active_conversations_from_db() {
    const min_date = new Date();
    min_date.setDate(min_date.getDate() - 30);

    return this.storageService.db[this.EVENT_STORE_NAME]
      .where('time')
      .aboveOrEqual(min_date.toISOString())
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
    return this.storageService.getAll(this.CONVERSATION_STORE_NAME);
  }

  /**
   * Saves a list of conversation records in the local database.
   * @param {Array<Conversation>} conversations - Conversation entity
   * @returns {Promise<Array>} Resolves with a list of conversation records
   */
  save_conversations_in_db(conversations) {
    const keys = conversations.map(conversation => conversation.id);
    return this.storageService.db[this.CONVERSATION_STORE_NAME].bulkPut(conversations, keys).then(() => conversations);
  }

  /**
   * Saves a conversation entity in the local database.
   * @param {Conversation} conversation_et - Conversation entity
   * @returns {Promise} Resolves with the conversation entity
   */
  save_conversation_state_in_db(conversation_et) {
    const conversationData = conversation_et.serialize();

    return this.storageService
      .save(this.CONVERSATION_STORE_NAME, conversation_et.id, conversationData)
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

    return this.eventService.loadEventsWithCategory(conversation_id, category_min, category_max).then(events => {
      return events.filter(({data: event_data}) => z.search.FullTextSearch.search(event_data.content, query));
    });
  }
};
