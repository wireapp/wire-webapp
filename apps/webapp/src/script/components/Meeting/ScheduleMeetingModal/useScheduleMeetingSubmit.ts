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
import {useMeetingStore} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';
import type {Translate} from 'Util/localizerUtil';

import {SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS} from 'Components/Meeting/shared/submit/meetingSubmitErrorKeys';
import type {MeetingSubmitSuccess, UpdateMeetingParams} from 'Components/Meeting/shared/service/meetingService';
import type {ScheduleMeetingCommand} from 'Components/Meeting/shared/types/meetingCommandTypes';
import type {ScheduleMeetingFormState, ScheduleMeetingMode} from './scheduleMeetingTypes';
import {shouldRefreshMeetingsListAfterSubmitError} from 'Components/Meeting/shared/submit/shouldRefreshMeetingsListAfterSubmitError';
import {showMeetingPartialAddFailureModal} from 'Components/Meeting/shared/submit/showMeetingPartialAddFailureModal';
import {useScheduleMeetingModal} from './useScheduleMeetingModal';

const showMeetingSubmitError = (translate: Translate, error: MeetingSubmitErrors): void => {
  const {titleKey, messageKey} = SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS[error];
  PrimaryModal.show(
    PrimaryModal.type.ACKNOWLEDGE,
    {
      text: {
        title: translate(titleKey),
        message: translate(messageKey),
      },
    },
    undefined,
    translate,
  );
};

type SubmitMeetingParams = {
  formState: ScheduleMeetingFormState;
  mode: ScheduleMeetingMode;
  editingMeetingId: Maybe<QualifiedId>;
  qualifiedConversation: Maybe<QualifiedId>;
  originalRecurrence: UpdateMeetingParams['originalRecurrence'];
  originalSelectedUsers: User[];
  wallClock: WallClock;
  scheduleMeeting: (command: ScheduleMeetingCommand) => Task<MeetingSubmitSuccess, MeetingSubmitErrors>;
  updateMeeting: (params: UpdateMeetingParams) => Task<MeetingSubmitSuccess, MeetingSubmitErrors>;
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

  return updateMeeting({
    meetingId: editingMeetingId.value,
    formState,
    qualifiedConversation,
    originalRecurrence,
    originalSelectedUsers,
  });
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
    async (formState: ScheduleMeetingFormState): Promise<boolean> => {
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
        showMeetingSubmitError(translate, submitResult.error);
        return false;
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

      return true;
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
