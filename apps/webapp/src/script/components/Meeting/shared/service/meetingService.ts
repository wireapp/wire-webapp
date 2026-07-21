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
import type {MeetingWithConversation} from '@wireapp/api-client/lib/meetings/meeting';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import type {AddUsersFailure} from '@wireapp/core/lib/conversation';
import {Task, task} from 'true-myth';

import {computeParticipantDiff} from 'Components/Meeting/computeMeetingParticipantDiff';
import {mapMeetNowCommandToCreateMeeting} from 'Components/Meeting/mapMeetNowCommandToCreateMeeting';
import {mapScheduleCommandToCreateMeeting} from 'Components/Meeting/mapScheduleCommandToCreateMeeting';
import {mapUpdateCommandToUpdateMeeting} from 'Components/Meeting/mapUpdateCommandToUpdateMeeting';
import {
  meetingConversationSyncErrors,
  syncMeetingConversationParticipants,
  type MeetingConversationSyncError,
} from 'Components/Meeting/meetingConversationSync';
import type {MeetingServiceDeps} from 'Components/Meeting/meetingStore/meetingStoreDeps';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import type {
  MeetNowMeetingCommand,
  ScheduleMeetingCommand,
  UpdateMeetingCommand,
} from 'Components/Meeting/shared/types/meetingCommandTypes';
import type {User} from 'Repositories/entity/User';

export type MeetingSubmitSuccess = {failedToAdd: AddUsersFailure[]};

export type CreateMeetingSuccess = MeetingSubmitSuccess & {qualifiedConversation: QualifiedId};

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

const saveMeetingConversationFromResponse = (
  conversationRepository: MeetingServiceDeps['conversationRepository'],
  conversation: MeetingWithConversation['conversation'] | undefined,
  onFailure: MeetingSubmitErrors,
): Task<void, MeetingSubmitErrors> =>
  conversation
    ? conversationRepository.saveMeetingConversationFromBackend(conversation).mapRejected(() => onFailure)
    : task.resolve(undefined);

const createMeetingAndSyncParticipants = (
  createPayload: CreateMeeting,
  selectedUsers: User[],
  deps: MeetingServiceDeps,
): Task<CreateMeetingSuccess, MeetingSubmitErrors> =>
  deps.meetingsRepository
    .createMeeting(createPayload)
    .mapRejected(() => meetingSubmitErrors.createFailed)
    .andThen(createdMeeting =>
      saveMeetingConversationFromResponse(
        deps.conversationRepository,
        createdMeeting.conversation,
        meetingSubmitErrors.conversationSetupFailed,
      ).andThen(() =>
        syncMeetingConversationParticipants(deps.conversationRepository, {
          qualifiedConversationId: createdMeeting.qualified_conversation,
          selectedUsers,
          usersToAdd: selectedUsers,
          userIdsToRemove: [],
          isCreate: true,
        })
          .mapRejected(mapSyncErrorToSubmitError)
          .map(syncResult => ({
            ...syncResult,
            qualifiedConversation: createdMeeting.qualified_conversation,
          })),
      ),
    );

/**
 * Schedules a meeting and establishes the MLS conversation with selected participants.
 */
export const scheduleMeeting = (
  command: ScheduleMeetingCommand,
  deps: MeetingServiceDeps,
): Task<MeetingSubmitSuccess, MeetingSubmitErrors> =>
  createMeetingAndSyncParticipants(mapScheduleCommandToCreateMeeting(command), command.selectedUsers, deps).map(
    ({failedToAdd}) => ({
      failedToAdd,
    }),
  );

/**
 * Creates an instant meeting and establishes the MLS conversation with selected participants.
 */
export const meetNowMeeting = (
  command: MeetNowMeetingCommand,
  deps: MeetingServiceDeps,
): Task<CreateMeetingSuccess, MeetingSubmitErrors> =>
  createMeetingAndSyncParticipants(
    mapMeetNowCommandToCreateMeeting(command, deps.wallClock),
    command.selectedUsers,
    deps,
  );

/**
 * Updates meeting metadata and syncs conversation participants.
 */
export const updateMeeting = (
  command: UpdateMeetingCommand,
  deps: MeetingServiceDeps,
): Task<MeetingSubmitSuccess, MeetingSubmitErrors> => {
  const {usersToAdd, userIdsToRemove} = computeParticipantDiff(command.originalSelectedUsers, command.selectedUsers);

  return deps.meetingsRepository
    .updateMeeting(command.meetingId, mapUpdateCommandToUpdateMeeting(command))
    .mapRejected(() => meetingSubmitErrors.updateFailed)
    .andThen(updatedMeeting =>
      saveMeetingConversationFromResponse(
        deps.conversationRepository,
        updatedMeeting.conversation,
        meetingSubmitErrors.updateFailed,
      ).andThen(() => {
        if (is.emptyArray(usersToAdd) && is.emptyArray(userIdsToRemove)) {
          return task.resolve({failedToAdd: []});
        }

        if (command.qualifiedConversation.isNothing) {
          return task.reject(meetingSubmitErrors.addParticipantsFailed);
        }

        return syncMeetingConversationParticipants(deps.conversationRepository, {
          qualifiedConversationId: command.qualifiedConversation.value,
          selectedUsers: command.selectedUsers,
          usersToAdd,
          userIdsToRemove,
          isCreate: false,
        }).mapRejected(mapSyncErrorToSubmitError);
      }),
    );
};
