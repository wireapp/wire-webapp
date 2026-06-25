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

import type {Meeting} from 'Components/meeting/meetingList/meetingList';
import {getMeetingActionEntries} from 'Components/meeting/meetingList/meetingListItemGroup/meetingListItem/meetingAction/getMeetingActionEntries';
import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';

const createMeeting = (overrides: Partial<Meeting> = {}): Meeting => ({
  start_date: '2026-06-15T14:00:00.000Z',
  end_date: '2026-06-15T15:00:00.000Z',
  recurrence: 'weekly',
  conversation_id: 'conv-id',
  title: 'Weekly sync',
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  qualified_creator: {id: 'host-id', domain: 'example.com'},
  invited_emails: [],
  ...overrides,
});

const createSelfUser = (id = 'host-id') => {
  const user = new User(id, 'example.com', translateForTest);
  user.name('Host');
  return user;
};

const translate = (key: string) => key;

const getEditEntryLabel = (entries: ReturnType<typeof getMeetingActionEntries>) =>
  entries.find(entry => entry.label === 'meetings.action.editMeeting');

describe('getMeetingActionEntries', () => {
  it('includes Edit meeting for an eligible host', () => {
    const entries = getMeetingActionEntries({
      meeting: createMeeting(),
      selfUser: createSelfUser(),
      nowMs: new Date('2026-06-15T13:00:00.000Z').getTime(),
      translate,
      onEdit: jest.fn(),
    });

    expect(getEditEntryLabel(entries)).toBeDefined();
  });

  it('omits Edit meeting for a non-host invitee', () => {
    const entries = getMeetingActionEntries({
      meeting: createMeeting(),
      selfUser: createSelfUser('invitee-id'),
      nowMs: new Date('2026-06-15T13:00:00.000Z').getTime(),
      translate,
      onEdit: jest.fn(),
    });

    expect(getEditEntryLabel(entries)).toBeUndefined();
  });

  it('omits Edit meeting for an ongoing meeting', () => {
    const entries = getMeetingActionEntries({
      meeting: createMeeting(),
      selfUser: createSelfUser(),
      nowMs: new Date('2026-06-15T14:30:00.000Z').getTime(),
      translate,
      onEdit: jest.fn(),
    });

    expect(getEditEntryLabel(entries)).toBeUndefined();
  });

  it('omits Edit meeting for a past meeting', () => {
    const entries = getMeetingActionEntries({
      meeting: createMeeting(),
      selfUser: createSelfUser(),
      nowMs: new Date('2026-06-15T16:00:00.000Z').getTime(),
      translate,
      onEdit: jest.fn(),
    });

    expect(getEditEntryLabel(entries)).toBeUndefined();
  });
});
