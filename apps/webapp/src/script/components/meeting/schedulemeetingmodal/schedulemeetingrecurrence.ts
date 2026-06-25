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

import {MeetingRecurrence, MeetingRecurrenceFrequency} from '@wireapp/api-client/lib/meetings/meetingRecurrence';

import type {TranslationKey} from 'Util/localizerUtil';

import type {ScheduleMeetingRecurrenceOption} from './schedulemeetingtypes';

export const SCHEDULE_MEETING_RECURRENCE_OPTIONS = [
  'doesNotRepeat',
  'daily',
  'weekly',
  'everyTwoWeeks',
  'monthly',
] as const satisfies readonly ScheduleMeetingRecurrenceOption[];

export const SCHEDULE_MEETING_RECURRENCE_TRANSLATION_KEYS = {
  doesNotRepeat: 'meetings.scheduleModal.recurrence.doesNotRepeat',
  daily: 'meetings.scheduleModal.recurrence.daily',
  weekly: 'meetings.scheduleModal.recurrence.weekly',
  everyTwoWeeks: 'meetings.scheduleModal.recurrence.everyTwoWeeks',
  monthly: 'meetings.scheduleModal.recurrence.monthly',
} as const satisfies Record<ScheduleMeetingRecurrenceOption, TranslationKey>;

export const mapRecurrenceOptionToMeetingRecurrence = (
  option: ScheduleMeetingRecurrenceOption,
): MeetingRecurrence | undefined => {
  switch (option) {
    case 'doesNotRepeat':
      return undefined;
    case 'daily':
      return {frequency: MeetingRecurrenceFrequency.DAILY};
    case 'weekly':
      return {frequency: MeetingRecurrenceFrequency.WEEKLY};
    case 'everyTwoWeeks':
      return {frequency: MeetingRecurrenceFrequency.WEEKLY, interval: 2};
    case 'monthly':
      return {frequency: MeetingRecurrenceFrequency.MONTHLY};
  }
};

export const mapMeetingRecurrenceToOption = (recurrence?: MeetingRecurrence): ScheduleMeetingRecurrenceOption => {
  if (recurrence === undefined) {
    return 'doesNotRepeat';
  }

  const biweeklyInterval = 2;
  if (recurrence.frequency === MeetingRecurrenceFrequency.WEEKLY && recurrence.interval === biweeklyInterval) {
    return 'everyTwoWeeks';
  }

  switch (recurrence.frequency) {
    case MeetingRecurrenceFrequency.DAILY:
      return 'daily';
    case MeetingRecurrenceFrequency.WEEKLY:
      return 'weekly';
    case MeetingRecurrenceFrequency.MONTHLY:
      return 'monthly';
    default:
      return 'doesNotRepeat';
  }
};
