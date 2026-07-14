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

import {getQueueLength, isSendingMessage, resumeMessageSending, sendMessage} from './messageSender';

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

describe('messageSender queue state', () => {
  it('reports waiting and running tasks from the p-queue size and pending state', async () => {
    const taskStarted = createDeferredPromise<void>();
    const completeFirstTask = createDeferredPromise<string>();
    const firstTaskResult = sendMessage(() => {
      taskStarted.resolve(undefined);
      return completeFirstTask.promise;
    });
    const secondTaskResult = sendMessage(() => {
      return Promise.resolve('second');
    });

    expect(getQueueLength()).toBe(2);
    expect(isSendingMessage()).toBe(false);

    resumeMessageSending();
    await taskStarted.promise;

    expect(getQueueLength()).toBe(1);
    expect(isSendingMessage()).toBe(true);

    completeFirstTask.resolve('first');

    await expect(firstTaskResult).resolves.toBe('first');
    await expect(secondTaskResult).resolves.toBe('second');
  });
});
