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
import is from '@sindresorhus/is';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {Maybe, Result, result, Task, task} from 'true-myth';

import {mapScheduleFormToCreateMeeting} from 'Components/Meeting/mapScheduleFormToCreateMeeting';
import {mapScheduleFormToUpdateMeeting} from 'Components/Meeting/mapScheduleFormToUpdateMeeting';
import {
  meetingSubmitErrors,
  type MeetingSubmitErrors,
  type ScheduleMeetingErrors,
  type UpdateMeetingErrors,
} from 'Components/Meeting/MeetingSubmitErrors';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';

import type {ScheduleMeetingFormState, ScheduleMeetingMode} from './scheduleMeetingTypes';

export type {ScheduleMeetingErrors, UpdateMeetingErrors} from 'Components/Meeting/MeetingSubmitErrors';

export type TryScheduleMeetingDependencies = {
  meetingsRepository: MeetingsRepository;
  fetchMeetings: () => Promise<void>;
  wallClock: WallClock;
};

export type TryUpdateMeetingDependencies = TryScheduleMeetingDependencies;

export type TryUpdateMeetingParams = {
  meetingId: QualifiedId;
  formState: ScheduleMeetingFormState;
  originalInvitedEmails: string[];
  dependencies: TryUpdateMeetingDependencies;
};

export type PerformMeetingSubmitParams = {
  mode: ScheduleMeetingMode;
  editingMeetingId: Maybe<QualifiedId>;
  formState: ScheduleMeetingFormState;
  originalInvitedEmails: string[];
  dependencies: TryScheduleMeetingDependencies;
};

export async function performMeetingSubmit({
  mode,
  editingMeetingId,
  formState,
  originalInvitedEmails,
  dependencies,
}: PerformMeetingSubmitParams): Promise<Result<void, MeetingSubmitErrors>> {
  if (mode === 'edit') {
    if (editingMeetingId.isNothing) {
      return result.err(meetingSubmitErrors.editMeetingIdMissing);
    }

    return await tryUpdateMeeting({
      meetingId: editingMeetingId.value,
      formState,
      originalInvitedEmails,
      dependencies,
    });
  }

  return await tryScheduleMeeting(formState, dependencies);
}

const resultToTask = <T, E>(run: () => Promise<Result<T, E>>): Task<T, E> =>
  task.fromPromise(run()).andThen(value => task.fromResult(value)) as Task<T, E>;

/**
 * Tries to schedule a meeting with the given form state.
 * @param formState - The form state to schedule the meeting with.
 * @param deps - Repository and list refresh dependencies.
 * @returns A task that resolves to success or a semantic failure reason.
 */
export function tryScheduleMeeting(
  formState: ScheduleMeetingFormState,
  dependencies: TryScheduleMeetingDependencies,
): Task<void, ScheduleMeetingErrors> {
  return resultToTask(async () => {
    const mappingResult = mapScheduleFormToCreateMeeting(formState, dependencies.wallClock);

    if (mappingResult.isErr) {
      return result.err(mappingResult.error);
    }

    const {meetingsRepository, fetchMeetings} = dependencies;
    const createResult = await meetingsRepository.createMeeting(mappingResult.value);

    if (createResult.isErr) {
      return result.err(meetingSubmitErrors.createFailed);
    }

    await fetchMeetings();
    return result.ok(undefined);
  });
}

/**
 * Tries to update a meeting with the given form state and invitation diff.
 */
export function tryUpdateMeeting({
  meetingId,
  formState,
  originalInvitedEmails,
  dependencies,
}: TryUpdateMeetingParams): Task<void, UpdateMeetingErrors> {
  return resultToTask(async () => {
    const mappingResult = mapScheduleFormToUpdateMeeting(formState, originalInvitedEmails, dependencies.wallClock);

    if (mappingResult.isErr) {
      return result.err(mappingResult.error);
    }

    const {payload, addedEmails, removedEmails} = mappingResult.value;
    const {meetingsRepository, fetchMeetings} = dependencies;

    const updateResult = await meetingsRepository.updateMeeting(meetingId, payload);

    if (updateResult.isErr) {
      return result.err(meetingSubmitErrors.updateFailed);
    }

    if (is.nonEmptyArray(removedEmails)) {
      const removeResult = await meetingsRepository.removeMeetingInvitation(meetingId, removedEmails);

      if (removeResult.isErr) {
        await fetchMeetings();
        return result.err(meetingSubmitErrors.removeInvitationFailed);
      }
    }

    if (is.nonEmptyArray(addedEmails)) {
      const addResult = await meetingsRepository.addMeetingInvitation(meetingId, addedEmails);

      if (addResult.isErr) {
        await fetchMeetings();
        return result.err(meetingSubmitErrors.addInvitationFailed);
      }
    }

    await fetchMeetings();
    return result.ok(undefined);
  });
}
