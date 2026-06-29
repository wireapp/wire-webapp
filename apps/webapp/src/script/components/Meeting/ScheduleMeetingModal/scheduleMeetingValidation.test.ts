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
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';

import {hasScheduleMeetingFormErrors, validateScheduleMeetingForm} from './scheduleMeetingValidation';

describe('scheduleMeetingValidation', () => {
  const fixedNow = new Date('2026-06-23T14:30:00.000Z');
  const futureStartDate = new Date('2026-06-23T16:00:00.000Z');
  const futureEndDate = new Date('2026-06-23T17:00:00.000Z');
  const pastStartDate = new Date('2026-06-23T10:00:00.000Z');

  const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: fixedNow.getTime()});
  const futureStart = maybe.just(futureStartDate);
  const futureEnd = maybe.just(futureEndDate);

  it('returns titleRequired when title is empty', () => {
    const errors = validateScheduleMeetingForm({title: '   ', start: futureStart, end: futureEnd, wallClock});

    expect(errors.title).toBe('meetings.scheduleModal.error.titleRequired');
    expect(errors.startInPast).toBeUndefined();
    expect(errors.endBeforeStart).toBeUndefined();
  });

  it('returns startInPast when start is not in the future', () => {
    const errors = validateScheduleMeetingForm({
      title: 'Weekly sync',
      start: maybe.just(pastStartDate),
      end: futureEnd,
      wallClock,
    });

    expect(errors.startInPast).toBe('meetings.schedule.errors.startInPast');
  });

  it('returns endInPast when end is not in the future', () => {
    const errors = validateScheduleMeetingForm({
      title: 'Weekly sync',
      start: futureStart,
      end: maybe.just(pastStartDate),
      wallClock,
    });

    expect(errors.endInPast).toBe('meetings.schedule.errors.endInPast');
    expect(errors.endBeforeStart).toBeUndefined();
  });

  it('returns startInPast for a past time on today while allowing today as a date', () => {
    const pastTimeToday = new Date(wallClock.currentDate);
    pastTimeToday.setHours(pastTimeToday.getHours() - 1);

    const errors = validateScheduleMeetingForm({
      title: 'Weekly sync',
      start: maybe.just(pastTimeToday),
      end: futureEnd,
      wallClock,
    });

    expect(errors.startInPast).toBe('meetings.schedule.errors.startInPast');
  });

  it('returns endBeforeStart when end is not after start', () => {
    const errors = validateScheduleMeetingForm({
      title: 'Weekly sync',
      start: futureStart,
      end: maybe.just(futureStartDate),
      wallClock,
    });

    expect(errors.endBeforeStart).toBe('meetings.scheduleModal.error.endBeforeStart');
  });

  it('returns no errors for valid input', () => {
    const errors = validateScheduleMeetingForm({title: 'Weekly sync', start: futureStart, end: futureEnd, wallClock});

    expect(hasScheduleMeetingFormErrors(errors)).toBe(false);
  });

  it('skips end validation when start or end is missing', () => {
    const errors = validateScheduleMeetingForm({
      title: 'Weekly sync',
      start: maybe.nothing(),
      end: futureEnd,
      wallClock,
    });

    expect(errors.endBeforeStart).toBeUndefined();
  });
});
