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

import {maybe} from 'true-myth';
import {createDeterministicWallClock} from 'src/script/clock/deterministicwallclock';
import {unwrap, unwrapErr} from 'Util/test/resulttestsupport';

import {scheduleFormErrors} from '../scheduleformerrors';

import {requireScheduleMeetingTimes} from './requireschedulemeetingtimes';
import type {ScheduleMeetingFormState} from './schedulemeetingtypes';

const fixedNow = new Date('2026-06-23T14:30:00.000Z');
const futureStartDate = new Date('2026-06-23T16:00:00.000Z');
const futureEndDate = new Date('2026-06-23T17:00:00.000Z');
const pastStartDate = new Date('2026-06-23T10:00:00.000Z');

const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: fixedNow.getTime()});

const baseFormState = (): ScheduleMeetingFormState => ({
  title: 'Weekly sync',
  start: maybe.just(futureStartDate),
  end: maybe.just(futureEndDate),
  recurrence: 'weekly',
  selectedUsers: [],
  participantsFilter: '',
});

describe('requireScheduleMeetingTimes', () => {
  it('returns start and end when both are present', () => {
    const result = requireScheduleMeetingTimes(
      {
        ...baseFormState(),
        start: maybe.just(futureStartDate),
        end: maybe.just(futureEndDate),
      },
      wallClock,
    );

    expect(result.isOk).toBe(true);
    expect(unwrap(result)).toEqual({start: futureStartDate, end: futureEndDate});
  });

  it('returns missingTimes when start is missing', () => {
    const result = requireScheduleMeetingTimes(
      {
        ...baseFormState(),
        start: maybe.nothing(),
      },
      wallClock,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(scheduleFormErrors.missingTimes);
  });

  it('returns missingTimes when end is missing', () => {
    const result = requireScheduleMeetingTimes(
      {
        ...baseFormState(),
        end: maybe.nothing(),
      },
      wallClock,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(scheduleFormErrors.missingTimes);
  });

  it('returns startInPast when start is not in the future', () => {
    const result = requireScheduleMeetingTimes(
      {
        ...baseFormState(),
        start: maybe.just(pastStartDate),
      },
      wallClock,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(scheduleFormErrors.startInPast);
  });

  it('returns endInPast when end is not in the future', () => {
    const result = requireScheduleMeetingTimes(
      {
        ...baseFormState(),
        start: maybe.just(futureStartDate),
        end: maybe.just(pastStartDate),
      },
      wallClock,
    );

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(scheduleFormErrors.endInPast);
  });
});
