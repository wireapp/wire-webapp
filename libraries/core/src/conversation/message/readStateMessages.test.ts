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

import {CONVERSATION_EVENT, ConversationOtrMessageAddEvent} from '@wireapp/api-client/lib/event';
import {GenericMessage} from '@wireapp/protocol-messaging';

import {buildLastReadMessage, buildMarkUnreadMessage} from './messageBuilder';
import {PayloadBundleType} from './payloadBundle';

import {GenericMessageMapper} from '../../cryptography/genericMessageMapper';
import {NotificationSource} from '../../notification';
import {GenericMessageType} from '../genericMessageType';

const conversationId = {id: 'conversation', domain: 'example.com'};
const qualifiedConversationBytes = '0a0c636f6e766572736174696f6e120b6578616d706c652e636f6d';
// Kalium's contract: GenericMessage tag 33, qualified ID tag 1, boundary tag 2, operation time tag 3.
const markUnreadBytes = Buffer.from(`0a066d61726b6572c801008a02230a1b${qualifiedConversationBytes}10e80718d00f`, 'hex');
const lastReadContent = `0a0c636f6e766572736174696f6e10e8071a1b${qualifiedConversationBytes}`;

describe('read state protobuf compatibility', () => {
  it('encodes and decodes the explicit unread boundary using Kalium field numbers', () => {
    const message = buildMarkUnreadMessage(conversationId, 1000, 2000);
    message.messageId = 'marker';

    expect(Buffer.from(GenericMessage.encode(message).finish())).toEqual(markUnreadBytes);
    const decoded = GenericMessage.decode(markUnreadBytes);
    expect(decoded.content).toBe(GenericMessageType.MARK_UNREAD);
    expect(decoded.markUnread?.qualifiedConversationId).toEqual(conversationId);
    expect(Number(decoded.markUnread?.unreadFromTimestamp)).toBe(1000);
    expect(Number(decoded.markUnread?.operationTimestamp)).toBe(2000);
    expect(decoded.unknownStrategy).toBe(GenericMessage.UnknownStrategy.IGNORE);
  });

  it('adds a read operation timestamp as optional LastRead field 4', () => {
    const message = buildLastReadMessage(conversationId, 1000, 2000);
    message.messageId = 'read';
    const bytes = Buffer.from(`0a04726561643231${lastReadContent}20d00f`, 'hex');

    expect(Buffer.from(GenericMessage.encode(message).finish())).toEqual(bytes);
    expect(Number(GenericMessage.decode(bytes).lastRead?.operationTimestamp)).toBe(2000);
  });

  it('preserves legacy LastRead messages without an operation timestamp', () => {
    const message = buildLastReadMessage(conversationId, 1000);
    message.messageId = 'read';
    const bytes = Buffer.from(`0a0472656164322e${lastReadContent}`, 'hex');

    expect(Buffer.from(GenericMessage.encode(message).finish())).toEqual(bytes);
    const lastRead = GenericMessage.decode(bytes).lastRead;
    expect(Object.hasOwn(lastRead ?? {}, 'operationTimestamp')).toBe(false);
    expect(Number(lastRead?.lastReadTimestamp)).toBe(1000);
  });

  it('maps unread controls without losing the sender, transport conversation, or operation metadata', () => {
    const event: ConversationOtrMessageAddEvent = {
      type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
      from: 'self-user',
      qualified_from: {id: 'self-user', domain: 'example.com'},
      conversation: 'self-conversation',
      qualified_conversation: {id: 'self-conversation', domain: 'example.com'},
      data: {sender: 'self-client', recipient: 'this-client', text: ''},
      time: '2026-10-30T12:00:00.000Z',
    };
    const message = GenericMessage.decode(markUnreadBytes);

    const mapped = GenericMessageMapper.mapGenericMessage(message, event, NotificationSource.WEBSOCKET);

    expect(mapped).toMatchObject({
      type: PayloadBundleType.MARK_UNREAD,
      conversation: 'self-conversation',
      qualifiedFrom: event.qualified_from,
      fromClientId: 'self-client',
      timestamp: Date.parse(event.time),
      content: message.markUnread,
    });
  });
});
