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

const isAfter11Pm = (date: Date): boolean => date.getHours() > 23 || (date.getHours() === 23 && date.getMinutes() > 0);

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

export const alignEndDateToStart = (start: Date, end: Date): Date => {
  const midnight = getMidnightAfter(start);

  if (end.getTime() >= midnight.getTime()) {
    return midnight;
  }

  const aligned = new Date(end);
  aligned.setFullYear(start.getFullYear(), start.getMonth(), start.getDate());

  if (aligned.getTime() <= start.getTime()) {
    return getDefaultMeetingEndDateTime(start);
  }

  return aligned;
};

export const clampMeetingEndDateTime = (start: Date, end: Date): Date => {
  const alignedEnd = alignEndDateToStart(start, end);

  if (alignedEnd.getTime() <= start.getTime()) {
    return getDefaultMeetingEndDateTime(start);
  }

  return alignedEnd;
};

export const getDefaultScheduleMeetingStartDateTime = (wallClock: WallClock): Date =>
  getNextHalfHourDateTime(wallClock.currentDate);
