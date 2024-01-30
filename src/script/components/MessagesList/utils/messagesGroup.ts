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

type GroupInfo = {
  sender: string;
  firstMessageTime: number;
  lastMessageTime: number;
  messages: Message[];
};

function shouldGroupMessagesByTimestamp(firstMessageTime: number, lastMessageTime: number, messageTime: number) {
  return true;
}

export function groupMessagesBySenderAndTime(messages: Message[]) {
  const groupedMessages: GroupInfo[] = [];
  for (const message of messages) {
    const lastGroupInfo = groupedMessages[groupedMessages.length - 1];
    if (
      lastGroupInfo &&
      lastGroupInfo.sender === message.from &&
      shouldGroupMessagesByTimestamp(lastGroupInfo.firstMessageTime, lastGroupInfo.lastMessageTime, message.timestamp())
    ) {
      lastGroupInfo.messages.push(message);
      lastGroupInfo.lastMessageTime = message.timestamp();
    } else {
      groupedMessages.push({
        sender: message.from,
        firstMessageTime: message.timestamp(),
        lastMessageTime: message.timestamp(),
        messages: [message],
      });
    }
  }
  return groupedMessages;
}
