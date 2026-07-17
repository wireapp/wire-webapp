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
  capEndForStart,
  getDefaultMeetingEndDateTime,
  getDefaultScheduleMeetingStartDateTime,
  getMeetNowMeetingTimes,
  getNextHalfHourDateTime,
  resolveEndChange,
  resolveStartChange,
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

  it('caps end times at midnight for late starts', () => {
    const start = new Date(2026, 6, 13, 23, 15, 0, 0);
    const end = new Date(2026, 6, 14, 0, 0, 0, 0);

    expect(capEndForStart(start, end)).toEqual(new Date(2026, 6, 14, 0, 0, 0, 0));
  });

  it('shifts the end forward when the start is moved past the current end', () => {
    const previousStart = new Date(2026, 6, 13, 13, 0, 0, 0);
    const previousEnd = new Date(2026, 6, 13, 14, 0, 0, 0);
    const nextStart = new Date(2026, 6, 13, 15, 0, 0, 0);

    expect(resolveStartChange(previousStart, previousEnd, nextStart)).toEqual({
      start: nextStart,
      end: new Date(2026, 6, 13, 16, 0, 0, 0),
    });
  });

  it('keeps the end unchanged when the start is moved earlier', () => {
    const previousStart = new Date(2026, 6, 13, 13, 0, 0, 0);
    const previousEnd = new Date(2026, 6, 13, 14, 0, 0, 0);
    const nextStart = new Date(2026, 6, 13, 12, 0, 0, 0);

    expect(resolveStartChange(previousStart, previousEnd, nextStart)).toEqual({
      start: nextStart,
      end: previousEnd,
    });
  });

  it('shifts the start backward when the end is moved before the current start', () => {
    const previousStart = new Date(2026, 6, 13, 13, 0, 0, 0);
    const previousEnd = new Date(2026, 6, 13, 14, 0, 0, 0);
    const nextEnd = new Date(2026, 6, 13, 12, 0, 0, 0);

    expect(resolveEndChange(previousStart, previousEnd, nextEnd)).toEqual({
      start: new Date(2026, 6, 13, 11, 0, 0, 0),
      end: nextEnd,
    });
  });

  it('sets the end to midnight when the start is moved to 11:45 PM', () => {
    const previousStart = new Date(2026, 6, 13, 22, 45, 0, 0);
    const previousEnd = new Date(2026, 6, 13, 23, 45, 0, 0);
    const nextStart = new Date(2026, 6, 13, 23, 45, 0, 0);

    expect(resolveStartChange(previousStart, previousEnd, nextStart)).toEqual({
      start: nextStart,
      end: new Date(2026, 6, 14, 0, 0, 0, 0),
    });
  });

  it('derives defaults from the wall clock', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: new Date(2026, 6, 13, 16, 47, 0, 0).getTime(),
    });

    expect(getDefaultScheduleMeetingStartDateTime(wallClock)).toEqual(new Date(2026, 6, 13, 17, 0, 0, 0));
  });

  it('uses the current time as the meet-now start time', () => {
    const now = new Date(2026, 6, 13, 16, 47, 0, 0);
    const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: now.getTime()});

    expect(getMeetNowMeetingTimes(wallClock)).toEqual({
      start: now,
      end: new Date(2026, 6, 13, 17, 47, 0, 0),
    });
  });

  it('caps meet-now end time at midnight for late starts', () => {
    const now = new Date(2026, 6, 13, 23, 45, 0, 0);
    const wallClock = createDeterministicWallClock({initialCurrentTimestampInMilliseconds: now.getTime()});

    expect(getMeetNowMeetingTimes(wallClock)).toEqual({
      start: now,
      end: new Date(2026, 6, 14, 0, 0, 0, 0),
    });
  });
});
