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

import type {UpdateMeeting} from '@wireapp/api-client/lib/meetings/updateMeeting';
import {Result, result} from 'true-myth';

import {getInvitedEmailsFromSelectedUsers} from 'Components/Meeting/getInvitedEmailsFromSelectedUsers';
import {requireScheduleMeetingTimes} from 'Components/Meeting/ScheduleMeetingModal/requireScheduleMeetingTimes';
import {mapRecurrenceOptionToMeetingRecurrence} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingRecurrence';
import type {ScheduleMeetingFormState} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';

import {scheduleFormErrors, ScheduleFormErrors} from './ScheduleFormErrors';

export type MapScheduleFormToUpdateMeetingResult = {
  payload: UpdateMeeting;
  addedEmails: string[];
  removedEmails: string[];
};

const normalizeEmail = (email: string): string => email.toLowerCase();

export const computeInvitationDiff = (
  originalInvitedEmails: string[],
  newInvitedEmails: string[],
): {addedEmails: string[]; removedEmails: string[]} => {
  const originalSet = new Set(originalInvitedEmails.map(normalizeEmail));
  const newSet = new Set(newInvitedEmails.map(normalizeEmail));

  const addedEmails = newInvitedEmails.filter(email => !originalSet.has(normalizeEmail(email)));
  const removedEmails = originalInvitedEmails.filter(email => !newSet.has(normalizeEmail(email)));

  return {addedEmails, removedEmails};
};

export const mapScheduleFormToUpdateMeeting = (
  formState: ScheduleMeetingFormState,
  originalInvitedEmails: string[],
): Result<MapScheduleFormToUpdateMeetingResult, ScheduleFormErrors> => {
  const timesResult = requireScheduleMeetingTimes(formState);
  if (timesResult.isErr) {
    return result.err(timesResult.error);
  }
  const {start, end} = timesResult.value;

  const invitedEmails = getInvitedEmailsFromSelectedUsers(formState.selectedUsers);

  if (invitedEmails.isNothing) {
    return result.err(scheduleFormErrors.participantMissingEmail);
  }

  const recurrence = mapRecurrenceOptionToMeetingRecurrence(formState.recurrence);
  const {addedEmails, removedEmails} = computeInvitationDiff(originalInvitedEmails, invitedEmails.value);

  return result.ok({
    payload: {
      title: formState.title.trim(),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      ...(recurrence !== undefined && {recurrence}),
    },
    addedEmails,
    removedEmails,
  });
};
