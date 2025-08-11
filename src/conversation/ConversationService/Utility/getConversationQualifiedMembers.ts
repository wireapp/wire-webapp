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

import {APIClient} from '@wireapp/api-client/lib/APIClient';
import {QualifiedId} from '@wireapp/api-client/lib/user';

interface Params {
  apiClient: APIClient;
  conversationId: QualifiedId;
}
const getConversationQualifiedMembers = async ({apiClient, conversationId}: Params): Promise<QualifiedId[]> => {
  const conversation = await apiClient.api.conversation.getConversation(conversationId);
  /*
   * If you are sending a message to a conversation, you have to include
   * yourself in the list of users if you want to sync a message also to your
   * other clients.
   */
  const filteredConversations = conversation.members.others
    .filter(member => !!member.qualified_id)
    .map(member => member.qualified_id!);

  if (conversation.members.self?.qualified_id) {
    filteredConversations.push(conversation.members.self.qualified_id);
  }

  return filteredConversations;
};

export {getConversationQualifiedMembers};
