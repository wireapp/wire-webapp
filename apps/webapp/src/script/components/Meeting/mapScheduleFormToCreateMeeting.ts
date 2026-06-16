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

import is from '@sindresorhus/is';
import type {CreateMeeting} from '@wireapp/api-client/lib/meetings/createMeeting';
import {Maybe, maybe} from 'true-myth';

import {mapRecurrenceOptionToMeetingRecurrence} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingRecurrence';
import type {ScheduleMeetingFormState} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';

export type MapScheduleFormToCreateMeetingError = 'participantMissingEmail';

export type MapScheduleFormToCreateMeetingResult =
  | {payload: CreateMeeting; error?: undefined}
  | {payload?: undefined; error: MapScheduleFormToCreateMeetingError};

const getInvitedEmails = (selectedUsers: ScheduleMeetingFormState['selectedUsers']): Maybe<string[]> => {
  const emails = selectedUsers.map(user => user.email()).filter((email): email is string => is.nonEmptyString(email));

  const hasMissingEmail = selectedUsers.some(user => !is.nonEmptyString(user.email()));

  if (hasMissingEmail) {
    return maybe.nothing();
  }

  return maybe.just(emails);
};

export const mapScheduleFormToCreateMeeting = (
  formState: ScheduleMeetingFormState,
): MapScheduleFormToCreateMeetingResult => {
  if (formState.start === null || formState.end === null) {
    throw new Error('Schedule meeting form is missing start or end time');
  }

  const invitedEmails = getInvitedEmails(formState.selectedUsers);

  if (invitedEmails.isNothing) {
    return {error: 'participantMissingEmail'};
  }

  const recurrence = mapRecurrenceOptionToMeetingRecurrence(formState.recurrence);

  return {
    payload: {
      title: formState.title.trim(),
      start_time: formState.start.toISOString(),
      end_time: formState.end.toISOString(),
      ...(invitedEmails.value.length > 0 && {invited_emails: invitedEmails.value}),
      ...(recurrence !== undefined && {recurrence}),
    },
  };
};
