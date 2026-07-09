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

import {createRef} from 'react';

import {createFactory} from '@enormora/objectory';
import {renderHook, act} from '@testing-library/react';
import {Virtualizer} from '@tanstack/react-virtual';

import {Message} from 'Repositories/entity/message/message';

import {GroupedMessage, Marker} from './virtualizedMessagesGroup';
import {getInitialScrollPosition, useScrollToLastUnreadMessage} from './useScrollToLastUnreadMessage';

const messageFactory = createFactory<Message>(() => {
  return {
    id: 'message-id',
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

function createGroupedMessage(messageId: string, timestamp: number): GroupedMessage {
  return groupedMessageFactory.build({
    message: messageFactory.build({id: messageId}),
    timestamp,
    firstMessageTimestamp: timestamp,
    lastMessageTimestamp: timestamp,
  });
}

function createUnreadMarker(timestamp: number): Marker {
  return {
    messageType: 'marker',
    type: 'unread',
    timestamp,
    firstMessageTimestamp: timestamp,
    lastMessageTimestamp: timestamp,
  };
}

describe('useScrollToLastUnreadMessage', () => {
  it('bottom-aligns the newest message when a missed call is the final item', () => {
    const groupedMessages = [
      createGroupedMessage('older-message-1', 10),
      createGroupedMessage('older-message-2', 20),
      createGroupedMessage('missed-call-message', 30),
    ];

    const actualScrollPosition = getInitialScrollPosition(groupedMessages, 30);

    expect(actualScrollPosition.isJust).toBe(true);
    expect(actualScrollPosition.value).toEqual({
      scrollAlign: 'end',
      scrollIndex: 2,
    });
  });

  it('scrolls to the unread marker before the first unread message', () => {
    const groupedMessages = [
      createGroupedMessage('read-message', 10),
      createUnreadMarker(20),
      createGroupedMessage('first-unread-message', 20),
      createGroupedMessage('second-unread-message', 30),
    ];

    const actualScrollPosition = getInitialScrollPosition(groupedMessages, 10);

    expect(actualScrollPosition.isJust).toBe(true);
    expect(actualScrollPosition.value).toEqual({
      scrollAlign: 'start',
      scrollIndex: 1,
    });
  });

  it('waits for grouped messages before measuring and scrolling the loaded conversation', () => {
    let animationFrameCallback: FrameRequestCallback = () => 0;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      animationFrameCallback = callback;
      return 1;
    });

    const scrollToIndex = jest.fn();
    const measure = jest.fn();
    const virtualizer = {
      measure,
      scrollToIndex,
    } as unknown as Virtualizer<HTMLDivElement, Element>;
    const conversationLastReadTimestamp = createRef<number>();
    conversationLastReadTimestamp.current = 30;
    const groupedMessages = [
      createGroupedMessage('older-message-1', 10),
      createGroupedMessage('older-message-2', 20),
      createGroupedMessage('missed-call-message', 30),
    ];

    const renderedHook = renderHook(
      properties => {
        return useScrollToLastUnreadMessage(virtualizer, properties);
      },
      {
        initialProps: {
          isConversationLoaded: true,
          groupedMessages: [],
          conversationLastReadTimestamp,
        },
      },
    );

    expect(measure).not.toHaveBeenCalled();
    expect(scrollToIndex).not.toHaveBeenCalled();

    renderedHook.rerender({
      isConversationLoaded: true,
      groupedMessages,
      conversationLastReadTimestamp,
    });

    expect(measure).toHaveBeenCalledTimes(1);
    expect(scrollToIndex).not.toHaveBeenCalled();

    act(() => {
      animationFrameCallback(0);
    });

    expect(measure).toHaveBeenCalledTimes(2);
    expect(scrollToIndex).toHaveBeenCalledWith(2, {align: 'end'});
  });
});
