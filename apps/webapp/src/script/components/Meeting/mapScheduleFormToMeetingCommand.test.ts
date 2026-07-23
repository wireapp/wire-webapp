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

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {maybe} from 'true-myth';

import {User} from 'Repositories/entity/User';
import {translateForTest} from 'Util/test/translateForTest';
import {unwrap, unwrapErr} from 'Util/test/resultTestSupport';

import {mapScheduleFormToMeetingCommand} from './mapScheduleFormToMeetingCommand';
import type {ScheduleMeetingFormState} from './ScheduleMeetingModal/scheduleMeetingTypes';

const fixedNow = new Date('2026-06-23T14:30:00.000Z');
const futureStartDate = new Date('2026-06-23T16:00:00.000Z');
const futureEndDate = new Date('2026-06-23T17:00:00.000Z');
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
  participantsFilter: 'alice',
});

describe('mapScheduleFormToMeetingCommand', () => {
  it('maps validated form state to a meeting command', () => {
    const alice = createUser('1');
    const bob = createUser('2');
    const result = mapScheduleFormToMeetingCommand(
      {
        ...baseFormState(),
        selectedUsers: [alice, bob],
      },
      wallClock,
    );

    expect(result.isOk).toBe(true);
    expect(unwrap(result)).toEqual({
      title: 'Weekly sync',
      start: futureStartDate,
      end: futureEndDate,
      recurrence: 'weekly',
      selectedUsers: [alice, bob],
    });
  });

  it('returns form errors when start or end is missing', () => {
    const result = mapScheduleFormToMeetingCommand(
      {
        ...baseFormState(),
        start: maybe.nothing(),
      },
      wallClock,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toEqual({
      title: undefined,
      missingTimes: 'meetings.scheduleModal.error.missingTimes',
      startInPast: undefined,
      endInPast: undefined,
      endBeforeStart: undefined,
    });
  });
});
