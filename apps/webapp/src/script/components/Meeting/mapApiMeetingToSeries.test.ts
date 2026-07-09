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

import {unwrap, unwrapErr} from 'Util/test/resultTestSupport';

import {mapApiMeetingToSeries} from './mapApiMeetingToSeries';

const createApiMeeting = (overrides: {
  start_time?: string;
  end_time?: string;
  recurrence?: {frequency: MeetingRecurrenceFrequency; until?: string};
} = {}) => ({
  created_at: '2026-06-15T09:00:00.000Z',
  updated_at: '2026-06-15T09:00:00.000Z',
  start_time: '2026-06-15T10:00:00.000Z',
  end_time: '2026-06-15T11:00:00.000Z',
  title: 'Weekly sync',
  qualified_conversation: {id: 'conv-id', domain: 'example.com'},
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  qualified_id: {id: 'meeting-id', domain: 'example.com'},
  trial: false,
  ...overrides,
});

describe('mapApiMeetingToSeries', () => {
  it('maps API meeting fields to meeting series shape', () => {
    const result = mapApiMeetingToSeries(
      createApiMeeting({recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY}}),
    );

    expect(unwrap(result)).toEqual({
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
    const result = mapApiMeetingToSeries(createApiMeeting({title: 'One-off'}));

    expect(unwrap(result).recurrence).toBe('doesNotRepeat');
  });

  it('maps recurrence_until from API recurrence', () => {
    const result = mapApiMeetingToSeries(
      createApiMeeting({
        recurrence: {
          frequency: MeetingRecurrenceFrequency.WEEKLY,
          until: '2026-12-31T23:59:59.000Z',
        },
      }),
    );

    expect(unwrap(result).recurrence_until).toBe('2026-12-31T23:59:59.000Z');
  });

  it('rejects invalid start_time', () => {
    const result = mapApiMeetingToSeries(createApiMeeting({start_time: 'not-a-date'}));

    expect(unwrapErr(result)).toBe('invalidStartTime');
  });

  it('rejects invalid end_time', () => {
    const result = mapApiMeetingToSeries(createApiMeeting({end_time: 'not-a-date'}));

    expect(unwrapErr(result)).toBe('invalidEndTime');
  });

  it('rejects end_time that is not after start_time', () => {
    const result = mapApiMeetingToSeries(
      createApiMeeting({
        start_time: '2026-06-15T11:00:00.000Z',
        end_time: '2026-06-15T10:00:00.000Z',
      }),
    );

    expect(unwrapErr(result)).toBe('endNotAfterStart');
  });

  it('rejects equal start_time and end_time', () => {
    const result = mapApiMeetingToSeries(
      createApiMeeting({
        start_time: '2026-06-15T10:00:00.000Z',
        end_time: '2026-06-15T10:00:00.000Z',
      }),
    );

    expect(unwrapErr(result)).toBe('endNotAfterStart');
  });

  it('rejects invalid recurrence until', () => {
    const result = mapApiMeetingToSeries(
      createApiMeeting({
        recurrence: {
          frequency: MeetingRecurrenceFrequency.WEEKLY,
          until: 'not-a-date',
        },
      }),
    );

    expect(unwrapErr(result)).toBe('invalidRecurrenceUntil');
  });
});
