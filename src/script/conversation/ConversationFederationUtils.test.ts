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

import {generateConversation} from 'test/helper/ConversationGenerator';
import {generateUser} from 'test/helper/UserGenerator';

import {processFederationDeleteEvent, FederationDeleteResult} from './ConversationFederationUtils';

import {Conversation} from '../entity/Conversation';

describe('processFederationDeleteEvent', () => {
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

    const result: FederationDeleteResult = processFederationDeleteEvent(deletedDomain, conversations);

    expect(result.conversationsToLeave).toHaveLength(0);
    expect(result.conversationsToDisable).toHaveLength(1);
    expect(result.conversationsToDeleteUsers).toHaveLength(1);

    expect(result.conversationsToDeleteUsers[0].conversation).toBe(conversations[4]);
    expect(result.conversationsToDeleteUsers[0].users).toContainEqual(userFromDeletedDomain);
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

    const result: FederationDeleteResult = processFederationDeleteEvent(deletedDomain, conversations);

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

    const result: FederationDeleteResult = processFederationDeleteEvent(deletedDomain, conversations);

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

    const result: FederationDeleteResult = processFederationDeleteEvent(deletedDomain, conversations);

    expect(result.conversationsToLeave).toHaveLength(0);
    expect(result.conversationsToDisable).toHaveLength(0);
    expect(result.conversationsToDeleteUsers).toHaveLength(0);
  });
});
