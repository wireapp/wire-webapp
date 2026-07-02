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

import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {result, type Maybe, type Result} from 'true-myth';

import {useMeetingStore} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';
import type {Translate} from 'Util/localizerUtil';

import {SCHEDULE_MEETING_ERROR_TRANSLATION_KEYS} from './scheduleMeetingErrorKeys';
import type {MeetingSubmitSuccess, UpdateMeetingParams} from './scheduleMeetingService';
import type {ScheduleMeetingFormState, ScheduleMeetingMode} from './scheduleMeetingTypes';
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
  originalSelectedUsers: User[];
  scheduleMeeting: (formState: ScheduleMeetingFormState) => Promise<Result<MeetingSubmitSuccess, MeetingSubmitErrors>>;
  updateMeeting: (params: UpdateMeetingParams) => Promise<Result<MeetingSubmitSuccess, MeetingSubmitErrors>>;
};

const submitMeeting = ({
  formState,
  mode,
  editingMeetingId,
  qualifiedConversation,
  originalSelectedUsers,
  scheduleMeeting,
  updateMeeting,
}: SubmitMeetingParams): Promise<Result<MeetingSubmitSuccess, MeetingSubmitErrors>> => {
  if (mode === 'create') {
    return scheduleMeeting(formState);
  }

  if (editingMeetingId.isNothing) {
    return Promise.resolve(result.err(meetingSubmitErrors.editMeetingIdMissing));
  }

  return updateMeeting({
    meetingId: editingMeetingId.value,
    formState,
    qualifiedConversation,
    originalSelectedUsers,
  });
};

export const useScheduleMeetingSubmit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {translate} = useApplicationContext();
  const scheduleMeeting = useMeetingStore(state => state.scheduleMeeting);
  const updateMeeting = useMeetingStore(state => state.updateMeeting);
  const mode = useScheduleMeetingModal(state => state.mode);
  const editingMeetingId = useScheduleMeetingModal(state => state.editingMeetingId);
  const qualifiedConversation = useScheduleMeetingModal(state => state.qualifiedConversation);
  const originalSelectedUsers = useScheduleMeetingModal(state => state.originalSelectedUsers);

  const submit = useCallback(
    async (formState: ScheduleMeetingFormState): Promise<boolean> => {
      setIsSubmitting(true);

      const submitResult = await submitMeeting({
        formState,
        mode,
        editingMeetingId,
        qualifiedConversation,
        originalSelectedUsers,
        scheduleMeeting,
        updateMeeting,
      });

      setIsSubmitting(false);

      if (submitResult.isErr) {
        showMeetingSubmitError(translate, submitResult.error);
        return false;
      }

      return true;
    },
    [editingMeetingId, mode, originalSelectedUsers, qualifiedConversation, scheduleMeeting, translate, updateMeeting],
  );

  return {isSubmitting, submit};
};
