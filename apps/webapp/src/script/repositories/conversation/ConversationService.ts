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
  CONVERSATION_ACCESS_ROLE,
  Conversation as BackendConversation,
  ConversationCode,
  CONVERSATION_ACCESS,
  RemoteConversations,
  ADD_PERMISSION,
} from '@wireapp/api-client/lib/conversation';
import type {
  ConversationJoinData,
  ConversationMemberUpdateData,
  ConversationOtherMemberUpdateData,
  ConversationReceiptModeUpdateData,
} from '@wireapp/api-client/lib/conversation/data';
import {ConversationProtocolUpdateEvent} from '@wireapp/api-client/lib/event';
import type {
  ConversationCodeDeleteEvent,
  ConversationCodeUpdateEvent,
  ConversationEvent,
  ConversationMemberJoinEvent,
  ConversationMemberLeaveEvent,
  ConversationMessageTimerUpdateEvent,
  ConversationReceiptModeUpdateEvent,
  ConversationRenameEvent,
} from '@wireapp/api-client/lib/event';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {MLSServiceEvents} from '@wireapp/core/lib/messagingProtocols/mls';
import type {Conversation as ConversationEntity} from 'Repositories/entity/Conversation';
import type {EventService} from 'Repositories/event/EventService';
import {search as fullTextSearch} from 'Repositories/search/FullTextSearch';
import {StorageService} from 'Repositories/storage';
import {ConversationRecord} from 'Repositories/storage/record/ConversationRecord';
import {StorageSchemata} from 'Repositories/storage/StorageSchemata';
import {container} from 'tsyringe';

import {MLSCapableConversation} from './ConversationSelectors';

import {MessageCategory} from '../../message/MessageCategory';
import {APIClient} from '../../service/APIClientSingleton';
import {Core} from '../../service/CoreSingleton';

export class ConversationService {
  private readonly eventService: EventService;

  constructor(
    eventService: EventService,
    private readonly storageService = container.resolve(StorageService),
    private readonly apiClient = container.resolve(APIClient),
    private readonly core = container.resolve(Core),
  ) {
    this.eventService = eventService;
  }

  private get coreConversationService() {
    const conversationService = this.core.service?.conversation;

    if (!conversationService) {
      throw new Error('Conversation service not available');
    }

    return conversationService;
  }

  //##############################################################################
  // Get conversations
  //##############################################################################

  /**
   * Retrieves all the conversations of a user.
   * @returns Resolves with the conversation information
   */
  async getAllConversations() {
    return this.coreConversationService.getConversations();
  }

  /**
   * Get a conversation by ID.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversation
   */
  getConversationById({id, domain}: QualifiedId): Promise<BackendConversation> {
    return this.apiClient.api.conversation.getConversation({domain, id});
  }

  public async blacklistConversation(conversationId: QualifiedId): Promise<void> {
    await this.coreConversationService.blacklistConversation(conversationId);
  }

  public async removeConversationFromBlacklist(conversationId: QualifiedId): Promise<void> {
    await this.coreConversationService.removeConversationFromBlacklist(conversationId);
  }

  /**
   * Get conversations for a list of conversation IDs.
   * @see https://staging-nginz-https.zinfra.io/v4/api/swagger-ui/#/default/post_conversations_list
   */
  getConversationByIds(conversations: QualifiedId[]): Promise<RemoteConversations> {
    return this.apiClient.api.conversation.getConversationsByQualifiedIds(conversations);
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
  updateConversationName(conversationId: QualifiedId, name: string): Promise<ConversationRenameEvent> {
    return this.apiClient.api.conversation.putConversation(conversationId, {
      name,
    });
  }

  /**
   * Update the conversation protocol.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversation
   *
   * @param conversationId ID of conversation to rename
   * @param protocol new protocol of the conversation
   * @returns Resolves with the server response
   */
  updateConversationProtocol(
    conversationId: QualifiedId,
    protocol: CONVERSATION_PROTOCOL.MIXED | CONVERSATION_PROTOCOL.MLS,
  ): Promise<ConversationProtocolUpdateEvent | null> {
    return this.apiClient.api.conversation.putConversationProtocol(conversationId, protocol);
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
    conversationId: QualifiedId,
    message_timer: number,
  ): Promise<ConversationMessageTimerUpdateEvent> {
    return this.apiClient.api.conversation.putConversationMessageTimer(conversationId, {message_timer});
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
    conversationId: QualifiedId,
    receiptMode: ConversationReceiptModeUpdateData,
  ): Promise<ConversationReceiptModeUpdateEvent> {
    return this.apiClient.api.conversation.putConversationReceiptMode(conversationId, receiptMode);
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
  updateMemberProperties(conversationId: QualifiedId, payload: Partial<ConversationMemberUpdateData>): Promise<void> {
    return this.apiClient.api.conversation.putMembershipProperties(conversationId, payload);
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
    return this.apiClient.api.conversation.deleteConversationCode(conversationId);
  }

  /**
   * Get the conversation access code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/getConversationCode
   * @param conversationId ID of conversation to get access code for
   * @returns Resolves with the server response
   */
  getConversationCode(conversationId: string): Promise<ConversationCode> {
    return this.apiClient.api.conversation.getConversationCode(conversationId);
  }

  /**
   * Request a conversation access code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createConversationCode
   * @param conversationId ID of conversation to request access code for
   * @returns Resolves with the server response
   */
  postConversationCode(conversationId: string, password?: string): Promise<ConversationCodeUpdateEvent> {
    return this.apiClient.api.conversation.postConversationCodeRequest(conversationId, password);
  }

  /**
   * Join a conversation using a code.
   *
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/joinConversationByCode
   * @param key Conversation identifier
   * @param code Conversation access code
   * @returns Resolves with the server response
   */
  postConversationJoin(key: string, code: string, password?: string): Promise<ConversationMemberJoinEvent> {
    return this.apiClient.api.conversation.postJoinByCode({code, key, password});
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
    return this.apiClient.api.conversation.getJoinByCode({code, key});
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
    conversationId: QualifiedId,
    accessModes: CONVERSATION_ACCESS[],
    accessRole: CONVERSATION_ACCESS_ROLE[],
  ): Promise<ConversationEvent> {
    const accessRoleField = this.apiClient.backendFeatures.version >= 3 ? 'access_role' : 'access_role_v2';

    return this.apiClient.api.conversation.putAccess(conversationId, {
      access: accessModes,
      [accessRoleField]: accessRole,
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
    return this.apiClient.api.conversation.deleteBot(conversationId, userId);
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
  deleteMembers(conversationId: QualifiedId, userId: QualifiedId): Promise<ConversationMemberLeaveEvent> {
    return this.apiClient.api.conversation.deleteMember(conversationId, userId);
  }

  putMembers(conversationId: QualifiedId, userId: QualifiedId, data: ConversationOtherMemberUpdateData): Promise<void> {
    return this.apiClient.api.conversation.putOtherMember(userId, conversationId, data);
  }

  deleteConversation(teamId: string, conversationId: string): Promise<void> {
    return this.apiClient.api.teams.conversation.deleteConversation(teamId, conversationId);
  }

  putAddPermission(conversationId: QualifiedId, addPermission: ADD_PERMISSION) {
    return this.apiClient.api.conversation.putAddPermission(conversationId, addPermission);
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
    return this.apiClient.api.conversation.postBot(conversationId, providerId, serviceId);
  }

  //##############################################################################
  // Database interactions
  //##############################################################################

  /**
   * Deletes a conversation entity from the local database.
   * @returns Resolves when the entity was deleted
   */
  async deleteConversationFromDb(conversationId: string): Promise<string> {
    return this.storageService.delete(StorageSchemata.OBJECT_STORE.CONVERSATIONS, conversationId);
  }

  loadConversation<T>(conversationId: string): Promise<T | undefined> {
    return this.storageService.load(StorageSchemata.OBJECT_STORE.CONVERSATIONS, conversationId);
  }

  /**
   * Get active conversations from database.
   * @returns Resolves with active conversations
   */
  async getActiveConversationsFromDb(): Promise<QualifiedId[]> {
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
      // TODO(federation): generate fully qualified ids
      accumulated[event.conversation] = (accumulated[event.conversation] || 0) + 1;
      return accumulated;
    }, {});

    return Object.keys(conversations)
      .sort((id_a, id_b) => conversations[id_b] - conversations[id_a])
      .map(id => ({domain: '', id}));
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
      .then(() => conversation_et);
  }

  /**
   * Search for text in given conversation.
   *
   * @param conversation_id ID of conversation to add users to
   * @param query will be checked in against all text messages
   * @returns Resolves with the matching events
   */
  async searchInConversation(conversation_id: string, query: string): Promise<any> {
    const category_min = MessageCategory.TEXT;
    const category_max = MessageCategory.TEXT | MessageCategory.LINK | MessageCategory.LINK_PREVIEW;

    const events = await this.eventService.loadEventsWithCategory(conversation_id, category_min, category_max);
    return events
      .filter(record => record.ephemeral_expires !== true)
      .filter(({data: event_data}: any) => fullTextSearch(event_data.content, query));
  }

  /**
   * Wipes MLS conversation in corecrypto and deletes the conversation state.
   * @param mlsConversation mls conversation
   */
  async wipeMLSCapableConversation(conversation: MLSCapableConversation) {
    const {groupId} = conversation;
    await this.coreConversationService.wipeMLSConversation(groupId);
  }

  public addMLSConversationRecoveredListener(onRecovered: (conversationId: QualifiedId) => void) {
    this.coreConversationService.on('MLSConversationRecovered', ({conversationId}) => onRecovered(conversationId));
  }

  public addMLSEventDistributedListener(onDistributed: (events: any, time: string) => void) {
    // Listen to the MLS distributed event to handle events that were distributed
    this.coreConversationService.on(MLSServiceEvents.MLS_EVENT_DISTRIBUTED, ({events, time}) =>
      onDistributed(events, time),
    );
  }

  /**
   * Will try to register mls group by sending an empty commit to establish it.
   * After group was successfully established, it will try to add other users to the group.
   *
   * @param groupId - id of the MLS group
   * @param conversationId - id of the conversation
   * @param selfUserId - id of the self user
   * @param qualifiedUsers - list of qualified users to add to the group (should not include the self user)
   */
  public readonly tryEstablishingMLSGroup = (params: {
    groupId: string;
    conversationId: QualifiedId;
    selfUserId: QualifiedId;
    qualifiedUsers: QualifiedId[];
  }) => {
    return this.coreConversationService.tryEstablishingMLSGroup(params);
  };

  /**
   * Checks if MLS conversation exists locally.
   * @param groupId id of the MLS group
   */
  async mlsGroupExistsLocally(groupId: string): Promise<boolean> {
    return this.coreConversationService.mlsGroupExistsLocally(groupId);
  }

  /**
   * Will check if mls group is established locally.
   * Group is established after the first commit was sent in the group and epoch number is at least 1.
   * @param groupId groupId of the conversation
   */
  async isMLSGroupEstablishedLocally(groupId: string): Promise<boolean> {
    return this.coreConversationService.isMLSGroupEstablishedLocally(groupId);
  }

  async getMLS1to1Conversation(userId: QualifiedId) {
    return this.coreConversationService.getMLS1to1Conversation(userId);
  }
}
