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
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {unwrap, unwrapErr} from 'Util/test/resultTestSupport';

import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';

import {mapScheduleFormToCreateMeeting} from './mapScheduleFormToCreateMeeting';
import type {ScheduleMeetingFormState} from './ScheduleMeetingModal/scheduleMeetingTypes';

const fixedNow = new Date('2026-06-23T14:30:00.000Z');
const futureStartDate = new Date('2026-06-23T16:00:00.000Z');
const futureEndDate = new Date('2026-06-23T17:00:00.000Z');
const futureStartIso = futureStartDate.toISOString();
const futureEndIso = futureEndDate.toISOString();

const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: fixedNow.getTime()});

const createUser = (id: string) => {
  const user = new User(id, 'example.com', translateForTest);
  user.name(`User ${id}`);
  return user;
};

const baseFormState = (): ScheduleMeetingFormState => ({
  title: 'Weekly sync',
  start: maybe.just(futureStartDate),
  end: maybe.just(futureEndDate),
  recurrence: 'weekly',
  selectedUsers: [],
  participantsFilter: '',
});

describe('mapScheduleFormToCreateMeeting', () => {
  it('maps title, times, and recurrence metadata only', () => {
    const result = mapScheduleFormToCreateMeeting(
      {
        ...baseFormState(),
        selectedUsers: [createUser('1'), createUser('2')],
      },
      wallClock,
    );

    expect(result.isOk).toBe(true);
    expect(unwrap(result)).toEqual({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
      recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY},
    });
  });

  it('does not include invited_emails regardless of selected participants', () => {
    const result = mapScheduleFormToCreateMeeting(
      {
        ...baseFormState(),
        selectedUsers: [createUser('1')],
      },
      wallClock,
    );

    expect(result.isOk).toBe(true);
    expect(unwrap(result).invited_emails).toBeUndefined();
  });

  it('returns missingTimes when start or end is missing', () => {
    const result = mapScheduleFormToCreateMeeting(
      {
        ...baseFormState(),
        start: maybe.nothing(),
      },
      wallClock,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe('missingTimes');
  });
});
