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

import {AxiosRequestConfig} from 'axios';
import {
  ClientMismatch,
  Conversation,
  ConversationCode,
  ConversationIds,
  Conversations,
  Invite,
  Member,
  NewConversation,
  NewOTRMessage,
} from '../conversation/';
import {
  ConversationEvent,
  ConversationMemberJoinEvent,
  ConversationMemberLeaveEvent,
  ConversationMessageTimerUpdateEvent,
  ConversationRenameEvent,
  ConversationCodeUpdateEvent,
  ConversationCodeDeleteEvent,
  ConversationReceiptModeUpdateEvent,
  ConversationAccessUpdateEvent,
} from '../event/';
import {HttpClient} from '../http/';
import {ValidationError} from '../validation/';
import {
  ConversationMemberUpdateData,
  ConversationMessageTimerUpdateData,
  ConversationNameUpdateData,
  ConversationReceiptModeUpdateData,
  ConversationTypingData,
  ConversationAccessUpdateData,
} from './data';

export class ConversationAPI {
  public static readonly MAX_CHUNK_SIZE = 500;
  public static readonly URL = {
    ACCESS: 'access',
    BOTS: 'bots',
    CLIENTS: '/clients',
    CODE: 'code',
    CODE_CHECK: '/code-check',
    CONVERSATIONS: '/conversations',
    JOIN: '/join',
    MEMBERS: 'members',
    MESSAGES: 'messages',
    MESSAGE_TIMER: 'message-timer',
    NAME: 'name',
    OTR: 'otr',
    RECEIPT_MODE: 'receipt-mode',
    SELF: 'self',
    TYPING: 'typing',
  };

  constructor(private readonly client: HttpClient) {}

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
   * Remove bot from conversation.
   * @param conversationId The conversation ID to remove the bot from
   * @param botId The ID of the bot to be removed from the conversation
   */
  public async deleteBot(conversationId: string, botId: string): Promise<void> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.BOTS}/${botId}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Remove member from conversation.
   * @param conversationId The conversation ID to remove the user from
   * @param userId The user to remove
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/removeMember
   */
  public async deleteMember(conversationId: string, userId: string): Promise<ConversationMemberLeaveEvent> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.MEMBERS}/${userId}`,
    };

    const response = await this.client.sendJSON<ConversationMemberLeaveEvent>(config);
    return response.data;
  }

  /**
   * Get all conversations.
   */
  public getAllConversations(): Promise<Conversation[]> {
    let allConversations: Conversation[] = [];

    const getConversationChunks = async (conversationId?: string): Promise<Conversation[]> => {
      const {conversations, has_more} = await this.getConversations(conversationId, ConversationAPI.MAX_CHUNK_SIZE);

      if (conversations.length) {
        allConversations = allConversations.concat(conversations);
      }

      if (has_more) {
        const lastConversation = conversations.pop();
        if (lastConversation) {
          return getConversationChunks(lastConversation.id);
        }
      }

      return allConversations;
    };

    return getConversationChunks();
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
   * Get a conversation by ID.
   * @param conversationId The conversation ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversation
   */
  public async getConversation(conversationId: string): Promise<Conversation> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}`,
    };

    const response = await this.client.sendJSON<Conversation>(config);
    return response.data;
  }

  /**
   * Get all conversation IDs.
   * @param limit Max. number of IDs to return
   * @param conversationId Conversation ID to start from (exclusive)
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversationIds
   */
  public async getConversationIds(limit: number, conversationId?: string): Promise<ConversationIds> {
    const config: AxiosRequestConfig = {
      method: 'get',
      params: {
        size: limit,
        start: conversationId,
      },
      url: `${ConversationAPI.URL.CONVERSATIONS}/ids`,
    };

    const response = await this.client.sendJSON<ConversationIds>(config);
    return response.data;
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
      url: `${ConversationAPI.URL.CONVERSATIONS}`,
    };

    if (filteredConversationIds) {
      config.params.ids = filteredConversationIds.join(',');
    }

    const response = await this.client.sendJSON<Conversations>(config);
    return response.data;
  }

  /**
   * Get self membership properties.
   * @param conversationId The Conversation ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/getSelf
   */
  public async getMembershipProperties(conversationId: string): Promise<Member> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/self`,
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

    const response = await this.client.sendJSON<ConversationEvent>(config);
    return response.data;
  }

  /**
   * Add a bot to an existing conversation.
   * @param conversationId ID of the conversation to add bots to
   * @param providerId ID of the bot provider
   * @param serviceId ID of the service provider
   */
  public async postBot(conversationId: string, providerId: string, serviceId: string): Promise<void> {
    const config: AxiosRequestConfig = {
      data: {
        provider: providerId,
        service: serviceId,
      },
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.BOTS}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Create a new conversation
   * @param conversationData The new conversation
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createGroupConversation
   */
  public async postConversation(conversationData: NewConversation): Promise<Conversation> {
    const config: AxiosRequestConfig = {
      data: conversationData,
      method: 'post',
      url: ConversationAPI.URL.CONVERSATIONS,
    };

    const response = await this.client.sendJSON<Conversation>(config);
    return response.data;
  }

  /**
   * Create or recreate a conversation code.
   * @param conversationId ID of conversation to request the code for
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createConversationCode
   */
  public async postConversationCodeRequest(conversationId: string): Promise<ConversationCodeUpdateEvent> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.CODE}`,
    };

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

    await this.client.sendJSON(config);
  }

  /**
   * Join a conversation by conversation code.
   * @param conversationCode The conversation code
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/joinConversationByCode
   */
  public async postJoinByCode(conversationCode: ConversationCode): Promise<ConversationMemberJoinEvent> {
    const config: AxiosRequestConfig = {
      data: conversationCode,
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}${ConversationAPI.URL.JOIN}`,
    };

    const response = await this.client.sendJSON<ConversationMemberJoinEvent>(config);
    return response.data;
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
   * Post an encrypted message to a conversation.
   * @param clientId The sender's client ID
   * @param conversationId The conversation ID
   * @param messageData The message content
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/postOtrMessage
   */
  public async postOTRMessage(
    clientId: string,
    conversationId: string,
    messageData?: NewOTRMessage,
    params?: {
      ignore_missing?: boolean;
      report_missing?: string;
    },
  ): Promise<ClientMismatch> {
    if (!clientId) {
      throw new ValidationError('Unable to send OTR message without client ID.');
    }
    if (!messageData) {
      messageData = {
        recipients: {},
        sender: clientId,
      };
    }

    const config: AxiosRequestConfig = {
      data: messageData,
      method: 'post',
      params: {
        ignore_missing: !!messageData.data,
        ...params,
      },
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.OTR}/${ConversationAPI.URL.MESSAGES}`,
    };

    const response =
      typeof messageData.recipients === 'object'
        ? await this.client.sendJSON<ClientMismatch>(config, true)
        : await this.client.sendProtocolBuffer<ClientMismatch>(config, true);
    return response.data;
  }

  /**
   * Create a self-conversation.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createSelfConversation
   */
  public async postSelf(): Promise<Conversation> {
    const config: AxiosRequestConfig = {
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/self`,
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
  public async postTyping(conversationId: string, typingData: ConversationTypingData): Promise<void> {
    const config: AxiosRequestConfig = {
      data: typingData,
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.TYPING}`,
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
    conversationId: string,
    accessData: ConversationAccessUpdateData,
  ): Promise<ConversationAccessUpdateEvent> {
    const config: AxiosRequestConfig = {
      data: accessData,
      method: 'put',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.NAME}`,
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
   * Add users to an existing conversation.
   * @param conversationId The conversation ID to add the users to
   * @param userIds List of user IDs to add to a conversation
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/addMembers
   */
  public async postMembers(conversationId: string, userIds: string[]): Promise<ConversationMemberJoinEvent> {
    const config: AxiosRequestConfig = {
      data: {
        users: userIds,
      },
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.MEMBERS}`,
    };

    const response = await this.client.sendJSON<ConversationMemberJoinEvent>(config);
    return response.data;
  }

  /**
   * Update self membership properties.
   * @param conversationId The Conversation ID
   * @param memberData The new conversation
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateSelf
   */
  public async putMembershipProperties(
    conversationId: string,
    memberData: ConversationMemberUpdateData,
  ): Promise<void> {
    const config: AxiosRequestConfig = {
      data: memberData,
      method: 'put',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.SELF}`,
    };

    await this.client.sendJSON(config);
  }
}
