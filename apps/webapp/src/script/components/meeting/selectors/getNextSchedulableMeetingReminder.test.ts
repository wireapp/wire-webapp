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

import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

import {getNextSchedulableMeetingReminder} from './getNextSchedulableMeetingReminder';

const reminderOffsetMs = TIME_IN_MILLIS.MINUTE * 10;

const createMeetingSeries = (overrides: Partial<MeetingSeries> = {}): MeetingSeries => ({
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
});

describe('getNextSchedulableMeetingReminder', () => {
  it('schedules ten minutes before the next scheduled start', () => {
    const meeting = createMeetingSeries();
    const nowMs = Date.parse('2026-06-01T09:00:00.000Z');

    const reminder = getNextSchedulableMeetingReminder(meeting, nowMs);

    assert(maybe.isJust(reminder));
    expect(reminder.value.occurrenceStart.toISOString()).toBe('2026-06-01T10:00:00.000Z');
    expect(reminder.value.fireAt).toBe(Date.parse('2026-06-01T10:00:00.000Z') - reminderOffsetMs);
  });

  it('does not schedule a Meet Now meeting whose start is already now', () => {
    const meeting = createMeetingSeries({
      series_start_date: '2026-06-01T10:00:00.000Z',
      series_end_date: '2026-06-01T10:30:00.000Z',
      duration_ms: TIME_IN_MILLIS.MINUTE * 30,
    });

    const reminder = getNextSchedulableMeetingReminder(meeting, Date.parse('2026-06-01T10:00:00.000Z'));

    expect(maybe.isNothing(reminder)).toBe(true);
  });

  it('does not schedule a late invite after T-10', () => {
    const meeting = createMeetingSeries();

    const reminder = getNextSchedulableMeetingReminder(meeting, Date.parse('2026-06-01T09:51:00.000Z'));

    expect(maybe.isNothing(reminder)).toBe(true);
  });

  it('schedules at T-10 when now is exactly ten minutes before start', () => {
    const meeting = createMeetingSeries();
    const nowMs = Date.parse('2026-06-01T09:50:00.000Z');

    const reminder = getNextSchedulableMeetingReminder(meeting, nowMs);

    assert(maybe.isJust(reminder));
    expect(reminder.value.fireAt).toBe(nowMs);
  });

  it('schedules only the next upcoming occurrence of a recurring series', () => {
    const meeting = createMeetingSeries({
      recurrence: 'weekly',
      series_start_date: '2026-06-01T10:00:00.000Z',
      series_end_date: '2026-06-01T11:00:00.000Z',
    });

    const reminder = getNextSchedulableMeetingReminder(meeting, Date.parse('2026-06-08T09:00:00.000Z'));

    assert(maybe.isJust(reminder));
    expect(reminder.value.occurrenceStart.toISOString()).toBe('2026-06-08T10:00:00.000Z');
    expect(reminder.value.fireAt).toBe(Date.parse('2026-06-08T09:50:00.000Z'));
  });

  it('skips a fired occurrence and schedules the following recurring start', () => {
    const meeting = createMeetingSeries({
      recurrence: 'weekly',
      series_start_date: '2026-06-01T10:00:00.000Z',
      series_end_date: '2026-06-01T11:00:00.000Z',
    });
    const firedStartMs = Date.parse('2026-06-01T10:00:00.000Z');

    const reminder = getNextSchedulableMeetingReminder(
      meeting,
      Date.parse('2026-06-01T09:00:00.000Z'),
      occurrenceStartMs => occurrenceStartMs === firedStartMs,
    );

    assert(maybe.isJust(reminder));
    expect(reminder.value.occurrenceStart.toISOString()).toBe('2026-06-08T10:00:00.000Z');
  });

  it('skips this occurrence after T-10 and still reminds for the next recurring start', () => {
    const meeting = createMeetingSeries({
      recurrence: 'weekly',
      series_start_date: '2026-06-01T10:00:00.000Z',
      series_end_date: '2026-06-01T11:00:00.000Z',
    });

    const reminder = getNextSchedulableMeetingReminder(meeting, Date.parse('2026-06-01T09:51:00.000Z'));

    assert(maybe.isJust(reminder));
    expect(reminder.value.occurrenceStart.toISOString()).toBe('2026-06-08T10:00:00.000Z');
  });

  it('returns nothing for invalid meeting dates', () => {
    const meeting = createMeetingSeries({series_start_date: 'not-a-date'});

    const reminder = getNextSchedulableMeetingReminder(meeting, Date.parse('2026-06-01T09:00:00.000Z'));

    expect(maybe.isNothing(reminder)).toBe(true);
  });
});
