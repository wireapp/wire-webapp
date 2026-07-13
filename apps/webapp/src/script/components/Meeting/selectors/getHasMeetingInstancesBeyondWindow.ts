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

import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';

import {getVisibleTimeWindow} from './getVisibleTimeWindow';

/**
 * Returns whether any meeting series can still produce instances at or after the current window end.
 *
 * Used by the meeting list infinite scroll to avoid widening `dayCount` when nothing remains to load.
 */
export const getHasMeetingInstancesBeyondWindow = (
  meetingSeriesList: MeetingSeries[],
  now: Date,
  visibleDayCount: number,
): boolean => {
  const {to: windowEnd} = getVisibleTimeWindow(now, {dayCount: visibleDayCount});
  const windowEndMs = windowEnd.getTime();

  return meetingSeriesList.some(meetingSeries => {
    const recurrenceUntilMs =
      meetingSeries.recurrence_until !== undefined
        ? Date.parse(meetingSeries.recurrence_until)
        : Number.POSITIVE_INFINITY;

    if (recurrenceUntilMs < windowEndMs) {
      return false;
    }

    if (meetingSeries.recurrence === 'doesNotRepeat') {
      return new Date(meetingSeries.series_start_date).getTime() >= windowEndMs;
    }

    return true;
  });
};
