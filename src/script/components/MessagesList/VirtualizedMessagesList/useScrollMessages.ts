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

import {MutableRefObject, useCallback, useLayoutEffect, useRef, useState} from 'react';

import {Virtualizer} from '@tanstack/react-virtual';

import {StatusType} from '../../../message/StatusType';
import {GroupedMessage, isMarker, Marker} from '../utils/virtualizedMessagesGroup';

interface Props {
  messages: (Marker | GroupedMessage)[];
  highlightedMessage?: string;
  userId: string;
  conversationLastReadTimestamp: MutableRefObject<number>;
  setAlreadyScrolledToLastMessage: (scrolled: boolean) => void;
}

export const useScrollMessages = (
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  {messages, highlightedMessage, userId, conversationLastReadTimestamp, setAlreadyScrolledToLastMessage}: Props,
) => {
  const prevNbMessages = useRef(0);
  const newNbMessages = messages.length;

  const initiallyScrolled = useRef(false);
  const newMessagesCount = useRef(messages.length);

  const scrollToMessage = useCallback(() => {
    if (messages.length !== newMessagesCount.current) {
      return;
    }

    for (const message of messages) {
      const lastUnreadMessageIndex = messages.findIndex(
        message => message.timestamp > conversationLastReadTimestamp.current,
      );

      if (lastUnreadMessageIndex !== -1) {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(lastUnreadMessageIndex, {align: 'start'});
          initiallyScrolled.current = true;
          setAlreadyScrolledToLastMessage(true);
        });
        break;
      }

      // If the message is before the last read timestamp, we scroll to the last message
      if (message.timestamp <= conversationLastReadTimestamp.current) {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(messages.length - 1, {align: 'end'});
          initiallyScrolled.current = true;
          setAlreadyScrolledToLastMessage(true);
        });
        break;
      }
    }
  }, [messages, virtualizer, setAlreadyScrolledToLastMessage]);

  useLayoutEffect(() => {
    if (!initiallyScrolled.current && messages.length > 0) {
      scrollToMessage();
    }
  }, [messages.length, scrollToMessage]);

  const [scrollToHighlightedMessage, setScrollToHighlightedMessage] = useState(false);

  useLayoutEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const lastMessageItem = messages[newNbMessages - 1];

    if (isMarker(lastMessageItem)) {
      return;
    }

    const lastMessage = lastMessageItem?.message;

    const element = virtualizer.scrollElement;
    const scrollTop = element?.scrollTop || 0;
    const scrollHeight = element?.scrollHeight || 0;
    const clientHeight = element?.clientHeight || 0;

    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const shouldStickToBottom = distanceFromBottom < 100;

    if (highlightedMessage && !scrollToHighlightedMessage) {
      // If we have an element we want to focus
      const index = messages.findIndex(message => !isMarker(message) && message.message.id === highlightedMessage);

      if (index !== -1) {
        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(index, {align: 'center'});
          setScrollToHighlightedMessage(true);
        });
      }
    } else if (shouldStickToBottom) {
      // We only want to animate the scroll if there are new messages in the list
      const nbNewMessages = newNbMessages - prevNbMessages.current;
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
  }, [highlightedMessage, messages, virtualizer, userId, newNbMessages, scrollToHighlightedMessage]);
};
