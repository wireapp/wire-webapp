/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {ConversationRepository} from 'Repositories/conversation/conversationrepository';
import type {Conversation} from 'Repositories/entity/conversation';
import {User} from 'Repositories/entity/user';

import {getDriveEnabledParticipants} from './usedriveenabledparticipantfilteritems';
import {translateForTest} from 'Util/test/translatefortest';

const createUser = ({id, domain = 'example.com', name}: {id: string; domain?: string; name: string}): User => {
  const user = new User(id, domain, translateForTest);
  user.name(name);
  return user;
};

const createConversation = ({users, lastEventTimestamp}: {users: User[]; lastEventTimestamp: number}): Conversation =>
  ({
    allUserEntities: () => users,
    last_event_timestamp: () => lastEventTimestamp,
  }) as Conversation;

const createConversationRepository = (conversations: Conversation[]): ConversationRepository =>
  ({
    getAllCellEnabledGroupConversations: () => conversations,
  }) as ConversationRepository;

describe('getDriveEnabledParticipants', () => {
  it('returns unique participants from all drive-enabled conversations sorted by recent conversations first', () => {
    const alex = createUser({id: 'alex', name: 'Alex'});
    const deniz = createUser({id: 'deniz', name: 'Deniz'});
    const alexFromAnotherConversation = createUser({id: 'alex', name: 'Alex'});

    const participants = getDriveEnabledParticipants(
      createConversationRepository([
        createConversation({users: [alexFromAnotherConversation], lastEventTimestamp: 1_000}),
        createConversation({users: [deniz, alex], lastEventTimestamp: 2_000}),
      ]),
    );

    expect(participants).toEqual([deniz, alex]);
  });

  it('skips unavailable users and services', () => {
    const availableUser = createUser({id: 'available-user', name: 'Available User'});
    const unavailableUser = new User('unavailable-user', 'example.com', translateForTest);
    const serviceUser = createUser({id: 'service-user', name: 'Service User'});
    serviceUser.isService = true;

    const participants = getDriveEnabledParticipants(
      createConversationRepository([
        createConversation({users: [unavailableUser, serviceUser, availableUser], lastEventTimestamp: 1_000}),
      ]),
    );

    expect(participants).toEqual([availableUser]);
  });
});
