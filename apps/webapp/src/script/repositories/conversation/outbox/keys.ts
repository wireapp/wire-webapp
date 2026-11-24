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

import type {MessageChangePayload, MessagePayload, ReceiptPayload} from './payloads';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';

/**
 * Correlation keys are shared by every kind, so a change to a message and the message itself never collide:
 * the message is a bare id, a change adds what it does to it.
 */
export function messageCorrelationKey(payload: MessagePayload | MessageChangePayload): string {
  switch (payload.type) {
    case 'text':
    case 'asset':
      return payload.messageId;
    case 'reaction':
      return `${payload.targetMessageId}:reaction`;
    case 'edit':
      return `${payload.originalMessageId}:edit`;
    case 'delete':
      return `${payload.targetMessageId}:delete`;
    case 'hide':
      return `${payload.targetMessageId}:hide`;
  }
}

/** The changes a message can have waiting in the outbox, which go away with it */
export function changeCorrelationKeysOf(messageId: string): string[] {
  return [`${messageId}:reaction`, `${messageId}:edit`, `${messageId}:delete`];
}

/** Messages, their pending changes and pings go out one at a time, in the order the user acted */
export function messageOrderingKey(conversationId: QualifiedId): string {
  return conversationId.id;
}

/** Changes to messages that were sent never wait behind messages that are still pending */
export function messageChangeOrderingKey(conversationId: QualifiedId): string {
  return `${conversationId.id}#changes`;
}

/** A newer last read or cleared value of a conversation replaces the one not sent yet */
export function receiptCorrelationKey(payload: ReceiptPayload): string {
  switch (payload.type) {
    case 'confirmation':
      return `receipt:${payload.conversationId.id}:${payload.confirmationType}:${payload.messageIds[0]}`;
    case 'last-read':
      return `last-read:${payload.conversationId.id}`;
    case 'cleared':
      return `cleared:${payload.conversationId.id}`;
    case 'data-transfer':
      return 'data-transfer';
  }
}

export function receiptOrderingKey(payload: ReceiptPayload): string {
  return payload.type === 'data-transfer' ? 'self#receipts' : `${payload.conversationId.id}#receipts`;
}
