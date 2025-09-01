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

import {MutableRefObject, useEffect} from 'react';

import {Virtualizer} from '@tanstack/react-virtual';

import {filterMessages} from 'Components/MessagesList/utils/messagesFilter';
import {groupMessagesBySenderAndTime, isMarker} from 'Components/MessagesList/utils/virtualizedMessagesGroup';
import {Conversation} from 'Repositories/entity/Conversation';
import {Message} from 'Repositories/entity/message/Message';

interface Props {
  conversation: Conversation;
  isConversationLoaded: boolean;
  allMessages: Message[];
  conversationLastReadTimestamp: MutableRefObject<number>;
}

export const useLoadInitialMessage = (
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  {conversation, isConversationLoaded, allMessages, conversationLastReadTimestamp}: Props,
) => {
  useEffect(() => {
    if (isConversationLoaded) {
      let scrollAlign: 'start' | 'center' | 'end' = 'end';

      const filteredMessages = filterMessages(allMessages);
      const groupedMessages = groupMessagesBySenderAndTime(filteredMessages, conversationLastReadTimestamp.current);

      const initialMessageIndex = groupedMessages.findIndex(message => {
        return !isMarker(message) && message.message.id === conversation.initialMessage()?.id;
      });

      const firstUnreadMessageIndex = groupedMessages.findIndex(
        message => !isMarker(message) && message.timestamp > conversationLastReadTimestamp.current,
      );

      let nextScrollIndex = groupedMessages.length - 1; // Default to the last message

      if (conversation.initialMessage()?.id && initialMessageIndex !== -1) {
        nextScrollIndex = initialMessageIndex;
        scrollAlign = 'center';
      } else if (firstUnreadMessageIndex !== -1) {
        nextScrollIndex = firstUnreadMessageIndex - 1;
        scrollAlign = 'start';
      }

      const nextMessageIndex = nextScrollIndex;
      const hasInitialMessage = nextMessageIndex !== -1;
      const scrollIndex = hasInitialMessage ? nextMessageIndex : allMessages.length - 1;

      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(scrollIndex, {align: scrollAlign});
      });
    }
  }, [virtualizer, isConversationLoaded]);
};
