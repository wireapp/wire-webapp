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

export class ConversationRepositoryE2E extends BackendClientE2E {
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
      {
        headers: {
          Authorization: `Bearer ${inviterToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async createGroupConversation(token: string, data: createGroupConversationDataParams) {
    const conversationData = createGroupConversationData(data);
    try {
      const response = await this.axiosInstance.post('conversations', conversationData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error creating group conversation:', error);
      throw error;
    }
  }

  async getMLSConversationWithUser(token: string, conversationPartnerId: string, timeout = 10000) {
    const retryDelay = 1000;
    const maxRetries = timeout / retryDelay;
    let mlsConversationId = null;

    for (let attempt = 0; attempt < maxRetries && !mlsConversationId; attempt++) {
      const listIdsResponse = await this.axiosInstance.post(
        'conversations/list-ids',
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const qualifiedIds = listIdsResponse.data.qualified_conversations;

      if (!qualifiedIds) {
        throw new Error('No qualified conversations found');
      }

      const response = await this.axiosInstance.post(
        'conversations/list',
        {
          qualified_ids: qualifiedIds,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // Filtering out conversations that are not MLS;
      const responseData = response.data;
      mlsConversationId =
        responseData.found.find(
          (conversation: {protocol: string; members: {others: {conversation_role: string; id: string}[]}}) =>
            conversation.protocol === 'mls' &&
            conversation.members.others.some(
              (member: {conversation_role: string; id: string}) =>
                member.conversation_role === 'wire_member' && member.id === conversationPartnerId,
            ),
        )?.qualified_id?.id ?? null;

      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
    if (!mlsConversationId) {
      throw new Error(`No MLS conversation found with user ID: ${conversationPartnerId}`);
    }
    return mlsConversationId;
  }
}
