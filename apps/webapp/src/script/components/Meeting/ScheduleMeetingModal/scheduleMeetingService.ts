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

import {computeParticipantDiff} from 'Components/Meeting/computeMeetingParticipantDiff';
import {mapScheduleFormToCreateMeeting} from 'Components/Meeting/mapScheduleFormToCreateMeeting';
import {mapScheduleFormToUpdateMeeting} from 'Components/Meeting/mapScheduleFormToUpdateMeeting';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {User} from 'Repositories/entity/User';
import type {MeetingsRepository} from 'Repositories/meetings/meetingsRepository';

import type {ScheduleMeetingFormState, ScheduleMeetingMode} from './scheduleMeetingTypes';

export type TryScheduleMeetingDependencies = {
  meetingsRepository: MeetingsRepository;
  conversationRepository: ConversationRepository;
  fetchMeetings: () => Promise<void>;
  wallClock: WallClock;
};

export type TryUpdateMeetingDependencies = TryScheduleMeetingDependencies;

export type TryUpdateMeetingParams = {
  meetingId: QualifiedId;
  formState: ScheduleMeetingFormState;
  qualifiedConversation: Maybe<QualifiedId>;
  originalSelectedUsers: User[];
  dependencies: TryUpdateMeetingDependencies;
};

export type PerformMeetingSubmitParams = {
  mode: ScheduleMeetingMode;
  editingMeetingId: Maybe<QualifiedId>;
  formState: ScheduleMeetingFormState;
  qualifiedConversation: Maybe<QualifiedId>;
  originalSelectedUsers: User[];
  dependencies: TryScheduleMeetingDependencies;
};

export async function performMeetingSubmit({
  mode,
  editingMeetingId,
  formState,
  qualifiedConversation,
  originalSelectedUsers,
  dependencies,
}: PerformMeetingSubmitParams): Promise<Result<void, MeetingSubmitErrors>> {
  if (mode === 'edit') {
    if (editingMeetingId.isNothing) {
      return result.err(meetingSubmitErrors.editMeetingIdMissing);
    }

    return await tryUpdateMeeting({
      meetingId: editingMeetingId.value,
      formState,
      qualifiedConversation,
      originalSelectedUsers,
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
): Task<void, MeetingSubmitErrors> {
  return resultToTask(async () => {
    const mappingResult = mapScheduleFormToCreateMeeting(formState, dependencies.wallClock);

    if (mappingResult.isErr) {
      return result.err(mappingResult.error);
    }

    const {meetingsRepository, conversationRepository, fetchMeetings} = dependencies;
    const createResult = await meetingsRepository.createMeeting(mappingResult.value);

    if (createResult.isErr) {
      return result.err(meetingSubmitErrors.createFailed);
    }

    if (formState.selectedUsers.length > 0) {
      try {
        const conversation = await conversationRepository.getConversationById(
          createResult.value.qualified_conversation,
        );
        await conversationRepository.addUsers(conversation, formState.selectedUsers);
      } catch {
        await fetchMeetings();
        return result.err(meetingSubmitErrors.addParticipantsFailed);
      }
    }

    await fetchMeetings();
    return result.ok(undefined);
  });
}

/**
 * Tries to update a meeting metadata and sync conversation participants.
 */
export function tryUpdateMeeting({
  meetingId,
  formState,
  qualifiedConversation,
  originalSelectedUsers,
  dependencies,
}: TryUpdateMeetingParams): Task<void, MeetingSubmitErrors> {
  return resultToTask(async () => {
    const mappingResult = mapScheduleFormToUpdateMeeting(formState, dependencies.wallClock);

    if (mappingResult.isErr) {
      return result.err(mappingResult.error);
    }

    const {payload} = mappingResult.value;
    const {meetingsRepository, conversationRepository, fetchMeetings} = dependencies;

    const updateResult = await meetingsRepository.updateMeeting(meetingId, payload);

    if (updateResult.isErr) {
      return result.err(meetingSubmitErrors.updateFailed);
    }

    const {usersToAdd, userIdsToRemove} = computeParticipantDiff(originalSelectedUsers, formState.selectedUsers);

    if (usersToAdd.length === 0 && userIdsToRemove.length === 0) {
      await fetchMeetings();
      return result.ok(undefined);
    }

    if (qualifiedConversation.isNothing) {
      return result.err(meetingSubmitErrors.updateFailed);
    }

    const conversation = await conversationRepository.getConversationById(qualifiedConversation.value);

    if (is.nonEmptyArray(userIdsToRemove)) {
      try {
        await conversationRepository.removeMembers(conversation, userIdsToRemove);
      } catch {
        await fetchMeetings();
        return result.err(meetingSubmitErrors.removeParticipantsFailed);
      }
    }

    if (is.nonEmptyArray(usersToAdd)) {
      try {
        await conversationRepository.addUsers(conversation, usersToAdd);
      } catch {
        await fetchMeetings();
        return result.err(meetingSubmitErrors.addParticipantsFailed);
      }
    }

    await fetchMeetings();
    return result.ok(undefined);
  });
}
