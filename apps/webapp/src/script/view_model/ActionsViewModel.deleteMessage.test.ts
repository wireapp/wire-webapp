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

import {ActionsViewModel} from './ActionsViewModel';

import {PrimaryModal} from '../components/Modals/PrimaryModal';
import {translateForTest} from '../util/test/translateForTest';

describe('ActionsViewModel.deleteMessage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const showConfirmation = (isNeverAttempted: boolean): {content: Parameters<typeof PrimaryModal.show>[1]} => {
    const messageRepository = {
      deleteMessage: jest.fn().mockResolvedValue(undefined),
      isPendingAndNeverAttempted: jest.fn().mockReturnValue(isNeverAttempted),
    } as never;
    const viewModel = new ActionsViewModel(
      {} as never,
      {} as never,
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

    void viewModel.deleteMessage({} as never, {id: 'message-1'} as never);

    return {content: showModal.mock.calls[0][1]};
  };

  it('asks "Delete message?" for a pending message nobody can have', () => {
    const {content} = showConfirmation(true);

    expect(content.text).toEqual({
      closeBtnLabel: 'outboxDeletePendingCloseBtn',
      message: 'outboxDeletePendingMessage',
      title: 'outboxDeletePendingHeadline',
    });
    expect(content.primaryAction?.text).toBe('outboxDeletePendingAction');
  });

  it('asks "Delete only for me?" for any other message', () => {
    const {content} = showConfirmation(false);

    expect(content.text).toEqual({
      closeBtnLabel: 'modalConversationDeleteMessageCloseBtn',
      message: 'modalConversationDeleteMessageMessage',
      title: 'modalConversationDeleteMessageHeadline',
    });
    expect(content.primaryAction?.text).toBe('modalConversationDeleteMessageAction');
  });
});
