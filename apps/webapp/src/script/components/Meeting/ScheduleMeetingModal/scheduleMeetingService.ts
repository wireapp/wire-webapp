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
import type {QualifiedId} from '@wireapp/api-client/lib/user';

import {mapScheduleFormToCreateMeeting} from 'Components/Meeting/mapScheduleFormToCreateMeeting';
import {mapScheduleFormToUpdateMeeting} from 'Components/Meeting/mapScheduleFormToUpdateMeeting';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';

import type {ScheduleMeetingFormState} from './scheduleMeetingTypes';

import type {ScheduleFormErrors} from '../ScheduleFormErrors';

export type ScheduleMeetingResult = {status: 'success'} | {status: ScheduleFormErrors} | {status: 'createFailed'};

export type UpdateMeetingResult = {status: 'success'} | {status: ScheduleFormErrors} | {status: 'updateFailed'};

export type TryScheduleMeetingDependencies = {
  meetingsRepository: MeetingsRepository;
  fetchMeetings: () => Promise<void>;
};

export type TryUpdateMeetingDependencies = TryScheduleMeetingDependencies;

export type TryUpdateMeetingParams = {
  meetingId: QualifiedId;
  formState: ScheduleMeetingFormState;
  originalInvitedEmails: string[];
  dependencies: TryUpdateMeetingDependencies;
};

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
  const mappingResult = mapScheduleFormToCreateMeeting(formState);

  if (mappingResult.isErr) {
    return {status: mappingResult.error};
  }

  const {meetingsRepository, fetchMeetings} = dependencies;
  const createResult = await meetingsRepository.createMeeting(mappingResult.value);

  if (createResult.isErr) {
    return {status: 'createFailed'};
  }

  await fetchMeetings();
  return {status: 'success'};
}

/**
 * Tries to update a meeting with the given form state and invitation diff.
 */
export async function tryUpdateMeeting({
  meetingId,
  formState,
  originalInvitedEmails,
  dependencies,
}: TryUpdateMeetingParams): Promise<UpdateMeetingResult> {
  const mappingResult = mapScheduleFormToUpdateMeeting(formState, originalInvitedEmails);

  if (mappingResult.isErr) {
    return {status: mappingResult.error};
  }

  const {payload, addedEmails, removedEmails} = mappingResult.value;
  const {meetingsRepository, fetchMeetings} = dependencies;

  const updateResult = await meetingsRepository.updateMeeting(meetingId, payload);

  if (updateResult.isErr) {
    return {status: 'updateFailed'};
  }

  if (is.nonEmptyArray(removedEmails)) {
    const removeResult = await meetingsRepository.removeMeetingInvitation(meetingId, removedEmails);

    if (removeResult.isErr) {
      await fetchMeetings();
      return {status: 'updateFailed'};
    }
  }

  if (is.nonEmptyArray(addedEmails)) {
    const addResult = await meetingsRepository.addMeetingInvitation(meetingId, addedEmails);

    if (addResult.isErr) {
      await fetchMeetings();
      return {status: 'updateFailed'};
    }
  }

  await fetchMeetings();
  return {status: 'success'};
}
