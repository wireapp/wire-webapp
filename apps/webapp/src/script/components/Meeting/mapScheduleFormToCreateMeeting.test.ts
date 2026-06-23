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

import {MeetingRecurrenceFrequency} from '@wireapp/api-client/lib/meetings/meetingRecurrence';
import {maybe} from 'true-myth';
import {unwrap, unwrapErr} from 'true-myth/test-support';

import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';

import {mapScheduleFormToCreateMeeting} from './mapScheduleFormToCreateMeeting';
import type {ScheduleMeetingFormState} from './ScheduleMeetingModal/scheduleMeetingTypes';

const createUser = (id: string, email?: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(`User ${id}`);
  if (email !== undefined) {
    user.email(email);
  }
  return user;
};

const baseFormState = (): ScheduleMeetingFormState => ({
  title: 'Weekly sync',
  start: maybe.just(new Date('2026-06-15T10:00:00.000Z')),
  end: maybe.just(new Date('2026-06-15T11:00:00.000Z')),
  recurrence: 'weekly',
  selectedUsers: [],
  participantsFilter: '',
});

describe('mapScheduleFormToCreateMeeting', () => {
  it('maps title, times, recurrence, and invited emails', () => {
    const result = mapScheduleFormToCreateMeeting({
      ...baseFormState(),
      selectedUsers: [createUser('1', 'alice@wire.com'), createUser('2', 'bob@wire.com')],
    });

    expect(result.isOk).toBe(true);
    expect(unwrap(result)).toEqual({
      title: 'Weekly sync',
      start_time: '2026-06-15T10:00:00.000Z',
      end_time: '2026-06-15T11:00:00.000Z',
      recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY},
      invited_emails: ['alice@wire.com', 'bob@wire.com'],
    });
  });

  it('omits invited_emails when no participants are selected', () => {
    const result = mapScheduleFormToCreateMeeting(baseFormState());

    expect(result.isOk).toBe(true);
    expect(unwrap(result).invited_emails).toBeUndefined();
  });

  it('returns participantMissingEmail when a selected user has no email', () => {
    const result = mapScheduleFormToCreateMeeting({
      ...baseFormState(),
      selectedUsers: [createUser('1', 'alice@wire.com'), createUser('2')],
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe('participantMissingEmail');
  });

  it('returns missingTimes when start or end is missing', () => {
    const result = mapScheduleFormToCreateMeeting({
      ...baseFormState(),
      start: maybe.nothing(),
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe('missingTimes');
  });
});
