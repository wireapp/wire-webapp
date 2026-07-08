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

import {MeetingRecurrenceFrequency} from './meetingRecurrence';
import {meetingSchema, meetingsListResponseSchema} from './meetingSchema';

describe('meetingSchema', () => {
  const validMeeting = {
    created_at: '2026-06-15T09:00:00.000Z',
    updated_at: '2026-06-15T09:00:00.000Z',
    start_time: '2026-06-16T10:00:00.000Z',
    end_time: '2026-06-16T11:00:00.000Z',
    title: 'Weekly sync',
    qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
    qualified_creator: {id: 'creator-id', domain: 'example.com'},
    qualified_id: {id: 'meeting-id', domain: 'example.com'},
    trial: false,
  };

  it('accepts a valid meeting payload', () => {
    expect(meetingSchema.safeParse(validMeeting).success).toBe(true);
  });

  it('accepts optional recurrence and strips unknown backend fields', () => {
    const result = meetingSchema.safeParse({
      ...validMeeting,
      recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY, interval: 2},
      invited_emails: ['guest@example.com'],
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('Expected meeting schema parse to succeed');
    }

    expect(result.data).toEqual({
      ...validMeeting,
      recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY, interval: 2},
    });
    expect(result.data).not.toHaveProperty('invited_emails');
  });

  it('rejects meetings missing required fields', () => {
    const {title, ...meetingWithoutTitle} = validMeeting;

    expect(meetingSchema.safeParse(meetingWithoutTitle).success).toBe(false);
  });

  it('rejects invalid datetime fields', () => {
    expect(meetingSchema.safeParse({...validMeeting, start_time: 'foo'}).success).toBe(false);
    expect(
      meetingSchema.safeParse({
        ...validMeeting,
        recurrence: {frequency: MeetingRecurrenceFrequency.WEEKLY, until: 'foo'},
      }).success,
    ).toBe(false);
  });

  it('validates meetings list responses', () => {
    expect(meetingsListResponseSchema.safeParse([validMeeting]).success).toBe(true);
    expect(meetingsListResponseSchema.safeParse([{title: 'invalid'}]).success).toBe(false);
  });
});
