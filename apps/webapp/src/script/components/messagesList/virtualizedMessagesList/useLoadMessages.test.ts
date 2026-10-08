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

import {act, renderHook} from '@testing-library/react';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import type {Virtualizer} from '@tanstack/react-virtual';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {Message} from 'Repositories/entity/message/message';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {useLoadMessages} from './useLoadMessages';

describe('useLoadMessages', () => {
  it('loads following messages when the virtualized tail is at index zero', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const conversation = new Conversation('conversation', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    const newestMessage = new Message('newest-loaded', undefined, translateForTest);
    newestMessage.timestamp(1);
    conversation.messages_unordered([newestMessage]);
    conversation.last_event_timestamp(2);
    const getSubsequentMessages = jest.fn().mockResolvedValue([]);
    const conversationRepository = {getSubsequentMessages} as unknown as ConversationRepository;
    const parentElement = document.createElement('div');
    const virtualItems = [{index: 0}];
    const measure = jest.fn();
    const virtualizer = {
      measure,
      getVirtualItems: () => {
        return virtualItems;
      },
      getTotalSize: () => {
        return 0;
      },
    } as unknown as Virtualizer<HTMLDivElement, Element>;
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
    const {unmount} = renderHook(
      () => {
        return useLoadMessages(virtualizer, {
          conversation,
          conversationRepository,
          itemsLength: 1,
          shouldPullMessages: false,
          isConversationLoaded: true,
          parentElement,
        });
      },
      {
        wrapper: createRootProviderWrapperForTest(
          createRootContextValueForTest({
            translate: translateForTest,
            fireAndForgetInvoker,
            clock,
          }),
        ),
      },
    );

    try {
      await act(async () => {
        clock.advanceByMilliseconds(99);
      });

      expect(getSubsequentMessages).not.toHaveBeenCalled();

      await act(async () => {
        clock.advanceByMilliseconds(1);
        await fireAndForgetInvoker.waitUntilAllSettled();
      });

      expect(getSubsequentMessages).toHaveBeenCalledTimes(1);
      expect(getSubsequentMessages).toHaveBeenCalledWith(conversation, newestMessage);
      expect(measure).toHaveBeenCalledTimes(1);
    } finally {
      unmount();
    }
  });

  it('does not load following messages when unmounted before the debounce expires', async () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const conversation = new Conversation('conversation', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    const newestMessage = new Message('newest-loaded', undefined, translateForTest);
    newestMessage.timestamp(1);
    conversation.messages_unordered([newestMessage]);
    conversation.last_event_timestamp(2);
    const getSubsequentMessages = jest.fn().mockResolvedValue([]);
    const conversationRepository = {getSubsequentMessages} as unknown as ConversationRepository;
    const parentElement = document.createElement('div');
    const virtualItems = [{index: 0}];
    const virtualizer = {
      measure: jest.fn(),
      getVirtualItems: () => {
        return virtualItems;
      },
      getTotalSize: () => {
        return 0;
      },
    } as unknown as Virtualizer<HTMLDivElement, Element>;
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
    const {unmount} = renderHook(
      () => {
        return useLoadMessages(virtualizer, {
          conversation,
          conversationRepository,
          itemsLength: 1,
          shouldPullMessages: false,
          isConversationLoaded: true,
          parentElement,
        });
      },
      {
        wrapper: createRootProviderWrapperForTest(
          createRootContextValueForTest({
            translate: translateForTest,
            fireAndForgetInvoker,
            clock,
          }),
        ),
      },
    );

    unmount();

    await act(async () => {
      clock.advanceByMilliseconds(100);
      await fireAndForgetInvoker.waitUntilAllSettled();
    });

    expect(getSubsequentMessages).not.toHaveBeenCalled();
  });
});
