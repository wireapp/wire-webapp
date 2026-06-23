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

import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {mapScheduleFormToCreateMeeting} from 'Components/Meeting/mapScheduleFormToCreateMeeting';
import {mapScheduleFormToUpdateMeeting} from 'Components/Meeting/mapScheduleFormToUpdateMeeting';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';

import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';

export type ScheduleMeetingResult =
  | {status: 'success'}
  | {status: 'participantMissingEmail'}
  | {status: 'createFailed'};

export type UpdateMeetingResult = {status: 'success'} | {status: 'participantMissingEmail'} | {status: 'updateFailed'};

export type TryScheduleMeetingDependencies = {
  meetingsRepository: MeetingsRepository;
  fetchMeetings: () => Promise<void>;
};

export type TryUpdateMeetingDependencies = TryScheduleMeetingDependencies;

/**
 * Tries to schedule a meeting with the given form state.
 * @param formState - The form state to schedule the meeting with.
 * @param deps - Repository and list refresh dependencies.
 * @returns A semantic result indicating success or the failure reason.
 */
export async function tryScheduleMeeting(
  formState: ScheduleMeetingFormState,
  dependencies: TryScheduleMeetingDependencies,
): Promise<ScheduleMeetingResult> {
  const mapping = mapScheduleFormToCreateMeeting(formState);

  if (mapping.error === 'participantMissingEmail') {
    return {status: 'participantMissingEmail'};
  }

  try {
    const {meetingsRepository, fetchMeetings} = dependencies;
    await meetingsRepository.createMeeting(mapping.payload);
    await fetchMeetings();
    return {status: 'success'};
  } catch {
    return {status: 'createFailed'};
  }
}

/**
 * Tries to update a meeting with the given form state and invitation diff.
 */
export async function tryUpdateMeeting(
  meetingId: QualifiedId,
  formState: ScheduleMeetingFormState,
  originalInvitedEmails: string[],
  dependencies: TryUpdateMeetingDependencies,
): Promise<UpdateMeetingResult> {
  const mapping = mapScheduleFormToUpdateMeeting(formState, originalInvitedEmails);

  if (mapping.error === 'participantMissingEmail') {
    return {status: 'participantMissingEmail'};
  }

  const {meetingsRepository, fetchMeetings} = dependencies;
  let didUpdateMeeting = false;

  try {
    await meetingsRepository.updateMeeting(meetingId, mapping.payload);
    didUpdateMeeting = true;

    if (mapping.removedEmails.length > 0) {
      await meetingsRepository.removeMeetingInvitation(meetingId, mapping.removedEmails);
    }

    if (mapping.addedEmails.length > 0) {
      await meetingsRepository.addMeetingInvitation(meetingId, mapping.addedEmails);
    }

    await fetchMeetings();
    return {status: 'success'};
  } catch {
    if (didUpdateMeeting) {
      await fetchMeetings();
    }

    return {status: 'updateFailed'};
  }
}
