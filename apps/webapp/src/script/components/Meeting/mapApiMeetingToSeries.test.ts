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

import {MeetingRecurrenceFrequency} from '@wireapp/api-client/lib/meetings/meetingRecurrence';

import {mapApiMeetingToSeries} from './mapApiMeetingToSeries';

describe('mapApiMeetingToSeries', () => {
  it('maps API meeting fields to meeting series shape', () => {
    const result = mapApiMeetingToSeries({
      created_at: '2026-06-15T09:00:00.000Z',
      updated_at: '2026-06-15T09:00:00.000Z',
      start_time: '2026-06-15T10:00:00.000Z',
      end_time: '2026-06-15T11:00:00.000Z',
      title: 'Weekly sync',
      qualified_conversation: {id: 'conv-id', domain: 'example.com'},
      qualified_creator: {id: 'creator-id', domain: 'example.com'},
      qualified_id: {id: 'meeting-id', domain: 'example.com'},
      trial: false,
      recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY},
    });

    expect(result).toEqual({
      series_start_date: '2026-06-15T10:00:00.000Z',
      series_end_date: '2026-06-15T11:00:00.000Z',
      duration_ms: 3_600_000,
      conversation_id: 'conv-id',
      qualified_conversation: {id: 'conv-id', domain: 'example.com'},
      title: 'Weekly sync',
      recurrence: 'weekly',
      qualified_id: {id: 'meeting-id', domain: 'example.com'},
      qualified_creator: {id: 'creator-id', domain: 'example.com'},
    });
  });

  it('uses doesNotRepeat when meeting does not repeat', () => {
    const result = mapApiMeetingToSeries({
      created_at: '2026-06-15T09:00:00.000Z',
      updated_at: '2026-06-15T09:00:00.000Z',
      start_time: '2026-06-15T10:00:00.000Z',
      end_time: '2026-06-15T11:00:00.000Z',
      title: 'One-off',
      qualified_conversation: {id: 'conv-id', domain: 'example.com'},
      qualified_creator: {id: 'creator-id', domain: 'example.com'},
      qualified_id: {id: 'meeting-id', domain: 'example.com'},
      trial: false,
    });

    expect(result.recurrence).toBe('doesNotRepeat');
  });

  it('maps recurrence_until from API recurrence', () => {
    const result = mapApiMeetingToSeries({
      created_at: '2026-06-15T09:00:00.000Z',
      updated_at: '2026-06-15T09:00:00.000Z',
      start_time: '2026-06-15T10:00:00.000Z',
      end_time: '2026-06-15T11:00:00.000Z',
      title: 'Weekly sync',
      qualified_conversation: {id: 'conv-id', domain: 'example.com'},
      qualified_creator: {id: 'creator-id', domain: 'example.com'},
      qualified_id: {id: 'meeting-id', domain: 'example.com'},
      trial: false,
      recurrence: {
        frequency: MeetingRecurrenceFrequency.WEEKLY,
        until: '2026-12-31T23:59:59.000Z',
      },
    });

    expect(result.recurrence_until).toBe('2026-12-31T23:59:59.000Z');
  });
});
