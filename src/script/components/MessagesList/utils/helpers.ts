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

import {Message} from 'Repositories/entity/message/Message';

import {GroupedMessage, Marker} from './messagesGroup';

export const verticallyCenterMessage = (messages: Message[]): boolean => {
  const filteredMessagesLength = messages.length;
  if (filteredMessagesLength === 1) {
    const [firstMessage] = messages;
    return firstMessage.isMember() && firstMessage.isConnection();
  }
  return false;
};

export const getLastUnreadMessageIndex = (lastReadTimestamp: number, messages: (Marker | GroupedMessage)[]) => {
  return messages.findIndex(message => message.timestamp > lastReadTimestamp);
};
