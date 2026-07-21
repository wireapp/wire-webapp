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
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {task, type Task} from 'true-myth';

import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';
import type {DeleteMeetingModalMode} from 'Components/Meeting/shared/delete/showDeleteMeetingModal';
import {DELETE_MEETING_ERROR_TRANSLATION_KEYS} from 'Components/Meeting/shared/submit/deleteMeetingSubmitErrorKeys';
import {
  isMeetingDeletedDespiteSubmitError,
  shouldRefreshMeetingsListAfterDeleteError,
} from 'Components/Meeting/shared/submit/shouldRefreshMeetingsListAfterSubmitError';
import {showMeetingSubmitError} from 'Components/Meeting/shared/submit/showMeetingSubmitError';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import {canDeleteMeetingForAll, canDeleteMeetingForMe} from 'Components/Meeting/utils/canDeleteMeeting';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {User} from 'Repositories/entity/User';
import type {Translate} from 'Util/localizerUtil';

const inFlightDeleteMeetingIds = new Set<string>();

const toMeetingIdKey = (meetingId: QualifiedId): string => `${meetingId.domain}:${meetingId.id}`;

export const deleteMeetingSubmitResults = {
  succeeded: 'succeeded',
  failed: 'failed',
  deletedButCleanupFailed: 'deletedButCleanupFailed',
  blocked: 'blocked',
  alreadyInFlight: 'alreadyInFlight',
} as const;

export type DeleteMeetingSubmitResult = (typeof deleteMeetingSubmitResults)[keyof typeof deleteMeetingSubmitResults];

export type SubmitDeleteMeetingParams = {
  meetingInstance: MeetingInstance;
  mode: DeleteMeetingModalMode;
  selfUser: User | undefined;
  wallClock: WallClock;
  translate: Translate;
  deleteMeetingForMe: (meetingInstance: MeetingInstance) => Task<void, MeetingSubmitErrors>;
  deleteMeetingForAll: (meetingInstance: MeetingInstance, selfUser: User) => Task<void, MeetingSubmitErrors>;
  removeMeetingByQualifiedId: (meetingId: QualifiedId) => void;
  loadMeetings: () => Promise<void>;
};

const showDeleteNotAllowedModal = (translate: Translate): void => {
  PrimaryModal.show(
    PrimaryModal.type.ACKNOWLEDGE,
    {
      text: {
        title: translate('meetings.deleteModal.error.deleteFailedTitle'),
        message: translate('meetings.deleteModal.error.deleteFailed'),
      },
    },
    undefined,
    translate,
  );
};

const canDeleteMeetingWithMode = (
  meetingInstance: MeetingInstance,
  mode: DeleteMeetingModalMode,
  selfUser: User,
  nowMilliseconds: number,
): boolean =>
  mode === 'forAll'
    ? canDeleteMeetingForAll(meetingInstance, selfUser, nowMilliseconds)
    : canDeleteMeetingForMe(meetingInstance, selfUser, nowMilliseconds);

export const resetInFlightDeleteMeetingsForTest = (): void => {
  inFlightDeleteMeetingIds.clear();
};

export const submitDeleteMeeting = async ({
  meetingInstance,
  mode,
  selfUser,
  wallClock,
  translate,
  deleteMeetingForMe,
  deleteMeetingForAll,
  removeMeetingByQualifiedId,
  loadMeetings,
}: SubmitDeleteMeetingParams): Promise<DeleteMeetingSubmitResult> => {
  if (selfUser === undefined) {
    showDeleteNotAllowedModal(translate);
    return deleteMeetingSubmitResults.blocked;
  }

  const nowMilliseconds = wallClock.currentTimestampInMilliseconds;

  if (!canDeleteMeetingWithMode(meetingInstance, mode, selfUser, nowMilliseconds)) {
    showDeleteNotAllowedModal(translate);
    return deleteMeetingSubmitResults.blocked;
  }

  const meetingIdKey = toMeetingIdKey(meetingInstance.meetingSeries.qualified_id);

  if (inFlightDeleteMeetingIds.has(meetingIdKey)) {
    return deleteMeetingSubmitResults.alreadyInFlight;
  }

  inFlightDeleteMeetingIds.add(meetingIdKey);

  try {
    const deleteTask =
      mode === 'forAll' ? deleteMeetingForAll(meetingInstance, selfUser) : deleteMeetingForMe(meetingInstance);

    const result = await deleteTask;

    if (result.isOk) {
      removeMeetingByQualifiedId(meetingInstance.meetingSeries.qualified_id);
      return deleteMeetingSubmitResults.succeeded;
    }

    if (shouldRefreshMeetingsListAfterDeleteError(result.error)) {
      await task.tryOrElse(() => meetingSubmitErrors.refreshFailed, loadMeetings);
    }

    if (isMeetingDeletedDespiteSubmitError(result.error)) {
      removeMeetingByQualifiedId(meetingInstance.meetingSeries.qualified_id);
      showMeetingSubmitError(translate, result.error, DELETE_MEETING_ERROR_TRANSLATION_KEYS);
      return deleteMeetingSubmitResults.deletedButCleanupFailed;
    }

    showMeetingSubmitError(translate, result.error, DELETE_MEETING_ERROR_TRANSLATION_KEYS);
    return deleteMeetingSubmitResults.failed;
  } finally {
    inFlightDeleteMeetingIds.delete(meetingIdKey);
  }
};
