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

import assert from 'node:assert';

import {maybe} from 'true-myth';

import type {MeetingReminderFirePayload} from 'Components/meeting/createMeetingReminderScheduler';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

import {resolveCurrentMeetingReminderPayload} from './resolveCurrentMeetingReminderPayload';

const createMeetingSeries = (overrides: Partial<MeetingSeries> = {}): MeetingSeries => {
  return {
    series_start_date: '2026-06-01T10:00:00.000Z',
    series_end_date: '2026-06-01T11:00:00.000Z',
    duration_ms: TIME_IN_MILLIS.HOUR,
    recurrence: 'doesNotRepeat',
    conversation_id: 'conversation-id',
    qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
    qualified_id: {id: 'meeting-id', domain: 'example.com'},
    qualified_creator: {id: 'creator-id', domain: 'example.com'},
    title: 'Weekly sync',
    tzid: 'UTC',
    ...overrides,
  };
};

const payload: MeetingReminderFirePayload = {
  qualifiedId: {id: 'meeting-id', domain: 'example.com'},
  qualifiedConversationId: {id: 'conversation-id', domain: 'example.com'},
  meetingTitle: 'Weekly sync',
  meetingStartTime: '2026-06-01T10:00:00.000Z',
  qualifiedCreator: {id: 'creator-id', domain: 'example.com'},
};

describe('resolveCurrentMeetingReminderPayload', () => {
  it('returns the current series fields when the occurrence is still scheduled', () => {
    const resolved = resolveCurrentMeetingReminderPayload([createMeetingSeries({title: 'Renamed sync'})], payload);

    assert(maybe.isJust(resolved));
    expect(resolved.value.meetingTitle).toBe('Renamed sync');
    expect(resolved.value.meetingStartTime).toBe('2026-06-01T10:00:00.000Z');
  });

  it('returns nothing when the meeting was cancelled', () => {
    const resolved = resolveCurrentMeetingReminderPayload([], payload);

    expect(maybe.isNothing(resolved)).toBe(true);
  });

  it('returns nothing when the occurrence was rescheduled', () => {
    const resolved = resolveCurrentMeetingReminderPayload(
      [createMeetingSeries({series_start_date: '2026-06-01T11:00:00.000Z'})],
      payload,
    );

    expect(maybe.isNothing(resolved)).toBe(true);
  });
});
