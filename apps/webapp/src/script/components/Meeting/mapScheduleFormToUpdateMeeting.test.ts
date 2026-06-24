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
import {createDeterministicWallClock} from 'src/script/clock/deterministicWallClock';
import {unwrap, unwrapErr} from 'Util/test/resultTestSupport';

import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';

import {computeInvitationDiff, mapScheduleFormToUpdateMeeting} from './mapScheduleFormToUpdateMeeting';
import type {ScheduleMeetingFormState} from './ScheduleMeetingModal/scheduleMeetingTypes';

const fixedNow = new Date('2026-06-23T14:30:00.000Z');
const futureStartDate = new Date('2026-06-23T16:00:00.000Z');
const futureEndDate = new Date('2026-06-23T17:00:00.000Z');
const futureStartIso = futureStartDate.toISOString();
const futureEndIso = futureEndDate.toISOString();

const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: fixedNow.getTime()});

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
  start: maybe.just(futureStartDate),
  end: maybe.just(futureEndDate),
  recurrence: 'weekly',
  selectedUsers: [],
  participantsFilter: '',
});

describe('computeInvitationDiff', () => {
  it('computes added and removed emails case-insensitively', () => {
    expect(computeInvitationDiff(['alice@wire.com', 'bob@wire.com'], ['Alice@wire.com', 'charlie@wire.com'])).toEqual({
      addedEmails: ['charlie@wire.com'],
      removedEmails: ['bob@wire.com'],
    });
  });
});

describe('mapScheduleFormToUpdateMeeting', () => {
  it('maps title, times, recurrence, and invitation diff', () => {
    const result = mapScheduleFormToUpdateMeeting(
      {
        ...baseFormState(),
        selectedUsers: [createUser('1', 'alice@wire.com'), createUser('3', 'charlie@wire.com')],
      },
      ['alice@wire.com', 'bob@wire.com'],
      wallClock,
    );

    expect(result.isOk).toBe(true);
    expect(unwrap(result).payload).toEqual({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
      recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY},
    });
    expect(unwrap(result).addedEmails).toEqual(['charlie@wire.com']);
    expect(unwrap(result).removedEmails).toEqual(['bob@wire.com']);
  });

  it('returns participantMissingEmail when a selected user has no email', () => {
    const result = mapScheduleFormToUpdateMeeting(
      {
        ...baseFormState(),
        selectedUsers: [createUser('1', 'alice@wire.com'), createUser('2')],
      },
      ['alice@wire.com'],
      wallClock,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe('participantMissingEmail');
  });

  it('returns missingTimes when start or end is missing', () => {
    const result = mapScheduleFormToUpdateMeeting(
      {
        ...baseFormState(),
        end: maybe.nothing(),
      },
      ['alice@wire.com'],
      wallClock,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe('missingTimes');
  });

  it('clears recurrence when changed to doesNotRepeat', () => {
    const result = mapScheduleFormToUpdateMeeting(
      {
        ...baseFormState(),
        recurrence: 'doesNotRepeat',
      },
      [],
      wallClock,
    );

    expect(result.isOk).toBe(true);
    expect(unwrap(result).payload).toEqual({
      title: 'Weekly sync',
      start_time: futureStartIso,
      end_time: futureEndIso,
      recurrence: null,
    });
  });
});
