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

import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';

export interface FederationDeleteResult {
  /**
   * Conversations the self user is part of that are hosted on the deleted domain
   */
  conversationsToLeave: Conversation[];

  /**
   * One to One conversations that must be marked as disabled
   * and the connection to their user must be deleted
   */
  conversationsToDisable: Conversation[];

  /**
   * Conversations that contain users from the deleted domain
   */
  conversationsToDeleteUsers: {conversation: Conversation; users: User[]}[];

  connectionRequestsToDelete: Conversation[];
}

export function getFederationDeleteEventUpdates(
  deletedDomain: string,
  conversations: Conversation[],
): FederationDeleteResult {
  const result: FederationDeleteResult = {
    conversationsToLeave: [],
    conversationsToDisable: [],
    conversationsToDeleteUsers: [],
    connectionRequestsToDelete: [],
  };

  conversations.forEach(conversation => {
    const is1to1 = conversation.is1to1();
    const isConnectionRequest = conversation.isRequest();
    const firstUserEntity = conversation.firstUserEntity();
    const allUserEntities = conversation.allUserEntities();

    if (conversation.domain === deletedDomain && !is1to1 && !isConnectionRequest) {
      result.conversationsToLeave.push(conversation);
    } else if (isConnectionRequest && firstUserEntity?.qualifiedId.domain === deletedDomain) {
      result.connectionRequestsToDelete.push(conversation);
    } else if (is1to1 && firstUserEntity?.qualifiedId.domain === deletedDomain) {
      result.conversationsToDisable.push(conversation);
    } else {
      const usersToDelete = allUserEntities.filter(user => user.domain === deletedDomain);
      if (usersToDelete.length > 0) {
        result.conversationsToDeleteUsers.push({conversation, users: usersToDelete});
      }
    }
  });

  return result;
}

export type FederationConnectionRemovedResult = {conversation: Conversation; usersToRemove: User[]}[];

export function getUsersToDeleteFromFederatedConversations(
  deletedDomains: string[],
  conversations: Conversation[],
): FederationConnectionRemovedResult {
  const result: FederationConnectionRemovedResult = [];

  const [domainOne, domainTwo] = deletedDomains;

  conversations.forEach(conversation => {
    if (conversation.domain === domainOne || conversation.domain === domainTwo) {
      const targetDomain = conversation.domain === domainOne ? domainTwo : domainOne;
      const usersToDelete = conversation.allUserEntities().filter(user => user.domain === targetDomain);

      if (usersToDelete.length > 0) {
        result.push({conversation, usersToRemove: usersToDelete});
      }
    }
  });

  conversations.forEach(conversation => {
    if (deletedDomains.includes(conversation.domain)) {
      return;
    }

    const allUserEntities = conversation.allUserEntities();
    const userDomains = new Set(allUserEntities.map(user => user.qualifiedId.domain));

    if (userDomains.has(domainOne) && userDomains.has(domainTwo)) {
      const usersToDelete = allUserEntities.filter(user => [domainOne, domainTwo].includes(user.domain));
      if (usersToDelete.length > 0) {
        result.push({conversation, usersToRemove: usersToDelete});
      }
    }
  });

  return result;
}
