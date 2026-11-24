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

import {getErrorName} from './guardStore';
import {toView} from './operationData';
import type {
  Kind,
  OperationDropped,
  OperationSnapshot,
  OperationSucceeded,
  OutboxLogger,
  OutboxNotStarted,
  PerformOutcome,
  Trigger,
} from './types';

/** How an attempt ended, for the commands that waited for it */
export type AttemptEnding = OperationSucceeded | OperationDropped | OutboxNotStarted | {type: 'operation-continues'};

export type Attempt = {
  controller: AbortController;
  ended: Promise<AttemptEnding>;
  end: (ending: AttemptEnding) => void;
};

export type Attempts = {
  get: (operationId: string) => Attempt | undefined;
  /** Runs `perform` for the operation, and tells `whenPerformed` which trigger says how it went */
  begin: (operation: OperationSnapshot, whenPerformed: (attempt: Attempt, trigger: Trigger) => Promise<void>) => void;
  /** Forgets the attempt of the operation, which is over, and returns it */
  take: (operationId: string) => Attempt | undefined;
  /** Aborts every attempt, and tells the commands waiting for them that the outbox has stopped */
  abortAll: (stopped: OutboxNotStarted) => void;
};

const PERFORM_ANSWER_TYPES: readonly PerformOutcome['type'][] = [
  'attempt-succeeded',
  'attempt-failed',
  'operation-held',
  'operation-dead-lettered',
  'operation-dropped',
];

export function createAttempts(kinds: ReadonlyMap<string, Kind<unknown>>, logger: OutboxLogger): Attempts {
  const running = new Map<string, Attempt>();

  /** The trigger for how `perform` went; a rejection, a throw or an unknown answer is `attempt-errored` */
  async function perform(operation: OperationSnapshot, signal: AbortSignal): Promise<Trigger> {
    const kind = kinds.get(operation.kind);
    if (kind === undefined) {
      logger.warn('Attempt errored', {kind: operation.kind, errorName: 'KindNotRegistered'});
      return 'attempt-errored';
    }
    try {
      const answer = await kind.perform(toView(operation), signal);
      if (!PERFORM_ANSWER_TYPES.includes(answer.type)) {
        logger.warn('Attempt errored', {kind: operation.kind, errorName: 'UnknownAnswer'});
        return 'attempt-errored';
      }
      return answer.type;
    } catch (error) {
      // An attempt that was aborted is over; its rejection is the kind honouring the signal
      if (!signal.aborted) {
        logger.warn('Attempt errored', {kind: operation.kind, errorName: getErrorName(error)});
      }
      return 'attempt-errored';
    }
  }

  async function performWithinTimeout(operation: OperationSnapshot, controller: AbortController): Promise<Trigger> {
    const timeoutMilliseconds =
      operation.performTimeoutMilliseconds ?? kinds.get(operation.kind)?.performTimeoutMilliseconds;
    if (timeoutMilliseconds === undefined) {
      return perform(operation, controller.signal);
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timedOut = new Promise<Trigger>(resolve => {
      timer = setTimeout(() => {
        controller.abort();
        resolve('attempt-timed-out');
      }, timeoutMilliseconds);
    });
    try {
      return await Promise.race([perform(operation, controller.signal), timedOut]);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    get: operationId => {
      return running.get(operationId);
    },
    begin(operation, whenPerformed) {
      const {promise: ended, resolve: end} = Promise.withResolvers<AttemptEnding>();
      const attempt: Attempt = {controller: new AbortController(), ended, end};
      running.set(operation.id, attempt);
      void performWithinTimeout(operation, attempt.controller).then(async trigger => {
        await whenPerformed(attempt, trigger);
      });
    },
    take(operationId) {
      const attempt = running.get(operationId);
      running.delete(operationId);
      return attempt;
    },
    abortAll(stopped) {
      for (const attempt of running.values()) {
        attempt.controller.abort();
        attempt.end(stopped);
      }
      running.clear();
    },
  };
}
