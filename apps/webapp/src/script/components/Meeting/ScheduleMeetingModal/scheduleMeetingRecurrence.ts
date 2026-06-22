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

import {translate} from 'Util/localizerUtil';

import type {ScheduleMeetingRecurrenceOption} from './scheduleMeetingTypes';

export const SCHEDULE_MEETING_RECURRENCE_OPTIONS = {
  doesNotRepeat: {value: 'doesNotRepeat', label: translate('meetings.scheduleModal.recurrence.doesNotRepeat')},
  daily: {value: 'daily', label: translate('meetings.scheduleModal.recurrence.daily')},
  weekly: {value: 'weekly', label: translate('meetings.scheduleModal.recurrence.weekly')},
  everyTwoWeeks: {value: 'everyTwoWeeks', label: translate('meetings.scheduleModal.recurrence.everyTwoWeeks')},
  monthly: {value: 'monthly', label: translate('meetings.scheduleModal.recurrence.monthly')},
};

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
