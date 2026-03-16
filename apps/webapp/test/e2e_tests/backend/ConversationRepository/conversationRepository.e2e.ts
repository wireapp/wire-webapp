/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {createGroupConversationData, createGroupConversationDataParams} from './conversationRepository.mocks';

import {BackendClientE2E} from '../backendClient.e2e';

type Conversation = {
  qualified_id: {id: string};
  members: {
    others: {
      conversation_role: string;
      id: string;
    }[];
  };
  protocol: 'proteus' | 'mls';
  name: string;
};

export class ConversationRepositoryE2E extends BackendClientE2E {
  private getAuthHeaders(token: string) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  }

  private async listAllConversations(token: string): Promise<Conversation[]> {
    const {data: idData} = await this.axiosInstance.post('conversations/list-ids', {}, this.getAuthHeaders(token));

    const qualifiedIds = idData.qualified_conversations;
    if (!qualifiedIds) throw new Error('No qualified conversations found');

    const {data: listData} = await this.axiosInstance.post(
      'conversations/list',
      {qualified_ids: qualifiedIds},
      this.getAuthHeaders(token),
    );

    return listData.found as Conversation[];
  }
  async inviteToConversation(
    inviteeIds: string | string[],
    inviterToken: string,
    teamId: string,
    conversationName?: string,
  ) {
    await this.axiosInstance.post(
      'conversations',
      {
        access: ['invite', 'code'],
        conversation_role: 'wire_member',
        access_role_v2: ['team_member', 'non_team_member', 'guest', 'service'],
        ...(conversationName && {name: conversationName}),
        team: {
          managed: false,
          teamid: teamId,
        },
        qualified_users: [],
        users: [inviteeIds].flat(),
      },
      this.getAuthHeaders(inviterToken),
    );
  }

  async createGroupConversation(token: string, data: createGroupConversationDataParams) {
    const conversationData = createGroupConversationData(data);
    try {
      const response = await this.axiosInstance.post('conversations', conversationData, this.getAuthHeaders(token));

      return response.data;
    } catch (error: unknown) {
      console.error('Error creating group conversation:', error);
      throw error;
    }
  }

  async getConversationWithUser(
    token: string,
    conversationPartnerId: string,
    options?: {protocol?: 'proteus' | 'mls'},
  ) {
    const conversations = await this.listAllConversations(token);

    const conversation = conversations.find(conversation =>
      conversation.members.others.some(
        member =>
          member.id === conversationPartnerId &&
          // If a specific protocol to use was provided also filter by it
          (options?.protocol ? conversation.protocol === options.protocol : true),
      ),
    );

    return conversation?.qualified_id.id;
  }

  async getGroupConversation(token: string, conversationName: string) {
    const conversations = await this.listAllConversations(token);
    return conversations.find(conv => conv.name === conversationName)?.qualified_id.id;
  }
}
