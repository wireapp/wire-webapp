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

import {meetingConversationSyncErrors} from 'Components/Meeting/meetingConversationSync';
import {
  removeMeetingConversationLocally,
  safeLeaveMeetingConversation,
  type LeaveMeetingConversationError,
} from 'Components/Meeting/meetingConversationTeardown';
import type {MeetingServiceDeps} from 'Components/Meeting/meetingStore/meetingStoreDeps';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';
import {LEAVE_CALL_REASON} from 'Repositories/calling/enum/LeaveCallReason';

export type DeleteMeetingCommand = {
  meetingId: QualifiedId;
  qualifiedConversation: QualifiedId;
};

const mapLeaveSyncErrorToDeleteError = (error: LeaveMeetingConversationError): MeetingSubmitErrors => {
  switch (error) {
    case meetingConversationSyncErrors.conversationNotFound:
    case meetingConversationSyncErrors.leaveFailed:
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
    mapLeaveSyncErrorToDeleteError,
  );
};

/**
 * Deletes the meeting for everyone via DELETE /meetings.
 * The backend deletes the meeting conversation and notifies remaining members.
 * When in a call, leaves the call first, then removes the conversation locally after a successful delete.
 */
export const deleteMeetingForAll = (
  command: DeleteMeetingCommand,
  deps: MeetingServiceDeps,
): Task<void, MeetingSubmitErrors> => {
  leaveCallIfActive(deps, command.qualifiedConversation);

  return deps.meetingsRepository
    .deleteMeeting(command.meetingId)
    .mapRejected(() => meetingSubmitErrors.deleteFailed)
    .andThen(() =>
      removeMeetingConversationLocally(deps.conversationRepository, command.qualifiedConversation).mapRejected(
        () => meetingSubmitErrors.deleteSucceededButLocalCleanupFailed,
      ),
    );
};
