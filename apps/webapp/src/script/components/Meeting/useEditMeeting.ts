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

import {mapMeetingToScheduleFormState} from 'Components/Meeting/mapMeetingToScheduleFormState';
import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {useScheduleMeetingModal} from './ScheduleMeetingModal/useScheduleMeetingModal';

export const useEditMeeting = () => {
  const {mainViewModel} = useApplicationContext();
  const conversationRepository = mainViewModel.content.repositories.conversation;
  const openEdit = useScheduleMeetingModal(state => state.openEdit);

  const editMeeting = useCallback(
    async (meeting: Meeting) => {
      const conversation = await conversationRepository.getConversationById(meeting.qualified_conversation);
      const selectedUsers = [...conversation.participating_user_ets()];
      const formState = mapMeetingToScheduleFormState(meeting, selectedUsers);

      openEdit(meeting, formState, meeting.qualified_conversation, selectedUsers);
    },
    [conversationRepository, openEdit],
  );

  return {editMeeting};
};
