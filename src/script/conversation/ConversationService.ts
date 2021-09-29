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

import type {
  CONVERSATION_ACCESS,
  CONVERSATION_ACCESS_ROLE,
  ClientMismatch,
  Conversation as BackendConversation,
  ConversationCode,
  NewConversation,
  NewOTRMessage,
} from '@wireapp/api-client/src/conversation';
import type {
  ConversationMemberUpdateData,
  ConversationOtherMemberUpdateData,
  ConversationReceiptModeUpdateData,
  ConversationJoinData,
} from '@wireapp/api-client/src/conversation/data';
import type {
  ConversationCodeDeleteEvent,
  ConversationCodeUpdateEvent,
  ConversationEvent,
  ConversationMemberJoinEvent,
  ConversationMemberLeaveEvent,
  ConversationMessageTimerUpdateEvent,
  ConversationReceiptModeUpdateEvent,
  ConversationRenameEvent,
} from '@wireapp/api-client/src/event';
import {container} from 'tsyringe';

import {Logger, getLogger} from 'Util/Logger';

import type {Conversation as ConversationEntity} from '../entity/Conversation';
import type {EventService} from '../event/EventService';
import {MessageCategory} from '../message/MessageCategory';
import {search as fullTextSearch} from '../search/FullTextSearch';
import {StorageService} from '../storage';
import {StorageSchemata} from '../storage/StorageSchemata';
import {APIClient} from '../service/APIClientSingleton';
import {ConversationRecord} from '../storage/record/ConversationRecord';
import {Config} from '../Config';
import {QualifiedIdOptional} from './EventBuilder';

export class ConversationService {
  private readonly eventService: EventService;
  private readonly logger: Logger;

  constructor(
    eventService: EventService,
    private readonly storageService = container.resolve(StorageService),
    private readonly apiClient = container.resolve(APIClient),
  ) {
    this.eventService = eventService;
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
    return this.apiClient.conversation.api.postConversation(payload);
  }

  //##############################################################################
  // Get conversations
  //##############################################################################

  /**
   * Retrieves all the conversations of a user.
   * @returns Resolves with the conversation information
   */
  async getAllConversations(): Promise<BackendConversation[]> {
    const conversations = await this.apiClient.conversation.api.getAllConversations();

    if (Config.getConfig().FEATURE.ENABLE_FEDERATION === true && Config.getConfig().FEATURE.FEDERATION_DOMAIN) {
      const remoteConversations = await this.apiClient.conversation.api.getRemoteConversations(
        Config.getConfig().FEATURE.FEDERATION_DOMAIN,
      );
      conversations.push(...remoteConversations);
    }

    return conversations;
  }

  /**
   * Get a conversation by ID.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversation
   */
  getConversationById(conversationId: string, domain: string | null): Promise<BackendConversation> {
    return this.apiClient.conversation.api.getConversation(conversationId, domain);
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
    return this.apiClient.conversation.api.putConversation(conversationId, {
      name,
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
    message_timer: number,
  ): Promise<ConversationMessageTimerUpdateEvent> {
    return this.apiClient.conversation.api.putConversationMessageTimer(conversationId, {message_timer});
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
  updateConversationReceiptMode(
    conversationId: string,
    receiptMode: ConversationReceiptModeUpdateData,
  ): Promise<ConversationReceiptModeUpdateEvent> {
    return this.apiClient.conversation.api.putConversationReceiptMode(conversationId, receiptMode);
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
  updateMemberProperties(conversationId: string, payload: Partial<ConversationMemberUpdateData>): Promise<void> {
    return this.apiClient.conversation.api.putMembershipProperties(conversationId, payload);
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
  deleteConversationCode(conversationId: string): Promise<ConversationCodeDeleteEvent> {
    return this.apiClient.conversation.api.deleteConversationCode(conversationId);
  }

  /**
   * Get the conversation access code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/getConversationCode
   * @param conversationId ID of conversation to get access code for
   * @returns Resolves with the server response
   */
  getConversationCode(conversationId: string): Promise<ConversationCode> {
    return this.apiClient.conversation.api.getConversationCode(conversationId);
  }

  /**
   * Request a conversation access code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createConversationCode
   * @param conversationId ID of conversation to request access code for
   * @returns Resolves with the server response
   */
  postConversationCode(conversationId: string): Promise<ConversationCodeUpdateEvent> {
    return this.apiClient.conversation.api.postConversationCodeRequest(conversationId);
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
    return this.apiClient.conversation.api.postJoinByCode({code, key});
  }

  /**
   * Join a conversation using a code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/joinConversationByCode
   * @param key Conversation identifier
   * @param code Conversation access code
   * @returns Resolves with the server response
   */
  getConversationJoin(key: string, code: string): Promise<ConversationJoinData> {
    return this.apiClient.conversation.api.getJoinByCode({code, key});
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
    accessModes: CONVERSATION_ACCESS[],
    accessRole: CONVERSATION_ACCESS_ROLE,
  ): Promise<ConversationEvent> {
    return this.apiClient.conversation.api.putAccess(conversationId, {
      access: accessModes,
      access_role: accessRole,
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
    return this.apiClient.conversation.api.deleteBot(conversationId, userId);
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
  deleteMembers(conversationId: string, userId: string): Promise<ConversationMemberLeaveEvent> {
    return this.apiClient.conversation.api.deleteMember(conversationId, userId);
  }

  putMembers(conversationId: string, userId: string, data: ConversationOtherMemberUpdateData): Promise<void> {
    return this.apiClient.conversation.api.putOtherMember(userId, conversationId, data);
  }

  deleteConversation(teamId: string, conversationId: string): Promise<void> {
    return this.apiClient.teams.conversation.api.deleteConversation(teamId, conversationId);
  }

  /**
   * Add a service to an existing conversation.
   *
   * @param conversationId ID of conversation to add users to
   * @param providerId ID of service provider
   * @param serviceId ID of service
   * @returns Resolves with the server response
   */
  postBots(conversationId: string, providerId: string, serviceId: string): Promise<ConversationMemberJoinEvent> {
    return this.apiClient.conversation.api.postBot(conversationId, providerId, serviceId);
  }

  /**
   * Post an encrypted message to a conversation.
   *
   * @note If "recipients" are not specified you will receive a list of all missing OTR recipients (user-client-map).
   * @note Options for the precondition check on missing clients are:
   * - `false` - all clients
   * - `Array<string>` - only clients of listed users
   * - `true` - force sending
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/postOtrMessage
   * @example How to send "recipients" payload
   * "recipients": {
   *   "<user-id>": {
   *     "<client-id>": "<base64-encoded-encrypted-content>"
   *   }
   * }
   *
   * @param conversationId ID of conversation to send message in
   * @param payload Payload to be posted
   * @returns Promise that resolves when the message was sent
   */
  postEncryptedMessage(
    conversationId: QualifiedIdOptional,
    payload: NewOTRMessage<string>,
    preconditionOption?: boolean | string[],
  ): Promise<ClientMismatch> {
    const reportMissing = Array.isArray(preconditionOption) ? preconditionOption : undefined;
    const ignoreMissing = preconditionOption === true ? true : undefined;

    if (reportMissing) {
      payload.report_missing = reportMissing;
    }

    // TODO(federation): add domain in the postOTRMessage (?)
    return this.apiClient.conversation.api.postOTRMessage(payload.sender, conversationId.id, payload, ignoreMissing);
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
    return this.apiClient.conversation.api.postMembers(conversationId, userIds);
  }

  //##############################################################################
  // Database interactions
  //##############################################################################

  /**
   * Deletes a conversation entity from the local database.
   * @returns Resolves when the entity was deleted
   */
  async deleteConversationFromDb(conversationId: string, domain: string | null): Promise<string> {
    const id = domain ? `${conversationId}@${domain}` : conversationId;
    const primaryKey = await this.storageService.delete(StorageSchemata.OBJECT_STORE.CONVERSATIONS, id);
    return primaryKey;
  }

  loadConversation<T>(conversationId: string): Promise<T> {
    return this.storageService.load(StorageSchemata.OBJECT_STORE.CONVERSATIONS, conversationId);
  }

  /**
   * Get active conversations from database.
   * @returns Resolves with active conversations
   */
  async getActiveConversationsFromDb(): Promise<string[]> {
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
  loadConversationStatesFromDb<T>(): Promise<T[]> {
    return this.storageService.getAll(StorageSchemata.OBJECT_STORE.CONVERSATIONS);
  }

  /**
   * Saves a list of conversation records in the local database.
   * @param conversations Conversation entity
   * @returns Resolves with a list of conversation records
   */
  async saveConversationsInDb(conversations: ConversationRecord[]): Promise<ConversationRecord[]> {
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
  saveConversationStateInDb(conversation_et: ConversationEntity): Promise<ConversationEntity> {
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
  searchInConversation(conversation_id: string, query: string): Promise<any> {
    const category_min = MessageCategory.TEXT;
    const category_max = MessageCategory.TEXT | MessageCategory.LINK | MessageCategory.LINK_PREVIEW;

    return this.eventService.loadEventsWithCategory(conversation_id, category_min, category_max).then(events => {
      return events.filter(({data: event_data}: any) => fullTextSearch(event_data.content, query));
    });
  }
}
