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

import {isUndefined} from '@sindresorhus/is';
import {Maybe} from 'true-myth';

import {
  getFirstMeetingInstanceOnOrAfter,
  getNextMeetingInstance,
} from 'Components/meeting/selectors/getMeetingInstancesInRange';
import type {MeetingInstance} from 'Components/meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

export const MEETING_REMINDER_OFFSET_MS = TIME_IN_MILLIS.FIVE_MINUTES + TIME_IN_MILLIS.FIVE_MINUTES;

export type SchedulableMeetingReminder = {
  occurrenceStart: Date;
  fireAt: number;
};

const hasValidSeriesStart = (meeting: MeetingSeries): boolean => !Number.isNaN(Date.parse(meeting.series_start_date));

const toReminder = (meetingInstance: MeetingInstance): SchedulableMeetingReminder => ({
  occurrenceStart: meetingInstance.start,
  fireAt: meetingInstance.start.getTime() - MEETING_REMINDER_OFFSET_MS,
});

export const getNextSchedulableMeetingReminder = (
  meeting: MeetingSeries,
  nowMs: number,
  hasFiredOccurrence: (occurrenceStartMs: number) => boolean = () => false,
): Maybe<SchedulableMeetingReminder> => {
  if (!hasValidSeriesStart(meeting)) {
    return Maybe.nothing();
  }

  let meetingInstance = getFirstMeetingInstanceOnOrAfter(meeting, new Date(nowMs));

  while (!isUndefined(meetingInstance)) {
    const occurrenceStartMs = meetingInstance.start.getTime();

    if (!hasFiredOccurrence(occurrenceStartMs)) {
      const reminder = toReminder(meetingInstance);

      if (reminder.fireAt >= nowMs) {
        return Maybe.just(reminder);
      }
    }

    const nextMeetingInstance = getNextMeetingInstance(meetingInstance);

    if (isUndefined(nextMeetingInstance) || nextMeetingInstance.start.getTime() <= occurrenceStartMs) {
      return Maybe.nothing();
    }

    meetingInstance = nextMeetingInstance;
  }

  return Maybe.nothing();
};
