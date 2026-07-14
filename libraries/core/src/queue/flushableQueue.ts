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

import is from '@sindresorhus/is';
import PromiseQueue from 'p-queue';
import {Maybe} from 'true-myth';

export const queueFlushedErrorCause = 'QUEUE_FLUSHED' as const;

export type PromiseTask<T> = () => Promise<T>;

type FlushableQueueOptions = {
  autoStart: boolean;
  concurrency: number;
  timeout: number;
};

export type FlushableQueue = {
  readonly queue: PromiseQueue;
  add: <T>(promiseTask: PromiseTask<T>) => Promise<T>;
  flush: (reason?: Error) => void;
};

export function createQueueFlushedError(): Error {
  const error = new Error('Queue was flushed');
  error.cause = queueFlushedErrorCause;

  return error;
}

export function isQueueFlushedError(error: unknown): error is Error {
  return is.error(error) && error.cause === queueFlushedErrorCause;
}

export function createFlushableQueue(flushableQueueOptions: FlushableQueueOptions): FlushableQueue {
  const queue = new PromiseQueue(flushableQueueOptions);
  const queuedTaskAbortControllers = new Set<AbortController>();

  function add<T>(promiseTask: PromiseTask<T>): Promise<T> {
    const taskAbortController = new AbortController();
    queuedTaskAbortControllers.add(taskAbortController);

    return queue.add(
      () => {
        queuedTaskAbortControllers.delete(taskAbortController);
        return promiseTask();
      },
      {signal: taskAbortController.signal},
    );
  }

  function flush(reason: Error | undefined = undefined): void {
    const flushReason = Maybe.of(reason).unwrapOrElse(createQueueFlushedError);

    for (const taskAbortController of queuedTaskAbortControllers) {
      taskAbortController.abort(flushReason);
    }

    queuedTaskAbortControllers.clear();
  }

  return {queue, add, flush};
}
