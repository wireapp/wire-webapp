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
import {unwrap, unwrapErr} from 'Util/test/resultTestSupport';

import {scheduleFormErrors} from '../ScheduleFormErrors';

import {requireScheduleMeetingTimes} from './requireScheduleMeetingTimes';
import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';

const baseFormState = (): ScheduleMeetingFormState => ({
  title: 'Weekly sync',
  start: maybe.just(new Date('2026-06-15T10:00:00.000Z')),
  end: maybe.just(new Date('2026-06-15T11:00:00.000Z')),
  recurrence: 'weekly',
  selectedUsers: [],
  participantsFilter: '',
});

describe('requireScheduleMeetingTimes', () => {
  it('returns start and end when both are present', () => {
    const start = new Date('2026-06-15T10:00:00.000Z');
    const end = new Date('2026-06-15T11:00:00.000Z');
    const result = requireScheduleMeetingTimes({
      ...baseFormState(),
      start: maybe.just(start),
      end: maybe.just(end),
    });

    expect(result.isOk).toBe(true);
    expect(unwrap(result)).toEqual({start, end});
  });

  it('returns missingTimes when start is missing', () => {
    const result = requireScheduleMeetingTimes({
      ...baseFormState(),
      start: maybe.nothing(),
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(scheduleFormErrors.missingTimes);
  });

  it('returns missingTimes when end is missing', () => {
    const result = requireScheduleMeetingTimes({
      ...baseFormState(),
      end: maybe.nothing(),
    });

    expect(result.isErr).toBe(true);
    expect(unwrapErr(result)).toBe(scheduleFormErrors.missingTimes);
  });
});
