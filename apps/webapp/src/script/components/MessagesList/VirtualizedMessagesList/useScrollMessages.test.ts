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

import {createFactory} from '@enormora/objectory';
import {renderHook, act} from '@testing-library/react';
import {Virtualizer} from '@tanstack/react-virtual';

import {StatusType} from '../../../message/statusType';
import {Message} from 'Repositories/entity/message/message';
import {GroupedMessage} from '../utils/virtualizedMessagesGroup';

import {useScrollMessages} from './useScrollMessages';

const messageFactory = createFactory<Message>(() => {
  return {
    id: 'message-id',
    status: () => StatusType.SENT,
    user: () => ({id: 'sender-id'}),
  } as Message;
});

const groupedMessageFactory = createFactory<GroupedMessage>(() => {
  return {
    messageType: 'message',
    message: messageFactory.build(),
    timestamp: 1,
    sender: 'sender-id',
    firstMessageTimestamp: 1,
    lastMessageTimestamp: 1,
    shouldGroup: false,
  };
});

function createGroupedMessage(messageId: string): GroupedMessage {
  return groupedMessageFactory.build({
    message: messageFactory.build({id: messageId}),
  });
}

describe('useScrollMessages', () => {
  it('does not scroll to the bottom for the initial loaded message range', () => {
    const scrollElement = {
      clientHeight: 500,
    } as HTMLDivElement;
    const scrollToIndex = jest.fn();
    const virtualizer = {
      getTotalSize: () => 1000,
      options: {
        getScrollElement: () => scrollElement,
      },
      scrollOffset: 500,
      scrollToIndex,
    } as unknown as Virtualizer<HTMLDivElement, Element>;

    renderHook(() => {
      return useScrollMessages(virtualizer, {
        messages: [createGroupedMessage('older-message'), createGroupedMessage('newest-message')],
        userId: 'self-user-id',
        isConversationLoaded: true,
      });
    });

    expect(scrollToIndex).not.toHaveBeenCalled();
  });

  it('keeps sticking to the bottom for later new messages', () => {
    let animationFrameCallback: FrameRequestCallback = () => 0;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      animationFrameCallback = callback;
      return 1;
    });

    const scrollElement = {
      clientHeight: 500,
    } as HTMLDivElement;
    const scrollToIndex = jest.fn();
    const virtualizer = {
      getTotalSize: () => 1000,
      options: {
        getScrollElement: () => scrollElement,
      },
      scrollOffset: 500,
      scrollToIndex,
    } as unknown as Virtualizer<HTMLDivElement, Element>;

    const renderedHook = renderHook(
      properties => {
        return useScrollMessages(virtualizer, properties);
      },
      {
        initialProps: {
          messages: [createGroupedMessage('older-message')],
          userId: 'self-user-id',
          isConversationLoaded: true,
        },
      },
    );

    renderedHook.rerender({
      messages: [createGroupedMessage('older-message'), createGroupedMessage('newest-message')],
      userId: 'self-user-id',
      isConversationLoaded: true,
    });

    expect(scrollToIndex).not.toHaveBeenCalled();

    act(() => {
      animationFrameCallback(0);
    });

    expect(scrollToIndex).toHaveBeenCalledWith(1, {align: 'end'});
  });
});
