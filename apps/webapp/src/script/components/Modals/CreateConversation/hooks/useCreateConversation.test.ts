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

import type {KeyboardEvent, MouseEvent} from 'react';

import {act, renderHook} from '@testing-library/react';

import {useCreateConversation} from './useCreateConversation';
import {useCreateConversationModal} from './useCreateConversationModal';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../../util/test/translateForTest';
import type {MainViewModel} from '../../../../view_model/MainViewModel';
import {getNonFederatingParticipantsModalCopy} from '../utils';

describe('useCreateConversation', () => {
  it('shares one pending submission between Done and Enter and allows a retry after failure', async () => {
    const createdConversation = {qualifiedId: {id: 'conversation-id', domain: 'example.com'}};
    const pending = Promise.withResolvers<typeof createdConversation>();
    const createGroupConversation = jest
      .fn()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(createdConversation);
    const mainViewModel = {
      content: {repositories: {conversation: {createGroupConversation}}},
    } as unknown as MainViewModel;
    const wrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({mainViewModel, translate: translateForTest}),
    );
    const modal = useCreateConversationModal.getState();
    modal.showModal();
    modal.setConversationName('Test group');

    const copy = getNonFederatingParticipantsModalCopy(translateForTest);
    const {result} = renderHook(
      () => {
        const done = useCreateConversation(copy);
        const search = useCreateConversation(copy);
        return {done, search};
      },
      {wrapper},
    );

    const click = {preventDefault: jest.fn()} as unknown as MouseEvent<HTMLButtonElement>;
    const enter = {key: 'Enter', preventDefault: jest.fn()} as unknown as KeyboardEvent<HTMLInputElement>;

    await act(async () => {
      const {done, search} = result.current;
      const submissions = [done.onSubmit(click), done.onSubmit(click), search.onSubmit(enter)];
      pending.reject(new Error('Conversation creation failed'));
      await Promise.all(submissions);
    });
    expect(createGroupConversation).toHaveBeenCalledTimes(1);
    expect(useCreateConversationModal.getState().isOpen).toBe(false);

    act(() => {
      modal.showModal();
      modal.setConversationName('Test group');
    });
    await act(async () => {
      await result.current.search.onSubmit(enter);
    });
    expect(createGroupConversation).toHaveBeenCalledTimes(2);
    expect(enter.preventDefault).toHaveBeenCalledTimes(1);
    expect(useCreateConversationModal.getState().isOpen).toBe(false);
  });
});
