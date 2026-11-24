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

import {KIND_NAME as MESSAGE_CHANGE_KIND} from './createMessageChangeKind';
import {KIND_NAME as MESSAGE_KIND} from './createMessageKind';
import {KIND_NAME as PING_KIND} from './createPingKind';
import {KIND_NAME as RECEIPT_KIND} from './createReceiptKind';
import type {MessageOutboxPort, OutboxConversation} from './MessageOutboxPort';
import {
  parseMessageChangePayload,
  parseMessagePayload,
  parsePingPayload,
  parseReceiptPayload,
  type MessageChangePayload,
  type MessagePayload,
} from './payloads';
import {outboxLogger, runDetached} from './sendAnswers';
import type {HoldRequest, SendingPermission} from './sendingPermission';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import type {OperationView, Outbox} from '../../../outbox';

/** What a hold needs to be asked about again */
type HoldSubject = {
  conversationId: QualifiedId;
  /** Sent to the self conversations rather than to the conversation of the payload */
  toSelfConversations: boolean;
  /** The hold stays while the draft is editing one of these messages: it is the user's hold for editing */
  editedMessageIds: string[];
  /** The message that shows the decline, if there is one */
  declinedMessageId?: string;
};

function subjectOfMessageChange(payload: MessagePayload | MessageChangePayload): HoldSubject {
  const subject: HoldSubject = {
    conversationId: payload.conversationId,
    toSelfConversations: false,
    editedMessageIds: [],
  };
  switch (payload.type) {
    case 'text':
    case 'asset':
      return {...subject, editedMessageIds: [payload.messageId], declinedMessageId: payload.messageId};
    case 'edit':
      return {...subject, editedMessageIds: [payload.originalMessageId, payload.messageId]};
    case 'hide':
      return {...subject, toSelfConversations: true};
    default:
      return subject;
  }
}

/** `undefined` for what never holds for a conversation, or that can't be read */
function subjectOf(operation: OperationView<unknown>): HoldSubject | undefined {
  try {
    switch (operation.kind) {
      case MESSAGE_KIND:
        return subjectOfMessageChange(parseMessagePayload(operation.payload));
      case MESSAGE_CHANGE_KIND:
        return subjectOfMessageChange(parseMessageChangePayload(operation.payload));
      case PING_KIND:
        return {
          conversationId: parsePingPayload(operation.payload).conversationId,
          toSelfConversations: false,
          editedMessageIds: [],
        };
      case RECEIPT_KIND: {
        const payload = parseReceiptPayload(operation.payload);
        return payload.type === 'last-read' || payload.type === 'cleared'
          ? {conversationId: payload.conversationId, toSelfConversations: true, editedMessageIds: []}
          : undefined;
      }
      default:
        return undefined;
    }
  } catch (error: unknown) {
    outboxLogger.warn('Skipped a hold whose payload can not be read', {
      kind: operation.kind,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return undefined;
  }
}

/**
 * The holds restored from an earlier session have no prompt any more. When the user opens their conversation:
 * those that are still degraded ask again, the others are released, and an edit the draft still edits stays on hold.
 * Nothing happens before the outbox started; it looks again the next time the conversation is opened.
 */
export function createRestoredHoldsReview<Conversation extends OutboxConversation>(
  outbox: Outbox,
  port: MessageOutboxPort<Conversation>,
  permission: SendingPermission<Conversation>,
): (conversation: Conversation) => Promise<void> {
  async function review(conversation: Conversation, operation: OperationView<unknown>): Promise<void> {
    const {correlationKey, kind} = operation;
    const subject = subjectOf(operation);
    if (correlationKey === undefined || subject === undefined) {
      return;
    }
    if (port.findConversation(subject.conversationId) !== conversation) {
      return;
    }
    for (const messageId of subject.editedMessageIds) {
      if (await port.isBeingEdited(conversation, messageId)) {
        return;
      }
    }
    const degraded = (subject.toSelfConversations ? port.selfConversations() : [conversation]).filter(candidate => {
      return port.isDegraded(candidate);
    });
    if (degraded.length === 0) {
      const outcome = await outbox.release(correlationKey);
      outboxLogger.info('Released a restored hold', {kind, outcome: outcome.type});
      return;
    }
    const {declinedMessageId} = subject;
    const request: HoldRequest<Conversation> = {
      kind,
      correlationKey,
      conversations: degraded,
      recordDecline:
        declinedMessageId === undefined
          ? undefined
          : () => {
              return port.markFailed(conversation, declinedMessageId, {reason: 'declined', federation: false});
            },
    };
    permission.holdUntilAnswered(request);
  }

  return async conversation => {
    const listed = outbox.lanes();
    if (listed.type !== 'lanes-listed') {
      return;
    }
    // A held operation blocks its lane, so it is always the first of it
    const restored = listed.lanes
      .map(({first}) => {
        return first;
      })
      .filter(({state, correlationKey}) => {
        return state === 'on-hold' && correlationKey !== undefined && !permission.holds.has(correlationKey);
      });
    for (const operation of restored) {
      runDetached(operation.kind, () => {
        return review(conversation, operation);
      });
    }
  };
}
