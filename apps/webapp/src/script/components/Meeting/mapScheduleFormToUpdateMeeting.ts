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

import type {WallClock} from '@enormora/wall-clock/wall-clock';
import type {UpdateMeeting} from '@wireapp/api-client/lib/meetings/updateMeeting';
import {Result, result} from 'true-myth';

import {getInvitedEmailsFromSelectedUsers} from 'Components/Meeting/getInvitedEmailsFromSelectedUsers';
import {requireScheduleMeetingTimes} from 'Components/Meeting/ScheduleMeetingModal/requireScheduleMeetingTimes';
import {mapRecurrenceOptionToMeetingRecurrence} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingRecurrence';
import type {ScheduleMeetingFormState} from 'Components/Meeting/ScheduleMeetingModal/scheduleMeetingTypes';

import {createParticipantMissingEmailError, ScheduleFormErrors} from './ScheduleFormErrors';

export type MapScheduleFormToUpdateMeetingResult = {
  payload: UpdateMeeting;
  addedParticipantEmails: string[];
  removedParticipantEmails: string[];
};

const normalizeEmail = (email: string): string => email.toLowerCase();

/**
 * Diff backend `invited_emails` lists. Values are Wire contact profile emails, not free-text invites.
 */
export const computeInvitationDiff = (
  originalInvitedParticipantEmails: string[],
  newInvitedParticipantEmails: string[],
): {addedParticipantEmails: string[]; removedParticipantEmails: string[]} => {
  const originalSet = new Set(originalInvitedParticipantEmails.map(normalizeEmail));
  const newSet = new Set(newInvitedParticipantEmails.map(normalizeEmail));

  const addedParticipantEmails = newInvitedParticipantEmails.filter(email => !originalSet.has(normalizeEmail(email)));
  const removedParticipantEmails = originalInvitedParticipantEmails.filter(email => !newSet.has(normalizeEmail(email)));

  return {addedParticipantEmails, removedParticipantEmails};
};

export const mapScheduleFormToUpdateMeeting = (
  formState: ScheduleMeetingFormState,
  originalInvitedParticipantEmails: string[],
  wallClock: WallClock,
): Result<MapScheduleFormToUpdateMeetingResult, ScheduleFormErrors> => {
  const timesResult = requireScheduleMeetingTimes(formState, wallClock);
  if (timesResult.isErr) {
    return result.err(timesResult.error);
  }
  const {start, end} = timesResult.value;

  const {emails: invitedEmails, usersWithoutEmail} = getInvitedEmailsFromSelectedUsers(formState.selectedUsers);

  if (usersWithoutEmail.length > 0) {
    return result.err(createParticipantMissingEmailError(usersWithoutEmail.map(user => user.name())));
  }

  const recurrence = mapRecurrenceOptionToMeetingRecurrence(formState.recurrence);
  const {addedParticipantEmails, removedParticipantEmails} = computeInvitationDiff(
    originalInvitedParticipantEmails,
    invitedEmails,
  );

  return result.ok({
    payload: {
      title: formState.title.trim(),
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      recurrence: recurrence ?? null,
    },
    addedParticipantEmails,
    removedParticipantEmails,
  });
};
