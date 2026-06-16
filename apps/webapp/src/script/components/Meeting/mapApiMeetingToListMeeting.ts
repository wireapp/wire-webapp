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

import type {Meeting as ApiMeeting} from '@wireapp/api-client/lib/meetings/meeting';

import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import {
  mapMeetingRecurrenceToOption,
  SCHEDULE_MEETING_RECURRENCE_OPTIONS,
} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingRecurrence';

const getRecurrenceScheduleLabel = (apiMeeting: ApiMeeting): string => {
  const option = mapMeetingRecurrenceToOption(apiMeeting.recurrence);

  const selectOption = SCHEDULE_MEETING_RECURRENCE_OPTIONS[option];
  return selectOption.label;
};

export const mapApiMeetingToListMeeting = (apiMeeting: ApiMeeting): Meeting => ({
  start_date: apiMeeting.start_time,
  end_date: apiMeeting.end_time,
  conversation_id: apiMeeting.qualified_conversation.id,
  title: apiMeeting.title,
  schedule: getRecurrenceScheduleLabel(apiMeeting),
});
