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

import {useCallback, useState} from 'react';

import type {WallClock} from '@enormora/wall-clock/wall-clock';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {task, type Maybe, type Task} from 'true-myth';

import {mapScheduleFormToMeetingCommand} from 'Components/Meeting/mapScheduleFormToMeetingCommand';
import {mapScheduleFormToUpdateMeetingCommand} from 'Components/Meeting/mapScheduleFormToUpdateMeetingCommand';
import {useMeetingStore} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';
import type {MeetingSubmitSuccess} from 'Components/Meeting/shared/service/meetingService';
import {getScheduleMeetingSubmitErrorTranslationKeys} from 'Components/Meeting/shared/submit/meetingSubmitErrorKeys';
import {
  isMeetingPersistedDespiteSubmitError,
  shouldRefreshMeetingsListAfterSubmitError,
} from 'Components/Meeting/shared/submit/shouldRefreshMeetingsListAfterSubmitError';
import {showMeetingPartialAddFailureModal} from 'Components/Meeting/shared/submit/showMeetingPartialAddFailureModal';
import {showMeetingSubmitError} from 'Components/Meeting/shared/submit/showMeetingSubmitError';
import type {ScheduleMeetingCommand, UpdateMeetingCommand} from 'Components/Meeting/shared/types/meetingCommandTypes';
import type {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  scheduleMeetingSubmitResults,
  type ScheduleMeetingFormState,
  type ScheduleMeetingMode,
  type ScheduleMeetingSubmitResult,
} from './scheduleMeetingTypes';
import {useScheduleMeetingModal} from './useScheduleMeetingModal';

type SubmitMeetingParams = {
  formState: ScheduleMeetingFormState;
  mode: ScheduleMeetingMode;
  editingMeetingId: Maybe<QualifiedId>;
  qualifiedConversation: Maybe<QualifiedId>;
  originalRecurrence: ScheduleMeetingFormState['recurrence'];
  originalSelectedUsers: User[];
  wallClock: WallClock;
  scheduleMeeting: (command: ScheduleMeetingCommand) => Task<MeetingSubmitSuccess, MeetingSubmitErrors>;
  updateMeeting: (command: UpdateMeetingCommand) => Task<MeetingSubmitSuccess, MeetingSubmitErrors>;
};

const submitMeeting = ({
  formState,
  mode,
  editingMeetingId,
  qualifiedConversation,
  originalRecurrence,
  originalSelectedUsers,
  wallClock,
  scheduleMeeting,
  updateMeeting,
}: SubmitMeetingParams): Task<MeetingSubmitSuccess, MeetingSubmitErrors> => {
  if (mode === 'create') {
    const commandResult = mapScheduleFormToMeetingCommand(formState, wallClock);

    if (commandResult.isErr) {
      return task.reject(meetingSubmitErrors.createFailed);
    }

    return scheduleMeeting(commandResult.value);
  }

  if (editingMeetingId.isNothing) {
    return task.reject(meetingSubmitErrors.editMeetingIdMissing);
  }

  const commandResult = mapScheduleFormToUpdateMeetingCommand({
    formState,
    meetingId: editingMeetingId.value,
    qualifiedConversation,
    originalRecurrence,
    originalSelectedUsers,
    wallClock,
  });

  if (commandResult.isErr) {
    return task.reject(commandResult.error);
  }

  return updateMeeting(commandResult.value);
};

export const useScheduleMeetingSubmit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {translate, wallClock} = useApplicationContext();
  const scheduleMeeting = useMeetingStore(state => state.scheduleMeeting);
  const updateMeeting = useMeetingStore(state => state.updateMeeting);
  const loadMeetings = useMeetingStore(state => state.loadMeetings);
  const mode = useScheduleMeetingModal(state => state.mode);
  const editingMeetingId = useScheduleMeetingModal(state => state.editingMeetingId);
  const qualifiedConversation = useScheduleMeetingModal(state => state.qualifiedConversation);
  const originalRecurrence = useScheduleMeetingModal(state => state.originalRecurrence);
  const originalSelectedUsers = useScheduleMeetingModal(state => state.originalSelectedUsers);

  const submit = useCallback(
    async (formState: ScheduleMeetingFormState): Promise<ScheduleMeetingSubmitResult> => {
      setIsSubmitting(true);

      const submitResult = await submitMeeting({
        formState,
        mode,
        editingMeetingId,
        qualifiedConversation,
        originalRecurrence,
        originalSelectedUsers,
        wallClock,
        scheduleMeeting,
        updateMeeting,
      });

      if (submitResult.isErr) {
        if (shouldRefreshMeetingsListAfterSubmitError(submitResult.error)) {
          await task.tryOrElse(() => meetingSubmitErrors.refreshFailed, loadMeetings);
        }

        setIsSubmitting(false);
        showMeetingSubmitError(translate, submitResult.error, getScheduleMeetingSubmitErrorTranslationKeys(mode));
        return isMeetingPersistedDespiteSubmitError(submitResult.error)
          ? scheduleMeetingSubmitResults.setupFailed
          : scheduleMeetingSubmitResults.submitFailed;
      }

      if (submitResult.value.failedToAdd.length > 0) {
        showMeetingPartialAddFailureModal({
          failedToAdd: submitResult.value.failedToAdd,
          users: formState.selectedUsers,
          translate,
        });
      }

      await task.tryOrElse(() => meetingSubmitErrors.refreshFailed, loadMeetings);

      setIsSubmitting(false);

      return scheduleMeetingSubmitResults.succeeded;
    },
    [
      editingMeetingId,
      loadMeetings,
      mode,
      originalRecurrence,
      originalSelectedUsers,
      qualifiedConversation,
      scheduleMeeting,
      translate,
      updateMeeting,
      wallClock,
    ],
  );

  return {isSubmitting, submit};
};
