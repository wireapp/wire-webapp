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

import type {ScheduleMeetingRecurrenceOption} from 'Components/meeting/scheduleMeetingModal/scheduleMeetingTypes';
import type {MeetingInstance} from 'Components/meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {getMeetingTemporalStatusAt, MeetingTemporalStatuses} from 'Components/meeting/utils/meetingStatusUtil';

const daysPerWeek = 7;
const daysPerBiweeklyPeriod = 14;
const daysPerFourWeeksPeriod = 28;

const createMeetingInstance = (meetingSeries: MeetingSeries, start: Date): MeetingInstance => ({
  meetingSeries,
  start,
  end: new Date(start.getTime() + meetingSeries.duration_ms),
});

const isMeetingInstanceStartInRange = (meetingInstance: MeetingInstance, from: Date, to: Date): boolean =>
  meetingInstance.start.getTime() >= from.getTime() && meetingInstance.start.getTime() < to.getTime();

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
    case 'everyFourWeeks':
      return addDays(start, daysPerFourWeeksPeriod);
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

/**
 * Instance whose start/end should anchor a recurring edit PUT.
 *
 * When today still has an upcoming or ongoing occurrence, use that slot so
 * editing a future list row does not jump the series start to the next day
 * (WPB-27894). Otherwise fall back to the next instance on or after `now`.
 */
export const getEditAnchorMeetingInstance = (meetingSeries: MeetingSeries, now: Date): MeetingInstance => {
  if (meetingSeries.recurrence === 'doesNotRepeat') {
    return createMeetingInstance(meetingSeries, new Date(meetingSeries.series_start_date));
  }

  const startOfToday = startOfDay(now);
  const startOfTomorrow = addDays(startOfToday, 1);
  const todaysNotYetEnded = getMeetingInstancesInRange(meetingSeries, startOfToday, startOfTomorrow).find(
    meetingInstance => meetingInstance.end.getTime() > now.getTime(),
  );

  if (todaysNotYetEnded !== undefined) {
    return todaysNotYetEnded;
  }

  const nextInstance = getFirstMeetingInstanceOnOrAfter(meetingSeries, now);

  if (nextInstance !== undefined) {
    return nextInstance;
  }

  const anchor = new Date(meetingSeries.series_start_date);
  const start = advanceToFirstInstanceOnOrAfter(anchor, now, meetingSeries.recurrence);

  return createMeetingInstance(meetingSeries, start);
};

export const getFirstMeetingInstanceOnOrAfter = (
  meetingSeries: MeetingSeries,
  from: Date,
): MeetingInstance | undefined => {
  const anchor = new Date(meetingSeries.series_start_date);

  if (meetingSeries.recurrence === 'doesNotRepeat') {
    return anchor.getTime() >= from.getTime() ? createMeetingInstance(meetingSeries, anchor) : undefined;
  }

  const start = advanceToFirstInstanceOnOrAfter(anchor, from, meetingSeries.recurrence);

  return isAfterRecurrenceUntil(start, meetingSeries.recurrence_until)
    ? undefined
    : createMeetingInstance(meetingSeries, start);
};

export const getNextMeetingInstance = (meetingInstance: MeetingInstance): MeetingInstance | undefined => {
  const {meetingSeries} = meetingInstance;

  if (meetingSeries.recurrence === 'doesNotRepeat') {
    return undefined;
  }

  const start = advanceInstanceStart(meetingInstance.start, meetingSeries.recurrence);

  return isAfterRecurrenceUntil(start, meetingSeries.recurrence_until)
    ? undefined
    : createMeetingInstance(meetingSeries, start);
};

const getRecurringMeetingInstancesInRange = (meetingSeries: MeetingSeries, from: Date, to: Date): MeetingInstance[] => {
  const anchor = new Date(meetingSeries.series_start_date);
  const meetingInstances: MeetingInstance[] = [];
  let current = advanceToFirstInstanceOnOrAfter(anchor, from, meetingSeries.recurrence);

  while (current.getTime() < to.getTime()) {
    if (isAfterRecurrenceUntil(current, meetingSeries.recurrence_until)) {
      break;
    }

    const meetingInstance = createMeetingInstance(meetingSeries, current);

    if (isMeetingInstanceStartInRange(meetingInstance, from, to)) {
      meetingInstances.push(meetingInstance);
    }

    current = advanceInstanceStart(current, meetingSeries.recurrence);
  }

  return meetingInstances;
};

/**
 * Expands one meeting series into concrete instances whose start falls in `[from, to)`.
 *
 * Uses the series anchor (`series_start_date`) and recurrence rule. For repeating series, skips past
 * instances before `from`, then emits each step until `to`. Non-repeating series yield zero or one row.
 *
 * @param meetingSeries - A single meeting definition from the store (one backend record).
 * @param from - Inclusive start of the visible window (usually start of today).
 * @param to - Exclusive end of the visible window.
 * @returns meeting instances for this series only, in chronological order.
 */
export const getMeetingInstancesInRange = (meetingSeries: MeetingSeries, from: Date, to: Date): MeetingInstance[] => {
  if (meetingSeries.recurrence === 'doesNotRepeat') {
    const meetingInstance = createMeetingInstance(meetingSeries, new Date(meetingSeries.series_start_date));

    return isMeetingInstanceStartInRange(meetingInstance, from, to) ? [meetingInstance] : [];
  }

  return getRecurringMeetingInstancesInRange(meetingSeries, from, to);
};

/**
 * Finds the concrete instance that is ongoing at `now`, if any.
 *
 * The search starts one meeting duration before `now`, because an ongoing
 * instance may have started before the current time. The upper bound is just
 * after `now` so an instance starting exactly at `now` is included.
 */
export const getMeetingInstanceAt = (meetingSeries: MeetingSeries, now: Date): MeetingInstance | undefined => {
  const from = new Date(now.getTime() - meetingSeries.duration_ms);
  const to = new Date(now.getTime() + 1);

  return getMeetingInstancesInRange(meetingSeries, from, to).find(
    meetingInstance =>
      getMeetingTemporalStatusAt(now, meetingInstance.start, meetingInstance.end) === MeetingTemporalStatuses.ON_GOING,
  );
};
