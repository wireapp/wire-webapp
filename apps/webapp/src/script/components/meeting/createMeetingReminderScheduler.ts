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

import type {Clock} from '@enormora/clock/clock';
import {isUndefined} from '@sindresorhus/is';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {maybe} from 'true-myth';

import {getNextSchedulableMeetingReminder} from 'Components/meeting/selectors/getNextSchedulableMeetingReminder';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {toMeetingIdKey} from 'Components/meeting/utils/toMeetingIdKey';

export const MEETING_REMINDER_MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

export type MeetingReminderFirePayload = {
  qualifiedId: QualifiedId;
  qualifiedConversationId: QualifiedId;
  meetingTitle: string;
  meetingStartTime: string;
  qualifiedCreator: QualifiedId;
};

export type CreateMeetingReminderSchedulerDependencies = {
  clock: Clock;
  onReminder: (payload: MeetingReminderFirePayload) => void;
};

export type MeetingReminderScheduler = {
  sync: (meetingSeries: readonly MeetingSeries[]) => void;
  stop: () => void;
};

type ScheduledMeetingReminder = {
  timeoutId: ReturnType<Clock['setTimeout']> | undefined;
  fireAt: number;
  occurrenceStartMs: number;
  meeting: MeetingSeries;
};

const toFiredOccurrenceKey = (meetingKey: string, occurrenceStartMs: number): string =>
  `${meetingKey}:${occurrenceStartMs}`;

const toReminderPayload = (meeting: MeetingSeries, occurrenceStartMs: number): MeetingReminderFirePayload => ({
  qualifiedId: meeting.qualified_id,
  qualifiedConversationId: meeting.qualified_conversation,
  meetingTitle: meeting.title,
  meetingStartTime: new Date(occurrenceStartMs).toISOString(),
  qualifiedCreator: meeting.qualified_creator,
});

export const createMeetingReminderScheduler = ({
  clock,
  onReminder,
}: CreateMeetingReminderSchedulerDependencies): MeetingReminderScheduler => {
  const scheduled = new Map<string, ScheduledMeetingReminder>();
  const firedOccurrenceKeys = new Set<string>();

  const hasFiredOccurrence = (meetingKey: string, occurrenceStartMs: number): boolean =>
    firedOccurrenceKeys.has(toFiredOccurrenceKey(meetingKey, occurrenceStartMs));

  const clearTimeoutIfScheduled = (scheduledReminder: ScheduledMeetingReminder): void => {
    if (!isUndefined(scheduledReminder.timeoutId)) {
      clock.clearTimeout(scheduledReminder.timeoutId);
    }
  };

  const unschedule = (meetingKey: string): void => {
    const scheduledReminder = scheduled.get(meetingKey);

    if (!isUndefined(scheduledReminder)) {
      clearTimeoutIfScheduled(scheduledReminder);
      scheduled.delete(meetingKey);
    }

    for (const firedOccurrenceKey of firedOccurrenceKeys) {
      if (firedOccurrenceKey.startsWith(`${meetingKey}:`)) {
        firedOccurrenceKeys.delete(firedOccurrenceKey);
      }
    }
  };

  const armTimeout = (meetingKey: string): void => {
    const scheduledReminder = scheduled.get(meetingKey);

    if (isUndefined(scheduledReminder)) {
      return;
    }

    clearTimeoutIfScheduled(scheduledReminder);

    const delayInMilliseconds = Math.max(0, scheduledReminder.fireAt - clock.currentUnixEpochMilliseconds);
    scheduledReminder.timeoutId = clock.setTimeout(
      () => onTimeout(meetingKey),
      Math.min(delayInMilliseconds, MEETING_REMINDER_MAX_TIMEOUT_DELAY_MS),
    );
  };

  const scheduleMeeting = (meeting: MeetingSeries): void => {
    const meetingKey = toMeetingIdKey(meeting.qualified_id);
    const reminder = getNextSchedulableMeetingReminder(meeting, clock.currentUnixEpochMilliseconds, occurrenceStartMs =>
      hasFiredOccurrence(meetingKey, occurrenceStartMs),
    );

    if (maybe.isNothing(reminder)) {
      const scheduledReminder = scheduled.get(meetingKey);

      if (!isUndefined(scheduledReminder)) {
        clearTimeoutIfScheduled(scheduledReminder);
        scheduled.delete(meetingKey);
      }

      return;
    }

    const existing = scheduled.get(meetingKey);

    if (
      !isUndefined(existing) &&
      existing.fireAt === reminder.value.fireAt &&
      existing.occurrenceStartMs === reminder.value.occurrenceStart.getTime()
    ) {
      existing.meeting = meeting;
      return;
    }

    if (!isUndefined(existing)) {
      clearTimeoutIfScheduled(existing);
    }

    scheduled.set(meetingKey, {
      timeoutId: undefined,
      fireAt: reminder.value.fireAt,
      occurrenceStartMs: reminder.value.occurrenceStart.getTime(),
      meeting,
    });
    armTimeout(meetingKey);
  };

  const onTimeout = (meetingKey: string): void => {
    const scheduledReminder = scheduled.get(meetingKey);

    if (isUndefined(scheduledReminder)) {
      return;
    }

    if (clock.currentUnixEpochMilliseconds < scheduledReminder.fireAt) {
      armTimeout(meetingKey);
      return;
    }

    scheduled.delete(meetingKey);
    firedOccurrenceKeys.add(toFiredOccurrenceKey(meetingKey, scheduledReminder.occurrenceStartMs));

    if (clock.currentUnixEpochMilliseconds < scheduledReminder.occurrenceStartMs) {
      onReminder(toReminderPayload(scheduledReminder.meeting, scheduledReminder.occurrenceStartMs));
    }

    scheduleMeeting(scheduledReminder.meeting);
  };

  return {
    sync: meetingSeries => {
      const nextMeetingKeys = new Set(meetingSeries.map(meeting => toMeetingIdKey(meeting.qualified_id)));

      for (const meetingKey of scheduled.keys()) {
        if (!nextMeetingKeys.has(meetingKey)) {
          unschedule(meetingKey);
        }
      }

      for (const meeting of meetingSeries) {
        scheduleMeeting(meeting);
      }
    },
    stop: () => {
      for (const scheduledReminder of scheduled.values()) {
        clearTimeoutIfScheduled(scheduledReminder);
      }

      scheduled.clear();
      firedOccurrenceKeys.clear();
    },
  };
};
