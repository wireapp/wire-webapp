/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {queueConversationRejoin} from './conversationRejoinQueue';

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

describe('queueConversationRejoin', () => {
  it('suppresses a second rejoin while the first task is pending', async () => {
    const taskStarted = createDeferredPromise<void>();
    const completeRejoin = createDeferredPromise<void>();
    const rejoinFn = jest.fn(() => {
      taskStarted.resolve(undefined);
      return completeRejoin.promise;
    });

    const firstRejoinResult = queueConversationRejoin('groupId', rejoinFn);
    await taskStarted.promise;
    const secondRejoinResult = await queueConversationRejoin('groupId', rejoinFn);

    expect(secondRejoinResult).toBeUndefined();
    expect(rejoinFn).toHaveBeenCalledTimes(1);

    completeRejoin.resolve(undefined);
    await firstRejoinResult;
  });

  it('queues a new rejoin after the previous task resolves', async () => {
    const rejoinFn = jest.fn(() => {
      return Promise.resolve();
    });

    await queueConversationRejoin('groupId', rejoinFn);
    await queueConversationRejoin('groupId', rejoinFn);

    expect(rejoinFn).toHaveBeenCalledTimes(2);
  });

  it('queues a new rejoin after the previous task rejects', async () => {
    const rejectedRejoinError = new Error('Rejoin failed');
    let rejoinAttemptCount = 0;
    const rejoinFn = jest.fn(() => {
      rejoinAttemptCount += 1;

      if (rejoinAttemptCount === 1) {
        return Promise.reject(rejectedRejoinError);
      }

      return Promise.resolve();
    });

    await expect(queueConversationRejoin('groupId', rejoinFn)).rejects.toBe(rejectedRejoinError);
    await queueConversationRejoin('groupId', rejoinFn);

    expect(rejoinFn).toHaveBeenCalledTimes(2);
  });

  it('propagates the original rejoin rejection', async () => {
    const expectedError = new Error('Rejoin failed');
    const rejoinFn = jest.fn(() => {
      return Promise.reject(expectedError);
    });

    await expect(queueConversationRejoin('groupId', rejoinFn)).rejects.toBe(expectedError);
  });
});
