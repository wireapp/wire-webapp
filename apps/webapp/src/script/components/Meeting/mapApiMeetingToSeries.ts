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
import {differenceInMilliseconds, isAfter, isValid, parseISO} from 'date-fns';
import {result, Result} from 'true-myth';

import {mapMeetingRecurrenceToOption} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingRecurrence';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';

export type MapApiMeetingToSeriesError =
  'invalidStartTime' | 'invalidEndTime' | 'endNotAfterStart' | 'invalidRecurrenceUntil';

export const mapApiMeetingToSeries = (apiMeeting: ApiMeeting): Result<MeetingSeries, MapApiMeetingToSeriesError> => {
  const start = parseISO(apiMeeting.start_time);
  const end = parseISO(apiMeeting.end_time);

  if (!isValid(start)) {
    return result.err('invalidStartTime');
  }

  if (!isValid(end)) {
    return result.err('invalidEndTime');
  }

  if (!isAfter(end, start)) {
    return result.err('endNotAfterStart');
  }

  const recurrenceUntil = apiMeeting.recurrence?.until;

  if (recurrenceUntil !== undefined && !isValid(parseISO(recurrenceUntil))) {
    return result.err('invalidRecurrenceUntil');
  }

  return result.ok({
    series_start_date: apiMeeting.start_time,
    series_end_date: apiMeeting.end_time,
    duration_ms: differenceInMilliseconds(end, start),
    recurrence: mapMeetingRecurrenceToOption(apiMeeting.recurrence),
    ...(recurrenceUntil !== undefined && {recurrence_until: recurrenceUntil}),
    conversation_id: apiMeeting.qualified_conversation.id,
    qualified_conversation: apiMeeting.qualified_conversation,
    qualified_id: apiMeeting.qualified_id,
    qualified_creator: apiMeeting.qualified_creator,
    title: apiMeeting.title,
  });
};
