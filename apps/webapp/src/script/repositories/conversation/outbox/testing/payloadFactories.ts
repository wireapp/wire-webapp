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

import {CONVERSATION_ID} from './createFakeMessageOutboxPort';

import type {OperationState, OperationView} from '../../../../outbox';
import type {
  AssetMessagePayload,
  EditMessagePayload,
  MessageChangePayload,
  MessagePayload,
  PingPayload,
  ReceiptPayload,
  TextMessagePayload,
} from '../payloads';

export function textPayload(overrides: Partial<TextMessagePayload> = {}): TextMessagePayload {
  return {
    type: 'text',
    conversationId: CONVERSATION_ID,
    messageId: 'message-1',
    text: 'hello',
    mentions: [],
    ...overrides,
  };
}

export function assetPayload(overrides: Partial<AssetMessagePayload> = {}): AssetMessagePayload {
  return {type: 'asset', conversationId: CONVERSATION_ID, messageId: 'asset-1', asImage: false, ...overrides};
}

export function reactionPayload(
  overrides: Partial<Extract<MessagePayload, {type: 'reaction'}>> = {},
): Extract<MessagePayload, {type: 'reaction'}> {
  return {
    type: 'reaction',
    conversationId: CONVERSATION_ID,
    targetMessageId: 'message-1',
    reactions: 'like',
    ...overrides,
  };
}

export function editPayload(overrides: Partial<EditMessagePayload> = {}): EditMessagePayload {
  return {
    type: 'edit',
    conversationId: CONVERSATION_ID,
    originalMessageId: 'message-1',
    messageId: 'edit-1',
    text: 'edited',
    mentions: [],
    ...overrides,
  };
}

export function deletePayload(
  overrides: Partial<Extract<MessageChangePayload, {type: 'delete'}>> = {},
): Extract<MessageChangePayload, {type: 'delete'}> {
  return {type: 'delete', conversationId: CONVERSATION_ID, targetMessageId: 'message-1', ...overrides};
}

export function hidePayload(): MessageChangePayload {
  return {type: 'hide', conversationId: CONVERSATION_ID, targetMessageId: 'message-1'};
}

export function confirmationPayload(
  overrides: Partial<Extract<ReceiptPayload, {type: 'confirmation'}>> = {},
): ReceiptPayload {
  return {
    type: 'confirmation',
    conversationId: CONVERSATION_ID,
    confirmationType: Confirmation.Type.DELIVERED,
    messageIds: ['message-1'],
    recipient: {id: 'sender', domain: 'wire.test'},
    ...overrides,
  };
}

export function lastReadPayload(timestamp: number): ReceiptPayload {
  return {type: 'last-read', conversationId: CONVERSATION_ID, timestamp};
}

export function pingPayload(overrides: Partial<PingPayload> = {}): PingPayload {
  return {conversationId: CONVERSATION_ID, messageId: 'ping-1', ...overrides};
}

export function viewOf<Payload>(
  kind: string,
  payload: Payload,
  overrides: Partial<OperationView<Payload>> = {},
): OperationView<Payload> {
  return {id: 'operation-1', kind, payload, queuedAt: 0, state: 'queued' as OperationState, attempts: 0, ...overrides};
}
