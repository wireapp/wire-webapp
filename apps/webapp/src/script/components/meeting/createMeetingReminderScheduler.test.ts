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

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';

import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {TIME_IN_MILLIS} from 'Util/timeUtil';

import {createMeetingReminderScheduler, MEETING_REMINDER_MAX_TIMEOUT_DELAY_MS} from './createMeetingReminderScheduler';

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

describe('createMeetingReminderScheduler', () => {
  it('fires one reminder at T-10 for a scheduled meeting', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T09:49:00.000Z'),
    });
    const reminders: Array<{meetingTitle: string; meetingStartTime: string}> = [];
    const scheduler = createMeetingReminderScheduler({
      wallClock,
      onReminder: reminder => {
        reminders.push({meetingTitle: reminder.meetingTitle, meetingStartTime: reminder.meetingStartTime});
      },
    });

    scheduler.sync([createMeetingSeries()]);
    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE - 1);
    expect(reminders).toEqual([]);

    wallClock.advanceByMilliseconds(1);
    expect(reminders).toEqual([{meetingTitle: 'Weekly sync', meetingStartTime: '2026-06-01T10:00:00.000Z'}]);

    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE);
    expect(reminders).toHaveLength(1);
    scheduler.stop();
  });

  it('does not fire a reminder for Meet Now', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T10:00:00.000Z'),
    });
    const onReminder = jest.fn();
    const scheduler = createMeetingReminderScheduler({wallClock, onReminder});

    scheduler.sync([
      createMeetingSeries({
        series_end_date: '2026-06-01T10:30:00.000Z',
        duration_ms: TIME_IN_MILLIS.MINUTE * 30,
      }),
    ]);
    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE);

    expect(onReminder).not.toHaveBeenCalled();
    scheduler.stop();
  });

  it('does not fire a late reminder when invited after T-10', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T09:51:00.000Z'),
    });
    const onReminder = jest.fn();
    const scheduler = createMeetingReminderScheduler({wallClock, onReminder});

    scheduler.sync([createMeetingSeries()]);
    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE * 9);

    expect(onReminder).not.toHaveBeenCalled();
    scheduler.stop();
  });

  it('moves the pending reminder when the start time changes', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T09:40:00.000Z'),
    });
    const reminders: string[] = [];
    const scheduler = createMeetingReminderScheduler({
      wallClock,
      onReminder: reminder => {
        reminders.push(reminder.meetingStartTime);
      },
    });

    scheduler.sync([createMeetingSeries()]);
    scheduler.sync([
      createMeetingSeries({
        series_start_date: '2026-06-01T11:00:00.000Z',
        series_end_date: '2026-06-01T12:00:00.000Z',
      }),
    ]);

    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE * 10);
    expect(reminders).toEqual([]);

    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE * 60);
    expect(reminders).toEqual(['2026-06-01T11:00:00.000Z']);
    scheduler.stop();
  });

  it('drops the pending reminder when the meeting is removed', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T09:49:00.000Z'),
    });
    const onReminder = jest.fn();
    const scheduler = createMeetingReminderScheduler({wallClock, onReminder});

    scheduler.sync([createMeetingSeries()]);
    scheduler.sync([]);
    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE);

    expect(onReminder).not.toHaveBeenCalled();
    scheduler.stop();
  });

  it('fires only one reminder for the same occurrence', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T09:49:00.000Z'),
    });
    const onReminder = jest.fn();
    const scheduler = createMeetingReminderScheduler({wallClock, onReminder});
    const meeting = createMeetingSeries();

    scheduler.sync([meeting]);
    scheduler.sync([meeting]);
    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE);
    scheduler.sync([meeting]);
    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE);

    expect(onReminder).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('uses the latest meeting title at fire time', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T09:49:00.000Z'),
    });
    const titles: string[] = [];
    const scheduler = createMeetingReminderScheduler({
      wallClock,
      onReminder: reminder => {
        titles.push(reminder.meetingTitle);
      },
    });

    scheduler.sync([createMeetingSeries()]);
    scheduler.sync([createMeetingSeries({title: 'Renamed sync'})]);
    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE);

    expect(titles).toEqual(['Renamed sync']);
    scheduler.stop();
  });

  it('does not fire a reminder when the timeout runs after the meeting has started', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T09:49:00.000Z'),
    });
    const onReminder = jest.fn();
    const scheduler = createMeetingReminderScheduler({wallClock, onReminder});

    scheduler.sync([createMeetingSeries()]);
    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE * 21);

    expect(onReminder).not.toHaveBeenCalled();
    scheduler.stop();
  });

  it('still fires a reminder when the timeout is late but the meeting has not started', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T09:49:00.000Z'),
    });
    const onReminder = jest.fn();
    const scheduler = createMeetingReminderScheduler({wallClock, onReminder});

    scheduler.sync([createMeetingSeries()]);
    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE * 6);

    expect(onReminder).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('still reminds for the next recurring occurrence after skipping a stale fire', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T09:49:00.000Z'),
    });
    const reminders: string[] = [];
    const scheduler = createMeetingReminderScheduler({
      wallClock,
      onReminder: reminder => {
        reminders.push(reminder.meetingStartTime);
      },
    });

    scheduler.sync([
      createMeetingSeries({
        recurrence: 'weekly',
        series_start_date: '2026-06-01T10:00:00.000Z',
        series_end_date: '2026-06-01T11:00:00.000Z',
      }),
    ]);
    wallClock.advanceByMilliseconds(TIME_IN_MILLIS.MINUTE * 21);
    expect(reminders).toEqual([]);

    wallClock.advanceByMilliseconds(Date.parse('2026-06-08T09:50:00.000Z') - Date.parse('2026-06-01T10:10:00.000Z'));
    expect(reminders).toEqual(['2026-06-08T10:00:00.000Z']);
    scheduler.stop();
  });

  it('does not fire a far-future reminder on the first timeout chunk', () => {
    const wallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T10:00:00.000Z'),
    });
    const onReminder = jest.fn();
    const scheduler = createMeetingReminderScheduler({wallClock, onReminder});

    scheduler.sync([
      createMeetingSeries({
        series_start_date: '2026-08-01T10:00:00.000Z',
        series_end_date: '2026-08-01T11:00:00.000Z',
      }),
    ]);
    wallClock.advanceByMilliseconds(MEETING_REMINDER_MAX_TIMEOUT_DELAY_MS);

    expect(onReminder).not.toHaveBeenCalled();
    scheduler.stop();
  });
});
