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
 */

import {TZDate} from '@date-fns/tz';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

type GeneratedMeetingData = {
  title: string;
  dayOffset: number;
  startHour: number;
  startMinute: number;
  startLabel: string;
  endLabel: string;
  timeRange: string;
  dateLabel: string;
};

type ExpectedMeetingOccurrence = {
  title: string;
  dayHeading: string;
  timeRange: string;
  startMilliseconds: number;
};

type ExpectedMeetingTimelineRow = {
  kind: 'day' | 'meeting';
  dayHeading: string;
  title: string;
};

type OrderedMeetingListData = {
  meetingsToCreate: GeneratedMeetingData[];
  observationTime: Date;
  initialOccurrences: ExpectedMeetingOccurrence[];
  expectedOccurrences: ExpectedMeetingOccurrence[];
  expectedInitialTimeline: ExpectedMeetingTimelineRow[];
  expectedTimeline: ExpectedMeetingTimelineRow[];
};

type MidnightMeetingTimes = {
  dateLabel: string;
  startLabel: string;
  endLabel: string;
  todayHeading: string;
  afterMeetingEnds: Date;
  beforeMidnight: Date;
  midnight: Date;
};

type MeetingDetailsData = {
  dateLabel: string;
  dayHeading: string;
  startLabel: string;
  endLabel: string;
  timeRange: string;
};

export const roundDateDownToFifteenMinutes = (date: Date): Date => {
  const rounded = new Date(date);
  rounded.setMilliseconds(0);
  rounded.setSeconds(0);
  rounded.setMinutes(Math.floor(rounded.getMinutes() / 15) * 15);
  return rounded;
};

export const roundDateUpToFifteenMinutes = (date: Date): Date => {
  const rounded = new Date(date);
  rounded.setMilliseconds(0);
  rounded.setSeconds(0);
  const remainder = rounded.getMinutes() % 15;
  if (remainder !== 0) {
    rounded.setMinutes(rounded.getMinutes() + (15 - remainder));
  }
  return rounded;
};

export const formatMeetingTimeLabel = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: true});
};

export const formatMeetingDateIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const createOrderedMeetingListData = (
  referenceDate: Date,
  timeZone: string,
  occurrenceCount: number,
  baseTitle: string,
): OrderedMeetingListData => {
  // Use tomorrow as the first meeting day.
  const observationTime = new TZDate(referenceDate.getTime(), timeZone);

  observationTime.setDate(observationTime.getDate() + 1);
  observationTime.setHours(8, 0, 0, 0);

  // Deliberate test inputs, rather than manually written time strings.
  const firstStartHour = 9;
  const spacingMinutes = 120;
  const durationMinutes = 60;

  const formatTime = (date: Date, hour: 'numeric' | '2-digit'): string => {
    return date
      .toLocaleTimeString('en-US', {
        timeZone,
        hour,
        minute: '2-digit',
        hour12: true,
      })
      .replace(/[\u00a0\u202f]/g, ' ');
  };

  const formatTimeRange = (start: Date, end: Date): string => {
    const startText = formatTime(start, '2-digit');
    const endText = formatTime(end, '2-digit');

    const startPeriod = startText.match(/(AM|PM)$/)?.[0];
    const endPeriod = endText.match(/(AM|PM)$/)?.[0];

    // The approved format omits the first AM/PM when both are the same.
    const displayedStart = startPeriod === endPeriod ? startText.replace(/ (AM|PM)$/, '') : startText;

    return `${displayedStart} - ${endText}`;
  };

  const createMeeting = (dayOffset: number, timeSlot: number, index: number): GeneratedMeetingData => {
    const start = new TZDate(observationTime.getTime(), timeZone);

    start.setDate(start.getDate() + dayOffset);
    start.setHours(firstStartHour, 0, 0, 0);
    start.setMinutes(start.getMinutes() + timeSlot * spacingMinutes);

    const end = new TZDate(start.getTime(), timeZone);
    end.setMinutes(end.getMinutes() + durationMinutes);

    return {
      title: `${baseTitle} ${index + 1}`,
      dayOffset,
      startHour: start.getHours(),
      startMinute: start.getMinutes(),
      startLabel: formatTime(start, 'numeric'),
      endLabel: formatTime(end, 'numeric'),
      timeRange: formatTimeRange(start, end),
      dateLabel: createMeetingDetailsData(referenceDate, timeZone, 1 + dayOffset).dateLabel,
    };
  };

  // Create the first day's meetings out of chronological order.
  const meetingsToCreate = [
    ...[2, 0, 1].map((timeSlot, index) => {
      return createMeeting(0, timeSlot, index);
    }),

    // Next day has one meeting.
    createMeeting(1, 0, 3),

    // Day offset 2 is deliberately empty.
    createMeeting(3, 0, 4),
  ];

  // Calculate enough weekly occurrences to cross the loading boundary.
  const weeks = Math.ceil(occurrenceCount / meetingsToCreate.length);

  const expectedOccurrences = Array.from({length: weeks}, (_, week) => {
    return meetingsToCreate.map(meeting => {
      const daysAhead = meeting.dayOffset + week * 7;
      const start = new TZDate(observationTime.getTime(), timeZone);

      start.setDate(start.getDate() + daysAhead);
      start.setHours(meeting.startHour, meeting.startMinute, 0, 0);

      return {
        title: meeting.title,
        dayHeading: createMeetingDetailsData(observationTime, timeZone, daysAhead).dayHeading,
        timeRange: meeting.timeRange,
        startMilliseconds: start.getTime(),
      };
    });
  })
    .flat()
    .sort((first, second) => {
      return first.startMilliseconds - second.startMilliseconds;
    })
    .slice(0, occurrenceCount);

  const toTimeline = (occurrences: typeof expectedOccurrences): ExpectedMeetingTimelineRow[] => {
    const rows: Array<{kind: 'day' | 'meeting'; dayHeading: string; title: string}> = [];

    let previousDay = '';

    for (const occurrence of occurrences) {
      if (occurrence.dayHeading !== previousDay) {
        rows.push({
          kind: 'day',
          dayHeading: occurrence.dayHeading,
          title: '',
        });

        previousDay = occurrence.dayHeading;
      }

      rows.push({
        kind: 'meeting',
        dayHeading: occurrence.dayHeading,
        title: occurrence.title,
      });
    }

    return rows;
  };

  const initialOccurrences = expectedOccurrences.slice(0, 5);

  return {
    meetingsToCreate,
    observationTime,
    initialOccurrences,
    expectedOccurrences,
    expectedInitialTimeline: toTimeline(initialOccurrences),
    expectedTimeline: toTimeline(expectedOccurrences),
  };
};

type CreateOngoingMeetingWindowResult = {start: Date; end: Date};
export const createOngoingMeetingWindow = (now = new Date()): CreateOngoingMeetingWindowResult => {
  const start = roundDateDownToFifteenMinutes(new Date(now.getTime() - 30 * 60 * 1000));
  const end = roundDateUpToFifteenMinutes(new Date(now.getTime() + 2 * 60 * 60 * 1000));

  return {start, end};
};

type CreateEndedMeetingWindowResult = {start: Date; end: Date};
export const createEndedMeetingWindow = (now = new Date()): CreateEndedMeetingWindowResult => {
  const end = roundDateDownToFifteenMinutes(new Date(now.getTime() - 15 * 60 * 1000));
  const start = roundDateDownToFifteenMinutes(new Date(end.getTime() - 60 * 60 * 1000));

  return {start, end};
};

export const meetingWindowWithinPastEditPeriod = (start: Date, now = new Date()): boolean => {
  return now.getTime() - start.getTime() <= TWENTY_FOUR_HOURS_MS + FIFTEEN_MINUTES_MS;
};

export const createMidnightMeetingTimes = (referenceDate: Date, timeZone: string): MidnightMeetingTimes => {
  const meetingDay = new TZDate(referenceDate.getTime(), timeZone);

  // Schedule tomorrow to avoid creating a meeting in the past.
  meetingDay.setDate(meetingDay.getDate() + 1);
  meetingDay.setHours(9, 0, 0, 0);

  const atTime = (hours: number, minutes = 0, seconds = 0): Date => {
    const date = new TZDate(meetingDay.getTime(), timeZone);
    date.setHours(hours, minutes, seconds, 0);
    return date;
  };

  const midnight = atTime(0);
  midnight.setDate(midnight.getDate() + 1);

  const dateLabel = meetingDay.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const headingDate = meetingDay.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return {
    dateLabel,
    startLabel: '9:00 AM',
    endLabel: '10:00 AM',
    todayHeading: `Today (${headingDate})`,
    afterMeetingEnds: atTime(11),
    beforeMidnight: atTime(23, 59, 59),
    midnight,
  };
};

export const createMeetingDetailsData = (referenceDate: Date, timeZone: string, daysAhead = 1): MeetingDetailsData => {
  const start = new TZDate(referenceDate.getTime(), timeZone);

  start.setDate(start.getDate() + daysAhead);
  start.setHours(9, 0, 0, 0);

  const dateLabel = start.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const headingDate = start.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return {
    dateLabel,
    dayHeading:
      daysAhead === 0 ? `Today (${headingDate})` : daysAhead === 1 ? `Tomorrow (${headingDate})` : headingDate,
    startLabel: '9:00 AM',
    endLabel: '10:00 AM',
    timeRange: '09:00 - 10:00 AM',
  };
};
