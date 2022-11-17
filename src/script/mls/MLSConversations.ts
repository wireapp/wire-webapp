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

import {Account} from '@wireapp/core';

import {arrayToBase64} from 'Util/util';

import {mlsConversationState} from './mlsConversationState';

import {ConversationRepository} from '../conversation/ConversationRepository';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';

export async function initMLSConversations(
  conversations: Conversation[],
  selfUser: User,
  core: Account,
  conversationRepository: ConversationRepository,
): Promise<void> {
  // We send external proposal to all the MLS conversations that are in an unknown state (not established nor pendingWelcome)
  await mlsConversationState.getState().sendExternalToPendingJoin(
    conversations,
    groupId => core.service!.conversation.isMLSConversationEstablished(groupId),
    conversationId => core.service!.conversation.joinByExternalCommit(conversationId),
  );

  core.configureMLSCallbacks({
    authorize: groupIdBytes => {
      const groupId = arrayToBase64(groupIdBytes);
      const conversation = conversationRepository.findConversationByGroupId(groupId);
      if (!conversation) {
        // If the conversation is not found, it means it's being created by the self user, thus they have admin rights
        return true;
      }
      return conversationRepository.conversationRoleRepository.isUserGroupAdmin(conversation, selfUser);
    },
    groupIdFromConversationId: async conversationId => {
      const conversation = await conversationRepository.getConversationById(conversationId);
      return conversation?.groupId;
    },
    // This is enforced by backend, no need to implement this on the client side.
    userAuthorize: () => true,
  });
}
