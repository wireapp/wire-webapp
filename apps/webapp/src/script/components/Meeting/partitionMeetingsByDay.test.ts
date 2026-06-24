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
import {createDeterministicWallClock} from 'src/script/clock/deterministicWallClock';

import {partitionMeetingsByDay} from './partitionMeetingsByDay';

const createMeeting = (start: string, end: string, title: string): Meeting => ({
  start_date: start,
  end_date: end,
  recurrence: 'doesNotRepeat',
  conversation_id: title,
  title,
  qualified_id: {id: `meeting-${title}`, domain: 'example.com'},
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  invited_emails: [],
});

describe('partitionMeetingsByDay', () => {
  const wallClock = createDeterministicWallClock({
    initialCurrentTimestampInMilliseconds: new Date('2026-06-15T12:00:00.000Z').getTime(),
  });

  const createRelativeMeeting = (dayOffset: number, startHour: number, endHour: number, title: string): Meeting => {
    const start = new Date(wallClock.currentDate);
    start.setDate(start.getDate() + dayOffset);
    start.setHours(startHour, 0, 0, 0);

    const end = new Date(start);
    end.setHours(endHour, 0, 0, 0);

    return createMeeting(start.toISOString(), end.toISOString(), title);
  };

  it('groups meetings into today, tomorrow, and past buckets', () => {
    const result = partitionMeetingsByDay(
      [
        createRelativeMeeting(0, 14, 15, 'today'),
        createRelativeMeeting(1, 9, 10, 'tomorrow'),
        createRelativeMeeting(-1, 9, 10, 'past'),
      ],
      wallClock,
    );

    expect(result.today.map(meeting => meeting.title)).toEqual(['today']);
    expect(result.tomorrow.map(meeting => meeting.title)).toEqual(['tomorrow']);
    expect(result.past.map(meeting => meeting.title)).toEqual(['past']);
  });

  it('puts ended meetings from today into past', () => {
    const result = partitionMeetingsByDay([createRelativeMeeting(0, 8, 9, 'ended-today')], wallClock);

    expect(result.past.map(meeting => meeting.title)).toEqual(['ended-today']);
    expect(result.today).toHaveLength(0);
  });
});
