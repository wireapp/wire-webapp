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

import {MutableRefObject, useEffect, useRef, useState} from 'react';

import {Virtualizer} from '@tanstack/react-virtual';

import {Conversation} from 'Repositories/entity/Conversation';

import {StatusType} from '../../../message/StatusType';
import {GroupedMessage, isMarker, Marker} from '../utils/messagesGroup';

interface Props {
  conversation: Conversation;
  messages: (Marker | GroupedMessage)[];
  highlightedMessage?: string;
  userId: string;
  conversationLastReadTimestamp: MutableRefObject<number>;
  setHighlightedMessage: (messageId: string | undefined) => void;
}

export const useScrollMessages = (
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  {conversation, messages, highlightedMessage, userId, conversationLastReadTimestamp, setHighlightedMessage}: Props,
) => {
  const hasInitialScrollRef = useRef(false);
  const [hasScrolledToHighlightedMessage, setHasScrolledToHighlightedMessage] = useState(false);

  // 🟡 Scroll to highlightedMessage ONCE — only once per mount
  useEffect(() => {
    if (!highlightedMessage || hasScrolledToHighlightedMessage) {
      return;
    }

    const index = messages.findIndex(message => !isMarker(message) && message.message.id === highlightedMessage);

    if (index === -1) {
      return;
    }

    setHasScrolledToHighlightedMessage(true);

    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(index, {align: 'center'});
    });
  }, [highlightedMessage, hasScrolledToHighlightedMessage, messages, virtualizer]);

  // This function scroll to currently send message by self user.
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    if (isMarker(lastMessage)) {
      return;
    }

    const isSendingStatus = lastMessage.message.status() === StatusType.SENDING;

    if (virtualizer.isScrolling && !isSendingStatus) {
      return;
    }

    if (isSendingStatus && lastMessage.message.user().id === userId) {
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(messages.length - 1);
      });
    }
  }, [messages, userId, virtualizer]);

  // This function scrolling to the first unread message or bottom to the message list on initialization.
  useEffect(() => {
    if (hasInitialScrollRef.current) {
      return;
    }

    if (messages.length === 0) {
      return;
    }

    if (virtualizer.isScrolling) {
      return;
    }

    if (highlightedMessage && !hasScrolledToHighlightedMessage) {
      return;
    }

    let lastUnreadMessageIndex = messages.length - 1;

    const firstUnreadMessage = messages.findIndex(message => {
      if (!isMarker(message)) {
        if (message.message.from === userId && message.timestamp >= conversationLastReadTimestamp.current) {
          return true;
        }

        return message.timestamp > conversationLastReadTimestamp.current;
      }

      return false;
    });

    if (firstUnreadMessage !== -1) {
      lastUnreadMessageIndex = firstUnreadMessage;
    }

    requestAnimationFrame(() => {
      virtualizer.scrollToIndex(lastUnreadMessageIndex, {align: 'end'});
      hasInitialScrollRef.current = true;
    });
  }, [conversation, userId, virtualizer, messages, conversationLastReadTimestamp, highlightedMessage]);
};
