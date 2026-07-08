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

import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';

import {groupMeetingInstancesByDay} from './groupMeetingInstancesByDay';

const createMeetingSeries = (title: string): MeetingSeries => ({
  series_start_date: '2026-06-15T10:00:00.000Z',
  series_end_date: '2026-06-15T11:00:00.000Z',
  duration_ms: 3_600_000,
  recurrence: 'doesNotRepeat',
  conversation_id: 'conversation-id',
  qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
  qualified_id: {id: title, domain: 'example.com'},
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  title,
});

const createMeetingInstance = (title: string, start: string, end: string): MeetingInstance => ({
  meetingSeries: createMeetingSeries(title),
  start: new Date(start),
  end: new Date(end),
});

describe('groupMeetingInstancesByDay', () => {
  it('groups instances by calendar day in chronological order', () => {
    const meetingInstances = [
      createMeetingInstance('later-tomorrow', '2026-06-16T15:00:00.000Z', '2026-06-16T16:00:00.000Z'),
      createMeetingInstance('today-late', '2026-06-15T16:00:00.000Z', '2026-06-15T17:00:00.000Z'),
      createMeetingInstance('today-early', '2026-06-15T09:00:00.000Z', '2026-06-15T10:00:00.000Z'),
      createMeetingInstance('tomorrow-early', '2026-06-16T08:00:00.000Z', '2026-06-16T09:00:00.000Z'),
    ];

    const grouped = groupMeetingInstancesByDay(meetingInstances);

    expect(grouped.map(group => group.day.toISOString())).toEqual([
      '2026-06-15T00:00:00.000Z',
      '2026-06-16T00:00:00.000Z',
    ]);
    expect(grouped[0]?.meetingInstances.map(meetingInstance => meetingInstance.meetingSeries.title)).toEqual([
      'today-early',
      'today-late',
    ]);
    expect(grouped[1]?.meetingInstances.map(meetingInstance => meetingInstance.meetingSeries.title)).toEqual([
      'tomorrow-early',
      'later-tomorrow',
    ]);
  });

  it('returns an empty array when there are no instances', () => {
    expect(groupMeetingInstancesByDay([])).toEqual([]);
  });
});
