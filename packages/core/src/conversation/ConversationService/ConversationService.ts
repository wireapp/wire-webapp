/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
  Conversation,
  DefaultConversationRoleName,
  MutedStatus,
  NewConversation,
  QualifiedUserClients,
  ConversationProtocol,
  RemoteConversations,
  PostMlsMessageResponse,
  MLSConversation,
  SUBCONVERSATION_ID,
  Subconversation,
} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_TYPING, ConversationMemberUpdateData} from '@wireapp/api-client/lib/conversation/data';
import {
  BackendEvent,
  CONVERSATION_EVENT,
  ConversationMLSMessageAddEvent,
  ConversationMLSWelcomeEvent,
  ConversationMemberLeaveEvent,
  ConversationOtrMessageAddEvent,
} from '@wireapp/api-client/lib/event';
import {BackendError, BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {XOR} from '@wireapp/commons/lib/util/TypeUtil';
import {Decoder} from 'bazinga64';
import logdown from 'logdown';

import {APIClient} from '@wireapp/api-client';
import {TypedEventEmitter} from '@wireapp/commons';
import {GenericMessage} from '@wireapp/protocol-messaging';

import {
  AddUsersFailure,
  AddUsersParams,
  KeyPackageClaimUser,
  MLSCreateConversationResponse,
  SendMlsMessageParams,
  SendResult,
} from './ConversationService.types';

import {MessageTimer, MessageSendingState, RemoveUsersParams} from '../../conversation/';
import {MLSService} from '../../messagingProtocols/mls';
import {queueConversationRejoin} from '../../messagingProtocols/mls/conversationRejoinQueue';
import {
  isCoreCryptoMLSOrphanWelcomeMessageError,
  isCoreCryptoMLSWrongEpochError,
} from '../../messagingProtocols/mls/MLSService/CoreCryptoMLSError';
import {getConversationQualifiedMembers, ProteusService} from '../../messagingProtocols/proteus';
import {
  AddUsersToProteusConversationParams,
  SendProteusMessageParams,
} from '../../messagingProtocols/proteus/ProteusService/ProteusService.types';
import {HandledEventPayload, HandledEventResult} from '../../notification';
import {CoreDatabase} from '../../storage/CoreDB';
import {isMLSConversation} from '../../util';
import {mapQualifiedUserClientIdsToFullyQualifiedClientIds} from '../../util/fullyQualifiedClientIdUtils';
import {isSendingMessage, sendMessage} from '../message/messageSender';
import {SubconversationService} from '../SubconversationService/SubconversationService';

type Events = {
  MLSConversationRecovered: {conversationId: QualifiedId};
};

export class ConversationService extends TypedEventEmitter<Events> {
  public readonly messageTimer: MessageTimer;
  private readonly logger = logdown('@wireapp/core/ConversationService');

  constructor(
    private readonly apiClient: APIClient,
    private readonly proteusService: ProteusService,
    private readonly coreDatabase: CoreDatabase,
    private readonly groupIdFromConversationId: (
      conversationId: QualifiedId,
      subconversationId?: SUBCONVERSATION_ID,
    ) => Promise<string | undefined>,
    private readonly subconversationService: SubconversationService,
    private readonly _mlsService?: MLSService,
  ) {
    super();
    this.messageTimer = new MessageTimer();
  }

  get mlsService(): MLSService {
    if (!this._mlsService) {
      throw new Error('Cannot do MLS operations on a non-mls environment');
    }
    return this._mlsService;
  }

  /**
   * Get a fresh list from backend of clients for all the participants of the conversation.
   * @fixme there are some case where this method is not enough to detect removed devices
   * @param {string} conversationId
   * @param {string} conversationDomain? - If given will send the message to the new qualified endpoint
   */
  public async fetchAllParticipantsClients(conversationId: QualifiedId): Promise<QualifiedUserClients> {
    const qualifiedMembers = await getConversationQualifiedMembers({
      apiClient: this.apiClient,
      conversationId,
    });
    const allClients = await this.apiClient.api.user.postListClients({qualified_users: qualifiedMembers});
    const qualifiedUserClients: QualifiedUserClients = {};

    Object.entries(allClients.qualified_user_map).map(([domain, userClientMap]) =>
      Object.entries(userClientMap).map(async ([userId, clients]) => {
        qualifiedUserClients[domain] ||= {};
        qualifiedUserClients[domain][userId] = clients.map(client => client.id);
      }),
    );

    return qualifiedUserClients;
  }

  /**
   * Create a group conversation.
   *
   * This method might fail with a `BackendsNotConnectedError` if there are users from not connected backends that are part of the payload
   *
   * @note Do not include yourself as the requestor
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createGroupConversation
   *
   * @param conversationData Payload object for group creation
   * @returns Resolves when the conversation was created
   */
  public async createProteusConversation(conversationData: NewConversation) {
    return this.proteusService.createConversation(conversationData);
  }

  public async getConversation(conversationId: QualifiedId): Promise<Conversation> {
    return this.apiClient.api.conversation.getConversation(conversationId);
  }

  public async getMLSSelfConversation(): Promise<MLSConversation> {
    return this.apiClient.api.conversation.getMLSSelfConversation();
  }

  public async getConversations(conversationIds?: QualifiedId[]): Promise<RemoteConversations> {
    if (!conversationIds) {
      const conversationIdsToSkip = await this.coreDatabase.getAll('conversationBlacklist');
      return this.apiClient.api.conversation.getConversationList(conversationIdsToSkip);
    }
    return this.apiClient.api.conversation.getConversationsByQualifiedIds(conversationIds);
  }

  public async addUsersToProteusConversation(params: AddUsersToProteusConversationParams) {
    return this.proteusService.addUsersToConversation(params);
  }

  public async removeUserFromConversation(
    conversationId: QualifiedId,
    userId: QualifiedId,
  ): Promise<ConversationMemberLeaveEvent> {
    return this.apiClient.api.conversation.deleteMember(conversationId, userId);
  }

  /**
   * Sends a message to a conversation
   * @return resolves with the sending status
   */
  public async send(params: XOR<SendMlsMessageParams, SendProteusMessageParams>): Promise<SendResult> {
    function isMLS(params: SendProteusMessageParams | SendMlsMessageParams): params is SendMlsMessageParams {
      return params.protocol === ConversationProtocol.MLS;
    }
    return sendMessage(() => (isMLS(params) ? this.sendMLSMessage(params) : this.proteusService.sendMessage(params)));
  }

  public sendTypingStart(conversationId: QualifiedId): Promise<void> {
    return this.apiClient.api.conversation.postTyping(conversationId, {status: CONVERSATION_TYPING.STARTED});
  }

  public sendTypingStop(conversationId: QualifiedId): Promise<void> {
    return this.apiClient.api.conversation.postTyping(conversationId, {status: CONVERSATION_TYPING.STOPPED});
  }

  /**
   * Blacklists a conversation.
   * When conversations is blacklisted, it means that it will be completely ignored by a client, even though it does exist on backend and we're the conversation member.
   * @param conversationId id of the conversation to blacklist
   */
  public readonly blacklistConversation = async (conversationId: QualifiedId): Promise<void> => {
    await this.coreDatabase.put('conversationBlacklist', conversationId, conversationId.id);
  };

  /**
   * Removes a conversation from the blacklists.
   * @param conversationId id of the conversation to remove from the blacklist
   */
  public readonly removeConversationFromBlacklist = async (conversationId: QualifiedId): Promise<void> => {
    await this.coreDatabase.delete('conversationBlacklist', conversationId.id);
  };

  /**
   * returns the number of messages that are in the queue expecting to be sent
   */
  isSendingMessage(): boolean {
    return isSendingMessage();
  }

  public setConversationMutedStatus(
    conversationId: QualifiedId,
    status: MutedStatus,
    muteTimestamp: number | Date,
  ): Promise<void> {
    if (typeof muteTimestamp === 'number') {
      muteTimestamp = new Date(muteTimestamp);
    }

    const payload: ConversationMemberUpdateData = {
      otr_muted_ref: muteTimestamp.toISOString(),
      otr_muted_status: status,
    };

    return this.apiClient.api.conversation.putMembershipProperties(conversationId, payload);
  }

  public toggleArchiveConversation(
    conversationId: QualifiedId,
    archived: boolean,
    archiveTimestamp: number | Date = new Date(),
  ): Promise<void> {
    if (typeof archiveTimestamp === 'number') {
      archiveTimestamp = new Date(archiveTimestamp);
    }

    const payload: ConversationMemberUpdateData = {
      otr_archived: archived,
      otr_archived_ref: archiveTimestamp.toISOString(),
    };

    return this.apiClient.api.conversation.putMembershipProperties(conversationId, payload);
  }

  public setMemberConversationRole(
    conversationId: string,
    userId: string,
    conversationRole: DefaultConversationRoleName | string,
  ): Promise<void> {
    return this.apiClient.api.conversation.putOtherMember(userId, conversationId, {
      conversation_role: conversationRole,
    });
  }

  /**
   *   ###############################################
   *   ################ MLS Functions ################
   *   ###############################################
   */

  /**
   * Will create a conversation on backend and register it to CoreCrypto once created
   * @param conversationData
   */
  public async createMLSConversation(
    conversationData: NewConversation,
    selfUserId: QualifiedId,
    selfClientId: string,
  ): Promise<MLSCreateConversationResponse> {
    const {qualified_users: qualifiedUsers = []} = conversationData;

    /**
     * @note For creating MLS conversations the users & qualified_users
     * field must be empty as backend is not aware which users
     * are in a MLS conversation because of the MLS architecture.
     */
    const newConversation = await this.apiClient.api.conversation.postConversation({
      ...conversationData,
      users: undefined,
      qualified_users: undefined,
    });
    const {group_id: groupId, qualified_id: qualifiedId} = newConversation;
    if (!groupId) {
      throw new Error('No group_id found in response which is required for creating MLS conversations.');
    }

    const {events, failures} = await this.mlsService.registerConversation(groupId, qualifiedUsers.concat(selfUserId), {
      creator: {
        user: selfUserId,
        client: selfClientId,
      },
    });

    // We fetch the fresh version of the conversation created on backend with the newly added users
    const conversation = await this.apiClient.api.conversation.getConversation(qualifiedId);

    return {
      events,
      conversation,
      failedToAdd: failures,
    };
  }

  private async sendMLSMessage(params: SendMlsMessageParams, shouldRetry = true): Promise<SendResult> {
    const {payload, groupId, conversationId} = params;
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    // immediately execute pending commits before sending the message
    await this.mlsService.commitPendingProposals(groupId);

    const encrypted = await this.mlsService.encryptMessage(groupIdBytes, GenericMessage.encode(payload).finish());

    let response: PostMlsMessageResponse | null = null;
    let sentAt: string = '';
    try {
      response = await this.apiClient.api.conversation.postMlsMessage(encrypted);
      sentAt = response.time?.length > 0 ? response.time : new Date().toISOString();
    } catch (error) {
      const isMLSStaleMessageError =
        error instanceof BackendError && error.label === BackendErrorLabel.MLS_STALE_MESSAGE;
      if (isMLSStaleMessageError) {
        await this.recoverMLSGroupFromEpochMismatch(conversationId);
        if (shouldRetry) {
          return this.sendMLSMessage(params, false);
        }
      }

      throw error;
    }

    const failedToSend =
      response?.failed || (response?.failed_to_send ?? []).length > 0
        ? {
            queued: response?.failed_to_send,
            failed: response?.failed,
          }
        : undefined;

    return {
      id: payload.messageId,
      sentAt,
      failedToSend,
      state: sentAt ? MessageSendingState.OUTGOING_SENT : MessageSendingState.CANCELED,
    };
  }

  /**
   * Will add users to existing MLS group by claiming their key packages and passing them to CoreCrypto.addClientsToConversation
   *
   * @param qualifiedUsers List of qualified user ids (with optional skipOwnClientId field - if provided we will not claim key package for this self client)
   * @param groupId Id of the group to which we want to add users
   * @param conversationId Id of the conversation to which we want to add users
   */
  public async addUsersToMLSConversation({
    qualifiedUsers,
    groupId,
    conversationId,
  }: Required<AddUsersParams>): Promise<MLSCreateConversationResponse> {
    const {keyPackages, failures: keysClaimingFailures} = await this.mlsService.getKeyPackagesPayload(qualifiedUsers);

    const {events, failures} =
      keyPackages.length > 0
        ? await this.mlsService.addUsersToExistingConversation(groupId, keyPackages)
        : {events: [], failures: [] as AddUsersFailure[]};

    const conversation = await this.getConversation(conversationId);

    //We store the info when user was added (and key material was created), so we will know when to renew it
    await this.mlsService.resetKeyMaterialRenewal(groupId);

    return {
      events,
      conversation,
      failedToAdd: [...keysClaimingFailures, ...failures],
    };
  }

  public async removeUsersFromMLSConversation({
    groupId,
    conversationId,
    qualifiedUserIds,
  }: RemoveUsersParams): Promise<MLSCreateConversationResponse> {
    const clientsToRemove = await this.apiClient.api.user.postListClients({qualified_users: qualifiedUserIds});

    const fullyQualifiedClientIds = mapQualifiedUserClientIdsToFullyQualifiedClientIds(
      clientsToRemove.qualified_user_map,
    );

    const messageResponse = await this.mlsService.removeClientsFromConversation(groupId, fullyQualifiedClientIds);

    //key material gets updated after removing a user from the group, so we can reset last key update time value in the store
    await this.mlsService.resetKeyMaterialRenewal(groupId);

    const conversation = await this.getConversation(conversationId);

    return {
      events: messageResponse.events,
      conversation,
    };
  }

  public async joinByExternalCommit(conversationId: QualifiedId) {
    return this.mlsService.joinByExternalCommit(() => this.apiClient.api.conversation.getGroupInfo(conversationId));
  }

  /**
   * Will check if mls group exists locally.
   * @param groupId groupId of the conversation
   */
  public async mlsGroupExistsLocally(groupId: string) {
    return this.mlsService.conversationExists(groupId);
  }

  /**
   * Will check if mls group is established locally.
   * Group is established after the first commit was sent in the group and epoch number is at least 1.
   * @param groupId groupId of the conversation
   */
  public async isMLSGroupEstablishedLocally(groupId: string) {
    return this.mlsService.isConversationEstablished(groupId);
  }

  public async wipeMLSConversation(groupId: string): Promise<void> {
    return this.mlsService.wipeConversation(groupId);
  }

  private async matchesEpoch(groupId: string, backendEpoch: number): Promise<boolean> {
    const localEpoch = await this.mlsService.getEpoch(groupId);

    this.logger.log(
      `Comparing conversation's (group_id: ${groupId}) local and backend epoch number: {local: ${String(
        localEpoch,
      )}, backend: ${backendEpoch}}`,
    );
    //corecrypto stores epoch number as BigInt, we're mapping both values to be sure comparison is valid
    return BigInt(localEpoch) === BigInt(backendEpoch);
  }

  public async handleConversationsEpochMismatch() {
    this.logger.info(`There were some missed messages, handling possible epoch mismatch in MLS conversations.`);

    //fetch all the mls conversations from backend
    const conversations = await this.apiClient.api.conversation.getConversationList();
    const foundConversations = conversations.found || [];

    const mlsConversations = foundConversations.filter(isMLSConversation);

    //check all the established conversations' epoch with the core-crypto epoch
    for (const mlsConversation of mlsConversations) {
      await this.handleConversationEpochMismatch(mlsConversation);
    }
  }

  /**
   * Handles epoch mismatch in a subconversation.
   * @param subconversation - subconversation
   */
  private async handleSubconversationEpochMismatch(subconversation: Subconversation, parentGroupId: string) {
    const {
      parent_qualified_id: parentConversationId,
      group_id: groupId,
      epoch,
      subconv_id: subconversationId,
    } = subconversation;

    if (await this.hasEpochMismatch(groupId, epoch)) {
      this.logger.log(
        `Subconversation "${subconversationId}" (parent id: ${parentConversationId.id}) was not established or its epoch number was out of date, joining via external commit`,
      );

      // We only support conference subconversations for now
      if (subconversationId !== SUBCONVERSATION_ID.CONFERENCE) {
        throw new Error('Unexpected subconversation id');
      }

      try {
        await this.subconversationService.joinConferenceSubconversation(parentConversationId, parentGroupId);
      } catch (error) {
        const message = `There was an error while handling epoch mismatch in MLS subconversation (id: ${parentConversationId.id}, subconv: ${subconversationId}):`;
        this.logger.error(message, error);
      }
    }
  }

  /**
   * Handles epoch mismatch in a MLS conversation.
   * @param mlsConversation - mls conversation
   */
  private async handleConversationEpochMismatch(
    remoteMlsConversation: MLSConversation,
    onSuccessfulRejoin?: () => void,
  ) {
    const {qualified_id: qualifiedId, group_id: groupId, epoch} = remoteMlsConversation;

    if (await this.hasEpochMismatch(groupId, epoch)) {
      this.logger.log(
        `Conversation (id ${qualifiedId.id}) was not established or it's epoch number was out of date, joining via external commit`,
      );

      try {
        await this.joinByExternalCommit(qualifiedId);
        onSuccessfulRejoin?.();
      } catch (error) {
        const message = `There was an error while handling epoch mismatch in MLS conversation (id: ${qualifiedId.id}):`;
        this.logger.error(message, error);
      }
    }
  }

  /**
   * Handles epoch mismatch in a MLS group.
   * Compares the epoch of the local group with the epoch of the remote conversation.
   * If the epochs do not match, it will call onEpochMismatch callback.
   * @param groupId - id of the MLS group
   * @param epoch - epoch of the remote conversation
   * @param onEpochMismatch - callback to be called when epochs do not match
   */
  private async hasEpochMismatch(groupId: string, epoch: number) {
    const isEstablished = await this.mlsGroupExistsLocally(groupId);
    const doesEpochMatch = isEstablished && (await this.matchesEpoch(groupId, epoch));

    //if conversation is not established or epoch does not match -> try to rejoin
    return !isEstablished || !doesEpochMatch;
  }

  /**
   * Get a MLS 1:1-conversation with a given user.
   * @param userId - qualified user id
   */
  async getMLS1to1Conversation(userId: QualifiedId) {
    return this.apiClient.api.conversation.getMLS1to1Conversation(userId);
  }

  /**
   * Will try registering mls 1:1 conversation adding the other user.
   * If it fails and the conversation is already established, it will try joining via external commit instead.
   *
   * @param mlsConversation - mls 1:1 conversation
   * @param selfUser - user and client ids of the self user
   * @param otherUserId - id of the other user
   */
  public readonly establishMLS1to1Conversation = async (
    groupId: string,
    selfUser: {user: QualifiedId; client: string},
    otherUserId: QualifiedId,
    shouldRetry = true,
  ): Promise<MLSConversation> => {
    this.logger.info(`Trying to establish a MLS 1:1 conversation with user ${otherUserId.id}...`);

    // Before trying to register a group, check if the group is already established o backend.
    // If remote epoch is higher than 0, it means that the group was already established.
    // It's possible that we've already received a welcome message.
    const mlsConversation = await this.getMLS1to1Conversation(otherUserId);

    if (mlsConversation.epoch > 0) {
      this.logger.info(
        `Conversation (id ${mlsConversation.qualified_id.id}) is already established on backend, checking the local epoch...`,
      );

      const isMLSGroupEstablishedLocally = await this.isMLSGroupEstablishedLocally(groupId);

      // If group is already established locally, there's nothing more to do
      if (isMLSGroupEstablishedLocally) {
        this.logger.info(`Conversation (id ${mlsConversation.qualified_id.id}) is already established locally.`);
        return mlsConversation;
      }

      // If local epoch is 0 it means that we've not received a welcome message
      // We try joining via external commit.
      this.logger.info(
        `Conversation (id ${mlsConversation.qualified_id.id}) is not yet established locally, joining via external commit...`,
      );

      await this.joinByExternalCommit(mlsConversation.qualified_id);
      return this.getMLS1to1Conversation(otherUserId);
    }

    // If group is not established on backend,
    // we wipe the it locally (in case it exsits in the local store) and try to register it.
    await this.mlsService.wipeConversation(groupId);

    try {
      await this.mlsService.registerConversation(groupId, [otherUserId, selfUser.user], {creator: selfUser});
      this.logger.info(`Conversation (id ${mlsConversation.qualified_id.id}) established successfully.`);

      return this.getMLS1to1Conversation(otherUserId);
    } catch (error) {
      this.logger.info(`Could not register MLS group with id ${groupId}: `, error);

      if (!shouldRetry) {
        throw error;
      }

      this.logger.info(
        `Conversation (id ${mlsConversation.qualified_id.id}) is not established, retrying to establish it`,
      );
      return this.establishMLS1to1Conversation(groupId, selfUser, otherUserId, false);
    }
  };

  /**
   * Will try to register mls group by sending an empty commit to establish it.
   * After group was successfully established, it will try to add other users to the group.
   *
   * @param groupId - id of the MLS group
   * @param conversationId - id of the conversation
   * @param selfUserId - id of the self user
   * @param qualifiedUsers - list of qualified users to add to the group (should not include the self user)
   */
  public async tryEstablishingMLSGroup({
    groupId,
    conversationId,
    selfUserId,
    qualifiedUsers,
  }: {
    groupId: string;
    conversationId: QualifiedId;
    selfUserId: QualifiedId;
    qualifiedUsers: QualifiedId[];
  }): Promise<void> {
    const wasGroupEstablishedBySelfClient = await this.mlsService.tryEstablishingMLSGroup(groupId);

    if (!wasGroupEstablishedBySelfClient) {
      this.logger.info('Group was not established by self client, skipping adding users to the group.');
      return;
    }

    this.logger.info('Group was established by self client, adding other users to the group...');
    const usersToAdd: KeyPackageClaimUser[] = [
      ...qualifiedUsers,
      {...selfUserId, skipOwnClientId: this.apiClient.validatedClientId},
    ];

    const {conversation} = await this.addUsersToMLSConversation({
      conversationId,
      groupId,
      qualifiedUsers: usersToAdd,
    });

    const addedUsers = conversation.members.others;
    if (addedUsers.length > 0) {
      this.logger.info(`Successfully added ${addedUsers} users to the group.`);
    } else {
      this.logger.info('No other users were added to the group.');
    }
  }

  private async handleMLSMessageAddEvent(event: ConversationMLSMessageAddEvent): Promise<HandledEventPayload | null> {
    try {
      return await this.mlsService.handleMLSMessageAddEvent(event, this.groupIdFromConversationId);
    } catch (error) {
      if (isCoreCryptoMLSWrongEpochError(error)) {
        this.logger.info(
          `Received message for the wrong epoch in conversation ${event.conversation}, handling epoch mismatch...`,
        );
        const {qualified_conversation: conversationId, subconv} = event;
        if (!conversationId) {
          throw new Error('Qualified conversation id is missing in the event');
        }

        queueConversationRejoin(conversationId.id, () =>
          this.recoverMLSGroupFromEpochMismatch(conversationId, subconv),
        );
        return null;
      }
      throw error;
    }
  }

  private async recoverMLSGroupFromEpochMismatch(conversationId: QualifiedId, subconversationId?: SUBCONVERSATION_ID) {
    if (subconversationId) {
      const parentGroupId = await this.groupIdFromConversationId(conversationId);
      const subconversation = await this.apiClient.api.conversation.getSubconversation(
        conversationId,
        subconversationId,
      );

      if (!parentGroupId) {
        throw new Error('Could not find parent group id for the subconversation');
      }
      return this.handleSubconversationEpochMismatch(subconversation, parentGroupId);
    }

    const mlsConversation = await this.apiClient.api.conversation.getConversation(conversationId);

    if (!isMLSConversation(mlsConversation)) {
      throw new Error('Conversation is not an MLS conversation');
    }

    return this.handleConversationEpochMismatch(mlsConversation, () =>
      this.emit('MLSConversationRecovered', {conversationId: mlsConversation.qualified_id}),
    );
  }

  private async handleMLSWelcomeMessageEvent(event: ConversationMLSWelcomeEvent) {
    try {
      return await this.mlsService.handleMLSWelcomeMessageEvent(event, this.apiClient.validatedClientId);
    } catch (error) {
      if (isCoreCryptoMLSOrphanWelcomeMessageError(error)) {
        const {qualified_conversation: conversationId} = event;

        // Note that we don't care about a subconversation here, as the welcome message is always for the parent conversation.
        // Subconversations are always joined via external commit.

        if (!conversationId) {
          throw new Error('Qualified conversation id is missing in the event');
        }

        this.logger.info(
          `Received an orphan welcome message, joining the conversation (${conversationId.id}) via external commit...`,
        );

        void queueConversationRejoin(conversationId.id, () => this.joinByExternalCommit(conversationId));
        return null;
      }

      throw error;
    }
  }

  private async handleOtrMessageAddEvent(event: ConversationOtrMessageAddEvent) {
    return this.proteusService.handleOtrMessageAddEvent(event);
  }

  private async isConversationBlacklisted(conversationId: string): Promise<boolean> {
    const foundEntry = await this.coreDatabase.get('conversationBlacklist', conversationId);
    return !!foundEntry;
  }

  /**
   * Will process one conversation event
   * @param event The backend event to process
   * @return Event handling status (if handled successfully also the decrypted payload and the raw event)
   */
  public async handleEvent(event: BackendEvent): Promise<HandledEventResult> {
    if ('conversation' in event) {
      const isBlacklisted = await this.isConversationBlacklisted(event.conversation);
      if (isBlacklisted) {
        this.logger.info(`Conversation ${event.conversation} is blacklisted, ignoring event ${event.type}`);
        return {status: 'ignored'};
      }
    }

    switch (event.type) {
      case CONVERSATION_EVENT.MLS_MESSAGE_ADD:
        return {status: 'handled', payload: await this.handleMLSMessageAddEvent(event)};
      case CONVERSATION_EVENT.MLS_WELCOME_MESSAGE:
        return {status: 'handled', payload: await this.handleMLSWelcomeMessageEvent(event)};
      case CONVERSATION_EVENT.OTR_MESSAGE_ADD:
        return {status: 'handled', payload: await this.handleOtrMessageAddEvent(event)};
    }

    return {status: 'unhandled'};
  }
}
