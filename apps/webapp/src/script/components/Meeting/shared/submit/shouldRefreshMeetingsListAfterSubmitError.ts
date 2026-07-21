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

import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';

/**
 * Returns whether meeting metadata was already persisted before the submit failed.
 * Partial failures should refresh the meetings list and must not invite a full retry.
 */
export const isMeetingPersistedDespiteSubmitError = (error: MeetingSubmitErrors): boolean => {
  switch (error) {
    case meetingSubmitErrors.addParticipantsFailed:
    case meetingSubmitErrors.conversationSetupFailed:
    case meetingSubmitErrors.removeParticipantsFailed:
      return true;
    default:
      return false;
  }
};

/**
 * Returns whether the meeting was already deleted on the server before the delete flow failed.
 */
export const isMeetingDeletedDespiteSubmitError = (error: MeetingSubmitErrors): boolean =>
  error === meetingSubmitErrors.deleteSucceededButLocalCleanupFailed;

/**
 * Returns whether the meetings list should be refreshed after a failed submit.
 */
export const shouldRefreshMeetingsListAfterSubmitError = isMeetingPersistedDespiteSubmitError;

/**
 * Returns whether the meetings list should be refreshed after a failed delete submit.
 */
export const shouldRefreshMeetingsListAfterDeleteError = (error: MeetingSubmitErrors): boolean => {
  switch (error) {
    case meetingSubmitErrors.deleteSucceededButLocalCleanupFailed:
    case meetingSubmitErrors.deleteFailed:
      return true;
    default:
      return false;
  }
};
