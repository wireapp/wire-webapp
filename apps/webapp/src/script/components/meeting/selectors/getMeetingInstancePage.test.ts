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

import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';

import {getMeetingInstancePage, getNextMeetingInstancePage} from './getMeetingInstancePage';

const createMeetingSeries = (overrides: Partial<MeetingSeries> = {}): MeetingSeries => ({
  series_start_date: '2026-06-15T10:00:00.000Z',
  series_end_date: '2026-06-15T10:30:00.000Z',
  duration_ms: 30 * 60 * 1000,
  recurrence: 'doesNotRepeat',
  conversation_id: 'conversation-id',
  qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  title: 'Meeting',
  ...overrides,
});

describe('getMeetingInstancePage', () => {
  const from = new Date('2026-06-15T00:00:00.000Z');

  it('returns the earliest occurrences across meeting series', () => {
    const page = getMeetingInstancePage(
      [
        createMeetingSeries({
          title: 'Far meeting',
          qualified_id: {id: 'far', domain: 'example.com'},
          series_start_date: '2030-01-01T10:00:00.000Z',
        }),
        createMeetingSeries({
          title: 'Daily meeting',
          qualified_id: {id: 'daily', domain: 'example.com'},
          recurrence: 'daily',
        }),
      ],
      from,
      3,
    );

    expect(page.meetingInstances.map(({meetingSeries}) => meetingSeries.title)).toEqual([
      'Daily meeting',
      'Daily meeting',
      'Daily meeting',
    ]);
    expect(page.hasMore).toBe(true);
  });

  it('jumps directly to a distant non-recurring meeting', () => {
    const page = getMeetingInstancePage(
      [
        createMeetingSeries({
          series_start_date: '2036-06-15T10:00:00.000Z',
        }),
      ],
      from,
      1,
    );

    expect(page.meetingInstances[0]?.start.toISOString()).toBe('2036-06-15T10:00:00.000Z');
    expect(page.hasMore).toBe(false);
  });

  it('stops a recurring series at recurrence_until', () => {
    const page = getMeetingInstancePage(
      [
        createMeetingSeries({
          recurrence: 'daily',
          recurrence_until: '2026-06-16T10:00:00.000Z',
        }),
      ],
      from,
      10,
    );

    expect(page.meetingInstances.map(({start}) => start.toISOString())).toEqual([
      '2026-06-15T10:00:00.000Z',
      '2026-06-16T10:00:00.000Z',
    ]);
    expect(page.hasMore).toBe(false);
  });

  it('keeps an unbounded recurring series pageable', () => {
    const firstPage = getMeetingInstancePage([createMeetingSeries({recurrence: 'weekly'})], from, 2);
    const secondPage = getNextMeetingInstancePage(firstPage.cursor, 2);

    expect(firstPage.meetingInstances.map(({start}) => start.toISOString())).toEqual([
      '2026-06-15T10:00:00.000Z',
      '2026-06-22T10:00:00.000Z',
    ]);
    expect(secondPage.meetingInstances.map(({start}) => start.toISOString())).toEqual([
      '2026-06-29T10:00:00.000Z',
      '2026-07-06T10:00:00.000Z',
    ]);
    expect(secondPage.hasMore).toBe(true);
  });
});
