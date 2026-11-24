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

import {classifySendError, type SendErrorClass} from './classifySendError';
import type {MessageOutboxPort, OutboxConversation} from './MessageOutboxPort';

import {MessageSendingState, type SendResult} from '../../../core/conversation';
import type {PerformOutcome} from '../../../outbox';
import {getLogger} from '../../../util/logger';

/** Logs carry the kind and the outcome, never the content of a message */
export const outboxLogger = getLogger('MessageOutbox');

/** How one send went; `declined` is the client mismatch handler refusing to send */
export type SendAnswer = {type: 'sent'} | {type: 'declined'} | SendErrorClass;

export async function attemptSend(send: () => Promise<SendResult>): Promise<SendAnswer> {
  try {
    const result = await send();
    return result.state === MessageSendingState.OUTGOING_SENT ? {type: 'sent'} : {type: 'declined'};
  } catch (error: unknown) {
    return classifySendError(error);
  }
}

/** For what the user doesn't see as a message: whatever isn't a success or a retry is forgotten */
export function answerForSilentSend(kind: string, answer: SendAnswer): PerformOutcome {
  switch (answer.type) {
    case 'sent':
      return {type: 'attempt-succeeded'};
    case 'retry':
      return {type: 'attempt-failed'};
    default:
      outboxLogger.info('Dropping an operation that could not be sent', {kind, outcome: answer.type});
      return {type: 'operation-dropped'};
  }
}

/** For work nobody waits for: a failure is logged by its name only */
export function runDetached(kind: string, work: () => Promise<void>): void {
  void (async () => {
    try {
      await work();
    } catch (error: unknown) {
      outboxLogger.warn('Work after an outbox operation failed', {
        kind,
        errorName: error instanceof Error ? error.name : typeof error,
      });
    }
  })();
}

export function dropBecauseConversationIsUnknown(kind: string): PerformOutcome {
  outboxLogger.info('Dropping an operation of an unknown conversation', {kind, outcome: 'conversation-unknown'});
  return {type: 'operation-dropped'};
}

/** To the self conversations; one that needs a retry has the whole operation retried, which is harmless */
export async function sendToSelfConversations<Conversation extends OutboxConversation>(
  port: MessageOutboxPort<Conversation>,
  selfConversations: Conversation[],
  message: GenericMessage,
): Promise<SendAnswer> {
  if (selfConversations.length === 0) {
    return {type: 'retry'};
  }
  const answers = await Promise.all(
    selfConversations.map(selfConversation => {
      return attemptSend(() => {
        return port.sendToBackend(message, selfConversation, {skipInjection: true});
      });
    }),
  );
  return (
    answers.find(answer => {
      return answer.type === 'retry';
    }) ??
    answers.find(answer => {
      return answer.type !== 'sent';
    }) ?? {type: 'sent'}
  );
}
