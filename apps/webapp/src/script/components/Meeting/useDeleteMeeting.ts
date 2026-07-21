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

import {useCallback} from 'react';

import {container} from 'tsyringe';

import {useMeetingStore} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {
  showDeleteMeetingModal,
  type DeleteMeetingModalMode,
} from 'Components/Meeting/shared/delete/showDeleteMeetingModal';
import {DELETE_MEETING_ERROR_TRANSLATION_KEYS} from 'Components/Meeting/shared/submit/deleteMeetingSubmitErrorKeys';
import {showMeetingSubmitError} from 'Components/Meeting/shared/submit/showMeetingSubmitError';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import {UserState} from 'Repositories/user/userState';
import {useApplicationContext} from 'src/script/page/rootProvider';

export const useDeleteMeeting = () => {
  const {translate, fireAndForgetInvoker} = useApplicationContext();
  const deleteMeetingForMe = useMeetingStore(state => state.deleteMeetingForMe);
  const deleteMeetingForAll = useMeetingStore(state => state.deleteMeetingForAll);
  const selfUser = container.resolve(UserState).self();

  const submitDelete = useCallback(
    (meetingInstance: MeetingInstance, mode: DeleteMeetingModalMode) => {
      if (selfUser === undefined) {
        return;
      }

      const deleteTask =
        mode === 'forAll' ? deleteMeetingForAll(meetingInstance, selfUser) : deleteMeetingForMe(meetingInstance);

      fireAndForgetInvoker.fireAndForget(async () => {
        const result = await deleteTask;

        if (result.isErr) {
          showMeetingSubmitError(translate, result.error, DELETE_MEETING_ERROR_TRANSLATION_KEYS);
        }
      });
    },
    [deleteMeetingForAll, deleteMeetingForMe, fireAndForgetInvoker, selfUser, translate],
  );

  const openDeleteMeetingModal = useCallback(
    (meetingInstance: MeetingInstance, mode: DeleteMeetingModalMode) => {
      showDeleteMeetingModal({
        mode,
        translate,
        onConfirm: () => submitDelete(meetingInstance, mode),
      });
    },
    [submitDelete, translate],
  );

  return {openDeleteMeetingModal};
};
