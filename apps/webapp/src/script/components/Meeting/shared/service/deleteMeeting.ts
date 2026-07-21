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
import type {Task} from 'true-myth';

import {
  meetingConversationSyncErrors,
  type MeetingConversationSyncError,
} from 'Components/Meeting/meetingConversationSync';
import {
  removeAllOtherMeetingParticipants,
  removeMeetingConversationLocally,
  safeLeaveMeetingConversation,
} from 'Components/Meeting/meetingConversationTeardown';
import type {MeetingServiceDeps} from 'Components/Meeting/meetingStore/meetingStoreDeps';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';
import {LEAVE_CALL_REASON} from 'Repositories/calling/enum/LeaveCallReason';
import type {User} from 'Repositories/entity/User';

export type DeleteMeetingCommand = {
  meetingId: QualifiedId;
  qualifiedConversation: QualifiedId;
};

const mapSyncErrorToDeleteError = (error: MeetingConversationSyncError): MeetingSubmitErrors => {
  switch (error) {
    case meetingConversationSyncErrors.removeFailed:
      return meetingSubmitErrors.removeParticipantsFailed;
    case meetingConversationSyncErrors.leaveFailed:
    case meetingConversationSyncErrors.conversationNotFound:
    case meetingConversationSyncErrors.groupIdMissing:
      return meetingSubmitErrors.leaveConversationFailed;
    default:
      return meetingSubmitErrors.leaveConversationFailed;
  }
};

const leaveCallIfActive = (deps: MeetingServiceDeps, qualifiedConversationId: QualifiedId): void => {
  if (deps.callingRepository.findCall(qualifiedConversationId)) {
    deps.callingRepository.leaveCall(qualifiedConversationId, LEAVE_CALL_REASON.MANUAL_LEAVE_BY_UI_CLICK);
  }
};

/**
 * Removes the meeting from the participant's calendar by leaving the MLS conversation.
 * When in a call, leaves the call first.
 */
export const deleteMeetingForMe = (
  command: DeleteMeetingCommand,
  deps: MeetingServiceDeps,
): Task<void, MeetingSubmitErrors> => {
  leaveCallIfActive(deps, command.qualifiedConversation);

  return safeLeaveMeetingConversation(deps.conversationRepository, command.qualifiedConversation).mapRejected(
    mapSyncErrorToDeleteError,
  );
};

/**
 * Deletes the meeting for everyone: remove invitees from MLS, DELETE /meetings while the host is still a member,
 * then remove the conversation locally.
 */
export const deleteMeetingForAll = (
  command: DeleteMeetingCommand,
  selfUser: User,
  deps: MeetingServiceDeps,
): Task<void, MeetingSubmitErrors> => {
  leaveCallIfActive(deps, command.qualifiedConversation);

  return deps.conversationRepository
    .safeGetConversationById(command.qualifiedConversation)
    .mapRejected(() => meetingSubmitErrors.deleteFailed)
    .andThen(conversation =>
      removeAllOtherMeetingParticipants(deps.conversationRepository, conversation, selfUser)
        .mapRejected(mapSyncErrorToDeleteError)
        .andThen(() =>
          deps.meetingsRepository.deleteMeeting(command.meetingId).mapRejected(() => meetingSubmitErrors.deleteFailed),
        )
        .andThen(() =>
          removeMeetingConversationLocally(deps.conversationRepository, command.qualifiedConversation).mapRejected(
            () => meetingSubmitErrors.deleteSucceededButLocalCleanupFailed,
          ),
        ),
    );
};
