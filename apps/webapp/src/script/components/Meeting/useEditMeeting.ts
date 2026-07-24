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
import {meetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';
import {getScheduleMeetingSubmitErrorTranslationKeys} from 'Components/Meeting/shared/submit/meetingSubmitErrorKeys';
import type {MeetingInstance} from 'Components/Meeting/types/meetingInstance';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {useScheduleMeetingModal} from './ScheduleMeetingModal/useScheduleMeetingModal';

export const useEditMeeting = () => {
  const {translate} = useApplicationContext();
  const loadMeetingForEdit = useMeetingStore(state => state.loadMeetingForEdit);
  const openEdit = useScheduleMeetingModal(state => state.openEdit);

  const editMeeting = useCallback(
    async (meetingInstance: MeetingInstance) => {
      const loadResult = await loadMeetingForEdit(meetingInstance);

      if (loadResult.isErr) {
        const {titleKey, messageKey} =
          getScheduleMeetingSubmitErrorTranslationKeys('edit')[meetingSubmitErrors.updateFailed];
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
        return;
      }

      const {formState, qualifiedConversation, originalSelectedUsers} = loadResult.value;
      openEdit(meetingInstance.meetingSeries, formState, qualifiedConversation, originalSelectedUsers);
    },
    [loadMeetingForEdit, openEdit, translate],
  );

  return {editMeeting};
};
