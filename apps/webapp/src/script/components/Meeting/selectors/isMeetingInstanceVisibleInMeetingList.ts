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

import {startOfDay} from 'date-fns';

import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';

/**
 * Completed meetings stay in the list until local midnight on the day they start.
 */
export const isMeetingInstanceVisibleInMeetingList = (
  meetingInstance: MeetingInstance,
  nowMilliseconds: number,
): boolean => {
  if (meetingInstance.end.getTime() >= nowMilliseconds) {
    return true;
  }

  const meetingDayStart = startOfDay(meetingInstance.start);
  const todayStart = startOfDay(new Date(nowMilliseconds));

  return meetingDayStart.getTime() === todayStart.getTime();
};
