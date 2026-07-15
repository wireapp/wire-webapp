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

import type {WallClock} from '@enormora/wall-clock/wall-clock';

const HALF_HOUR_MINUTES = 30;
const MEETING_DURATION_MILLISECONDS = 60 * 60 * 1000;

const isSameCalendarDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const isAfter11Pm = (date: Date): boolean => date.getHours() === 23 && date.getMinutes() > 0;

export const getNextHalfHourDateTime = (now: Date): Date => {
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const ceiledMinutes = Math.ceil(totalMinutes / HALF_HOUR_MINUTES) * HALF_HOUR_MINUTES;
  const result = new Date(now);

  result.setSeconds(0, 0);

  if (ceiledMinutes >= 24 * 60) {
    result.setDate(result.getDate() + 1);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  result.setHours(Math.floor(ceiledMinutes / 60), ceiledMinutes % 60, 0, 0);
  return result;
};

export const getMidnightAfter = (date: Date): Date => {
  const midnight = new Date(date);
  midnight.setHours(24, 0, 0, 0);
  return midnight;
};

export const getDefaultMeetingEndDateTime = (start: Date): Date => {
  if (isAfter11Pm(start)) {
    return getMidnightAfter(start);
  }

  const end = new Date(start.getTime() + MEETING_DURATION_MILLISECONDS);

  if (!isSameCalendarDay(start, end)) {
    return getMidnightAfter(start);
  }

  return end;
};

export const alignEndTimeToStartDate = (start: Date, end: Date): Date => {
  const aligned = new Date(end);
  aligned.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());
  return aligned;
};

export const getMeetingDurationMilliseconds = (start: Date, end: Date): number => {
  const duration = end.getTime() - start.getTime();
  return duration > 0 ? duration : MEETING_DURATION_MILLISECONDS;
};

export const capEndForStart = (start: Date, end: Date): Date => {
  const midnight = getMidnightAfter(start);
  return end.getTime() > midnight.getTime() ? midnight : end;
};

export const resolveStartChange = (
  previousStart: Date,
  previousEnd: Date,
  nextStart: Date,
): {start: Date; end: Date} => {
  const alignedPreviousEnd = alignEndTimeToStartDate(nextStart, previousEnd);

  if (nextStart.getTime() < alignedPreviousEnd.getTime()) {
    return {start: nextStart, end: capEndForStart(nextStart, alignedPreviousEnd)};
  }

  const duration = getMeetingDurationMilliseconds(previousStart, previousEnd);
  const nextEnd = capEndForStart(nextStart, new Date(nextStart.getTime() + duration));

  return {start: nextStart, end: nextEnd};
};

export const resolveEndChange = (previousStart: Date, previousEnd: Date, nextEnd: Date): {start: Date; end: Date} => {
  const alignedNextEnd = alignEndTimeToStartDate(previousStart, nextEnd);

  if (alignedNextEnd.getTime() > previousStart.getTime()) {
    return {start: previousStart, end: capEndForStart(previousStart, alignedNextEnd)};
  }

  const duration = getMeetingDurationMilliseconds(previousStart, previousEnd);
  const nextStart = new Date(alignedNextEnd.getTime() - duration);

  return {start: nextStart, end: capEndForStart(nextStart, alignedNextEnd)};
};

export const getDefaultScheduleMeetingStartDateTime = (wallClock: WallClock): Date =>
  getNextHalfHourDateTime(wallClock.currentDate);
