/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {StatusType} from '../../../message/statusType';
import {ContentMessage} from '../../../repositories/entity/message/contentMessage';
import {User} from '../../../repositories/entity/User';
import {translateForTest} from '../../../util/test/translateForTest';

import {findFirstPendingMessage, startsSendingStateGroup} from './sendingState';
import {groupMessagesBySenderAndTime as groupMessages, isMarker} from './messagesGroup';
import {groupMessagesBySenderAndTime as groupVirtualizedMessages} from './virtualizedMessagesGroup';

const secondInMilliseconds = 1000;

function createMessage(id: string, status: StatusType, secondsOffset: number): ContentMessage {
  const message = new ContentMessage(id, translateForTest);
  message.status(status);
  message.from = 'self';
  message.user(new User('self', '', translateForTest));
  message.timestamp(1_000_000 + secondsOffset * secondInMilliseconds);
  return message;
}

describe('sending states of messages', () => {
  it('starts no group for the first message', () => {
    expect(startsSendingStateGroup(createMessage('a', StatusType.SENDING, 0), undefined)).toBe(false);
  });

  it.each([
    [StatusType.SENT, StatusType.SENDING, true],
    [StatusType.SENDING, StatusType.FAILED, true],
    [StatusType.SENT, StatusType.FEDERATION_ERROR, true],
    [StatusType.FAILED, StatusType.FEDERATION_ERROR, false],
    [StatusType.SENT, StatusType.DELIVERED, false],
    [StatusType.SENDING, StatusType.SENDING, false],
  ])('after a %s message, a %s one starts a group: %s', (previous, current, expected) => {
    expect(startsSendingStateGroup(createMessage('b', current, 1), createMessage('a', previous, 0))).toBe(expected);
  });

  describe('grouping', () => {
    const messages = [
      createMessage('sent', StatusType.SENT, 0),
      createMessage('pending-1', StatusType.SENDING, 1),
      createMessage('pending-2', StatusType.SENDING, 2),
      createMessage('failed', StatusType.FAILED, 3),
    ];

    it('groups messages of one sender close in time together without the split', () => {
      const groups = groupMessages({messages, lastReadTimestamp: Infinity});

      expect(groups).toHaveLength(1);
    });

    it('gives each sending state its own group with the split', () => {
      const groups = groupMessages({messages, lastReadTimestamp: Infinity, splitBySendingState: true});

      expect(
        groups.map(group => {
          return isMarker(group)
            ? []
            : group.messages.map(({id}) => {
                return id;
              });
        }),
      ).toEqual([['sent'], ['pending-1', 'pending-2'], ['failed']]);
    });

    it('does the same in the virtualized list', () => {
      const items = groupVirtualizedMessages({messages, lastReadTimestamp: Infinity, splitBySendingState: true});

      expect(
        items.map(item => {
          return 'message' in item ? item.shouldGroup : undefined;
        }),
      ).toEqual([false, false, true, false]);
      expect(
        groupVirtualizedMessages({messages, lastReadTimestamp: Infinity}).map(item => {
          return 'message' in item ? item.shouldGroup : undefined;
        }),
      ).toEqual([false, true, true, true]);
    });
  });

  describe('finding the first pending message', () => {
    it('finds the first message that is sending', () => {
      const messages = [
        createMessage('sent', StatusType.SENT, 0),
        createMessage('failed', StatusType.FAILED, 1),
        createMessage('pending-1', StatusType.SENDING, 2),
        createMessage('pending-2', StatusType.SENDING, 3),
      ];

      expect(findFirstPendingMessage(messages)?.id).toBe('pending-1');
    });

    it('finds nothing when nothing is pending', () => {
      expect(findFirstPendingMessage([createMessage('failed', StatusType.FAILED, 0)])).toBeUndefined();
      expect(findFirstPendingMessage([])).toBeUndefined();
    });
  });
});
