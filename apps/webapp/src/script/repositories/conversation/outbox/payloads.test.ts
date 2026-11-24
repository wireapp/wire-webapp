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

import {
  messageChangeOrderingKey,
  messageCorrelationKey,
  messageOrderingKey,
  receiptCorrelationKey,
  receiptOrderingKey,
} from './keys';
import {parseMessageChangePayload, parseMessagePayload, parsePingPayload, parseReceiptPayload} from './payloads';
import {CONVERSATION_ID} from './testing/createFakeMessageOutboxPort';
import {
  assetPayload,
  confirmationPayload,
  deletePayload,
  editPayload,
  hidePayload,
  lastReadPayload,
  pingPayload,
  reactionPayload,
  textPayload,
} from './testing/payloadFactories';

describe('the payload guards', () => {
  const mention = {startIndex: 0, length: 3, userId: 'user', userQualifiedId: {id: 'user', domain: 'wire.test'}};

  it.each([
    ['a text', textPayload({mentions: [mention], quote: {messageId: 'quoted', userId: 'user'}, mayBeDelivered: true})],
    ['a text with attachments', textPayload({attachments: [{}]})],
    ['an asset', assetPayload({mayBeDelivered: true})],
    ['a reaction', reactionPayload()],
    ['a reaction that took every reaction back', reactionPayload({reactions: ''})],
    ['an edit', editPayload({mentions: [mention]})],
    ['a delete', deletePayload()],
  ])('accepts %s of a message', (_name, payload) => {
    expect(parseMessagePayload(payload)).toEqual(payload);
  });

  it.each([
    ['a reaction', reactionPayload()],
    ['an edit', editPayload()],
    ['a delete', deletePayload({recipients: [{id: 'user', domain: 'wire.test'}]})],
    ['a hide', hidePayload()],
  ])('accepts %s of a message change', (_name, payload) => {
    expect(parseMessageChangePayload(payload)).toEqual(payload);
  });

  it.each([
    ['a confirmation', confirmationPayload({messageIds: ['a', 'b']})],
    ['a last read', lastReadPayload(1)],
    ['a cleared', {type: 'cleared' as const, conversationId: CONVERSATION_ID, timestamp: 1}],
    ['a data transfer', {type: 'data-transfer' as const, countlyId: 'countly'}],
  ])('accepts %s', (_name, payload) => {
    expect(parseReceiptPayload(payload)).toEqual(payload);
  });

  it('accepts a ping', () => {
    expect(parsePingPayload(pingPayload())).toEqual(pingPayload());
  });

  it('accepts a conversation without a domain', () => {
    const payload = textPayload({conversationId: {id: 'conversation', domain: ''}});

    expect(parseMessagePayload(payload)).toEqual(payload);
  });

  it.each([
    ['nothing', undefined],
    ['a string', 'text'],
    ['an empty object', {}],
    ['an unknown type', {...textPayload(), type: 'voice'}],
    ['a hide, which only a change has', hidePayload()],
    ['a text without its message id', {...textPayload(), messageId: undefined}],
    ['a text with an empty message id', textPayload({messageId: ''})],
    ['a text whose text is not a string', {...textPayload(), text: 3}],
    ['a text whose mentions are not a list', {...textPayload(), mentions: 'none'}],
    ['a text whose mention misses its user', {...textPayload(), mentions: [{startIndex: 0, length: 1}]}],
    ['a text whose attachments are not a list', {...textPayload(), attachments: 'none'}],
    ['a text that may be delivered, but not with true', {...textPayload(), mayBeDelivered: false}],
    ['a text without a conversation', {...textPayload(), conversationId: undefined}],
    ['a text with a conversation id that is a string', {...textPayload(), conversationId: 'conversation'}],
    ['an asset without the image flag', {...assetPayload(), asImage: undefined}],
    ['a reaction without its target', {...reactionPayload(), targetMessageId: undefined}],
    ['an edit without the original', {...editPayload(), originalMessageId: undefined}],
  ])('refuses %s as a message', (_name, value) => {
    expect(() => {return parseMessagePayload(value)}).toThrow();
  });

  it.each([
    ['nothing', undefined],
    ['a text, which only a message has', textPayload()],
    ['a hide without its target', {...hidePayload(), targetMessageId: undefined}],
    ['a delete whose recipients are not a list', {...deletePayload(), recipients: 'all'}],
  ])('refuses %s as a message change', (_name, value) => {
    expect(() => {return parseMessageChangePayload(value)}).toThrow();
  });

  it.each([
    ['nothing', undefined],
    ['a confirmation without messages', {...confirmationPayload(), messageIds: []}],
    ['a confirmation of an unknown type', {...confirmationPayload(), confirmationType: 7}],
    ['a confirmation without a recipient', {...confirmationPayload(), recipient: undefined}],
    ['a last read without a timestamp', {type: 'last-read', conversationId: CONVERSATION_ID}],
    ['a last read with a timestamp that is a string', {...lastReadPayload(1), timestamp: '1'}],
    ['a cleared without a timestamp', {type: 'cleared', conversationId: CONVERSATION_ID}],
    ['a data transfer without an id', {type: 'data-transfer'}],
    ['a data transfer with an empty id', {type: 'data-transfer', countlyId: ''}],
    ['a text', textPayload()],
  ])('refuses %s as a receipt', (_name, value) => {
    expect(() => {return parseReceiptPayload(value)}).toThrow();
  });

  it.each([
    ['nothing', undefined],
    ['a ping without its id', {conversationId: CONVERSATION_ID}],
    ['a ping without its conversation', {messageId: 'ping'}],
  ])('refuses %s as a ping', (_name, value) => {
    expect(() => {return parsePingPayload(value)}).toThrow();
  });
});

describe('the keys', () => {
  it('names a message by its id and a change by what it does to its target', () => {
    expect(messageCorrelationKey(textPayload())).toBe('message-1');
    expect(messageCorrelationKey(assetPayload())).toBe('asset-1');
    expect(messageCorrelationKey(reactionPayload())).toBe('message-1:reaction');
    expect(messageCorrelationKey(editPayload())).toBe('message-1:edit');
    expect(messageCorrelationKey(deletePayload())).toBe('message-1:delete');
    expect(messageCorrelationKey(hidePayload())).toBe('message-1:hide');
  });

  it('puts messages and changes to messages in one lane, and changes to sent messages in another', () => {
    expect(messageOrderingKey(CONVERSATION_ID)).toBe('conversation-1');
    expect(messageChangeOrderingKey(CONVERSATION_ID)).toBe('conversation-1#changes');
  });

  it('keeps the latest last read and cleared of a conversation, and each batch of confirmations', () => {
    expect(receiptCorrelationKey(lastReadPayload(1))).toBe('last-read:conversation-1');
    expect(receiptCorrelationKey({type: 'cleared', conversationId: CONVERSATION_ID, timestamp: 1})).toBe(
      'cleared:conversation-1',
    );
    expect(receiptCorrelationKey(confirmationPayload({messageIds: ['a', 'b']}))).toBe('receipt:conversation-1:0:a');
    expect(receiptCorrelationKey({type: 'data-transfer', countlyId: 'countly'})).toBe('data-transfer');
  });

  it('puts receipts in a lane of their own', () => {
    expect(receiptOrderingKey(lastReadPayload(1))).toBe('conversation-1#receipts');
    expect(receiptOrderingKey({type: 'data-transfer', countlyId: 'countly'})).toBe('self#receipts');
  });
});
