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
 */

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {ActionsViewModel} from './ActionsViewModel';
import {translateForTest} from 'Util/test/translateForTest';

describe('ActionsViewModel.deleteMessageEveryone', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects the returned promise and leaves the message when attachment deletion fails', async () => {
    const error = new Error('Attachment deletion failed');
    const conversation = {} as never;
    const message = {} as never;
    const deleteMessageForEveryone = jest.fn();
    const messageRepository = {
      getCellsAssetAttachmentIds: jest.fn().mockReturnValue(['attachment-uuid']),
      deleteMessageForEveryone,
    } as never;
    const deleteNodes = jest.fn().mockRejectedValue(error);
    const vm = new ActionsViewModel(
      {} as never,
      {deleteNodes} as never,
      {} as never,
      {} as never,
      {} as never,
      messageRepository,
      {} as never,
      {} as never,
      {} as never,
      translateForTest,
    );
    const showModal = jest.spyOn(PrimaryModal, 'show').mockReturnValue(undefined);

    const deletion = vm.deleteMessageEveryone(conversation, message);
    const modalContent = showModal.mock.calls[0][1];
    const action = modalContent.primaryAction?.action;

    await action?.();
    await expect(deletion).rejects.toBe(error);
    expect(deleteMessageForEveryone).not.toHaveBeenCalled();
  });
});
