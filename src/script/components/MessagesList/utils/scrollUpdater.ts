/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Message} from 'Repositories/entity/message/Message';
import {StatusType} from 'src/script/message/StatusType';

export type FocusedElement = {center?: boolean; element: Element};

type MessageListContext = {
  focusedElement: FocusedElement | null;
  prevScrollHeight: number;
  prevNbMessages: number;
  messages: Message[];
  selfUserId: string;
};

export function updateScroll(
  container: HTMLElement,
  {focusedElement, prevScrollHeight, prevNbMessages, messages, selfUserId}: MessageListContext,
) {
  const newNbMessages = messages.length;
  const lastMessage = messages[newNbMessages - 1];
  const scrollBottomPosition = container.scrollTop + container.clientHeight;
  const shouldStickToBottom = prevScrollHeight - scrollBottomPosition < 100;

  if (focusedElement) {
    // If we have an element we want to focus
    const {element, center} = focusedElement;
    const elementPosition = element.getBoundingClientRect();
    const containerPosition = container.getBoundingClientRect();
    const scrollBy = container.scrollTop + elementPosition.top - containerPosition.top;
    container.scrollTo?.({top: scrollBy - (center ? container.offsetHeight / 2 : 0)});
  } else if (container.scrollTop === 0 && container.scrollHeight > prevScrollHeight) {
    // If we hit the top and new messages were loaded, we keep the scroll position stable
    container.scrollTop = container.scrollHeight - prevScrollHeight;
  } else if (shouldStickToBottom) {
    // We only want to animate the scroll if there are new messages in the list
    const nbNewMessages = newNbMessages - prevNbMessages;
    if (nbNewMessages <= 1) {
      // We only want to animate the scroll if there is a single new message (many messages added at once means we are navigating the messages list)
      const behavior = prevNbMessages !== newNbMessages ? 'smooth' : 'auto';
      // Simple content update, we just scroll to bottom if we are in the stick to bottom threshold
      container.scrollTo?.({behavior, top: container.scrollHeight});
    }
  } else if (lastMessage && lastMessage.status() === StatusType.SENDING && lastMessage.user().id === selfUserId) {
    // The self user just sent a message, we scroll straight to the bottom
    container.scrollTo?.({behavior: 'smooth', top: container.scrollHeight});
  }
  return container.scrollHeight;
}
