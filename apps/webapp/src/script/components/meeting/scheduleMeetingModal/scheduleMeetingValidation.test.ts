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

import {
  MEETING_TITLE_MAX_LENGTH,
  meetingTitleErrorKeys,
} from 'Components/meeting/shared/validation/meetingTitleValidation';

import {getScheduleMeetingFormErrors, hasScheduleMeetingFormErrors} from './scheduleMeetingValidation';

describe('scheduleMeetingValidation', () => {
  const fixedNow = new Date('2026-06-23T14:30:00.000Z');
  const futureStartDate = new Date('2026-06-23T16:00:00.000Z');
  const futureEndDate = new Date('2026-06-23T17:00:00.000Z');
  const pastStartDate = new Date('2026-06-23T10:00:00.000Z');

  const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: fixedNow.getTime()});
  const futureStart = maybe.just(futureStartDate);
  const futureEnd = maybe.just(futureEndDate);
  const createMode = {mode: 'create' as const};
  const editMode = {mode: 'edit' as const};

  it('returns titleRequired when title is empty', () => {
    const errors = getScheduleMeetingFormErrors({
      title: '   ',
      start: futureStart,
      end: futureEnd,
      wallClock,
      ...createMode,
    });

    expect(errors.title).toBe(meetingTitleErrorKeys.required);
    expect(errors.startInPast).toBeUndefined();
    expect(errors.endBeforeStart).toBeUndefined();
  });

  it('returns startInPast when start is not in the future', () => {
    const errors = getScheduleMeetingFormErrors({
      title: 'Weekly sync',
      start: maybe.just(pastStartDate),
      end: futureEnd,
      wallClock,
      ...createMode,
    });

    expect(errors.startInPast).toBe('meetings.schedule.errors.startInPast');
  });

  it('returns endInPast when end is not in the future', () => {
    const errors = getScheduleMeetingFormErrors({
      title: 'Weekly sync',
      start: futureStart,
      end: maybe.just(pastStartDate),
      wallClock,
      ...createMode,
    });

    expect(errors.endInPast).toBe('meetings.schedule.errors.endInPast');
    expect(errors.endBeforeStart).toBeUndefined();
  });

  it('returns startInPast for a past time on today while allowing today as a date', () => {
    const pastTimeToday = new Date(wallClock.currentDate);
    pastTimeToday.setHours(pastTimeToday.getHours() - 1);

    const errors = getScheduleMeetingFormErrors({
      title: 'Weekly sync',
      start: maybe.just(pastTimeToday),
      end: futureEnd,
      wallClock,
      ...createMode,
    });

    expect(errors.startInPast).toBe('meetings.schedule.errors.startInPast');
  });

  it('returns endBeforeStart when end is not after start', () => {
    const errors = getScheduleMeetingFormErrors({
      title: 'Weekly sync',
      start: futureStart,
      end: maybe.just(futureStartDate),
      wallClock,
      ...createMode,
    });

    expect(errors.endBeforeStart).toBe('meetings.scheduleModal.error.endBeforeStart');
  });

  it('returns titleTooLong when the title exceeds the maximum length', () => {
    const errors = getScheduleMeetingFormErrors({
      title: 'a'.repeat(MEETING_TITLE_MAX_LENGTH + 1),
      start: futureStart,
      end: futureEnd,
      wallClock,
      ...createMode,
    });

    expect(errors.title).toBe(meetingTitleErrorKeys.tooLong);
    expect(hasScheduleMeetingFormErrors(errors)).toBe(true);
  });

  it('returns no errors for valid input', () => {
    const errors = getScheduleMeetingFormErrors({
      title: 'Weekly sync',
      start: futureStart,
      end: futureEnd,
      wallClock,
      ...createMode,
    });

    expect(hasScheduleMeetingFormErrors(errors)).toBe(false);
  });

  it('allows past start and end times in edit mode', () => {
    const pastEndDate = new Date('2026-06-23T11:00:00.000Z');
    const errors = getScheduleMeetingFormErrors({
      title: 'Weekly sync',
      start: maybe.just(pastStartDate),
      end: maybe.just(pastEndDate),
      wallClock,
      ...editMode,
    });

    expect(errors.startInPast).toBeUndefined();
    expect(errors.endInPast).toBeUndefined();
  });

  it('returns missingTimes when start or end is missing', () => {
    const errors = getScheduleMeetingFormErrors({
      title: 'Weekly sync',
      start: maybe.nothing(),
      end: futureEnd,
      wallClock,
      ...createMode,
    });

    expect(errors.missingTimes).toBe('meetings.scheduleModal.error.missingTimes');
    expect(errors.endBeforeStart).toBeUndefined();
    expect(hasScheduleMeetingFormErrors(errors)).toBe(true);
  });
});
