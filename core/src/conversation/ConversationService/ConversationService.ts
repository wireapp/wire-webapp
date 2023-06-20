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
} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_TYPING, ConversationMemberUpdateData} from '@wireapp/api-client/lib/conversation/data';
import {ConversationMemberLeaveEvent} from '@wireapp/api-client/lib/event';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {XOR} from '@wireapp/commons/lib/util/TypeUtil';
import {Decoder} from 'bazinga64';
import logdown from 'logdown';

import {APIClient} from '@wireapp/api-client';
import {Ciphersuite, CredentialType, ExternalProposalType} from '@wireapp/core-crypto';
import {GenericMessage} from '@wireapp/protocol-messaging';

import {AddUsersParams, MLSReturnType, SendMlsMessageParams, SendResult} from './ConversationService.types';

import {MessageTimer, MessageSendingState, RemoveUsersParams} from '../../conversation/';
import {decryptAsset} from '../../cryptography/AssetCryptography';
import {MLSService, optionalToUint8Array} from '../../messagingProtocols/mls';
import {getConversationQualifiedMembers, ProteusService} from '../../messagingProtocols/proteus';
import {
  AddUsersToProteusConversationParams,
  SendProteusMessageParams,
} from '../../messagingProtocols/proteus/ProteusService/ProteusService.types';
import {isMLSConversation} from '../../util';
import {mapQualifiedUserClientIdsToFullyQualifiedClientIds} from '../../util/fullyQualifiedClientIdUtils';
import {RemoteData} from '../content';
import {isSendingMessage, sendMessage} from '../message/messageSender';

export class ConversationService {
  public readonly messageTimer: MessageTimer;
  private readonly logger = logdown('@wireapp/core/ConversationService');

  constructor(
    private readonly apiClient: APIClient,
    private readonly proteusService: ProteusService,
    private readonly _mlsService?: MLSService,
  ) {
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
   * @note Do not include yourself as the requestor
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createGroupConversation
   *
   * @param conversationData Payload object for group creation
   * @returns Resolves when the conversation was created
   */
  public async createProteusConversation(conversationData: NewConversation): Promise<Conversation>;
  public async createProteusConversation(
    conversationData: NewConversation | string,
    otherUserIds?: string | string[],
  ): Promise<Conversation> {
    return this.proteusService.createConversation({conversationData, otherUserIds});
  }

  public async getConversation(conversationId: QualifiedId): Promise<Conversation> {
    return this.apiClient.api.conversation.getConversation(conversationId);
  }

  public async getConversations(conversationIds?: QualifiedId[]): Promise<RemoteConversations> {
    if (!conversationIds) {
      return this.apiClient.api.conversation.getConversationList();
    }
    return this.apiClient.api.conversation.getConversationsByQualifiedIds(conversationIds);
  }

  public async getAsset({assetId, assetToken, otrKey, sha256}: RemoteData): Promise<Uint8Array> {
    const request = this.apiClient.api.asset.getAssetV3(assetId, assetToken);
    const encryptedBuffer = (await request.response).buffer;

    return decryptAsset({
      cipherText: new Uint8Array(encryptedBuffer),
      keyBytes: otrKey,
      sha256: sha256,
    });
  }

  public async getUnencryptedAsset(assetId: string, assetToken?: string): Promise<ArrayBuffer> {
    const request = await this.apiClient.api.asset.getAssetV3(assetId, assetToken);
    return (await request.response).buffer;
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
   * returns the number of messages that are in the queue expecting to be sent
   */
  isSendingMessage(): boolean {
    return isSendingMessage();
  }

  public setConversationMutedStatus(
    conversationId: string,
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
    conversationId: string,
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
  ): Promise<MLSReturnType> {
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

    const response = await this.mlsService.registerConversation(groupId, qualifiedUsers.concat(selfUserId), {
      user: selfUserId,
      client: selfClientId,
    });

    // We fetch the fresh version of the conversation created on backend with the newly added users
    const conversation = await this.apiClient.api.conversation.getConversation(qualifiedId);

    return {
      events: response.events,
      conversation,
    };
  }

  private async sendMLSMessage({payload, groupId}: SendMlsMessageParams): Promise<SendResult> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

    // immediately execute pending commits before sending the message
    await this.mlsService.commitPendingProposals({groupId});

    const encrypted = await this.mlsService.encryptMessage(groupIdBytes, GenericMessage.encode(payload).finish());

    let response: PostMlsMessageResponse | null = null;
    let sentAt: string = '';
    try {
      response = await this.apiClient.api.conversation.postMlsMessage(encrypted);
      sentAt = response.time?.length > 0 ? response.time : new Date().toISOString();
    } catch {}

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
  }: Required<AddUsersParams>): Promise<MLSReturnType> {
    const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
    const coreCryptoKeyPackagesPayload = await this.mlsService.getKeyPackagesPayload(qualifiedUsers);
    const response = await this.mlsService.addUsersToExistingConversation(groupIdBytes, coreCryptoKeyPackagesPayload);
    const conversation = await this.getConversation(conversationId);

    //We store the info when user was added (and key material was created), so we will know when to renew it
    this.mlsService.resetKeyMaterialRenewal(groupId);
    return {
      events: response.events,
      conversation,
    };
  }

  public async removeUsersFromMLSConversation({
    groupId,
    conversationId,
    qualifiedUserIds,
  }: RemoveUsersParams): Promise<MLSReturnType> {
    const clientsToRemove = await this.apiClient.api.user.postListClients({qualified_users: qualifiedUserIds});

    const fullyQualifiedClientIds = mapQualifiedUserClientIdsToFullyQualifiedClientIds(
      clientsToRemove.qualified_user_map,
    );

    const messageResponse = await this.mlsService.removeClientsFromConversation(groupId, fullyQualifiedClientIds);

    //key material gets updated after removing a user from the group, so we can reset last key update time value in the store
    this.mlsService.resetKeyMaterialRenewal(groupId);

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
   * Will send an external proposal for the current device to join a specific conversation.
   * In order for the external proposal to be sent correctly, the underlying mls conversation needs to be in a non-established state
   * @param groupId The conversation to join
   * @param epoch The current epoch of the local conversation
   */
  public async sendExternalJoinProposal(groupId: string, epoch: number) {
    return sendMessage(async () => {
      const groupIdBytes = Decoder.fromBase64(groupId).asBytes;
      const externalProposal = await this.mlsService.newExternalProposal(ExternalProposalType.Add, {
        epoch,
        conversationId: groupIdBytes,
        ciphersuite: Ciphersuite.MLS_128_DHKEMX25519_AES128GCM_SHA256_Ed25519,
        credentialType: CredentialType.Basic,
      });
      await this.apiClient.api.conversation.postMlsMessage(
        //@todo: it's temporary - we wait for core-crypto fix to return the actual Uint8Array instead of regular array
        optionalToUint8Array(externalProposal),
      );

      //We store the info when user was added (and key material was created), so we will know when to renew it
      this.mlsService.resetKeyMaterialRenewal(groupId);
    });
  }

  public async isMLSConversationEstablished(groupId: string) {
    return this.mlsService.conversationExists(groupId);
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

  public async handleEpochMismatch() {
    this.logger.info(`There were some missed messages, handling possible epoch mismatch in MLS conversations.`);

    //fetch all the mls conversations from backend
    const conversations = await this.apiClient.api.conversation.getConversationList();
    const foundConversations = conversations.found || [];

    const mlsConversations = foundConversations.filter(isMLSConversation);

    //check all the established conversations' epoch with the core-crypto epoch
    for (const {qualified_id: qualifiedId, group_id: groupId, epoch} of mlsConversations) {
      try {
        //if conversation is not established or epoch does not match -> try to rejoin
        if (!(await this.isMLSConversationEstablished(groupId)) || !(await this.matchesEpoch(groupId, epoch))) {
          this.logger.log(
            `Conversation (id ${qualifiedId.id}) was not established or it's epoch number was out of date, joining via external commit`,
          );
          await this.joinByExternalCommit(qualifiedId);
        }
      } catch (error) {
        this.logger.error(
          `There was an error while handling epoch mismatch in MLS conversation (id: ${qualifiedId.id}):`,
          error,
        );
      }
    }
  }
}
