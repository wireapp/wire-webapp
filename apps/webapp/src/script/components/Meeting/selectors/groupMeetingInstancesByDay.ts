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

import {isSameDay, startOfDay} from 'date-fns';

import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';

export type MeetingInstancesByDay = {
  day: Date;
  meetingInstances: MeetingInstance[];
};

/**
 * Groups a flat instance list into day sections for list rendering (day header + rows).
 *
 * Meeting instances must be sortable by start; output days are in chronological order. Each group's `day`
 * is the start of the calendar day of the instance's `start`.
 *
 * @param meetingInstances - Flat list from {@link getMeetingInstances}.
 * @returns Day buckets ready for one `MeetingListItemGroup` per entry.
 */
export const groupMeetingInstancesByDay = (meetingInstances: MeetingInstance[]): MeetingInstancesByDay[] => {
  const sortedMeetingInstances = [...meetingInstances].toSorted(
    (left, right) => left.start.getTime() - right.start.getTime(),
  );
  const groups: MeetingInstancesByDay[] = [];

  for (const meetingInstance of sortedMeetingInstances) {
    const day = startOfDay(meetingInstance.start);
    const lastGroup = groups.at(-1);

    if (lastGroup !== undefined && isSameDay(lastGroup.day, day)) {
      lastGroup.meetingInstances.push(meetingInstance);
      continue;
    }

    groups.push({day, meetingInstances: [meetingInstance]});
  }

  return groups;
};
