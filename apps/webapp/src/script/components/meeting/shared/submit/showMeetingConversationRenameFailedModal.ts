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

import type {Task} from 'true-myth';

import {meetingSubmitErrors, type MeetingSubmitErrors} from 'Components/meeting/meetingSubmitErrors';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {Translate} from 'Util/localizerUtil';

type ShowMeetingConversationRenameFailedModalParams = {
  translate: Translate;
  retryRename: () => Task<void, MeetingSubmitErrors>;
};

/**
 * Shows a confirm modal after the meeting was updated but conversation rename failed.
 * Retry re-issues only the conversation rename.
 */
export const showMeetingConversationRenameFailedModal = ({
  translate,
  retryRename,
}: ShowMeetingConversationRenameFailedModalParams): void => {
  PrimaryModal.show(
    PrimaryModal.type.CONFIRM,
    {
      closeOnConfirm: true,
      closeOnSecondaryAction: true,
      primaryAction: {
        action: async () => {
          const result = await retryRename();
          if (result.isErr && result.error === meetingSubmitErrors.conversationRenameFailed) {
            showMeetingConversationRenameFailedModal({translate, retryRename});
          }
        },
        text: translate('meetings.scheduleModal.error.conversationRenameFailedRetry'),
      },
      secondaryAction: {
        action: () => {},
        text: translate('meetings.deleteModal.cancel'),
      },
      text: {
        title: translate('meetings.scheduleModal.error.conversationRenameFailedTitle'),
        message: translate('meetings.scheduleModal.error.conversationRenameFailed'),
      },
    },
    undefined,
    translate,
  );
};
