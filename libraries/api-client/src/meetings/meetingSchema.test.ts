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

import {
  ADD_PERMISSION,
  CONVERSATION_ACCESS,
  CONVERSATION_CELLS_STATE,
  GROUP_CONVERSATION_TYPE,
} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {MeetingRecurrenceFrequency} from './meetingRecurrence';
import {meetingSchema, meetingWithConversationSchema, meetingsListResponseSchema} from './meetingSchema';

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

  const validMeetingConversation = {
    qualified_id: {id: 'conversation-id', domain: 'example.com'},
    creator: 'creator-id',
    type: 0,
    access: [CONVERSATION_ACCESS.INVITE, CONVERSATION_ACCESS.PRIVATE],
    access_role: 'activated',
    name: 'Weekly sync',
    group_conv_type: GROUP_CONVERSATION_TYPE.MEETING,
    protocol: CONVERSATION_PROTOCOL.MLS,
    group_id: 'group-id',
    epoch: 0,
    cells_state: CONVERSATION_CELLS_STATE.READY,
    add_permission: ADD_PERMISSION.ADMINS,
    members: {
      self: {
        id: 'creator-id',
        conversation_role: 'wire_admin',
        hidden: false,
        hidden_ref: null,
        otr_archived: false,
        otr_archived_ref: null,
        otr_muted_ref: null,
        otr_muted_status: null,
        service: null,
        status_ref: '0.0',
        status_time: '1970-01-01T00:00:00.000Z',
      },
      others: [],
    },
  };

  const validMeetingWithConversation = {
    ...validMeeting,
    conversation: validMeetingConversation,
  };

  it('strips unknown fields from embedded conversation payloads', () => {
    const result = meetingWithConversationSchema.safeParse({
      ...validMeetingWithConversation,
      conversation: {
        ...validMeetingConversation,
        invited_emails: ['guest@example.com'],
        team: 'team-id',
      },
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error('Expected meeting with conversation schema parse to succeed');
    }

    expect(result.data.conversation).toEqual(validMeetingConversation);
    expect(result.data.conversation).not.toHaveProperty('invited_emails');
    expect(result.data.conversation).not.toHaveProperty('team');
  });

  it('accepts meeting create/update payloads with embedded conversation', () => {
    expect(meetingWithConversationSchema.safeParse(validMeetingWithConversation).success).toBe(true);
  });

  it('rejects meeting create/update payloads without embedded conversation', () => {
    expect(meetingWithConversationSchema.safeParse(validMeeting).success).toBe(false);
  });

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
