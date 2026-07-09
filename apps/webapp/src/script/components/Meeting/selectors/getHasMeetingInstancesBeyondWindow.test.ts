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

import {getHasMeetingInstancesBeyondWindow} from './getHasMeetingInstancesBeyondWindow';

const createMeetingSeries = (
  overrides: Partial<MeetingSeries> & Pick<MeetingSeries, 'series_start_date' | 'series_end_date' | 'title'>,
): MeetingSeries => ({
  duration_ms: new Date(overrides.series_end_date).getTime() - new Date(overrides.series_start_date).getTime(),
  recurrence: 'doesNotRepeat',
  conversation_id: overrides.title,
  qualified_id: {id: overrides.title, domain: 'example.com'},
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  qualified_conversation: {id: 'conv-id', domain: 'example.com'},
  ...overrides,
});

describe('getHasMeetingInstancesBeyondWindow', () => {
  const now = new Date('2026-06-15T12:00:00.000Z');

  it('returns false when all non-repeating meetings start before the window end', () => {
    const meetingSeries = [
      createMeetingSeries({
        title: 'Today meeting',
        series_start_date: '2026-06-15T10:00:00.000Z',
        series_end_date: '2026-06-15T11:00:00.000Z',
      }),
    ];

    expect(getHasMeetingInstancesBeyondWindow(meetingSeries, now, 14)).toBe(false);
  });

  it('returns true when a non-repeating meeting starts on or after the window end', () => {
    const meetingSeries = [
      createMeetingSeries({
        title: 'Future meeting',
        series_start_date: '2026-07-01T10:00:00.000Z',
        series_end_date: '2026-07-01T11:00:00.000Z',
      }),
    ];

    expect(getHasMeetingInstancesBeyondWindow(meetingSeries, now, 14)).toBe(true);
  });

  it('returns true for recurring meetings that can still produce instances after the window end', () => {
    const meetingSeries = [
      createMeetingSeries({
        title: 'Daily standup',
        series_start_date: '2026-06-15T09:00:00.000Z',
        series_end_date: '2026-06-15T09:30:00.000Z',
        recurrence: 'daily',
        recurrence_until: '2026-08-01T09:30:00.000Z',
      }),
    ];

    expect(getHasMeetingInstancesBeyondWindow(meetingSeries, now, 14)).toBe(true);
  });

  it('returns false when recurrence ends before the window end', () => {
    const meetingSeries = [
      createMeetingSeries({
        title: 'Short daily',
        series_start_date: '2026-06-15T09:00:00.000Z',
        series_end_date: '2026-06-15T09:30:00.000Z',
        recurrence: 'daily',
        recurrence_until: '2026-06-20T09:30:00.000Z',
      }),
    ];

    expect(getHasMeetingInstancesBeyondWindow(meetingSeries, now, 14)).toBe(false);
  });
});
