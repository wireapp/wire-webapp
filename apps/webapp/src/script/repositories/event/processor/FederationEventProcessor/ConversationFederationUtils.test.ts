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

import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation/';

import {Conversation} from 'Repositories/entity/Conversation';
import {generateConversation} from 'test/helper/ConversationGenerator';
import {generateUser} from 'test/helper/UserGenerator';

import {
  getFederationDeleteEventUpdates,
  FederationDeleteResult,
  getUsersToDeleteFromFederatedConversations,
  FederationConnectionRemovedResult,
} from './ConversationFederationUtils';

describe('ConversationFederationUtils', () => {
  describe('getFederationDeleteEventUpdates', () => {
    it('correctly categorizes conversations for deletion', () => {
      const deletedDomain = 'deleted.wire.link';

      const user1 = generateUser();
      const user2 = generateUser();
      const userFromDeletedDomain = generateUser({domain: deletedDomain, id: 'test-id'});

      const conversations: Conversation[] = [
        generateConversation({
          id: {
            id: 'test-1',
            domain: 'test.wire.link',
          },
        }),
        generateConversation({
          id: {
            id: 'test-1',
            domain: 'test.wire.link',
          },
          users: [user1],
        }),
        generateConversation({
          type: CONVERSATION_TYPE.ONE_TO_ONE,
          id: {
            id: 'test-1',
            domain: deletedDomain,
          },
          users: [userFromDeletedDomain],
        }),
        generateConversation({
          id: {
            id: 'test-1',
            domain: 'test.wire.link',
          },
          users: [user2],
        }),
        generateConversation({
          id: {
            id: 'test-1',
            domain: 'test.wire.link',
          },
          users: [userFromDeletedDomain],
        }),
      ];

      const result: FederationDeleteResult = getFederationDeleteEventUpdates(deletedDomain, conversations);

      expect(result.conversationsToLeave).toHaveLength(0);
      expect(result.conversationsToDisable).toHaveLength(1);
      expect(result.conversationsToDeleteUsers).toHaveLength(1);

      expect(result.conversationsToDeleteUsers[0].conversation).toBe(conversations[4]);
      expect(result.conversationsToDeleteUsers[0].users).toContainEqual(userFromDeletedDomain);
    });

    it('finds connection requests to delete', () => {
      const deletedDomain = 'deleted.wire.link';

      const user1 = generateUser();
      const userFromDeletedDomain = generateUser({domain: deletedDomain, id: 'test-id'});

      const conversations: Conversation[] = [
        generateConversation({
          type: CONVERSATION_TYPE.CONNECT,
          id: {
            id: 'test-2',
            domain: 'wire.link',
          },
          users: [user1],
        }),
        generateConversation({
          type: CONVERSATION_TYPE.CONNECT,
          id: {
            id: 'test-3',
            domain: deletedDomain,
          },
          users: [userFromDeletedDomain],
        }),
      ];

      const result: FederationDeleteResult = getFederationDeleteEventUpdates(deletedDomain, conversations);

      expect(result.conversationsToLeave).toHaveLength(0);
      expect(result.conversationsToDisable).toHaveLength(0);
      expect(result.conversationsToDeleteUsers).toHaveLength(0);
      expect(result.connectionRequestsToDelete).toHaveLength(1);

      expect(result.connectionRequestsToDelete[0]).toBe(conversations[1]);
    });

    it('correctly finds one to one conversations to disable', () => {
      const deletedDomain = 'deleted.wire.link';

      const user1 = generateUser();
      const user2 = generateUser();
      const userFromDeletedDomain = generateUser({domain: deletedDomain, id: 'test-id'});

      const conversations: Conversation[] = [
        generateConversation({
          type: CONVERSATION_TYPE.ONE_TO_ONE,
          id: {
            id: 'test-1',
            domain: 'wire.link',
          },
          users: [user1],
        }),
        generateConversation({
          type: CONVERSATION_TYPE.ONE_TO_ONE,
          id: {
            id: 'test-2',
            domain: 'wire.link',
          },
          users: [user2],
        }),
        generateConversation({
          type: CONVERSATION_TYPE.ONE_TO_ONE,
          id: {
            id: 'test-3',
            domain: deletedDomain,
          },
          users: [userFromDeletedDomain],
        }),
        generateConversation({
          type: CONVERSATION_TYPE.ONE_TO_ONE,
          id: {
            id: 'test-4',
            domain: deletedDomain,
          },
          users: [userFromDeletedDomain],
        }),
      ];

      const result: FederationDeleteResult = getFederationDeleteEventUpdates(deletedDomain, conversations);

      expect(result.conversationsToLeave).toHaveLength(0);
      expect(result.conversationsToDisable).toHaveLength(2);
      expect(result.conversationsToDeleteUsers).toHaveLength(0);

      expect(result.conversationsToDisable[0]).toBe(conversations[2]);
      expect(result.conversationsToDisable[1]).toBe(conversations[3]);
    });

    it('correctly handles multiple conversations with the same domain', () => {
      const deletedDomain = 'deleted.wire.link';

      const user1 = generateUser();
      const user2 = generateUser({id: 'test-user-id-1', domain: deletedDomain});

      const conversations: Conversation[] = [
        generateConversation({
          id: {
            domain: deletedDomain,
            id: 'test-id-1',
          },
        }),
        generateConversation({
          id: {
            domain: deletedDomain,
            id: 'test-id-2',
          },
        }),
        generateConversation({
          id: {
            domain: 'other.wire.link',
            id: 'test-id-other-1',
          },
          users: [user1],
        }),
        generateConversation({
          id: {
            domain: 'other.wire.link',
            id: 'test-id-other-2',
          },
          users: [user2],
        }),
      ];

      const result: FederationDeleteResult = getFederationDeleteEventUpdates(deletedDomain, conversations);

      expect(result.conversationsToLeave).toHaveLength(2);
      expect(result.conversationsToDisable).toHaveLength(0);
      expect(result.conversationsToDeleteUsers).toHaveLength(1);

      expect(result.conversationsToLeave).toContainEqual(conversations[0]);
      expect(result.conversationsToLeave).toContainEqual(conversations[1]);
      expect(result.conversationsToDeleteUsers[0].conversation).toBe(conversations[3]);
      expect(result.conversationsToDeleteUsers[0].users).toContainEqual(user2);
    });

    it('handles conversations with no matching criteria', () => {
      const deletedDomain = 'deleted.wire.link';
      const user1 = generateUser();

      const conversations: Conversation[] = [
        generateConversation({
          id: {
            domain: 'other.wire.link',
            id: 'test-id-other-1',
          },
          users: [user1],
        }),
        generateConversation({
          id: {
            domain: 'other.wire.link',
            id: 'test-id-other-1',
          },
          users: [user1],
        }),
        generateConversation({
          type: CONVERSATION_TYPE.ONE_TO_ONE,
          id: {
            domain: 'other.wire.link',
            id: 'test-id-other-1',
          },
          users: [user1],
        }),
      ];

      const result: FederationDeleteResult = getFederationDeleteEventUpdates(deletedDomain, conversations);

      expect(result.conversationsToLeave).toHaveLength(0);
      expect(result.conversationsToDisable).toHaveLength(0);
      expect(result.conversationsToDeleteUsers).toHaveLength(0);
    });
  });

  describe('getUsersToDeleteFromFederatedConversations', () => {
    it('correctly identifies and categorizes conversations to remove users from', () => {
      const selfDomain = 'webapp.wire.link';
      const deletedDomains = ['deleted-1.wire.link', 'deleted-2.wire.link'];
      const selfUser = generateUser({id: 'self-user-id', domain: selfDomain});

      const user1 = generateUser();
      const user2 = generateUser();
      const userFromDeletedDomain1 = generateUser({domain: deletedDomains[0], id: 'userFromDeletedDomain1'});
      const userFromDeletedDomain2 = generateUser({domain: deletedDomains[1], id: 'userFromDeletedDomain2'});

      const conversations: Conversation[] = [
        generateConversation({
          id: {
            id: 'test-1',
            domain: selfDomain,
          },
          users: [selfUser, user1, user2, userFromDeletedDomain1, userFromDeletedDomain2],
        }),
        generateConversation({
          id: {
            id: 'test-2',
            domain: deletedDomains[0],
          },
          users: [selfUser, user1, user2, userFromDeletedDomain1, userFromDeletedDomain2],
        }),
        generateConversation({
          id: {
            id: 'test-3',
            domain: deletedDomains[1],
          },
          users: [selfUser, user1, user2, userFromDeletedDomain1, userFromDeletedDomain2],
        }),
      ];

      const result: FederationConnectionRemovedResult = getUsersToDeleteFromFederatedConversations(
        deletedDomains,
        conversations,
      );

      expect(result).toHaveLength(3);
      expect(result[0].usersToRemove[0].domain).toBe(deletedDomains[1]);
      expect(result[1].usersToRemove[0].domain).toBe(deletedDomains[0]);
      expect(result[2].usersToRemove).toHaveLength(2);
    });

    it('correctly identifies and categorizes conversations to remove users from, handling unrelated domains', () => {
      const selfDomain = 'webapp.wire.link';
      const unrelatedDomain = 'unrelated.wire.link';
      const deletedDomains = ['deleted-1.wire.link', 'deleted-2.wire.link'];
      const selfUser = generateUser({id: 'self-user-id', domain: selfDomain});

      const user1 = generateUser();
      const user2 = generateUser();
      const userFromUnrelatedDomain = generateUser({domain: unrelatedDomain, id: 'userFromUnrelatedDomain'});
      const userFromDeletedDomain1 = generateUser({domain: deletedDomains[0], id: 'userFromDeletedDomain1'});
      const userFromDeletedDomain2 = generateUser({domain: deletedDomains[1], id: 'userFromDeletedDomain2'});

      const conversations: Conversation[] = [
        generateConversation({
          id: {
            id: 'test-1',
            domain: selfDomain,
          },
          users: [selfUser, user1, user2, userFromDeletedDomain1, userFromDeletedDomain2, userFromUnrelatedDomain],
        }),
        generateConversation({
          id: {
            id: 'test-2',
            domain: deletedDomains[0],
          },
          users: [selfUser, user1, user2, userFromDeletedDomain1, userFromDeletedDomain2, userFromUnrelatedDomain],
        }),
        generateConversation({
          id: {
            id: 'test-3',
            domain: deletedDomains[1],
          },
          users: [selfUser, user1, user2, userFromDeletedDomain1, userFromDeletedDomain2, userFromUnrelatedDomain],
        }),
        generateConversation({
          id: {
            id: 'test-3',
            domain: unrelatedDomain,
          },
          users: [selfUser, user1, user2, userFromDeletedDomain1, userFromDeletedDomain2, userFromUnrelatedDomain],
        }),
      ];

      const result: FederationConnectionRemovedResult = getUsersToDeleteFromFederatedConversations(
        deletedDomains,
        conversations,
      );

      expect(result).toHaveLength(4);
      expect(result[0].usersToRemove[0].domain).toBe(deletedDomains[1]);
      expect(result[1].usersToRemove[0].domain).toBe(deletedDomains[0]);
      expect(result[2].usersToRemove).toHaveLength(2);
      expect(result[3].usersToRemove).toHaveLength(2);
    });

    it('handles conversations with no users to remove due to domain criteria', () => {
      const deletedDomains = ['deleted-1.wire.link', 'deleted-2.wire.link'];

      const user1 = generateUser();
      const user2 = generateUser({domain: 'other-domain-1', id: 'user2'});

      const conversations: Conversation[] = [
        generateConversation({
          id: {
            id: 'test-1',
            domain: 'test-domain-1',
          },
          users: [user1],
        }),
        generateConversation({
          id: {
            id: 'test-2',
            domain: 'test-domain-2',
          },
          users: [user2],
        }),
        generateConversation({
          id: {
            id: 'test-3',
            domain: 'test-domain-3',
          },
          users: [user1],
        }),
      ];

      const result: FederationConnectionRemovedResult = getUsersToDeleteFromFederatedConversations(
        deletedDomains,
        conversations,
      );

      expect(result).toHaveLength(0);
    });
  });
});
