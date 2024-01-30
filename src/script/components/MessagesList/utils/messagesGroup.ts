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

import {Message} from 'src/script/entity/message/Message';
import {differenceInMinutes, isSameDay} from 'Util/TimeUtil';

import {shouldGroupMessagesByTimestamp} from './MessagesGroupingUtil';

export type MessagesGroup = {
  sender: string;
  firstMessageTimestamp: number;
  lastMessageTimestamp: number;
  messages: Message[];
};

export type Marker = {
  type: 'unread' | 'day' | 'hour';
  timestamp: number;
};

/**
 * Return a marker that should be displayed right before the given message.
 * A marker would indicated a new day, hour or unread section
 *
 * @param message The message we want to render
 * @param lastReadTimestamp If given will check new messages from this timestamp instead of live value of conversation.last_read_timestamp()
 * @param previousMessage The right before in the conversation
 */
export function getMessageMarkerType(
  message: Message,
  lastReadTimestamp: number,
  previousMessage?: Message,
): Marker['type'] | undefined {
  if (!previousMessage || message.isCall()) {
    return undefined;
  }

  const previousMessageTimestamp = previousMessage.timestamp();
  const currentMessageTimestamp = message.timestamp();

  const isFirstUnread = previousMessageTimestamp <= lastReadTimestamp && currentMessageTimestamp > lastReadTimestamp;

  if (isFirstUnread) {
    return 'unread';
  }

  if (!isSameDay(previousMessageTimestamp, currentMessageTimestamp)) {
    return 'day';
  }

  if (differenceInMinutes(currentMessageTimestamp, previousMessageTimestamp) > 60) {
    return 'hour';
  }

  return undefined;
}

export function isMarker(object: any): object is Marker {
  return object && object.type && object.timestamp;
}

export function groupMessagesBySenderAndTime(messages: Message[], lastReadTimestamp: number) {
  return messages.reduce<Array<MessagesGroup | Marker>>((acc, message, index) => {
    const lastItem = acc[acc.length - 1];
    const lastGroupInfo = isMarker(lastItem) ? undefined : lastItem;

    const marker = getMessageMarkerType(message, lastReadTimestamp, messages[index - 1]);

    if (marker) {
      // if there is a marker to insert, we insert it before the current message
      acc.push({type: marker, timestamp: message.timestamp()});
    }

    if (
      lastGroupInfo &&
      lastGroupInfo.sender === message.from &&
      shouldGroupMessagesByTimestamp(
        lastGroupInfo.firstMessageTimestamp,
        lastGroupInfo.lastMessageTimestamp,
        message.timestamp(),
      )
    ) {
      lastGroupInfo.messages.push(message);
      lastGroupInfo.lastMessageTimestamp = message.timestamp();
    } else {
      acc.push({
        sender: message.from,
        firstMessageTimestamp: message.timestamp(),
        lastMessageTimestamp: message.timestamp(),
        messages: [message],
      });
    }
    return acc;
  }, []);
}
