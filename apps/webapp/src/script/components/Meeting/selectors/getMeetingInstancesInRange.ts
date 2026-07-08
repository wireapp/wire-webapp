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

import {addDays, addMonths} from 'date-fns';

import type {ScheduleMeetingRecurrenceOption} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';

const daysPerWeek = 7;
const daysPerBiweeklyPeriod = 14;

const createInstance = (series: MeetingSeries, start: Date): MeetingInstance => ({
  series,
  start,
  end: new Date(start.getTime() + series.duration_ms),
});

const isInstanceInRange = (instance: MeetingInstance, from: Date, to: Date): boolean =>
  instance.end.getTime() >= from.getTime() &&
  instance.start.getTime() >= from.getTime() &&
  instance.start.getTime() < to.getTime();

const isAfterRecurrenceUntil = (start: Date, recurrenceUntil?: string): boolean =>
  recurrenceUntil !== undefined && start.getTime() > Date.parse(recurrenceUntil);

const advanceInstanceStart = (start: Date, recurrence: ScheduleMeetingRecurrenceOption): Date => {
  switch (recurrence) {
    case 'doesNotRepeat':
      return start;
    case 'daily':
      return addDays(start, 1);
    case 'weekly':
      return addDays(start, daysPerWeek);
    case 'everyTwoWeeks':
      return addDays(start, daysPerBiweeklyPeriod);
    case 'monthly':
      return addMonths(start, 1);
  }
};

/**
 * Finds the first instance start on or after `from`, walking forward from the series anchor.
 *
 * Repeating series often have an anchor in the past; the list only needs instances inside the visible window.
 * This advances by whole recurrence steps (one day, week, etc.) until the candidate start is >= `from`.
 */
const advanceToFirstInstanceOnOrAfter = (
  anchor: Date,
  from: Date,
  recurrence: ScheduleMeetingRecurrenceOption,
): Date => {
  let current = anchor;

  // Step by whole recurrence periods (day/week/month), not by milliseconds.
  while (current.getTime() < from.getTime()) {
    current = advanceInstanceStart(current, recurrence);
  }

  return current;
};

const getRecurringInstancesInRange = (series: MeetingSeries, from: Date, to: Date): MeetingInstance[] => {
  const anchor = new Date(series.series_start_date);
  const instances: MeetingInstance[] = [];
  let current = advanceToFirstInstanceOnOrAfter(anchor, from, series.recurrence);

  while (current.getTime() < to.getTime()) {
    if (isAfterRecurrenceUntil(current, series.recurrence_until)) {
      break;
    }

    const instance = createInstance(series, current);

    if (isInstanceInRange(instance, from, to)) {
      instances.push(instance);
    }

    current = advanceInstanceStart(current, series.recurrence);
  }

  return instances;
};

/**
 * Expands one meeting series into concrete instances whose start falls in `[from, to)`.
 *
 * Uses the series anchor (`series_start_date`) and recurrence rule. For repeating series, skips past
 * instances before `from`, then emits each step until `to`. Non-repeating series yield zero or one row.
 *
 * @param series - A single meeting definition from the store (one backend record).
 * @param from - Inclusive start of the visible window (usually start of today).
 * @param to - Exclusive end of the visible window.
 * @returns Instances for this series only, in chronological order.
 */
export const getMeetingInstancesInRange = (series: MeetingSeries, from: Date, to: Date): MeetingInstance[] => {
  if (series.recurrence === 'doesNotRepeat') {
    const instance = createInstance(series, new Date(series.series_start_date));

    return isInstanceInRange(instance, from, to) ? [instance] : [];
  }

  return getRecurringInstancesInRange(series, from, to);
};
