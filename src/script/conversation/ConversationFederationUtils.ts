/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';

export interface FederationDeleteResult {
  conversationsToLeave: Conversation[];
  conversationsToDisable: Conversation[];
  /**
   * One to One conversations that must be marked as disabled
   * and the connection to their user must be deleted
   */
  conversationsToDeleteUsers: {conversation: Conversation; users: User[]}[];
}

export function processFederationDeleteEvent(
  deletedDomain: string,
  conversations: Conversation[],
): FederationDeleteResult {
  const result: FederationDeleteResult = {
    conversationsToLeave: [],
    conversationsToDisable: [],
    conversationsToDeleteUsers: [],
  };

  conversations.forEach(conversation => {
    if (conversation.domain === deletedDomain && !conversation.is1to1()) {
      result.conversationsToLeave.push(conversation);
    } else if (conversation.is1to1() && conversation.firstUserEntity().qualifiedId.domain === deletedDomain) {
      result.conversationsToDisable.push(conversation);
    } else {
      const usersToDelete = conversation.allUserEntities().filter(user => user.domain === deletedDomain);
      if (usersToDelete.length > 0) {
        result.conversationsToDeleteUsers.push({conversation, users: usersToDelete});
      }
    }
  });

  return result;
}
