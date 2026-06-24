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

import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import type {WallClock} from 'src/script/clock/wallClock';

export interface PartitionedMeetings {
  today: Meeting[];
  tomorrow: Meeting[];
}

const isSameCalendarDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getTomorrowDate = (referenceDate: Date): Date => {
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
};

export const partitionMeetingsByDay = (meetings: Meeting[], wallClock: WallClock): PartitionedMeetings => {
  const now = wallClock.currentDate;
  const tomorrow = getTomorrowDate(now);

  const partitioned: PartitionedMeetings = {
    today: [],
    tomorrow: [],
  };

  for (const meeting of meetings) {
    const startDate = new Date(meeting.start_date);
    const endDate = new Date(meeting.end_date);

    if (endDate.getTime() < now.getTime()) {
      continue;
    }

    if (isSameCalendarDay(startDate, now)) {
      partitioned.today.push(meeting);
      continue;
    }

    if (isSameCalendarDay(startDate, tomorrow)) {
      partitioned.tomorrow.push(meeting);
    }
  }

  const sortByStart = (left: Meeting, right: Meeting) =>
    new Date(left.start_date).getTime() - new Date(right.start_date).getTime();

  partitioned.today.sort(sortByStart);
  partitioned.tomorrow.sort(sortByStart);

  return partitioned;
};
