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

import type {MessageOutboxPort, OutboxConversation} from './MessageOutboxPort';
import {answerForSilentSend, outboxLogger, runDetached, sendToSelfConversations} from './sendAnswers';

import type {OperationState, Outbox, PerformOutcome} from '../../../outbox';

/**
 * The operations that were put on hold in this session, by correlation key. Whoever puts one on hold adds its key
 * first, because the outbox reports the hold right away; the key leaves when the operation leaves `on-hold`.
 * A hold that isn't in it was restored from an earlier session, whose prompt is gone: see `reviewRestoredHolds`.
 */
export type HoldsTracker = {
  add: (correlationKey: string) => void;
  has: (correlationKey: string) => boolean;
  remove: (correlationKey: string) => void;
};

export function createHoldsTracker(): HoldsTracker {
  const keys = new Set<string>();
  return {
    add: correlationKey => {
      keys.add(correlationKey);
    },
    has: correlationKey => {
      return keys.has(correlationKey);
    },
    remove: correlationKey => {
      keys.delete(correlationKey);
    },
  };
}

export type HoldRequest<Conversation extends OutboxConversation> = {
  kind: string;
  correlationKey: string;
  /** Asked one after the other; the first decline ends it */
  conversations: Conversation[];
  /**
   * Records the decline where the user sees it; the operation is then released and its next attempt gives up.
   * Without it there is nothing to show, and a decline drops the operation.
   */
  recordDecline?: () => Promise<void>;
};

export type SendingPermission<Conversation extends OutboxConversation> = {
  holds: HoldsTracker;
  /**
   * The answer to the prompt comes after the attempt that asked it ended, so the attempt returns the hold this gives.
   * One prompt serves every operation waiting on the same conversation.
   */
  holdUntilAnswered: (request: HoldRequest<Conversation>) => PerformOutcome;
  /** For `onChanged` of every kind that holds: forgets the key once the operation leaves `on-hold` */
  followHold: (correlationKey: string | undefined, state: OperationState) => void;
  /**
   * Sends to every self conversation. Those that are degraded wait for the user, as `holdUntilAnswered` does,
   * after the others got the message; a decline drops the operation.
   */
  performSelfSend: (kind: string, correlationKey: string, message: GenericMessage) => Promise<PerformOutcome>;
};

export function createSendingPermission<Conversation extends OutboxConversation>(
  outbox: Outbox,
  port: MessageOutboxPort<Conversation>,
  holds: HoldsTracker = createHoldsTracker(),
): SendingPermission<Conversation> {
  const prompts = new Map<string, Promise<boolean>>();

  function askPermission(conversation: Conversation): Promise<boolean> {
    const pending = prompts.get(conversation.id);
    if (pending !== undefined) {
      return pending;
    }
    const prompt = port
      .requestSendingPermission(conversation)
      .catch(() => {
        return false;
      })
      .finally(() => {
        prompts.delete(conversation.id);
      });
    prompts.set(conversation.id, prompt);
    return prompt;
  }

  async function askEach(conversations: Conversation[]): Promise<boolean> {
    const [first, ...rest] = conversations;
    if (first === undefined) {
      return true;
    }
    return (await askPermission(first)) && askEach(rest);
  }

  function holdUntilAnswered({
    kind,
    correlationKey,
    conversations,
    recordDecline,
  }: HoldRequest<Conversation>): PerformOutcome {
    holds.add(correlationKey);
    runDetached(kind, async () => {
      const accepted = await askEach(conversations);
      if (!accepted && recordDecline === undefined) {
        const outcome = await outbox.drop(correlationKey);
        outboxLogger.info('Dropped an operation after a declined sending prompt', {kind, outcome: outcome.type});
        return;
      }
      if (!accepted) {
        await recordDecline?.();
      }
      const outcome = await outbox.release(correlationKey);
      outboxLogger.info('Released an operation after the sending prompt', {kind, accepted, outcome: outcome.type});
    });
    return {type: 'operation-held'};
  }

  function followHold(correlationKey: string | undefined, state: OperationState): void {
    if (correlationKey !== undefined && state !== 'on-hold') {
      holds.remove(correlationKey);
    }
  }

  async function performSelfSend(
    kind: string,
    correlationKey: string,
    message: GenericMessage,
  ): Promise<PerformOutcome> {
    const selfConversations = port.selfConversations();
    const degraded = selfConversations.filter(conversation => {
      return port.isDegraded(conversation);
    });
    if (degraded.length === 0) {
      return answerForSilentSend(kind, await sendToSelfConversations(port, selfConversations, message));
    }
    const others = selfConversations.filter(conversation => {
      return !degraded.includes(conversation);
    });
    if (others.length > 0) {
      const answer = await sendToSelfConversations(port, others, message);
      if (answer.type === 'retry') {
        return answerForSilentSend(kind, answer);
      }
    }
    return holdUntilAnswered({kind, correlationKey, conversations: degraded});
  }

  return {holds, holdUntilAnswered, followHold, performSelfSend};
}
