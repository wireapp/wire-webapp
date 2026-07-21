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

import {useMeetingStore} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {
  showDeleteMeetingModal,
  type DeleteMeetingModalMode,
} from 'Components/Meeting/shared/delete/showDeleteMeetingModal';
import {submitDeleteMeeting} from 'Components/Meeting/shared/submit/submitDeleteMeeting';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import type {User} from 'Repositories/entity/User';
import {useApplicationContext} from 'src/script/page/rootProvider';

export const useDeleteMeeting = () => {
  const {translate, wallClock, fireAndForgetInvoker} = useApplicationContext();
  const deleteMeetingForMe = useMeetingStore(state => state.deleteMeetingForMe);
  const deleteMeetingForAll = useMeetingStore(state => state.deleteMeetingForAll);
  const removeMeetingByQualifiedId = useMeetingStore(state => state.removeMeetingByQualifiedId);
  const loadMeetings = useMeetingStore(state => state.loadMeetings);

  const submitDelete = useCallback(
    (meetingInstance: MeetingInstance, mode: DeleteMeetingModalMode, selfUser: User | undefined) => {
      fireAndForgetInvoker.fireAndForget(() =>
        submitDeleteMeeting({
          meetingInstance,
          mode,
          selfUser,
          wallClock,
          translate,
          deleteMeetingForMe,
          deleteMeetingForAll,
          removeMeetingByQualifiedId,
          loadMeetings,
        }),
      );
    },
    [
      deleteMeetingForAll,
      deleteMeetingForMe,
      fireAndForgetInvoker,
      loadMeetings,
      removeMeetingByQualifiedId,
      translate,
      wallClock,
    ],
  );

  const openDeleteMeetingModal = useCallback(
    (meetingInstance: MeetingInstance, mode: DeleteMeetingModalMode, selfUser: User | undefined) => {
      showDeleteMeetingModal({
        mode,
        translate,
        onConfirm: () => submitDelete(meetingInstance, mode, selfUser),
      });
    },
    [submitDelete, translate],
  );

  return {openDeleteMeetingModal};
};
