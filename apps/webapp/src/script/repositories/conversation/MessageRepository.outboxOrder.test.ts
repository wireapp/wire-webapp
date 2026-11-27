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

import {amplify} from 'amplify';

import type {GenericMessage} from '@wireapp/protocol-messaging';

import {BackendError} from '../../apiClient/http/backendError';
import {BackendErrorLabel} from '../../apiClient/http/backendErrorLabel';
import {StatusType} from '../../message/statusType';
import {WebAppEvents} from '../../webAppEvents';

import {ConversationVerificationState} from './ConversationVerificationState';
import {
  laneOfChanges,
  laneOfMessages,
  laneOfReceipts,
  messageCorrelationKey,
  receiptCorrelationKey,
  type MessageChangePayload,
  type MessagePayload,
  type ReceiptPayload,
} from './outbox/messageOutboxTypes';
import {
  CONVERSATION_ID,
  createOutboxRepository,
  OTHER_CONVERSATION_ID,
  sendingRecord,
  sentResult,
  type OutboxRepository,
} from './outbox/testing/createOutboxRepository';
import {
  confirmationPayload,
  lastReadPayload,
  pingPayload,
  reactionPayload,
  textPayload,
} from './outbox/testing/payloadFactories';

type PendingSend = {
  message: GenericMessage;
  succeed: () => Promise<void>;
  fail: (error: Error) => Promise<void>;
};

const rejection = new BackendError('invalid', BackendErrorLabel.CLIENT_ERROR, 400);
const removal = new BackendError('removed', BackendErrorLabel.CLIENT_ERROR, 403);

describe('the message kinds through the outbox', () => {
  let parts: OutboxRepository;
  let sends: PendingSend[];

  beforeEach(async () => {
    parts = createOutboxRepository();
    sends = [];
    parts.sendToBackend.mockImplementation(async (message: any) => {
      return new Promise((resolve, reject) => {
        sends.push({
          message,
          succeed: async () => {
            resolve(sentResult());
            await parts.kit.clock.settle();
          },
          fail: async error => {
            reject(error);
            await parts.kit.clock.settle();
          },
        });
      });
    });
    await parts.kit.start();
  });

  afterEach(() => {
    amplify.unsubscribeAll(WebAppEvents.EVENT.NOTIFICATION_HANDLING_STATE);
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
    parts.records.set(messageId, sendingRecord());
    await parts.handles.message.enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      laneKey: laneOfMessages(conversationId),
    });
    await parts.kit.clock.settle();
  }

  async function enqueueReactionToPendingMessage(targetMessageId: string): Promise<void> {
    const payload: MessagePayload = reactionPayload({targetMessageId});
    await parts.handles.message.enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      laneKey: laneOfMessages(CONVERSATION_ID),
    });
    await parts.kit.clock.settle();
  }

  async function enqueueReactionToSentMessage(targetMessageId: string): Promise<void> {
    const payload: MessageChangePayload = reactionPayload({targetMessageId});
    await parts.handles['message-change'].enqueue({
      payload,
      correlationKey: messageCorrelationKey(payload),
      laneKey: laneOfChanges(CONVERSATION_ID),
    });
    await parts.kit.clock.settle();
  }

  async function enqueueReceipt(payload: ReceiptPayload): Promise<void> {
    await parts.handles.receipt.enqueue({
      payload,
      correlationKey: receiptCorrelationKey(payload),
      laneKey: laneOfReceipts(payload),
    });
    await parts.kit.clock.settle();
  }

  async function enqueuePing(messageId: string): Promise<void> {
    await parts.handles.ping.enqueue({
      payload: pingPayload({messageId}),
      correlationKey: messageId,
      laneKey: laneOfMessages(CONVERSATION_ID),
    });
    await parts.kit.clock.settle();
  }

  function stateOf(correlationKey: string): string | undefined {
    const findResult = parts.kit.outbox.findByCorrelationKey(correlationKey);
    return findResult.outcome === 'operation-found' ? findResult.operation.state : undefined;
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

      expect(parts.kit.outbox.lanes()).toEqual({outcome: 'lanes-listed', lanes: []});
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

      expect(stateOf('a')).toBe('dead-lettered');
      expect(stateOf('b')).toBe('dead-lettered');
      expect(stateOf('x')).toBe('in-progress');
      expect(stateOf('y')).toBe('queued');
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

      expect(stateOf('a')).toBe('dead-lettered');
      expect(stateOf('a:reaction')).toBe('dead-lettered');
      expect(sentContents()).toEqual(['text']);
      expect(parts.markMessage).toHaveBeenCalledTimes(1);
      expect(parts.records.get('a')).toMatchObject({status: StatusType.FAILED, failed_reason: 'removed'});
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

      expect(stateOf('a')).toBe('dead-lettered');
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

      expect(stateOf('a')).toBe('dead-lettered');
      expect(sentContents()).toEqual(['text', 'confirmation']);
    });

    it('send only the latest last read of a conversation', async () => {
      parts.kit.outbox.pause();

      await enqueueReceipt(lastReadPayload(1));
      await enqueueReceipt(lastReadPayload(2));
      expect(sends).toHaveLength(0);
      parts.kit.outbox.resume();
      await parts.kit.clock.settle();

      expect(sentContents()).toEqual(['lastRead']);
      expect(sends[0].message.lastRead?.lastReadTimestamp?.toString()).toBe('2');
    });

    it('keep the last read of each conversation', async () => {
      parts.kit.outbox.pause();

      await enqueueReceipt(lastReadPayload(1));
      await enqueueReceipt({type: 'last-read', conversationId: OTHER_CONVERSATION_ID, timestamp: 2});
      parts.kit.outbox.resume();
      await parts.kit.clock.settle();

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

    it('carries on behind a message that failed, because only messages take their lane with them', async () => {
      await enqueueText('a');
      await enqueueText('b');
      await enqueuePing('ping');

      await sends[0].fail(rejection);

      expect(stateOf('a')).toBe('dead-lettered');
      expect(stateOf('b')).toBe('dead-lettered');
      expect(sentContents()).toEqual(['text', 'knock']);
    });

    it('is forgotten and removed from the conversation when the outbox gives up on it', async () => {
      await enqueuePing('ping');

      await sends[0].fail(rejection);

      expect(parts.kit.outbox.findByCorrelationKey('ping').outcome).toBe('operation-not-found');
      expect(parts.deleteMessage).toHaveBeenCalledWith(parts.conversation, 'ping');
    });
  });

  describe('a conversation that asks before sending to unverified devices', () => {
    beforeEach(() => {
      parts.degrade(parts.conversation);
    });

    it('holds its lane until the user accepts, and then sends in order', async () => {
      await enqueueText('a');
      await enqueueText('b');

      expect(stateOf('a')).toBe('on-hold');
      expect(parts.prompts).toHaveLength(1);
      expect(sends).toHaveLength(0);

      await parts.prompts[0].answer(true);

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

      await parts.prompts[0].answer(false);

      expect(sends).toHaveLength(0);
      expect(stateOf('a')).toBe('dead-lettered');
      expect(stateOf('b')).toBe('dead-lettered');
      expect(parts.records.get('a')).toMatchObject({status: StatusType.FAILED, failed_reason: 'declined'});
      expect(parts.records.get('b')).toMatchObject({status: StatusType.FAILED, failed_reason: 'generic'});
    });

    it('dead-letters the messages and deletes the ping behind them when the user declines, and asks only once', async () => {
      await enqueueText('a');
      await enqueueText('b');
      await enqueuePing('ping');

      await parts.prompts[0].answer(false);
      await parts.kit.clock.settle();

      expect(sends).toHaveLength(0);
      expect(stateOf('a')).toBe('dead-lettered');
      expect(stateOf('b')).toBe('dead-lettered');
      expect(stateOf('ping')).toBeUndefined();
      expect(parts.prompts).toHaveLength(1);
    });

    it('deletes a held ping at the head of the lane and dead-letters the message behind it, and asks only once', async () => {
      await enqueuePing('ping');
      await enqueueText('a');

      expect(stateOf('ping')).toBe('on-hold');
      await parts.prompts[0].answer(false);
      await parts.kit.clock.settle();

      expect(sends).toHaveLength(0);
      expect(stateOf('ping')).toBeUndefined();
      expect(stateOf('a')).toBe('dead-lettered');
      expect(parts.prompts).toHaveLength(1);
    });

    it('dead-letters, and does not delete, a change that waits on a pending message', async () => {
      await enqueueText('a');
      await enqueueReactionToPendingMessage('a');

      await parts.prompts[0].answer(false);
      await parts.kit.clock.settle();

      expect(stateOf('a')).toBe('dead-lettered');
      expect(stateOf('a:reaction')).toBe('dead-lettered');
      expect(sends).toHaveLength(0);
    });

    it('sends a declined message again once its owner took the decline back and queued it again', async () => {
      await enqueueText('a');
      await parts.prompts[0].answer(false);
      parts.conversation.verification_state(ConversationVerificationState.UNVERIFIED);

      parts.records.set('a', sendingRecord());
      const payload = textPayload({messageId: 'a'});
      const enqueueResult = await parts.handles.message.enqueue({
        payload,
        correlationKey: 'a',
        laneKey: laneOfMessages(CONVERSATION_ID),
      });
      await parts.kit.clock.settle();

      expect(enqueueResult.outcome).toBe('operation-versioned');
      expect(sentTextIds()).toEqual(['a']);
    });
  });
});
