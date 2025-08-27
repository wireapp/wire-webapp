/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useLayoutEffect, useRef} from 'react';

import {Virtualizer} from '@tanstack/react-virtual';

import {StatusType} from '../../../message/StatusType';
import {GroupedMessage, isMarker, Marker} from '../utils/virtualizedMessagesGroup';

interface Props {
  messages: (Marker | GroupedMessage)[];
  userId: string;
  isConversationLoaded: boolean;
}

function shouldStickToBottomFromPrev(
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  prevTotalSize: number,
  threshold = 100,
) {
  const scrollElement = virtualizer.options.getScrollElement?.();

  if (!scrollElement) {
    return false;
  }

  const scrollBottomPosition = (virtualizer.scrollOffset || 0) + scrollElement.clientHeight;
  const distanceFromPrevBottom = Math.max(0, prevTotalSize - scrollBottomPosition);

  return distanceFromPrevBottom < threshold;
}

export const useScrollMessages = (
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  {messages, userId, isConversationLoaded}: Props,
) => {
  const prevNbMessages = useRef(0);
  const prevTotalSizeRef = useRef(0);

  useLayoutEffect(() => {
    if (!isConversationLoaded && messages.length === 0) {
      return;
    }

    const lastMessageItem = messages[messages.length - 1];

    if (isMarker(lastMessageItem)) {
      return;
    }

    const lastMessage = lastMessageItem?.message;

    const shouldStickToBottom = shouldStickToBottomFromPrev(virtualizer, prevTotalSizeRef.current, 100);

    if (shouldStickToBottom) {
      // We only want to animate the scroll if there are new messages in the list
      const nbNewMessages = messages.length - prevNbMessages.current;

      if (nbNewMessages >= 1) {
        // Simple content update, we just scroll to bottom if we are in the stick to bottom threshold
        const index = messages.findIndex(message => !isMarker(message) && message.message.id === lastMessage.id);
        if (index !== -1) {
          requestAnimationFrame(() => {
            virtualizer.scrollToIndex(index, {align: 'end'});
          });
        }
      }
    } else if (lastMessage && lastMessage?.status() === StatusType.SENDING && lastMessage.user().id === userId) {
      // The self user just sent a message, we scroll straight to the bottom
      const index = messages.findIndex(message => !isMarker(message) && message.message.id === lastMessage.id);
      if (index !== -1) {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(index, {align: 'end'});
        });
      }
    }

    prevNbMessages.current = messages.length;
    prevTotalSizeRef.current = virtualizer.getTotalSize();
  }, [messages, virtualizer, userId, isConversationLoaded]);
};
