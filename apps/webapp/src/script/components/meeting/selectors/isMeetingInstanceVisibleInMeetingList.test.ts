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

import type {MeetingInstance} from 'Components/meeting/types/meetingInstance';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';

import {isMeetingInstanceVisibleInMeetingList} from './isMeetingInstanceVisibleInMeetingList';

const createMeetingSeries = (overrides: Partial<MeetingSeries> = {}): MeetingSeries => ({
  series_start_date: '2026-06-15T14:00:00.000Z',
  series_end_date: '2026-06-15T15:00:00.000Z',
  duration_ms: 3_600_000,
  recurrence: 'doesNotRepeat',
  conversation_id: 'conv-id',
  title: 'Weekly sync',
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  qualified_creator: {id: 'host-id', domain: 'example.com'},
  qualified_conversation: {id: 'conv-id', domain: 'example.com'},
  ...overrides,
});

const createMeetingInstance = (start: Date, end: Date): MeetingInstance => {
  const meetingSeries = createMeetingSeries({
    series_start_date: start.toISOString(),
    series_end_date: end.toISOString(),
    duration_ms: end.getTime() - start.getTime(),
  });

  return {meetingSeries, start, end};
};

describe('isMeetingInstanceVisibleInMeetingList', () => {
  it('keeps upcoming and ongoing meetings visible', () => {
    const start = new Date('2026-06-15T14:00:00.000Z');
    const end = new Date('2026-06-15T15:00:00.000Z');
    const meetingInstance = createMeetingInstance(start, end);

    expect(isMeetingInstanceVisibleInMeetingList(meetingInstance, Date.parse('2026-06-15T13:00:00.000Z'))).toBe(true);
    expect(isMeetingInstanceVisibleInMeetingList(meetingInstance, Date.parse('2026-06-15T14:30:00.000Z'))).toBe(true);
  });

  it('keeps completed meetings visible until local midnight on the day they start', () => {
    const start = new Date('2026-06-15T14:00:00.000Z');
    const end = new Date('2026-06-15T15:00:00.000Z');
    const meetingInstance = createMeetingInstance(start, end);

    expect(isMeetingInstanceVisibleInMeetingList(meetingInstance, Date.parse('2026-06-15T16:00:00.000Z'))).toBe(true);
    expect(isMeetingInstanceVisibleInMeetingList(meetingInstance, Date.parse('2026-06-15T23:59:59.999Z'))).toBe(true);
  });

  it('removes completed meetings after local midnight on the day they start', () => {
    const start = new Date('2026-06-15T14:00:00.000Z');
    const end = new Date('2026-06-15T15:00:00.000Z');
    const meetingInstance = createMeetingInstance(start, end);

    expect(isMeetingInstanceVisibleInMeetingList(meetingInstance, Date.parse('2026-06-16T00:00:00.000Z'))).toBe(false);
  });

  it('removes meetings that started on a previous day', () => {
    const start = new Date('2026-06-14T14:00:00.000Z');
    const end = new Date('2026-06-14T15:00:00.000Z');
    const meetingInstance = createMeetingInstance(start, end);

    expect(isMeetingInstanceVisibleInMeetingList(meetingInstance, Date.parse('2026-06-15T12:00:00.000Z'))).toBe(false);
  });
});
