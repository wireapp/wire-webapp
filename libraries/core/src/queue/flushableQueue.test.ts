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

import {createFlushableQueue, isQueueFlushedError} from './flushableQueue';
import {sequentialQueueOptions} from './sequentialQueueOptions';

type DeferredPromise<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function createDeferredPromise<T>(): DeferredPromise<T> {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>(resolve => {
    resolvePromise = resolve;
  });

  if (is.undefined(resolvePromise)) {
    throw new Error('Deferred promise resolver was not created');
  }

  return {promise, resolve: resolvePromise};
}

async function getRejectedError<T>(promise: Promise<T>): Promise<unknown> {
  try {
    await promise;

    return new Error('Expected promise to reject');
  } catch (error) {
    return error;
  }
}

describe('createFlushableQueue', () => {
  it('rejects all waiting tasks without executing them and empties the queue', async () => {
    const flushableQueue = createFlushableQueue({autoStart: false, ...sequentialQueueOptions});
    const firstWaitingTask = jest.fn(() => {
      return Promise.resolve('first');
    });
    const secondWaitingTask = jest.fn(() => {
      return Promise.resolve('second');
    });
    const firstWaitingTaskResult = flushableQueue.add(firstWaitingTask);
    const secondWaitingTaskResult = flushableQueue.add(secondWaitingTask);

    flushableQueue.flush();

    const firstRejectedError = await getRejectedError(firstWaitingTaskResult);
    const secondRejectedError = await getRejectedError(secondWaitingTaskResult);

    expect(isQueueFlushedError(firstRejectedError)).toBe(true);
    expect(isQueueFlushedError(secondRejectedError)).toBe(true);
    expect(firstWaitingTask).not.toHaveBeenCalled();
    expect(secondWaitingTask).not.toHaveBeenCalled();
    expect(flushableQueue.queue.size).toBe(0);
  });

  it('preserves the supplied flush error', async () => {
    const flushableQueue = createFlushableQueue({autoStart: false, ...sequentialQueueOptions});
    const suppliedFlushError = new Error('Connection was closed');
    const waitingTaskResult = flushableQueue.add(() => {
      return Promise.resolve();
    });

    flushableQueue.flush(suppliedFlushError);

    await expect(waitingTaskResult).rejects.toBe(suppliedFlushError);
  });

  it('does not affect a running task', async () => {
    const flushableQueue = createFlushableQueue({autoStart: true, ...sequentialQueueOptions});
    const taskStarted = createDeferredPromise<void>();
    const completeRunningTask = createDeferredPromise<string>();
    const runningTaskResult = flushableQueue.add(() => {
      taskStarted.resolve(undefined);
      return completeRunningTask.promise;
    });
    await taskStarted.promise;

    const waitingTask = jest.fn(() => {
      return Promise.resolve('waiting');
    });
    const waitingTaskResult = flushableQueue.add(waitingTask);

    flushableQueue.flush();
    completeRunningTask.resolve('completed');

    await expect(runningTaskResult).resolves.toBe('completed');
    const waitingTaskRejectedError = await getRejectedError(waitingTaskResult);

    expect(isQueueFlushedError(waitingTaskRejectedError)).toBe(true);
    expect(waitingTask).not.toHaveBeenCalled();
  });

  it('executes tasks added after a flush', async () => {
    const flushableQueue = createFlushableQueue({autoStart: false, ...sequentialQueueOptions});
    const flushedTaskResult = flushableQueue.add(() => {
      return Promise.resolve('flushed');
    });

    flushableQueue.flush();

    const flushedTaskRejectedError = await getRejectedError(flushedTaskResult);

    expect(isQueueFlushedError(flushedTaskRejectedError)).toBe(true);

    const newTaskResult = flushableQueue.add(() => {
      return Promise.resolve('new task');
    });
    flushableQueue.queue.start();

    await expect(newTaskResult).resolves.toBe('new task');
  });
});
