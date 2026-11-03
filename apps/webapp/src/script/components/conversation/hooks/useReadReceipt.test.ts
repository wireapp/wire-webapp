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

import {Conversation} from 'Repositories/entity/Conversation';
import {Message} from 'Repositories/entity/message/message';
import {translateForTest} from 'Util/test/translateForTest';
import {createUuid} from 'Util/uuid';

import {useReadReceiptSender} from './useReadReceipt';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

describe('useReadReceipt', () => {
  withDeterministicClock('drops queued receipts after a received unread marker, including after release', clock => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => {
      return useReadReceiptSender({messageSender: {sendReadReceipt}, clock});
    });
    const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    const message = new Message(createUuid(), undefined, translateForTest);
    message.timestamp(100);
    result.current.addReadReceiptToBatch(conversation, message);
    conversation.applyManualUnreadMarker(100, 200);
    conversation.release();

    clock.advanceByMilliseconds(500);

    expect(sendReadReceipt).not.toHaveBeenCalled();
  });

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

  withDeterministicClock('cancels a queued receipt when its conversation is marked unread', clock => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => {
      return useReadReceiptSender({messageSender: {sendReadReceipt}, clock});
    });
    const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    const message = new Message(createUuid(), undefined, translateForTest);

    result.current.addReadReceiptToBatch(conversation, message);
    result.current.cancelPendingReadReceiptsForConversation(conversation);
    conversation.markUnreadFrom(message);

    clock.advanceByMilliseconds(500);

    expect(sendReadReceipt).not.toHaveBeenCalled();
  });

  withDeterministicClock('keeps queued receipts for other conversations when one is marked unread', clock => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => {
      return useReadReceiptSender({messageSender: {sendReadReceipt}, clock});
    });
    const conversationId = createUuid();
    const conversationA = new Conversation(
      conversationId,
      'conversation-a.example',
      CONVERSATION_PROTOCOL.PROTEUS,
      translateForTest,
    );
    const conversationB = new Conversation(
      conversationId,
      'conversation-b.example',
      CONVERSATION_PROTOCOL.PROTEUS,
      translateForTest,
    );
    const sender = createUuid();
    const messageA1 = new Message(createUuid(), undefined, translateForTest);
    const messageA2 = new Message(createUuid(), undefined, translateForTest);
    const messageB1 = new Message(createUuid(), undefined, translateForTest);
    const messageB2 = new Message(createUuid(), undefined, translateForTest);
    [messageA1, messageA2, messageB1, messageB2].forEach(message => {
      message.from = sender;
    });

    result.current.addReadReceiptToBatch(conversationA, messageA1);
    result.current.addReadReceiptToBatch(conversationA, messageA2);
    result.current.addReadReceiptToBatch(conversationB, messageB1);
    result.current.addReadReceiptToBatch(conversationB, messageB2);
    result.current.cancelPendingReadReceiptsForConversation(conversationA);

    clock.advanceByMilliseconds(500);

    expect(sendReadReceipt).toHaveBeenCalledTimes(1);
    expect(sendReadReceipt).toHaveBeenCalledWith(conversationB, messageB1, [messageB2]);
  });

  withDeterministicClock(
    'does not send a canceled receipt after leaving the conversation resets auto-read suppression',
    clock => {
      const sendReadReceipt = jest.fn();
      const {result} = renderHook(() => {
        return useReadReceiptSender({messageSender: {sendReadReceipt}, clock});
      });
      const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
      const message = new Message(createUuid(), undefined, translateForTest);

      result.current.addReadReceiptToBatch(conversation, message);
      result.current.cancelPendingReadReceiptsForConversation(conversation);
      conversation.markUnreadFrom(message);
      conversation.release();

      clock.advanceByMilliseconds(500);

      expect(conversation.isAutoReadSuppressed()).toBe(false);
      expect(sendReadReceipt).not.toHaveBeenCalled();
    },
  );

  withDeterministicClock('sends newly queued receipts after normal reading resumes', clock => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => {
      return useReadReceiptSender({messageSender: {sendReadReceipt}, clock});
    });
    const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    const unreadMessage = new Message(createUuid(), undefined, translateForTest);
    const newlyReadMessage = new Message(createUuid(), undefined, translateForTest);

    result.current.addReadReceiptToBatch(conversation, unreadMessage);
    result.current.cancelPendingReadReceiptsForConversation(conversation);
    conversation.markUnreadFrom(unreadMessage);
    conversation.release();
    conversation.clearManualUnreadMarker();
    result.current.addReadReceiptToBatch(conversation, newlyReadMessage);

    clock.advanceByMilliseconds(500);

    expect(sendReadReceipt).toHaveBeenCalledTimes(1);
    expect(sendReadReceipt).toHaveBeenCalledWith(conversation, newlyReadMessage, []);
  });

  withDeterministicClock('sends queued receipts normally when unread cancellation is not used', clock => {
    const sendReadReceipt = jest.fn();
    const {result} = renderHook(() => {
      return useReadReceiptSender({messageSender: {sendReadReceipt}, clock});
    });
    const conversation = new Conversation(createUuid(), '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest);
    const message = new Message(createUuid(), undefined, translateForTest);

    result.current.addReadReceiptToBatch(conversation, message);

    clock.advanceByMilliseconds(500);

    expect(sendReadReceipt).toHaveBeenCalledWith(conversation, message, []);
  });
});
