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

import type {CreateMeeting} from '@wireapp/api-client/lib/meetings/createMeeting';

import {getInvitedEmailsFromSelectedUsers} from 'Components/Meeting/getInvitedEmailsFromSelectedUsers';
import {requireScheduleMeetingTimes} from 'Components/Meeting/ScheduleMeetingModal/requireScheduleMeetingTimes';
import {mapRecurrenceOptionToMeetingRecurrence} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingRecurrence';
import type {ScheduleMeetingFormState} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';

export type MapScheduleFormToCreateMeetingError = 'participantMissingEmail';

export type MapScheduleFormToCreateMeetingResult =
  | {payload: CreateMeeting; error?: undefined}
  | {payload?: undefined; error: MapScheduleFormToCreateMeetingError};

export const mapScheduleFormToCreateMeeting = (
  formState: ScheduleMeetingFormState,
): MapScheduleFormToCreateMeetingResult => {
  const {start, end} = requireScheduleMeetingTimes(formState);

  const invitedEmails = getInvitedEmailsFromSelectedUsers(formState.selectedUsers);

  if (invitedEmails.isNothing) {
    return {error: 'participantMissingEmail'};
  }

  const recurrence = mapRecurrenceOptionToMeetingRecurrence(formState.recurrence);

  return {
    payload: {
      title: formState.title.trim(),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      ...(invitedEmails.value.length > 0 && {invited_emails: invitedEmails.value}),
      ...(recurrence !== undefined && {recurrence}),
    },
  };
};
