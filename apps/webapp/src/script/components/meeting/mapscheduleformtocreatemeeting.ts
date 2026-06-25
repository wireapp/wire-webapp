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
import {result, Result} from 'true-myth';

import {getInvitedEmailsFromSelectedUsers} from 'Components/meeting/getinvitedemailsfromselectedusers';
import {requireScheduleMeetingTimes} from 'Components/meeting/schedulemeetingmodal/requireschedulemeetingtimes';
import {mapRecurrenceOptionToMeetingRecurrence} from 'Components/meeting/schedulemeetingmodal/schedulemeetingrecurrence';
import type {ScheduleMeetingFormState} from 'Components/meeting/schedulemeetingmodal/schedulemeetingtypes';
import type {WallClock} from 'src/script/clock/wallClock';

import {ScheduleFormErrors, scheduleFormErrors} from './scheduleformerrors';

export const mapScheduleFormToCreateMeeting = (
  formState: ScheduleMeetingFormState,
  wallClock: WallClock,
): Result<CreateMeeting, ScheduleFormErrors> => {
  const timesResult = requireScheduleMeetingTimes(formState, wallClock);

  if (timesResult.isErr) {
    return result.err(timesResult.error);
  }

  const {start, end} = timesResult.value;

  const invitedEmails = getInvitedEmailsFromSelectedUsers(formState.selectedUsers);

  if (invitedEmails.isNothing) {
    return result.err(scheduleFormErrors.participantMissingEmail);
  }

  const recurrence = mapRecurrenceOptionToMeetingRecurrence(formState.recurrence);

  return result.ok({
    title: formState.title.trim(),
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    ...(invitedEmails.value.length > 0 && {invited_emails: invitedEmails.value}),
    ...(recurrence !== undefined && {recurrence}),
  });
};
