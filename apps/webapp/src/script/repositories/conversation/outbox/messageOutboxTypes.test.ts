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

import {Confirmation} from '@wireapp/protocol-messaging';

import {
  laneOfChanges,
  laneOfMessages,
  laneOfReceipts,
  messageCorrelationKey,
  receiptCorrelationKey,
} from './messageOutboxTypes';

const conversationId = {id: 'conversation-1', domain: 'wire.test'};

// These formats are stored with every operation, so they must never change.
describe('the stored keys of the message kinds', () => {
  it('names a message by its id and a change by what it does to its target', () => {
    expect(
      messageCorrelationKey({type: 'text', conversationId, messageId: 'message-1', text: 'hello', mentions: []}),
    ).toBe('message-1');
    expect(messageCorrelationKey({type: 'asset', conversationId, messageId: 'asset-1', asImage: false})).toBe(
      'asset-1',
    );
    expect(
      messageCorrelationKey({type: 'reaction', conversationId, targetMessageId: 'message-1', reactions: 'like'}),
    ).toBe('message-1:reaction');
    expect(
      messageCorrelationKey({
        type: 'edit',
        conversationId,
        originalMessageId: 'message-1',
        messageId: 'edit-1',
        text: 'edited',
        mentions: [],
      }),
    ).toBe('message-1:edit');
    expect(messageCorrelationKey({type: 'delete', conversationId, targetMessageId: 'message-1'})).toBe(
      'message-1:delete',
    );
    expect(messageCorrelationKey({type: 'hide', conversationId, targetMessageId: 'message-1'})).toBe('message-1:hide');
  });

  it('keeps the latest last read and cleared timestamp of a conversation, and each batch of confirmations', () => {
    expect(receiptCorrelationKey({type: 'last-read', conversationId, timestamp: 1})).toBe('last-read:conversation-1');
    expect(receiptCorrelationKey({type: 'cleared', conversationId, timestamp: 1})).toBe('cleared:conversation-1');
    expect(
      receiptCorrelationKey({
        type: 'confirmation',
        conversationId,
        confirmationType: Confirmation.Type.DELIVERED,
        messageIds: ['a', 'b'],
        recipient: {id: 'sender', domain: 'wire.test'},
      }),
    ).toBe('receipt:conversation-1:0:a');
    expect(receiptCorrelationKey({type: 'data-transfer', countlyId: 'countly'})).toBe('data-transfer');
  });

  it('names the lanes of messages, of changes to sent messages and of receipts', () => {
    expect(laneOfMessages(conversationId)).toBe('conversation-1');
    expect(laneOfChanges(conversationId)).toBe('conversation-1#changes');
    expect(laneOfReceipts({type: 'last-read', conversationId, timestamp: 1})).toBe('conversation-1#receipts');
    expect(laneOfReceipts({type: 'data-transfer', countlyId: 'countly'})).toBe('self#receipts');
  });
});
