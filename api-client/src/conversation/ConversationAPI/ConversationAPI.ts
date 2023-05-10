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

import {chunk} from '@wireapp/commons/lib/util/ArrayUtil';
import {proteus as ProtobufOTR} from '@wireapp/protocol-messaging/web/otr';
import {AxiosRequestConfig} from 'axios';

import {
  Conversation,
  ConversationCode,
  ConversationProtocol,
  ConversationRolesList,
  Conversations,
  DefaultConversationRoleName,
  Invite,
  JoinConversationByCodePayload,
  Member,
  MessageSendingStatus,
  NewConversation,
  QualifiedConversationIds,
  RemoteConversations,
} from '..';
import {BackendFeatures} from '../../APIClient';
import {
  ConversationAccessUpdateEvent,
  ConversationCodeDeleteEvent,
  ConversationCodeUpdateEvent,
  ConversationEvent,
  ConversationMemberJoinEvent,
  ConversationMemberLeaveEvent,
  ConversationMessageTimerUpdateEvent,
  ConversationProtocolUpdateEvent,
  ConversationReceiptModeUpdateEvent,
  ConversationRenameEvent,
} from '../../event';
import {BackendError, BackendErrorLabel, HttpClient} from '../../http';
import {QualifiedId} from '../../user';
import {
  ConversationFullError,
  ConversationCodeNotFoundError,
  ConversationLegalholdMissingConsentError,
} from '../ConversationError';
import {
  ConversationAccessUpdateData,
  ConversationJoinData,
  ConversationMemberUpdateData,
  ConversationMessageTimerUpdateData,
  ConversationNameUpdateData,
  ConversationOtherMemberUpdateData,
  ConversationReceiptModeUpdateData,
  ConversationTypingData,
} from '../data';
import {Subconversation, SUBCONVERSATION_ID} from '../Subconversation';

export type PostMlsMessageResponse = {
  events: ConversationEvent[];
  time: string;
};

type ConversationGuestLinkStatus = {status: 'enabled' | 'disabled'};

export class ConversationAPI {
  public static readonly MAX_CHUNK_SIZE = 500;
  public static readonly URL = {
    ACCESS: 'access',
    BOTS: 'bots',
    CLIENTS: '/clients',
    CODE: 'code',
    CODE_CHECK: '/code-check',
    CONVERSATIONS: '/conversations',
    SUBCONVERSATIONS: 'subconversations',
    GROUP_INFO: 'groupinfo',
    MLS: '/mls',
    JOIN: '/join',
    LIST: 'list',
    LIST_IDS: 'list-ids',
    MEMBERS: 'members',
    MESSAGE_TIMER: 'message-timer',
    MESSAGES: 'messages',
    NAME: 'name',
    OTR: 'otr',
    PROTEUS: 'proteus',
    PROTOCOL: 'protocol',
    RECEIPT_MODE: 'receipt-mode',
    ROLES: 'roles',
    SELF: 'self',
    TYPING: 'typing',
    V2: 'v2',
  };

  constructor(protected readonly client: HttpClient, protected readonly backendFeatures: BackendFeatures) {}

  private generateBaseConversationUrl(conversationId: QualifiedId, supportsQualifiedEndpoint: boolean = true): string {
    return supportsQualifiedEndpoint && conversationId.domain
      ? `${ConversationAPI.URL.CONVERSATIONS}/${conversationId.domain}/${conversationId.id}`
      : `${ConversationAPI.URL.CONVERSATIONS}/${conversationId.id}`;
  }

  /**
   * Delete a conversation code.
   * @param conversationId ID of conversation to delete the code for
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/deleteConversationCode
   */
  public async deleteConversationCode(conversationId: string): Promise<ConversationCodeDeleteEvent> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.CODE}`,
    };

    const response = await this.client.sendJSON<ConversationCodeDeleteEvent>(config);
    return response.data;
  }

  /**
   * @deprecated Use `deleteService()` instead.
   */
  public deleteBot(conversationId: string, serviceId: string): Promise<void> {
    return this.deleteService(conversationId, serviceId);
  }

  /**
   * Remove service from conversation.
   * @param conversationId The conversation ID to remove the service from
   * @param serviceId The ID of the service to be removed from the conversation
   */
  public async deleteService(conversationId: string, serviceId: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.BOTS}/${serviceId}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Remove member from conversation.
   * @param conversationId The conversation ID to remove the user from
   * @param userId The user to remove
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/delete_conversations__cnv_domain___cnv__members__usr_domain___usr_
   */
  public async deleteMember(conversationId: QualifiedId, userId: QualifiedId): Promise<ConversationMemberLeaveEvent> {
    const url = `${ConversationAPI.URL.CONVERSATIONS}/${conversationId.domain}/${conversationId.id}/${ConversationAPI.URL.MEMBERS}/${userId.domain}/${userId.id}`;

    const response = await this.client.sendJSON<ConversationMemberLeaveEvent>({
      method: 'delete',
      url,
    });
    return response.data;
  }

  /**
   * Get a conversation code.
   * @param conversationId ID of conversation to get the code for
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/getConversationCode
   */
  public async getConversationCode(conversationId: string): Promise<ConversationCode> {
    const config: AxiosRequestConfig = {
      method: 'GET',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.CODE}`,
    };

    const response = await this.client.sendJSON<ConversationCode>(config);
    return response.data;
  }

  /**
   * @param conversationId
   * @deprecated use feature.getAllFeatures instead
   */
  public async getConversationGuestLinkFeature(conversationId: string): Promise<ConversationGuestLinkStatus> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/features/conversationGuestLinks`,
    };

    const response = await this.client.sendJSON<ConversationGuestLinkStatus>(config);
    return response.data;
  }

  public async getConversation(conversationId: QualifiedId): Promise<Conversation> {
    const {id, domain} = conversationId;
    const url = `${ConversationAPI.URL.CONVERSATIONS}/${domain}/${id}`;
    const config: AxiosRequestConfig = {
      method: 'get',
      url,
    };
    const response = await this.client.sendJSON<Conversation>(config);
    return response.data;
  }

  public async getSubconversation(
    conversationId: QualifiedId,
    subconversationId: SUBCONVERSATION_ID,
  ): Promise<Subconversation> {
    const {id, domain} = conversationId;

    const url = `${ConversationAPI.URL.CONVERSATIONS}/${domain}/${id}/${ConversationAPI.URL.SUBCONVERSATIONS}/${subconversationId}`;
    const config: AxiosRequestConfig = {
      method: 'get',
      url,
    };
    const response = await this.client.sendJSON<Subconversation>(config);
    return response.data;
  }

  public async deleteSubconversation(
    conversationId: QualifiedId,
    subconversationId: SUBCONVERSATION_ID,
    {groupId, epoch}: {groupId: string; epoch: number},
  ): Promise<void> {
    const {id, domain} = conversationId;

    const url = `${ConversationAPI.URL.CONVERSATIONS}/${domain}/${id}/${ConversationAPI.URL.SUBCONVERSATIONS}/${subconversationId}`;

    const config: AxiosRequestConfig = {
      method: 'delete',
      url,
      data: {group_id: groupId, epoch},
    };

    await this.client.sendJSON(config);
  }

  public async deleteSubconversationSelf(
    conversationId: QualifiedId,
    subconversationId: SUBCONVERSATION_ID,
  ): Promise<void> {
    const {id, domain} = conversationId;

    const url = `${ConversationAPI.URL.CONVERSATIONS}/${domain}/${id}/${ConversationAPI.URL.SUBCONVERSATIONS}/${subconversationId}/${ConversationAPI.URL.SELF}`;

    const config: AxiosRequestConfig = {
      method: 'delete',
      url,
    };

    await this.client.sendJSON(config);
  }

  public async getSubconversationGroupInfo(conversationId: QualifiedId, subconversationId: SUBCONVERSATION_ID) {
    const {id, domain} = conversationId;

    const url = `${ConversationAPI.URL.CONVERSATIONS}/${domain}/${id}/${ConversationAPI.URL.SUBCONVERSATIONS}/${subconversationId}/${ConversationAPI.URL.GROUP_INFO}`;

    const config: AxiosRequestConfig = {
      method: 'get',
      url,
      responseType: 'arraybuffer',
    };

    const response = await this.client.sendRequest<ArrayBuffer>(config);
    return new Uint8Array(response.data);
  }

  /**
   * Get all qualified conversation IDs.
   * @param limit Max. number of qualified IDs to return
   */
  public async getQualifiedConversationIds(limit: number = 0): Promise<QualifiedId[]> {
    const config: AxiosRequestConfig = {
      data: {},
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${ConversationAPI.URL.LIST_IDS}`,
    };

    if (limit > 0) {
      config.data.size = limit;
    }

    const allConversations: QualifiedId[] = [];

    const getConversationChunks = async (pagingState?: string): Promise<QualifiedId[]> => {
      if (pagingState) {
        config.data.paging_state = pagingState;
      }
      const {data} = await this.client.sendJSON<QualifiedConversationIds>(config);
      const {qualified_conversations, has_more, paging_state} = data;

      allConversations.push(...qualified_conversations);

      if (has_more) {
        return getConversationChunks(paging_state);
      }

      return allConversations;
    };

    return getConversationChunks();
  }

  /**
   * Get conversations as chunks.
   * Note: At most 500 conversations are returned per request.
   * @param startConversationId Conversation ID to start from (exclusive). Mutually exclusive with `conversationIds`.
   * @param limit Max. number of conversations to return
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversations
   */
  public getConversations(
    startConversationId?: string,
    limit = ConversationAPI.MAX_CHUNK_SIZE,
  ): Promise<Conversations> {
    return this._getConversations(startConversationId, undefined, limit);
  }

  /**
   * Get conversation metadata for a list of conversation qualified ids
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/post_conversations_list_v2
   */
  public async getConversationsByQualifiedIds(conversations: QualifiedId[]): Promise<RemoteConversations> {
    const chunks = chunk(conversations, ConversationAPI.MAX_CHUNK_SIZE);
    let results: RemoteConversations = {found: [], failed: [], not_found: []};

    for (const chunk of chunks) {
      const config: AxiosRequestConfig = {
        data: {qualified_ids: chunk},
        method: 'post',
        url:
          this.backendFeatures.version >= 2
            ? `${ConversationAPI.URL.CONVERSATIONS}/${ConversationAPI.URL.LIST}`
            : `${ConversationAPI.URL.CONVERSATIONS}/${ConversationAPI.URL.LIST}/${ConversationAPI.URL.V2}`,
      };

      const {data} = await this.client.sendJSON<RemoteConversations>(config);
      results = {
        found: results.found?.concat(data.found ?? []),
        not_found: results.not_found?.concat(data.not_found ?? []),
        failed: results.failed?.concat(data.failed ?? []),
      };
    }
    return results;
  }

  /**
   * Get all local & remote conversations from a federated backend.
   */
  public async getConversationList(): Promise<RemoteConversations> {
    const allConversationIds = await this.getQualifiedConversationIds();
    const conversations = await this.getConversationsByQualifiedIds(allConversationIds);
    return conversations;
  }

  /**
   * Get conversations.
   * Note: At most 500 conversations are returned per request.
   * @param conversationId Conversation ID to start from (exclusive). Mutually exclusive with `conversationIds`.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversations
   */
  public async getConversationsByIds(filteredConversationIds: string[]): Promise<Conversation[]> {
    let allConversations: Conversation[] = [];

    const getConversationChunk = async (chunkedConversationIds: string[]): Promise<Conversation[]> => {
      const {conversations} = await this._getConversations(
        undefined,
        chunkedConversationIds,
        ConversationAPI.MAX_CHUNK_SIZE,
      );
      return conversations;
    };

    for (let index = 0; index < filteredConversationIds.length; index += ConversationAPI.MAX_CHUNK_SIZE) {
      const requestChunk = filteredConversationIds.slice(index, index + ConversationAPI.MAX_CHUNK_SIZE);
      if (requestChunk.length) {
        const conversationChunk = await getConversationChunk(requestChunk);

        if (conversationChunk.length) {
          allConversations = allConversations.concat(conversationChunk);
        }
      }
    }

    return allConversations;
  }

  /**
   * Get conversations.
   * Note: At most 500 conversations are returned per request.
   * @param startConversationId Conversation ID to start from (exclusive). Mutually exclusive with `conversationIds`.
   * @param filteredConversationIds Mutually exclusive with `startConversationId`. At most 32 IDs per request.
   * @param limit Max. number of conversations to return
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversations
   */
  private async _getConversations(
    startConversationId?: string,
    filteredConversationIds?: string[],
    limit = ConversationAPI.MAX_CHUNK_SIZE,
  ): Promise<Conversations> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        size: limit,
        start: startConversationId,
      },
      url: ConversationAPI.URL.CONVERSATIONS,
    };

    if (filteredConversationIds) {
      config.params.ids = filteredConversationIds.join(',');
    }

    const response = await this.client.sendJSON<Conversations>(config);
    return response.data;
  }

  /**
   * see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/get_conversations__cnv_domain___cnv__groupinfo
   */
  public async getGroupInfo({id, domain}: QualifiedId) {
    const url = `/conversations/${domain}/${id}/${ConversationAPI.URL.GROUP_INFO}`;
    const response = await this.client.sendRequest<ArrayBuffer>({
      url,
      responseType: 'arraybuffer',
    });
    return new Uint8Array(response.data);
  }

  /**
   * Get existing roles available for the given conversation.
   * @param conversationId The Conversation ID to get roles for
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/getConversationsRoles
   */
  public async getRoles(conversationId: string): Promise<ConversationRolesList> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.ROLES}`,
    };

    const response = await this.client.sendJSON<ConversationRolesList>(config);
    return response.data;
  }

  /**
   * Get self membership properties.
   * @param conversationId The Conversation ID to get properties for
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/getSelf
   */
  public async getMembershipProperties(conversationId: string): Promise<Member> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.SELF}`,
    };

    const response = await this.client.sendJSON<Member>(config);
    return response.data;
  }

  /**
   * Create a 1:1-conversation.
   * @param conversationData The new conversation
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createOne2OneConversation
   */
  public async post1to1(conversationData: NewConversation): Promise<void> {
    const config: AxiosRequestConfig = {
      data: conversationData,
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/one2one`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Add users to an existing conversation.
   * @param conversationId The conversation ID
   * @param invitationData The new conversation
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/addMembers
   */
  public async postAddMembers(conversationId: string, invitationData: Invite): Promise<ConversationEvent> {
    const config: AxiosRequestConfig = {
      data: invitationData,
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.MEMBERS}`,
    };

    try {
      const response = await this.client.sendJSON<ConversationEvent>(config);
      return response.data;
    } catch (error) {
      const backendError = error as BackendError;
      switch (backendError.label) {
        case BackendErrorLabel.LEGAL_HOLD_MISSING_CONSENT: {
          throw new ConversationLegalholdMissingConsentError(backendError.message);
        }
      }
      throw error;
    }
  }

  /**
   * @deprecated Use `postService()` instead.
   */
  public postBot(conversationId: string, providerId: string, serviceId: string): Promise<ConversationMemberJoinEvent> {
    return this.postService(conversationId, providerId, serviceId);
  }

  /**
   * Add a service to an existing conversation.
   * @param conversationId ID of the conversation to add services to
   * @param providerId ID of the service provider
   * @param serviceId ID of the service provider
   */
  public async postService(
    conversationId: string,
    providerId: string,
    serviceId: string,
  ): Promise<ConversationMemberJoinEvent> {
    const config: AxiosRequestConfig = {
      data: {
        provider: providerId,
        service: serviceId,
      },
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.BOTS}`,
    };

    const response = await this.client.sendJSON<ConversationMemberJoinEvent>(config);
    return response.data;
  }

  /**
   * Create a new conversation
   * @param conversationData The new conversation
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/post_conversations
   */
  public async postConversation(conversationData: NewConversation): Promise<Conversation> {
    const config: AxiosRequestConfig = {
      data: conversationData,
      method: 'post',
      url: ConversationAPI.URL.CONVERSATIONS,
    };
    try {
      const response = await this.client.sendJSON<Conversation>(config);
      return response.data;
    } catch (error) {
      const backendError = error as BackendError;
      switch (backendError.label) {
        case BackendErrorLabel.LEGAL_HOLD_MISSING_CONSENT: {
          throw new ConversationLegalholdMissingConsentError(backendError.message);
        }
      }
      throw error;
    }
  }

  /**
   * Create or recreate a conversation code.
   * @param conversationId ID of conversation to request the code for
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createConversationCode
   */
  public async postConversationCodeRequest(
    conversationId: string,
    password?: string,
  ): Promise<ConversationCodeUpdateEvent> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.CODE}`,
      data: {},
    };

    if (password) {
      config.data = {password};
    }

    const response = await this.client.sendJSON<ConversationCodeUpdateEvent>(config);
    return response.data;
  }

  /**
   * Validate a conversation code.
   * @param conversationCode The conversation code
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/checkConversationCode
   */
  public async postConversationCodeCheck(conversationCode: ConversationCode): Promise<void> {
    const config: AxiosRequestConfig = {
      data: conversationCode,
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}${ConversationAPI.URL.CODE_CHECK}`,
    };

    try {
      await this.client.sendJSON(config);
    } catch (error) {
      const backendError = error as BackendError;
      switch (backendError.label) {
        case BackendErrorLabel.NO_CONVERSATION_CODE: {
          throw new ConversationCodeNotFoundError(backendError.message);
        }
      }
      throw error;
    }
  }

  /**
   * Join a conversation by conversation code.
   * @param conversationCode The conversation code
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/joinConversationByCode
   */
  public async postJoinByCode(conversationCode: JoinConversationByCodePayload): Promise<ConversationMemberJoinEvent> {
    const config: AxiosRequestConfig = {
      data: conversationCode,
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}${ConversationAPI.URL.JOIN}`,
    };

    try {
      const response = await this.client.sendJSON<ConversationMemberJoinEvent>(config);
      return response.data;
    } catch (error) {
      const backendError = error as BackendError;
      switch (backendError.label) {
        case BackendErrorLabel.NO_CONVERSATION_CODE: {
          throw new ConversationCodeNotFoundError(backendError.message);
        }
        case BackendErrorLabel.TOO_MANY_MEMBERS: {
          throw new ConversationFullError(backendError.message);
        }
      }
      throw error;
    }
  }

  /**
   * Get information about a conversation by conversation code.
   * @param conversationCode The conversation code
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/joinConversationByCode
   */
  public async getJoinByCode(
    conversationCode: Omit<ConversationCode, 'uri' | 'has_password'>,
  ): Promise<ConversationJoinData> {
    const config: AxiosRequestConfig = {
      params: conversationCode,
      method: 'get',
      url: `${ConversationAPI.URL.CONVERSATIONS}${ConversationAPI.URL.JOIN}`,
    };

    try {
      const response = await this.client.sendJSON<ConversationJoinData>(config);
      return response.data;
    } catch (error) {
      const backendError = error as BackendError;
      switch (backendError.label) {
        case BackendErrorLabel.NO_CONVERSATION_CODE: {
          throw new ConversationCodeNotFoundError(backendError.message);
        }
      }
      throw error;
    }
  }

  /**
   * Join a conversation.
   * @param conversationId The conversation ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/joinConversation
   */
  public async postJoin(conversationId: string): Promise<ConversationEvent> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}`,
    };

    const response = await this.client.sendJSON<ConversationEvent>(config);
    return response.data;
  }

  /**
   * This endpoint ensures that the list of clients is correct and only sends the message if the list is correct.
   * To override this, the endpoint accepts `client_mismatch_strategy` in the body. It can have these values:
   *
   * - `report_all`: When set, the message is not sent if any clients are missing. The missing clients are reported
   * in the response.
   * - `ignore_all`: When set, no checks about missing clients are carried out.
   * - `report_only`: Takes a list of qualified UserIDs. If any clients of the listed users are missing, the message is
   * not sent. The missing clients are reported in the response.
   * - `ignore_only`: Takes a list of qualified UserIDs. If any clients of the non-listed users are missing, the message
   * is not sent. The missing clients are reported in the response.
   *
   * The sending of messages in a federated conversation could theorectically fail partially. To make this case
   * unlikely, the backend first gets a list of clients from all the involved backends and then tries to send a message.
   * So, if any backend is down, the message is not propagated to anyone. But the actual message fan out to multiple
   * backends could still fail partially. This type of failure is reported as a 201, the clients for which the message
   * sending failed are part of the response body.
   *
   * This endpoint can lead to OtrMessageAdd event being sent to the recipients.
   *
   * @see https://nginz-https.anta.wire.link/api/swagger-ui/#/default/post_conversations__cnv_domain___cnv__proteus_messages
   */
  public async postOTRMessage(
    conversationId: string,
    domain: string,
    messageData: ProtobufOTR.QualifiedNewOtrMessage,
  ): Promise<MessageSendingStatus> {
    const config: AxiosRequestConfig = {
      /*
       * We need to slice the content of what protobuf has generated in order for Axios to send the correct data (see https://github.com/axios/axios/issues/4068)
       * FIXME: The `slice` can be removed as soon as Axios publishes a version with the dataview issue fixed.
       */
      data: ProtobufOTR.QualifiedNewOtrMessage.encode(messageData).finish().slice(),
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${domain}/${conversationId}/${ConversationAPI.URL.PROTEUS}/${ConversationAPI.URL.MESSAGES}`,
    };

    const response = await this.client.sendProtocolBuffer<MessageSendingStatus>(config, true);
    return response.data;
  }

  /**
   * Post an encrypted message to a conversation.
   * @param messageData Mls message payload in TLS format. Please refer to the MLS specification for details.
   * @see https://messaginglayersecurity.rocks/mls-protocol/draft-ietf-mls-protocol.html#name-message-framing
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/post_mls_messages
   */
  public async postMlsMessage(messageData: Uint8Array) {
    const config: AxiosRequestConfig = {
      data: messageData,
      method: 'post',
      url: `${ConversationAPI.URL.MLS}/${ConversationAPI.URL.MESSAGES}`,
    };

    const response = await this.client.sendProtocolMls<PostMlsMessageResponse>(config, true);
    return response.data;
  }

  /**
   * Post the welcome encrypted message to a conversation.
   * @param messageData Mls welocome message payload in TLS format. Please refer to the MLS specification for details.
   * @see https://messaginglayersecurity.rocks/mls-protocol/draft-ietf-mls-protocol.html#name-message-framing
   * @see https://staging-nginz-https.zinfra.io/api/swagger-ui/#/default/post_mls_welcome
   */
  public async postMlsCommitBundle(messageData: Uint8Array): Promise<PostMlsMessageResponse> {
    const config: AxiosRequestConfig = {
      data: messageData,
      method: 'post',
      url: `${ConversationAPI.URL.MLS}/commit-bundles`,
    };

    const response = await this.client.sendProtocolBuffer<PostMlsMessageResponse>(config, true);
    return response.data;
  }

  /**
   * Create a self-conversation.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createSelfConversation
   */
  public async postSelf(): Promise<Conversation> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${ConversationAPI.URL.SELF}`,
    };

    const response = await this.client.sendJSON<Conversation>(config);
    return response.data;
  }

  /**
   * Send typing notifications.
   * @param conversationId The Conversation ID to send notifications in
   * @param typingData The typing status
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/isTyping
   */
  public async postTyping(conversationId: QualifiedId, typingData: ConversationTypingData): Promise<void> {
    const config: AxiosRequestConfig = {
      data: typingData,
      method: 'post',
      url: `${this.generateBaseConversationUrl(conversationId, this.backendFeatures.version >= 3)}/${
        ConversationAPI.URL.TYPING
      }`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Update access modes for a conversation.
   * @param conversationId The conversation ID to update the access mode of
   * @param accessData The new access data
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversationAccess
   */
  public async putAccess(
    conversationId: QualifiedId,
    accessData: ConversationAccessUpdateData,
  ): Promise<ConversationAccessUpdateEvent> {
    const config: AxiosRequestConfig = {
      data: accessData,
      method: 'put',
      url: `${this.generateBaseConversationUrl(conversationId)}/${ConversationAPI.URL.ACCESS}`,
    };

    const response = await this.client.sendJSON<ConversationAccessUpdateEvent>(config);
    return response.data;
  }
  /**
   * Update conversation properties.
   * @param conversationId The conversation ID to update properties of
   * @param conversationNameData The new conversation name
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversation
   */
  public async putConversation(
    conversationId: string,
    conversationNameData: ConversationNameUpdateData,
  ): Promise<ConversationRenameEvent> {
    const config: AxiosRequestConfig = {
      data: conversationNameData,
      method: 'put',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.NAME}`,
    };

    const response = await this.client.sendJSON<ConversationRenameEvent>(config);
    return response.data;
  }

  /**
   * Update the message timer for a conversation.
   * @param conversationId The conversation ID
   * @param conversationData The new message timer
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversationMessageTimer
   */
  public async putConversationMessageTimer(
    conversationId: string,
    messageTimerData: ConversationMessageTimerUpdateData,
  ): Promise<ConversationMessageTimerUpdateEvent> {
    const config: AxiosRequestConfig = {
      data: messageTimerData,
      method: 'put',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.MESSAGE_TIMER}`,
    };

    const response = await this.client.sendJSON<ConversationMessageTimerUpdateEvent>(config);
    return response.data;
  }

  /**
   * Update the receipt mode for a conversation.
   * @param conversationId The conversation ID
   * @param receiptModeData The new receipt mode
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversationReceiptMode
   */
  public async putConversationReceiptMode(
    conversationId: string,
    receiptModeData: ConversationReceiptModeUpdateData,
  ): Promise<ConversationReceiptModeUpdateEvent> {
    const config: AxiosRequestConfig = {
      data: receiptModeData,
      method: 'put',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.RECEIPT_MODE}`,
    };

    const response = await this.client.sendJSON<ConversationReceiptModeUpdateEvent>(config);
    return response.data;
  }

  /**
   * Add qualified members to an existing Proteus conversation.
   * @param conversationId The conversation ID to add the users to
   * @param users List of users to add to a conversation
   */
  public async postMembers(conversationId: QualifiedId, users: QualifiedId[]) {
    const config: AxiosRequestConfig = {
      data: {
        conversation_role: DefaultConversationRoleName.WIRE_MEMBER,
        qualified_users: users,
      },
      method: 'post',
      url:
        this.backendFeatures.version >= 2
          ? `${ConversationAPI.URL.CONVERSATIONS}/${conversationId.domain}/${conversationId.id}/${ConversationAPI.URL.MEMBERS}`
          : `${ConversationAPI.URL.CONVERSATIONS}/${conversationId.id}/${ConversationAPI.URL.MEMBERS}/${ConversationAPI.URL.V2}`,
    };

    try {
      const response = await this.client.sendJSON<ConversationMemberJoinEvent>(config);
      return response.data;
    } catch (error) {
      const backendError = error as BackendError;
      switch (backendError.label) {
        case BackendErrorLabel.LEGAL_HOLD_MISSING_CONSENT: {
          throw new ConversationLegalholdMissingConsentError(backendError.message);
        }
      }
      throw error;
    }
  }

  /**
   * Update membership of the specified user in a certain conversation
   * @param userId The user ID
   * @param conversationId The conversation ID to change the user's membership in
   * @param memberUpdateData The new member data
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateOtherMember
   */
  public async putOtherMember(
    userId: string,
    conversationId: string,
    memberUpdateData: ConversationOtherMemberUpdateData,
  ): Promise<void> {
    const config: AxiosRequestConfig = {
      data: memberUpdateData,
      method: 'put',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.MEMBERS}/${userId}`,
    };

    await this.client.sendJSON<ConversationMemberJoinEvent>(config);
  }

  /**
   * Update self membership properties.
   * @param conversationId The Conversation ID
   * @param memberData The new conversation
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateSelf
   */
  public async putMembershipProperties(
    conversationId: string,
    memberData: Partial<ConversationMemberUpdateData>,
  ): Promise<void> {
    const config: AxiosRequestConfig = {
      data: memberData,
      method: 'put',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.SELF}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Update the protocol of the conversation.
   * Used in MLS Migration feature:
   * - changing the protocol from "proteus" to "mixed" will assign a groupId to the conversation.
   * - changing the protocol from "mixed" to "mls" will finalise the migration of the conversation.
   * @param conversationId id of the conversation
   * @param memberData the new conversation
   * @see https://wearezeta.atlassian.net/wiki/spaces/CORE/pages/746488003/Proteus+to+MLS+Migration for more details
   */
  public async putConversationProtocol(
    conversationId: QualifiedId,
    protocol: ConversationProtocol.MIXED | ConversationProtocol.MLS,
  ): Promise<ConversationProtocolUpdateEvent> {
    const config: AxiosRequestConfig = {
      data: {protocol},
      method: 'put',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId.domain}/${conversationId.id}/${ConversationAPI.URL.PROTOCOL}`,
    };

    const response = await this.client.sendJSON<ConversationProtocolUpdateEvent>(config);
    return response.data;
  }
}
