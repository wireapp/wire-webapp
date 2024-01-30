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

import {EventMapper} from 'src/script/conversation/EventMapper';
import {Conversation} from 'src/script/entity/Conversation';
import {Message} from 'src/script/entity/message/Message';
import {createMessageAddEvent} from 'test/helper/EventGenerator';
import {getRandomNumber} from 'Util/NumberUtil';
import {createUuid} from 'Util/uuid';

import {groupMessagesBySenderAndTime} from './messagesGroup';

describe('MessagesGroup', () => {
  const eventMapper = new EventMapper();
  const conversation = new Conversation(createUuid(), 'domain');

  it('should group messages by sender', () => {
    const sender = 'user1';
    const sizeGroup = getRandomNumber(1, 10);
    const nbOtherMessages = getRandomNumber(1, 10);

    // those are messages from different senders. They should not be grouped
    const otherSenderMessages = [...Array(nbOtherMessages)].map(() => createMessageAddEvent());

    const sameSenderMessages = Array(sizeGroup).fill(createMessageAddEvent({overrides: {from: sender}}));

    const allMessages = [...otherSenderMessages, ...sameSenderMessages].map(
      event => eventMapper.mapJsonEvent(event, conversation) as Message,
    );

    const groupedMessages = groupMessagesBySenderAndTime(allMessages);
    // We expect the number of groups to be the number of different senders + the group that contains all the message from user1
    expect(groupedMessages.length).toBe(nbOtherMessages + 1);

    // We expect the last group to have all the messages from the same sender
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    expect(lastGroup.messages.length).toBe(sizeGroup);
    expect(lastGroup.sender).toBe(sender);
  });
});
