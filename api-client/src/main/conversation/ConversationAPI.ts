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

import {AxiosRequestConfig, AxiosResponse} from 'axios';
import {
  ClientMismatch,
  Conversation,
  ConversationCode,
  ConversationIds,
  Conversations,
  ConversationUpdate,
  Invite,
  Member,
  MemberUpdate,
  NewConversation,
  NewOTRMessage,
  Typing,
} from '../conversation/';
import {ConversationEvent} from '../event/ConversationEvent';
import {HttpClient} from '../http/';
import {ValidationError} from '../validation/';

class ConversationAPI {
  constructor(private client: HttpClient) {}

  static get URL() {
    return {
      BOTS: 'bots',
      CLIENTS: '/clients',
      CODE_CHECK: '/code-check',
      CONVERSATIONS: '/conversations',
      MEMBERS: 'members',
      MESSAGES: 'messages',
      JOIN: '/join',
      OTR: 'otr',
      SELF: 'self',
    };
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
  public deleteMember(conversationId: string, userId: string): Promise<ConversationEvent> {
    const config: AxiosRequestConfig = {
      method: 'delete',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.MEMBERS}/${userId}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Get a conversation by ID.
   * @param conversationId The conversation ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversation
   */
  public getConversation(conversationId: string): Promise<Conversation> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Get all conversation IDs.
   * @param limit Max. number of IDs to return
   * @param conversationId Conversation ID to start from (exclusive)
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversationIds
   */
  public getConversationIds(limit: number, conversationId?: string): Promise<ConversationIds> {
    const config: AxiosRequestConfig = {
      params: {
        size: limit,
      },
      method: 'get',
      url: `${ConversationAPI.URL.CONVERSATIONS}/ids`,
    };

    if (conversationId) {
      config.data.start = conversationId;
    }

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Get conversations.
   * Note: At most 500 conversations are returned per request.
   * @param limit Max. number of conversations to return
   * @param conversationId Conversation ID to start from (exclusive). Mutually exclusive with `conversationIds`.
   * @param conversationIds Mutually exclusive with `conversationId`. At most 32 IDs per request.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/conversations
   */
  public getConversations(
    limit: number = 100,
    conversationId?: string,
    conversationIds?: string[]
  ): Promise<Conversations> {
    const config: AxiosRequestConfig = {
      params: {
        size: limit,
      },
      method: 'get',
      url: `${ConversationAPI.URL.CONVERSATIONS}`,
    };

    if (conversationId) {
      config.data.start = conversationId;
    } else if (conversationIds) {
      config.data.ids = conversationIds.join(',');
    }

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Get self membership properties.
   * @param conversationId The Conversation ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/getSelf
   */
  public getMembershipProperties(conversationId: string): Promise<Member> {
    const config: AxiosRequestConfig = {
      method: 'get',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/self`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
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
  public postAddMembers(conversationId: string, invitationData: Invite): Promise<ConversationEvent> {
    const config: AxiosRequestConfig = {
      data: invitationData,
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.MEMBERS}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
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
  public postConversation(conversationData: NewConversation): Promise<Conversation> {
    const config: AxiosRequestConfig = {
      data: conversationData,
      method: 'post',
      url: ConversationAPI.URL.CONVERSATIONS,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Validates conversation code
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
  public postJoinByCode(conversationCode: ConversationCode): Promise<ConversationEvent> {
    const config: AxiosRequestConfig = {
      data: conversationCode,
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}${ConversationAPI.URL.JOIN}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Join a conversation.
   * @param conversationId The conversation ID
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/joinConversation
   */
  public postJoin(conversationId: string): Promise<ConversationEvent> {
    const config: AxiosRequestConfig = {
      data: {},
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Post an encrypted message to a conversation.
   * @param clientId The sender's client ID
   * @param conversationId The conversation ID
   * @param messageData The message content
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/postOtrMessage
   */
  public postOTRMessage(
    clientId: string,
    conversationId: string,
    messageData?: NewOTRMessage,
    params?: {
      ignore_missing?: boolean;
      report_missing?: string;
    }
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
      params: {
        ignore_missing: !!messageData.data,
        ...params,
      },
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.OTR}/${
        ConversationAPI.URL.MESSAGES
      }`,
    };

    if (typeof messageData.recipients === 'object') {
      return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
    }

    return this.client.sendProtocolBuffer(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Create a self-conversation.
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/createSelfConversation
   */
  public postSelf(): Promise<Conversation> {
    const config: AxiosRequestConfig = {
      data: {},
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/self`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Send typing notifications.
   * @param conversationId The Conversation ID
   * @param typingData The typing status
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/isTyping
   */
  public async postTyping(conversationId: string, typingData: Typing): Promise<void> {
    const config: AxiosRequestConfig = {
      data: typingData,
      method: 'post',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.SELF}`,
    };

    await this.client.sendJSON(config);
  }

  /**
   * Update conversation properties.
   * @param conversationId The conversation ID
   * @param conversationData The new conversation
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateConversation
   */
  public putConversation(conversationId: string, conversationData: ConversationUpdate): Promise<ConversationEvent> {
    const config: AxiosRequestConfig = {
      data: conversationData,
      method: 'put',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}`,
    };

    return this.client.sendJSON(config).then((response: AxiosResponse) => response.data);
  }

  /**
   * Update self membership properties.
   * @param conversationId The Conversation ID
   * @param memberData The new conversation
   * @see https://staging-nginz-https.zinfra.io/swagger-ui/#!/conversations/updateSelf
   */
  public async putMembershipProperties(conversationId: string, memberData: MemberUpdate): Promise<void> {
    const config: AxiosRequestConfig = {
      data: memberData,
      method: 'put',
      url: `${ConversationAPI.URL.CONVERSATIONS}/${conversationId}/${ConversationAPI.URL.SELF}`,
    };

    await this.client.sendJSON(config);
  }
}

export {ConversationAPI};
