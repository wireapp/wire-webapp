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

import {task} from 'true-myth';

import {meetingSubmitErrors} from 'Components/Meeting/meetingSubmitErrors';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {translateForTest} from 'Util/test/translateForTest';

import {showMeetingConversationRenameFailedModal} from './showMeetingConversationRenameFailedModal';

describe('showMeetingConversationRenameFailedModal', () => {
  beforeEach(() => {
    jest.spyOn(PrimaryModal, 'show').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows a confirm modal with retry copy', () => {
    showMeetingConversationRenameFailedModal({
      translate: translateForTest,
      retryRename: () => task.resolve(undefined),
    });

    expect(PrimaryModal.show).toHaveBeenCalledWith(
      PrimaryModal.type.CONFIRM,
      expect.objectContaining({
        text: {
          title: translateForTest('meetings.scheduleModal.error.conversationRenameFailedTitle'),
          message: translateForTest('meetings.scheduleModal.error.conversationRenameFailed'),
        },
        primaryAction: expect.objectContaining({
          text: translateForTest('meetings.scheduleModal.error.conversationRenameFailedRetry'),
        }),
      }),
      undefined,
      translateForTest,
    );
  });

  it('re-shows the modal when retry rename fails', async () => {
    const retryRename = jest
      .fn()
      .mockReturnValueOnce(task.reject(meetingSubmitErrors.conversationRenameFailed))
      .mockReturnValueOnce(task.resolve(undefined));

    showMeetingConversationRenameFailedModal({
      translate: translateForTest,
      retryRename,
    });

    const firstOptions = (PrimaryModal.show as jest.Mock).mock.calls[0][1];
    await firstOptions.primaryAction.action();

    expect(retryRename).toHaveBeenCalledTimes(1);
    expect(PrimaryModal.show).toHaveBeenCalledTimes(2);
  });
});
