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

import {
  ClientMismatch,
  Conversation as BackendConversation,
  ConversationCode,
  Conversations as BackendConversations,
  NewConversation,
  NewOTRMessage,
} from '@wireapp/api-client/dist/conversation';
import {ConversationMemberUpdateData} from '@wireapp/api-client/dist/conversation/data';
import {
  ConversationCodeUpdateEvent,
  ConversationEvent,
  ConversationMemberJoinEvent,
  ConversationMessageTimerUpdateEvent,
  ConversationRenameEvent,
} from '@wireapp/api-client/dist/event';

import {Logger, getLogger} from 'Util/Logger';

import {Conversation as ConversationEntity} from '../entity/Conversation';
import {EventService} from '../event/EventService';
import {MessageCategory} from '../message/MessageCategory';
import {search as fullTextSearch} from '../search/FullTextSearch';
import {BackendClient} from '../service/BackendClient';
import {StorageService} from '../storage';
import {StorageSchemata} from '../storage/StorageSchemata';
import {TeamService} from '../team/TeamService';
import {ACCESS_MODE} from './AccessMode';
import {ACCESS_ROLE} from './AccessRole';
import {DefaultRole} from './ConversationRoleRepository';
import {ReceiptMode} from './ReceiptMode';

// Conversation service for all conversation calls to the backend REST API.
export class ConversationService {
  private readonly backendClient: BackendClient;
  private readonly eventService: EventService;
  private readonly logger: Logger;
  private readonly storageService: StorageService;

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      URL_CONVERSATIONS: '/conversations',
    };
  }

  constructor(backendClient: BackendClient, eventService: EventService, storageService: StorageService) {
    this.backendClient = backendClient;
    this.eventService = eventService;
    this.storageService = storageService;
    this.logger = getLogger('ConversationService');
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
   * @param payload Payload object for group creation
   * @returns Resolves when the conversation was created
   */
  postConversations(payload: NewConversation): Promise<BackendConversation> {
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
   * @param limit Number of results to return (default 100, max 500)
   * @param conversation_id Conversation ID to start from
   * @returns Resolves with the conversation information
   */
  getConversations(limit: number = 100, conversation_id?: string): Promise<BackendConversations> {
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
   * @param limit Number of results to return (default 500, max 500)
   * @returns Resolves with the conversation information
   */
  getAllConversations(limit = 500): Promise<BackendConversation[]> {
    let allConversations: BackendConversation[] = [];

    const _getConversations = (conversationId?: string): Promise<BackendConversation[]> => {
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
   * @param conversation_id ID of conversation to get
   * @returns Resolves with the server response
   */
  get_conversation_by_id(conversation_id: string): Promise<BackendConversation> {
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
   * @param conversationId ID of conversation to rename
   * @param name new name of the conversation
   * @returns Resolves with the server response
   */
  updateConversationName(conversationId: string, name: string): Promise<ConversationRenameEvent> {
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
   * @param conversationId ID of conversation to rename
   * @param messageTimer new message timer of the conversation
   * @returns Resolves with the server response
   */
  updateConversationMessageTimer(
    conversationId: string,
    messageTimer: number,
  ): Promise<ConversationMessageTimerUpdateEvent> {
    return this.backendClient.sendJson({
      data: {message_timer: messageTimer},
      type: 'PUT',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/message-timer`,
    });
  }

  /**
   * Update the conversation message timer value.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversationMessageTimer
   *
   * @param conversationId ID of conversation to rename
   * @param receiptMode new receipt mode
   * @returns Resolves with the server response
   */
  updateConversationReceiptMode(conversationId: string, receiptMode: ReceiptMode): Promise<any> {
    return this.backendClient.sendJson({
      data: {receipt_mode: receiptMode},
      type: 'PUT',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/receipt-mode`,
    });
  }

  /**
   * Update self membership properties.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateSelf
   *
   * @param conversation_id ID of conversation to update
   * @param payload Updated properties
   * @returns Resolves with the server response
   */
  update_member_properties(conversation_id: string, payload: ConversationMemberUpdateData): Promise<void> {
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
   * @param conversationId ID of conversation to delete access code for
   * @returns Resolves with the server response
   */
  deleteConversationCode(conversationId: string): Promise<BackendConversation> {
    return this.backendClient.sendRequest({
      type: 'DELETE',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/code`,
    });
  }

  /**
   * Get the conversation access code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/getConversationCode
   * @param conversationId ID of conversation to get access code for
   * @returns Resolves with the server response
   */
  getConversationCode(conversationId: string): Promise<ConversationCode> {
    return this.backendClient.sendRequest({
      type: 'GET',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/code`,
    });
  }

  /**
   * Request a conversation access code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createConversationCode
   * @param conversationId ID of conversation to request access code for
   * @returns Resolves with the server response
   */
  postConversationCode(conversationId: string): Promise<ConversationCodeUpdateEvent> {
    return this.backendClient.sendRequest({
      type: 'POST',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/code`,
    });
  }

  /**
   * Join a conversation using a code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/joinConversationByCode
   * @param key Conversation identifier
   * @param code Conversation access code
   * @returns Resolves with the server response
   */
  postConversationJoin(key: string, code: string): Promise<ConversationMemberJoinEvent> {
    return this.backendClient.sendJson({
      data: {
        code,
        key,
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
   * @param conversationId ID of conversation
   * @param accessModes Conversation access mode
   * @param accessRole Conversation access role
   * @returns Resolves with the server response
   */
  putConversationAccess(
    conversationId: string,
    accessModes: ACCESS_MODE[],
    accessRole: ACCESS_ROLE,
  ): Promise<ConversationEvent> {
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
   * @param conversationId ID of conversation to remove service from
   * @param userId ID of service to be removed from the the conversation
   * @returns Resolves with the server response
   */
  deleteBots(conversationId: string, userId: string): Promise<void> {
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
   * @param conversationId ID of conversation to remove member from
   * @param userId ID of member to be removed from the the conversation
   * @returns Resolves with the server response
   */
  deleteMembers(conversationId: string, userId: string): Promise<void> {
    return this.backendClient.sendRequest({
      type: 'DELETE',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/members/${userId}`,
    });
  }

  putMembers(conversationId: string, userId: string, data: {conversation_role: string}): Promise<void> {
    return this.backendClient.sendJson({
      data,
      type: 'PUT',
      url: `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversationId}/members/${userId}`,
    });
  }

  deleteConversation(teamId: string, conversationId: string): Promise<void> {
    return this.backendClient.sendRequest({
      type: 'DELETE',
      url: `${TeamService.URL.TEAMS}/${teamId}/conversations/${conversationId}`,
    });
  }

  /**
   * Add a service to an existing conversation.
   *
   * @param conversationId ID of conversation to add users to
   * @param providerId ID of service provider
   * @param serviceId ID of service
   * @returns Resolves with the server response
   */
  postBots(conversationId: string, providerId: string, serviceId: string): Promise<void> {
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
   * @param conversation_id ID of conversation to send message in
   * @param payload Payload to be posted
   * @param payload.recipients - Map with per-recipient data
   * @param payload.sender - Client ID of the sender
   * @param precondition_option Level that backend checks for missing clients
   * @returns Promise that resolves when the message was sent
   */
  post_encrypted_message(
    conversation_id: string,
    payload: NewOTRMessage,
    precondition_option: true | string[],
  ): Promise<ClientMismatch> {
    let url = `${ConversationService.CONFIG.URL_CONVERSATIONS}/${conversation_id}/otr/messages`;

    if (Array.isArray(precondition_option)) {
      url = `${url}?report_missing=${precondition_option.join(',')}`;
    } else if (precondition_option === true) {
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
   * @param conversationId ID of conversation to add users to
   * @param userIds IDs of users to be added to the conversation
   * @returns Resolves with the server response
   */
  postMembers(conversationId: string, userIds: string[]): Promise<ConversationMemberJoinEvent> {
    return this.backendClient.sendJson({
      data: {
        conversation_role: DefaultRole.WIRE_MEMBER,
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
   * @param conversation_id ID of conversation to be deleted
   * @returns Resolves when the entity was deleted
   */
  delete_conversation_from_db(conversation_id: string): Promise<string> {
    return this.storageService.delete(StorageSchemata.OBJECT_STORE.CONVERSATIONS, conversation_id).then(primary_key => {
      this.logger.info(`State of conversation '${primary_key}' was deleted`);
      return primary_key;
    });
  }

  loadConversation<T>(conversationId: string): Promise<T> {
    return this.storageService.load(StorageSchemata.OBJECT_STORE.CONVERSATIONS, conversationId);
  }

  /**
   * Get active conversations from database.
   * @returns Resolves with active conversations
   */
  async get_active_conversations_from_db(): Promise<string[]> {
    const min_date = new Date();
    min_date.setDate(min_date.getDate() - 30);

    let events;

    if (this.storageService.db) {
      events = await this.storageService.db
        .table(StorageSchemata.OBJECT_STORE.EVENTS)
        .where('time')
        .aboveOrEqual(min_date.toISOString())
        .toArray();
    } else {
      const records = await this.storageService.getAll<{time: number}>(StorageSchemata.OBJECT_STORE.EVENTS);
      events = records
        .filter(record => record.time.toString() >= min_date.toISOString())
        .sort((a, b) => a.time - b.time);
    }

    const conversations = events.reduce((accumulated, event) => {
      accumulated[event.conversation] = (accumulated[event.conversation] || 0) + 1;
      return accumulated;
    }, {});

    return Object.keys(conversations).sort((id_a, id_b) => conversations[id_b] - conversations[id_a]);
  }

  /**
   * Loads conversation states from the local database.
   * @returns Resolves with all the stored conversation states
   */
  load_conversation_states_from_db<T>(): Promise<T[]> {
    return this.storageService.getAll(StorageSchemata.OBJECT_STORE.CONVERSATIONS);
  }

  /**
   * Saves a list of conversation records in the local database.
   * @param conversations Conversation entity
   * @returns Resolves with a list of conversation records
   */
  async save_conversations_in_db(conversations: ConversationEntity[]): Promise<ConversationEntity[]> {
    if (this.storageService.db) {
      const keys = conversations.map(conversation => conversation.id);
      await this.storageService.db.table(StorageSchemata.OBJECT_STORE.CONVERSATIONS).bulkPut(conversations, keys);
    } else {
      for (const conversation of conversations) {
        await this.storageService.save(StorageSchemata.OBJECT_STORE.CONVERSATIONS, conversation.id, conversation);
      }
    }

    return conversations;
  }

  /**
   * Saves a conversation entity in the local database.
   * @param conversation_et Conversation entity
   * @returns Resolves with the conversation entity
   */
  save_conversation_state_in_db(conversation_et: ConversationEntity): Promise<ConversationEntity> {
    const conversationData = conversation_et.serialize();

    return this.storageService
      .save(StorageSchemata.OBJECT_STORE.CONVERSATIONS, conversation_et.id, conversationData)
      .then(primary_key => {
        this.logger.info(`State of conversation '${primary_key}' was stored`, conversationData);
        return conversation_et;
      });
  }

  /**
   * Search for text in given conversation.
   *
   * @param conversation_id ID of conversation to add users to
   * @param query will be checked in against all text messages
   * @returns Resolves with the matching events
   */
  search_in_conversation(conversation_id: string, query: string): Promise<any> {
    const category_min = MessageCategory.TEXT;
    const category_max = MessageCategory.TEXT | MessageCategory.LINK | MessageCategory.LINK_PREVIEW;

    return this.eventService.loadEventsWithCategory(conversation_id, category_min, category_max).then(events => {
      return events.filter(({data: event_data}: any) => fullTextSearch(event_data.content, query));
    });
  }
}
