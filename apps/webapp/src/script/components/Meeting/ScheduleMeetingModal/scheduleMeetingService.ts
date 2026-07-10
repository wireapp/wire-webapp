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
import type {AddUsersFailure} from '@wireapp/core/lib/conversation';
import {Maybe, Task, task} from 'true-myth';

import {computeParticipantDiff} from 'Components/Meeting/computeMeetingParticipantDiff';
import {mapScheduleFormToCreateMeeting} from 'Components/Meeting/mapScheduleFormToCreateMeeting';
import {mapScheduleFormToUpdateMeeting} from 'Components/Meeting/mapScheduleFormToUpdateMeeting';
import {
  meetingConversationSyncErrors,
  syncMeetingConversationParticipants,
  type MeetingConversationSyncError,
} from 'Components/Meeting/meetingConversationSync';
import type {MeetingStoreDeps} from 'Components/Meeting/meetingStore/meetingStoreDeps';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import type {User} from 'Repositories/entity/User';

import type {ScheduleMeetingFormState, ScheduleMeetingRecurrenceOption} from './scheduleMeetingTypes';

export type MeetingSubmitSuccess = {failedToAdd: AddUsersFailure[]};

export type UpdateMeetingParams = {
  meetingId: QualifiedId;
  formState: ScheduleMeetingFormState;
  qualifiedConversation: Maybe<QualifiedId>;
  originalRecurrence: ScheduleMeetingRecurrenceOption;
  originalSelectedUsers: User[];
};

const mapSyncErrorToSubmitError = (error: MeetingConversationSyncError): MeetingSubmitErrors => {
  switch (error) {
    case meetingConversationSyncErrors.removeFailed:
      return meetingSubmitErrors.removeParticipantsFailed;
    case meetingConversationSyncErrors.addFailed:
    case meetingConversationSyncErrors.establishFailed:
      return meetingSubmitErrors.addParticipantsFailed;
    case meetingConversationSyncErrors.conversationNotFound:
    case meetingConversationSyncErrors.groupIdMissing:
      return meetingSubmitErrors.addParticipantsFailed;
    default:
      return meetingSubmitErrors.addParticipantsFailed;
  }
};

/**
 * Schedules a meeting and establishes the MLS conversation with selected participants.
 */
export const scheduleMeeting = (
  formState: ScheduleMeetingFormState,
  deps: MeetingStoreDeps,
): Task<MeetingSubmitSuccess, MeetingSubmitErrors> => {
  const mappingResult = mapScheduleFormToCreateMeeting(formState, deps.wallClock);

  if (mappingResult.isErr) {
    return task.reject(mappingResult.error);
  }

  return deps.meetingsRepository
    .createMeeting(mappingResult.value)
    .mapRejected(() => meetingSubmitErrors.createFailed)
    .andThen(createdMeeting =>
      syncMeetingConversationParticipants(deps.conversationRepository, {
        qualifiedConversationId: createdMeeting.qualified_conversation,
        selectedUsers: formState.selectedUsers,
        usersToAdd: formState.selectedUsers,
        userIdsToRemove: [],
        isCreate: true,
      }).mapRejected(mapSyncErrorToSubmitError),
    );
};

/**
 * Updates meeting metadata and syncs conversation participants.
 */
export const updateMeeting = (
  {meetingId, formState, qualifiedConversation, originalRecurrence, originalSelectedUsers}: UpdateMeetingParams,
  deps: MeetingStoreDeps,
): Task<MeetingSubmitSuccess, MeetingSubmitErrors> => {
  const mappingResult = mapScheduleFormToUpdateMeeting(formState, deps.wallClock, originalRecurrence);

  if (mappingResult.isErr) {
    return task.reject(mappingResult.error);
  }

  const {usersToAdd, userIdsToRemove} = computeParticipantDiff(originalSelectedUsers, formState.selectedUsers);

  return deps.meetingsRepository
    .updateMeeting(meetingId, mappingResult.value.payload)
    .mapRejected(() => meetingSubmitErrors.updateFailed)
    .andThen(() => {
      if (usersToAdd.length === 0 && userIdsToRemove.length === 0) {
        return task.resolve({failedToAdd: []});
      }

      if (qualifiedConversation.isNothing) {
        return task.reject(meetingSubmitErrors.addParticipantsFailed);
      }

      return syncMeetingConversationParticipants(deps.conversationRepository, {
        qualifiedConversationId: qualifiedConversation.value,
        selectedUsers: formState.selectedUsers,
        usersToAdd,
        userIdsToRemove,
        isCreate: false,
      }).mapRejected(mapSyncErrorToSubmitError);
    });
};
