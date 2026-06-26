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

import {TrashIcon} from '@wireapp/react-ui-kit';

import {DELETE_MEETING_ERROR_TRANSLATION_KEYS} from 'Components/Meeting/deleteMeetingErrorKeys';
import type {DeleteMeetingErrorCode} from 'Components/Meeting/DeleteMeetingErrors';
import {tryDeleteMeeting, type TryDeleteMeetingDependencies} from 'Components/Meeting/deleteMeetingService';
import type {Meeting} from 'Components/Meeting/MeetingList/MeetingList';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {Translate} from 'Util/localizerUtil';

const deleteButtonIconStyles = {
  marginRight: '8px',
};

const showDeleteMeetingError = (translate: Translate, error: DeleteMeetingErrorCode): void => {
  const {titleKey, messageKey} = DELETE_MEETING_ERROR_TRANSLATION_KEYS[error];
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

export const showDeleteMeetingModal = ({
  meeting,
  dependencies,
  translate,
}: {
  meeting: Meeting;
  dependencies: TryDeleteMeetingDependencies;
  translate: Translate;
}): void => {
  PrimaryModal.show(
    PrimaryModal.type.CONFIRM,
    {
      primaryAction: {
        action: async () => {
          const deleteResult = await tryDeleteMeeting({
            meetingId: meeting.qualified_id,
            dependencies,
          });

          if (deleteResult.isErr) {
            showDeleteMeetingError(translate, deleteResult.error);
          }
        },
        text: (
          <>
            <TrashIcon aria-hidden="true" color="currentColor" css={deleteButtonIconStyles} />
            {translate('meetings.deleteModal.confirmAction')}
          </>
        ),
      },
      text: {
        message: translate('meetings.deleteModal.message'),
        title: translate('meetings.deleteModal.title'),
      },
    },
    undefined,
    translate,
  );
};
