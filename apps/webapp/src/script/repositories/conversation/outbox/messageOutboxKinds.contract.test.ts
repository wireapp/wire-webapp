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

import type {GenericMessage} from '@wireapp/protocol-messaging';

import {BackendError} from '../../../apiClient/http/backendError';
import {BackendErrorLabel} from '../../../apiClient/http/backendErrorLabel';
import {createOutboxTestKit, type OutboxTestKit} from '../../../outbox/testing/createOutboxTestKit';

import {
  messageChangeOrderingKey,
  messageCorrelationKey,
  messageOrderingKey,
  receiptCorrelationKey,
  receiptOrderingKey,
} from './keys';
import {registerMessageOutboxKinds, type MessageOutboxHandles} from './messageOutboxKinds';
import type {MessageChangePayload, MessagePayload, PingPayload, ReceiptPayload} from './payloads';
import {
  CONVERSATION_ID,
  OTHER_CONVERSATION_ID,
  createFakeMessageOutboxPort,
  sendingRecord,
  sentResult,
  type FakeMessageOutbox,
} from './testing/createFakeMessageOutboxPort';
import {confirmationPayload, lastReadPayload, pingPayload, reactionPayload, textPayload} from './testing/payloadFactories';

type PendingSend = {
  message: GenericMessage;
  succeed: () => Promise<void>;
  fail: (error: Error) => Promise<void>;
};

const rejection = new BackendError('invalid', BackendErrorLabel.CLIENT_ERROR, 400);
const removal = new BackendError('removed', BackendErrorLabel.CLIENT_ERROR, 403);

describe('the message kinds through the outbox', () => {
  let kit: OutboxTestKit;
  let fake: FakeMessageOutbox;
  let handles: MessageOutboxHandles;
  let sends: PendingSend[];

  beforeEach(async () => {
    kit = createOutboxTestKit();
    fake = createFakeMessageOutboxPort(kit.clock.settle);
    fake.port.serverTime.mockImplementation(kit.clock.getServerTime);
    handles = registerMessageOutboxKinds(kit.outbox, fake.port);
    sends = [];
    fake.port.sendToBackend.mockImplementation(async message => {
      return new Promise((resolve, reject) => {
        sends.push({
          message,
          succeed: async () => {
            resolve(sentResult());
            await kit.clock.settle();
          },
          fail: async error => {
            reject(error);
            await kit.clock.settle();
          },
        });
      });
    });
    await kit.start();
  });

  afterEach(() => {
    kit.dispose();
  });

  function sentContents(): (string | undefined)[] {
    return sends.map(({message}) => {
      return message.content;
    });
  }

  function sentTextIds(): string[] {
    return sends
      .filter(({message}) => {
        return message.content === 'text';
      })
      .map(({message}) => {
        return message.messageId;
      });
  }

  async function enqueueText(messageId: string, conversationId = CONVERSATION_ID): Promise<void> {
    const payload: MessagePayload = textPayload({messageId, conversationId});
    fake.records.set(messageId, sendingRecord());
    await handles.message.enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      orderingKey: messageOrderingKey(conversationId),
    });
    await kit.clock.settle();
  }

  async function enqueueReactionToPendingMessage(targetMessageId: string): Promise<void> {
    const payload: MessagePayload = reactionPayload({targetMessageId});
    await handles.message.enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      orderingKey: messageOrderingKey(CONVERSATION_ID),
    });
    await kit.clock.settle();
  }

  async function enqueueReactionToSentMessage(targetMessageId: string): Promise<void> {
    const payload: MessageChangePayload = reactionPayload({targetMessageId});
    await handles.messageChange.enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      orderingKey: messageChangeOrderingKey(CONVERSATION_ID),
    });
    await kit.clock.settle();
  }

  async function enqueueReceipt(payload: ReceiptPayload): Promise<void> {
    await handles.receipt.enqueue({
      payload,
      correlationKey: receiptCorrelationKey(payload),
      orderingKey: receiptOrderingKey(payload),
    });
    await kit.clock.settle();
  }

  async function enqueuePing(messageId: string): Promise<void> {
    const payload: PingPayload = pingPayload({messageId});
    await handles.ping.enqueue({
      payload,
      correlationKey: messageId,
      orderingKey: messageOrderingKey(CONVERSATION_ID),
    });
    await kit.clock.settle();
  }

  describe('order', () => {
    it('sends the messages of a conversation one at a time, in the order they were queued', async () => {
      await enqueueText('a');
      await enqueueText('b');
      await enqueueText('c');

      expect(sentTextIds()).toEqual(['a']);
      await sends[0].succeed();
      expect(sentTextIds()).toEqual(['a', 'b']);
      await sends[1].succeed();
      expect(sentTextIds()).toEqual(['a', 'b', 'c']);
      await sends[2].succeed();

      expect(kit.lanesOf()).toEqual([]);
    });

    it('sends the messages of different conversations independently', async () => {
      await enqueueText('a');
      await enqueueText('x', OTHER_CONVERSATION_ID);

      expect(sentTextIds()).toEqual(['a', 'x']);
    });

    it('does not let a message that failed in one conversation touch another', async () => {
      await enqueueText('a');
      await enqueueText('b');
      await enqueueText('x', OTHER_CONVERSATION_ID);
      await enqueueText('y', OTHER_CONVERSATION_ID);

      await sends[0].fail(rejection);

      expect(kit.findOperation('a')?.state).toBe('dead-lettered');
      expect(kit.findOperation('b')?.state).toBe('dead-lettered');
      expect(kit.findOperation('x')?.state).toBe('in-progress');
      expect(kit.findOperation('y')?.state).toBe('queued');
      await sends[1].succeed();
      expect(sentTextIds()).toEqual(['a', 'x', 'y']);
    });
  });

  describe('a change to a message that is still pending', () => {
    it('waits behind its message, and is sent after it', async () => {
      await enqueueText('a');
      await enqueueReactionToPendingMessage('a');

      expect(sentContents()).toEqual(['text']);

      await sends[0].succeed();

      expect(sentContents()).toEqual(['text', 'reaction']);
    });

    it('fails with its message, and is never sent or shown', async () => {
      await enqueueText('a');
      await enqueueReactionToPendingMessage('a');

      await sends[0].fail(removal);

      expect(kit.findOperation('a')?.state).toBe('dead-lettered');
      expect(kit.findOperation('a:reaction')?.state).toBe('dead-lettered');
      expect(sentContents()).toEqual(['text']);
      expect(fake.port.markFailed).toHaveBeenCalledTimes(1);
      expect(fake.records.get('a')).toMatchObject({isFailed: true, failedReason: 'removed'});
    });
  });

  describe('a change to a message that was sent', () => {
    it('is not blocked by a message in flight', async () => {
      await enqueueText('a');
      await enqueueReactionToSentMessage('sent-message');

      expect(sentContents()).toEqual(['text', 'reaction']);
    });

    it('is not blocked by a message that failed', async () => {
      await enqueueText('a');
      await sends[0].fail(rejection);

      await enqueueReactionToSentMessage('sent-message');

      expect(kit.findOperation('a')?.state).toBe('dead-lettered');
      expect(sentContents()).toEqual(['text', 'reaction']);
    });
  });

  describe('receipts', () => {
    it('are not blocked by a message in flight', async () => {
      await enqueueText('a');
      await enqueueReceipt(confirmationPayload());

      expect(sentContents()).toEqual(['text', 'confirmation']);
    });

    it('are not blocked by a message that failed', async () => {
      await enqueueText('a');
      await sends[0].fail(rejection);

      await enqueueReceipt(confirmationPayload());

      expect(kit.findOperation('a')?.state).toBe('dead-lettered');
      expect(sentContents()).toEqual(['text', 'confirmation']);
    });

    it('send only the latest last read of a conversation', async () => {
      kit.outbox.pause();

      await enqueueReceipt(lastReadPayload(1));
      await enqueueReceipt(lastReadPayload(2));
      expect(sends).toHaveLength(0);
      kit.outbox.resume();
      await kit.clock.settle();

      expect(sentContents()).toEqual(['lastRead']);
      expect(sends[0].message.lastRead?.lastReadTimestamp?.toString()).toBe('2');
    });

    it('keep the last read of each conversation', async () => {
      kit.outbox.pause();

      await enqueueReceipt(lastReadPayload(1));
      await enqueueReceipt({type: 'last-read', conversationId: OTHER_CONVERSATION_ID, timestamp: 2});
      kit.outbox.resume();
      await kit.clock.settle();

      expect(sentContents()).toEqual(['lastRead', 'lastRead']);
    });
  });

  describe('a ping', () => {
    it('is sent in the order of the messages of its conversation', async () => {
      await enqueueText('a');
      await enqueuePing('ping');

      expect(sentContents()).toEqual(['text']);
      await sends[0].succeed();
      expect(sentContents()).toEqual(['text', 'knock']);
    });

    it('carries on behind a message that failed: only messages cascade', async () => {
      await enqueueText('a');
      await enqueueText('b');
      await enqueuePing('ping');

      await sends[0].fail(rejection);

      expect(kit.findOperation('a')?.state).toBe('dead-lettered');
      expect(kit.findOperation('b')?.state).toBe('dead-lettered');
      expect(sentContents()).toEqual(['text', 'knock']);
    });

    it('is forgotten and removed from the conversation when the outbox gives up on it', async () => {
      await enqueuePing('ping');

      await sends[0].fail(rejection);

      expect(kit.findOperation('ping')).toBeUndefined();
      expect(fake.port.deleteMessage).toHaveBeenCalledWith(fake.conversation, 'ping');
    });
  });

  describe('a conversation that asks before sending to unverified devices', () => {
    beforeEach(() => {
      fake.degraded.add(fake.conversation);
    });

    it('holds its lane until the user accepts, and then sends in order', async () => {
      await enqueueText('a');
      await enqueueText('b');

      expect(kit.findOperation('a')?.state).toBe('on-hold');
      expect(fake.prompts).toHaveLength(1);
      expect(sends).toHaveLength(0);

      await fake.prompts[0].answer(true);

      expect(sentTextIds()).toEqual(['a']);
      await sends[0].succeed();
      expect(sentTextIds()).toEqual(['a', 'b']);
    });

    it('does not hold the other conversations', async () => {
      await enqueueText('a');
      await enqueueText('x', OTHER_CONVERSATION_ID);

      expect(sentTextIds()).toEqual(['x']);
    });

    it('keeps a declined message in its place as failed, and fails the messages behind it', async () => {
      await enqueueText('a');
      await enqueueText('b');

      await fake.prompts[0].answer(false);

      expect(sends).toHaveLength(0);
      expect(kit.findOperation('a')?.state).toBe('dead-lettered');
      expect(kit.findOperation('b')?.state).toBe('dead-lettered');
      expect(fake.records.get('a')).toMatchObject({isFailed: true, failedReason: 'declined'});
      expect(fake.records.get('b')).toMatchObject({isFailed: true, failedReason: 'generic'});
    });

    it('sends a declined message again once its owner took the decline back and queued it again', async () => {
      await enqueueText('a');
      await fake.prompts[0].answer(false);
      fake.degraded.clear();

      await fake.port.markSending(fake.conversation, 'a');
      const payload = textPayload({messageId: 'a'});
      const outcome = await handles.message.enqueue({
        payload,
        correlationKey: 'a',
        orderingKey: messageOrderingKey(CONVERSATION_ID),
      });
      await kit.clock.settle();

      expect(outcome.type).toBe('operation-versioned');
      expect(sentTextIds()).toEqual(['a']);
    });

    it('lets the next attempt of a declined message that was not taken back dead-letter it again', async () => {
      await enqueueText('a');
      await fake.prompts[0].answer(false);
      fake.degraded.clear();

      const payload = textPayload({messageId: 'a'});
      await handles.message.enqueue({payload, correlationKey: 'a', orderingKey: messageOrderingKey(CONVERSATION_ID)});
      await kit.clock.settle();

      expect(sends).toHaveLength(0);
      expect(kit.findOperation('a')?.state).toBe('dead-lettered');
    });
  });
});
