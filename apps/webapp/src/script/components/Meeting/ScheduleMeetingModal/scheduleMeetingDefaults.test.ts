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

import {
  alignEndDateToStart,
  clampMeetingEndDateTime,
  getDefaultMeetingEndDateTime,
  getDefaultScheduleMeetingStartDateTime,
  getNextHalfHourDateTime,
} from './scheduleMeetingDefaults';

describe('scheduleMeetingDefaults', () => {
  it('rounds the start time up to the next half hour', () => {
    const now = new Date(2026, 6, 13, 16, 47, 0, 0);

    expect(getNextHalfHourDateTime(now)).toEqual(new Date(2026, 6, 13, 17, 0, 0, 0));
  });

  it('keeps an exact half-hour start time unchanged', () => {
    const now = new Date(2026, 6, 13, 16, 0, 0, 0);

    expect(getNextHalfHourDateTime(now)).toEqual(new Date(2026, 6, 13, 16, 0, 0, 0));
  });

  it('defaults the end time to one hour after the start time', () => {
    const start = new Date(2026, 6, 13, 17, 0, 0, 0);

    expect(getDefaultMeetingEndDateTime(start)).toEqual(new Date(2026, 6, 13, 18, 0, 0, 0));
  });

  it('caps the end time at midnight when the start is at 11:45 PM', () => {
    const start = new Date(2026, 6, 13, 23, 45, 0, 0);

    expect(getDefaultMeetingEndDateTime(start)).toEqual(new Date(2026, 6, 14, 0, 0, 0, 0));
  });

  it('caps the end time at midnight when one hour would cross into the next day', () => {
    const start = new Date(2026, 6, 13, 23, 0, 0, 0);

    expect(getDefaultMeetingEndDateTime(start)).toEqual(new Date(2026, 6, 14, 0, 0, 0, 0));
  });

  it('preserves midnight when aligning the end date to the start date', () => {
    const start = new Date(2026, 6, 13, 23, 15, 0, 0);
    const end = new Date(2026, 6, 14, 0, 0, 0, 0);

    expect(alignEndDateToStart(start, end)).toEqual(new Date(2026, 6, 14, 0, 0, 0, 0));
  });

  it('sets the end to midnight when the start is moved to 11:45 PM', () => {
    const start = new Date(2026, 6, 13, 23, 45, 0, 0);
    const end = new Date(2026, 6, 13, 23, 45, 0, 0);

    expect(clampMeetingEndDateTime(start, end)).toEqual(new Date(2026, 6, 14, 0, 0, 0, 0));
  });

  it('derives defaults from the wall clock', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: new Date(2026, 6, 13, 16, 47, 0, 0).getTime(),
    });

    expect(getDefaultScheduleMeetingStartDateTime(wallClock)).toEqual(new Date(2026, 6, 13, 17, 0, 0, 0));
  });
});
