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

import {isFunction, isUndefined} from '@sindresorhus/is';
import {act, renderHook} from '@testing-library/react';

import {useCreateConversation} from './useCreateConversation';
import {useCreateConversationModal} from './useCreateConversationModal';

import {NonFederatingBackendsError} from '../../../../core/errors';
import {User} from '../../../../repositories/entity/User';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../page/testSupport/rootContextTestSupport';
import {translateForTest} from '../../../../util/test/translateForTest';
import type {MainViewModel} from '../../../../viewModel/mainViewModel';
import {usePrimaryModalState} from '../../PrimaryModal';
import {withIsolatedCreateConversationTest} from './createConversationTestSupport';
import {ConversationCreationStep} from '../types';
import {getNonFederatingParticipantsModalCopy} from '../utils';

describe('useCreateConversation', () => {
  it(
    'shares submission state between Done and Enter and allows a retry after failure',
    withIsolatedCreateConversationTest(async () => {
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

      let submissions: Promise<void>[] = [];
      act(() => {
        const {done, search} = result.current;
        submissions = [done.onSubmit(click), done.onSubmit(click), search.onSubmit(enter)];
      });

      expect(result.current.done.isSubmitting).toBe(true);
      expect(result.current.search.isSubmitting).toBe(true);
      expect(useCreateConversationModal.getState().isSubmitting).toBe(true);
      expect(createGroupConversation).toHaveBeenCalledTimes(1);

      act(() => {
        modal.hideModal();
        modal.showModal();
        modal.setConversationName('Test group');
        submissions.push(result.current.done.onSubmit(click));
      });

      expect(useCreateConversationModal.getState().isOpen).toBe(false);
      expect(useCreateConversationModal.getState().isSubmitting).toBe(true);
      expect(createGroupConversation).toHaveBeenCalledTimes(1);

      await act(async () => {
        pending.reject(new Error('Conversation creation failed'));
        await Promise.all(submissions);
      });

      expect(createGroupConversation).toHaveBeenCalledTimes(1);
      expect(useCreateConversationModal.getState().isOpen).toBe(false);
      expect(result.current.done.isSubmitting).toBe(false);
      expect(result.current.search.isSubmitting).toBe(false);

      act(() => {
        modal.showModal();
        modal.setConversationName('Test group');
      });

      expect(useCreateConversationModal.getState().isOpen).toBe(true);
      expect(result.current.done.isSubmitting).toBe(false);

      await act(async () => {
        await result.current.search.onSubmit(enter);
      });

      expect(createGroupConversation).toHaveBeenCalledTimes(2);
      expect(enter.preventDefault).toHaveBeenCalledTimes(1);
      expect(useCreateConversationModal.getState().isOpen).toBe(false);
      expect(result.current.done.isSubmitting).toBe(false);
      expect(result.current.search.isSubmitting).toBe(false);

      act(() => {
        modal.showModal();
      });

      expect(useCreateConversationModal.getState().isOpen).toBe(true);
    }),
  );

  it(
    'lets users edit participants and retry after a non-federating backends error',
    withIsolatedCreateConversationTest(async () => {
      const createdConversation = {qualifiedId: {id: 'conversation-id', domain: 'example.com'}};
      const createGroupConversation = jest
        .fn()
        .mockRejectedValueOnce(new NonFederatingBackendsError(['first.example', 'second.example']))
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

      const {result} = renderHook(
        () => {
          return useCreateConversation(getNonFederatingParticipantsModalCopy(translateForTest));
        },
        {wrapper},
      );

      await act(async () => {
        await result.current.onSubmit({key: 'Enter'} as unknown as KeyboardEvent<HTMLInputElement>);
      });

      expect(createGroupConversation).toHaveBeenCalledTimes(1);
      expect(useCreateConversationModal.getState().isSubmitting).toBe(false);
      expect(useCreateConversationModal.getState().isOpen).toBe(false);

      const editParticipantsAction = usePrimaryModalState.getState().currentModalContent.primaryAction?.action;
      if (!isFunction(editParticipantsAction)) {
        throw new Error('Expected the non-federating backends modal to offer participant editing');
      }

      act(() => {
        editParticipantsAction();
      });

      expect(useCreateConversationModal.getState().isOpen).toBe(true);
      expect(useCreateConversationModal.getState().conversationCreationStep).toBe(
        ConversationCreationStep.ParticipantsSelection,
      );
      expect(useCreateConversationModal.getState().conversationName).toBe('Test group');

      const editedParticipant = new User('participant-id', 'example.com', translateForTest);
      act(() => {
        modal.setSelectedContacts([editedParticipant]);
      });

      await act(async () => {
        await result.current.onSubmit({key: 'Enter'} as unknown as KeyboardEvent<HTMLInputElement>);
      });

      expect(createGroupConversation).toHaveBeenCalledTimes(2);
      const retryRequest = createGroupConversation.mock.calls[1];
      if (isUndefined(retryRequest)) {
        throw new Error('Expected the participant retry request to be recorded');
      }
      expect(retryRequest[0]).toEqual([editedParticipant]);
      expect(useCreateConversationModal.getState().isSubmitting).toBe(false);
      expect(useCreateConversationModal.getState().isOpen).toBe(false);
    }),
  );
});
