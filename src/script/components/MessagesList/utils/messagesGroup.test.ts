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

import {TimeInMillis} from '@wireapp/commons/lib/util/TimeUtil';

import {EventMapper} from 'Repositories/conversation/EventMapper';
import {Conversation} from 'Repositories/entity/Conversation';
import {Message} from 'Repositories/entity/message/Message';
import {createGroupCreationEvent, createMessageAddEvent} from 'test/helper/EventGenerator';
import {getRandomNumber} from 'Util/NumberUtil';
import {createUuid} from 'Util/uuid';

import {groupMessagesBySenderAndTime, isMarker} from './messagesGroup';

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

    const groupedMessages = groupMessagesBySenderAndTime(allMessages, 0);
    // We expect the number of groups to be the number of different senders + the group that contains all the message from user1
    expect(groupedMessages.length).toBe(nbOtherMessages + 1);

    // We expect the last group to have all the messages from the same sender
    const lastGroup: any = groupedMessages[groupedMessages.length - 1];
    expect(lastGroup.messages.length).toBe(sizeGroup);
    expect(lastGroup.sender).toBe(sender);
  });

  it('does not group together system messages and content messages', () => {
    const sender = createUuid();
    const groupCreationMessage = createGroupCreationEvent({from: sender});
    const contentMessage = createMessageAddEvent({overrides: {from: sender}});

    const allMessages = [groupCreationMessage, contentMessage].map(
      event => eventMapper.mapJsonEvent(event, conversation) as Message,
    );

    const groupedMessages = groupMessagesBySenderAndTime(allMessages, 0);
    expect(groupedMessages).toHaveLength(2);
  });

  it('adds markers for unread messages', () => {
    const nbReadMessages = getRandomNumber(1, 10);
    const nbUnreadMessages = getRandomNumber(1, 10);
    const lastReadTimestamp = 10;

    const readMessages = [...Array(nbReadMessages)].map((_, index) =>
      createMessageAddEvent({overrides: {time: new Date(index).toISOString()}}),
    );
    const unreadMessages = [...Array(nbUnreadMessages)].map((_, index) =>
      createMessageAddEvent({overrides: {time: new Date(lastReadTimestamp + 1 + index).toISOString()}}),
    );

    const allMessages = [...readMessages, ...unreadMessages].map(
      event => eventMapper.mapJsonEvent(event, conversation) as Message,
    );

    const groupedMessages = groupMessagesBySenderAndTime(allMessages, lastReadTimestamp);
    expect(groupedMessages.findIndex(group => isMarker(group))).toBe(nbReadMessages);
  });

  it('adds markers for messages sent on different days', () => {
    const nbPrevHourMessages = getRandomNumber(1, 10);
    const nbNextHourMessages = getRandomNumber(1, 10);

    const previousMessages = [...Array(nbPrevHourMessages)].map((_, index) =>
      createMessageAddEvent({overrides: {time: new Date(index).toISOString()}}),
    );
    const nextMessages = [...Array(nbNextHourMessages)].map((_, index) =>
      createMessageAddEvent({
        overrides: {time: new Date(TimeInMillis.DAY + 10 * TimeInMillis.MINUTE + index).toISOString()},
      }),
    );

    const allMessages = [...previousMessages, ...nextMessages].map(
      event => eventMapper.mapJsonEvent(event, conversation) as Message,
    );

    const groupedMessages = groupMessagesBySenderAndTime(allMessages, Infinity);
    const firstMarkerIndex = groupedMessages.findIndex(group => isMarker(group));
    const marker = groupedMessages[firstMarkerIndex] as any;
    expect(firstMarkerIndex).toBe(nbPrevHourMessages);
    expect(marker.type).toBe('day');
  });

  it('splits current group when new unread messages are detected', () => {
    const nbReadMessages = getRandomNumber(1, 10);
    const nbUnreadMessages = getRandomNumber(1, 10);
    const lastReadTimestamp = 10;
    const senderId = 'same-sender';

    const readMessages = [...Array(nbReadMessages)].map((_, index) =>
      createMessageAddEvent({overrides: {from: senderId, time: new Date(index).toISOString()}}),
    );
    const unreadMessages = [...Array(nbUnreadMessages)].map((_, index) =>
      createMessageAddEvent({
        overrides: {from: senderId, time: new Date(lastReadTimestamp + 1 + index).toISOString()},
      }),
    );

    const allMessages = [...readMessages, ...unreadMessages].map(
      event => eventMapper.mapJsonEvent(event, conversation) as Message,
    );

    const groupedMessages = groupMessagesBySenderAndTime(allMessages, lastReadTimestamp);
    /* There should be :
      - one group for read messages from the sender
      - one marker for unread messages
      - one group for unread messages from the sender
    */
    expect(groupedMessages).toHaveLength(3);
    expect((groupedMessages[0] as any).messages).toHaveLength(nbReadMessages);
    expect(isMarker(groupedMessages[1])).toBeTruthy();
    expect((groupedMessages[2] as any).messages).toHaveLength(nbUnreadMessages);
  });
});
