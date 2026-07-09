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

import {addDays, startOfDay} from 'date-fns';

export type VisibleTimeWindowOptions = {
  dayCount: number;
};

export type VisibleTimeWindow = {
  from: Date;
  to: Date;
};

/**
 * Builds the half-open time range `[from, to)` used when expanding meeting series into list instances.
 *
 * `from` is the start of the calendar day containing `now`. `to` is `from + dayCount` days.
 * The UI chooses `dayCount` (e.g. 14 now; larger when infinite scroll widens the window).
 *
 * @param now - Reference time, typically `wallClock.currentDate`.
 * @param options.dayCount - Number of calendar days to include from the start of today.
 * @returns Bounds passed to `getMeetingInstances`.
 */
export const getVisibleTimeWindow = (now: Date, {dayCount}: VisibleTimeWindowOptions): VisibleTimeWindow => {
  const from = startOfDay(now);
  const to = addDays(from, dayCount);

  return {from, to};
};
