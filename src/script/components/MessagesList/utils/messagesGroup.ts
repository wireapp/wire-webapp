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
import {isSameDay, fromUnixTime, TIME_IN_MILLIS} from 'Util/TimeUtil';

interface MessagesGroup {
  sender: string;
  firstMessageTimestamp: number;
  lastMessageTimestamp: number;
  messages: Message[];
}

export type Marker = {
  type: 'unread' | 'day';
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
function getMessageMarkerType(
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

  return undefined;
}

export function isMarker(object: any): object is Marker {
  return object && object.type && object.timestamp;
}

/**
 * Determines whether a message should be grouped with a previous one based on timestamp,
 * a message should be grouped if it's sent within the same minute on the clock than the first message in the group
 * or if it's sent within a timeframe (30 seconds) of the previous one
 * @param firstMessageTimestamp unix timestamp of the first message in the group
 * @param previousMessageTimestamp timestamp of the previous message
 * @param currentMessageTimestamp timestamp of the current message
 */
function shouldGroupMessagesByTimestamp(
  firstMessageTimestamp: number,
  previousMessageTimestamp: number,
  currentMessageTimestamp: number,
) {
  // Interval in seconds, within which messages are grouped together
  const GROUPED_MESSAGE_INTERVAL = 30 * TIME_IN_MILLIS.SECOND;

  const currentMessageDate = fromUnixTime(currentMessageTimestamp / TIME_IN_MILLIS.SECOND);
  const firstMessageDate = fromUnixTime(firstMessageTimestamp / TIME_IN_MILLIS.SECOND);

  const currentMinute = currentMessageDate.getMinutes();
  const previousMinute = firstMessageDate.getMinutes();

  const isSentWithinTheSameMinute = currentMinute === previousMinute;
  const isSentWithinTimeInterval = currentMessageTimestamp - previousMessageTimestamp <= GROUPED_MESSAGE_INTERVAL;

  if (isSentWithinTheSameMinute || isSentWithinTimeInterval) {
    return true;
  }
  return false;
}

/**
 * Will group a list of ordered messages in groups of messages from the same sender and close in time
 * @param messages - the sorted list of messages
 * @param lastReadTimestamp - the timestamp of the last read message (used to mark unread messages)
 */
export function groupMessagesBySenderAndTime(messages: Message[], lastReadTimestamp: number) {
  return messages.reduce<Array<MessagesGroup | Marker>>((acc, message, index) => {
    const previousMessage = messages[index - 1];

    const marker = getMessageMarkerType(message, lastReadTimestamp, previousMessage);

    if (marker) {
      // if there is a marker to insert, we insert it before the current message
      acc.push({type: marker, timestamp: message.timestamp()});
    }

    const lastItem = acc[acc.length - 1];
    const lastGroupInfo = isMarker(lastItem) ? undefined : lastItem;

    const areContentMessages = message.isContent() && previousMessage?.isContent();

    if (
      areContentMessages &&
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
