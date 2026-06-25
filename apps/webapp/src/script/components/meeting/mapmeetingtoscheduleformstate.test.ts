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

import type {Meeting} from 'Components/meeting/meetinglist/meetinglist';
import {User} from 'Repositories/entity/user';
import {translateForTest} from 'Util/test/translatefortest';

import {mapMeetingToScheduleFormState} from './mapmeetingtoscheduleformstate';

const createUser = (id: string, email?: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(`User ${id}`);
  if (email !== undefined) {
    user.email(email);
  }
  return user;
};

const createMeeting = (): Meeting => ({
  start_date: '2026-06-15T10:00:00.000Z',
  end_date: '2026-06-15T11:00:00.000Z',
  recurrence: 'weekly',
  conversation_id: 'conv-id',
  title: 'Weekly sync',
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  invited_emails: ['alice@wire.com', 'BOB@wire.com', 'unknown@example.com'],
});

describe('mapMeetingToScheduleFormState', () => {
  it('maps meeting fields to schedule form state', () => {
    const availableUsers = [createUser('1', 'alice@wire.com'), createUser('2', 'bob@wire.com')];

    const result = mapMeetingToScheduleFormState(createMeeting(), availableUsers);

    expect(result.title).toBe('Weekly sync');
    expect(result.start.isJust).toBe(true);
    expect(result.start.unwrapOr(new Date(0))).toEqual(new Date('2026-06-15T10:00:00.000Z'));
    expect(result.end.isJust).toBe(true);
    expect(result.end.unwrapOr(new Date(0))).toEqual(new Date('2026-06-15T11:00:00.000Z'));
    expect(result.recurrence).toBe('weekly');
    expect(result.participantsFilter).toBe('');
  });

  it('resolves invited emails to available users case-insensitively', () => {
    const alice = createUser('1', 'alice@wire.com');
    const bob = createUser('2', 'bob@wire.com');
    const availableUsers = [alice, bob];

    const result = mapMeetingToScheduleFormState(createMeeting(), availableUsers);

    expect(result.selectedUsers[0]).toBe(alice);
    expect(result.selectedUsers[1]).toBe(bob);
  });

  it('creates placeholder users for unmatched invited emails', () => {
    const result = mapMeetingToScheduleFormState(createMeeting(), []);

    expect(result.selectedUsers).toHaveLength(3);
    expect(result.selectedUsers[2]?.email()).toBe('unknown@example.com');
    expect(result.selectedUsers[2]?.name()).toBe('unknown@example.com');
  });
});
