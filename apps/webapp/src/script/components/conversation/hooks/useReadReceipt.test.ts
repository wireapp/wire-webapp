/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {renderHook} from '@testing-library/react';
import {createDeterministicClock, type DeterministicClock} from '@enormora/clock/deterministic-clock';

import {Conversation} from '../../../repositories/entity/Conversation';
import {Message} from '../../../repositories/entity/message/message';
import {translateForTest} from '../../../util/test/translateForTest';
import {createUuid} from '../../../util/uuid';

import {useReadReceiptSender} from './useReadReceipt';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

describe('useReadReceipt', () => {
  function withDeterministicClock(testName: string, testBody: (clock: DeterministicClock) => void): void {
    it(testName, () => {
      const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
      testBody(clock);
    });
  }

  withDeterministicClock('batches the read receipt sending per conversation', clock => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => {
      return useReadReceiptSender({messageSender: {sendReadReceipt}, clock});
    });
    const conversation1 = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    const conversation2 = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);

    const sender = createUuid();

    const firstBatch = [
      [conversation1, sender],
      [conversation1, sender],
      [conversation2, sender],
    ] as const;

    firstBatch.forEach(([conversation, sender]) => {
      const message = new Message(createUuid(), undefined, translateForTest);
      message.from = sender;
      result.current.addReadReceiptToBatch(conversation, message);
    });

    expect(sendReadReceipt).not.toHaveBeenCalled();
    clock.advanceByMilliseconds(499);
    expect(sendReadReceipt).not.toHaveBeenCalled();
    clock.advanceByMilliseconds(1);
    expect(sendReadReceipt).toHaveBeenCalledTimes(2);

    result.current.addReadReceiptToBatch(conversation1, new Message(createUuid(), undefined, translateForTest));
    expect(sendReadReceipt).toHaveBeenCalledTimes(2);
    clock.advanceByMilliseconds(500);
    expect(sendReadReceipt).toHaveBeenCalledTimes(3);
  });

  withDeterministicClock('resets the batching period when another receipt is added', clock => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => {
      return useReadReceiptSender({messageSender: {sendReadReceipt}, clock});
    });
    const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    const sender = createUuid();
    const firstMessage = new Message(createUuid(), undefined, translateForTest);
    const secondMessage = new Message(createUuid(), undefined, translateForTest);
    firstMessage.from = sender;
    secondMessage.from = sender;

    result.current.addReadReceiptToBatch(conversation, firstMessage);
    clock.advanceByMilliseconds(300);
    result.current.addReadReceiptToBatch(conversation, secondMessage);

    clock.advanceByMilliseconds(499);
    expect(sendReadReceipt).not.toHaveBeenCalled();
    clock.advanceByMilliseconds(1);

    expect(sendReadReceipt).toHaveBeenCalledTimes(1);
    expect(sendReadReceipt).toHaveBeenCalledWith(conversation, firstMessage, [secondMessage]);
  });

  withDeterministicClock('batches the read receipt sending per sender', clock => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => {
      return useReadReceiptSender({messageSender: {sendReadReceipt}, clock});
    });
    const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);

    const sender1 = createUuid();
    const sender2 = createUuid();

    const firstBatch = [
      [conversation, sender1],
      [conversation, sender1],
      [conversation, sender2],
      [conversation, sender2],
    ] as const;

    firstBatch.forEach(([conversation, sender]) => {
      const message = new Message(createUuid(), undefined, translateForTest);
      message.from = sender;
      result.current.addReadReceiptToBatch(conversation, message);
    });

    expect(sendReadReceipt).not.toHaveBeenCalled();
    clock.advanceByMilliseconds(500);
    expect(sendReadReceipt).toHaveBeenCalledTimes(2);
  });

  withDeterministicClock('does not add the same message multiple times', clock => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => {
      return useReadReceiptSender({messageSender: {sendReadReceipt}, clock});
    });
    const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);

    const message = new Message(createUuid(), undefined, translateForTest);
    message.from = createUuid();

    const firstBatch = [
      [conversation, message],
      [conversation, message],
      [conversation, message],
      [conversation, message],
    ] as const;

    firstBatch.forEach(([conversation, message]) => {
      result.current.addReadReceiptToBatch(conversation, message);
    });

    expect(sendReadReceipt).not.toHaveBeenCalled();
    clock.advanceByMilliseconds(500);
    expect(sendReadReceipt).toHaveBeenCalledTimes(1);
    expect(sendReadReceipt).toHaveBeenCalledWith(conversation, message, []);
  });
});
