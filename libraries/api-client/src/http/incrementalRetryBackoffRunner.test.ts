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

import {Maybe} from 'true-myth';

import {AbortableWait} from './abortableWait';
import {createIncrementalRetryBackoffPolicy, IncrementalRetryBackoffState} from './incrementalRetryBackoff';
import {createIncrementalRetryBackoffRunner} from './incrementalRetryBackoffRunner';

type RetryableError = {
  readonly statusCode: number;
};

type IncrementalRetryBackoffRunnerDependenciesForTest = {
  readonly abortableWait: AbortableWait;
  readonly waitForDurationInMilliseconds: jest.Mock<Promise<void>, [number, Maybe<AbortSignal>]>;
};

function createIncrementalRetryBackoffRunnerDependenciesForTest(): IncrementalRetryBackoffRunnerDependenciesForTest {
  const waitForDurationInMilliseconds = jest.fn<Promise<void>, [number, Maybe<AbortSignal>]>(
    async (_durationInMilliseconds: number, _abortSignal: Maybe<AbortSignal>) => {},
  );

  return {
    abortableWait: {
      waitForDurationInMilliseconds,
    },
    waitForDurationInMilliseconds,
  };
}

describe('IncrementalRetryBackoffRunner', () => {
  it('returns immediately when the first request attempt succeeds', async () => {
    const {abortableWait, waitForDurationInMilliseconds} = createIncrementalRetryBackoffRunnerDependenciesForTest();
    const incrementalRetryBackoffPolicy = createIncrementalRetryBackoffPolicy();
    const incrementalRetryBackoffRunner = createIncrementalRetryBackoffRunner({
      abortableWait,
      getStatusCode(error) {
        return Maybe.of((error as Partial<RetryableError>).statusCode);
      },
      incrementalRetryBackoffPolicy,
    });
    let incrementalRetryBackoffState = incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();
    const runRequestAttempt = jest.fn(async () => 'response');

    const response = await incrementalRetryBackoffRunner.runWithIncrementalRetryBackoff({
      abortSignal: Maybe.nothing(),
      getIncrementalRetryBackoffState() {
        return incrementalRetryBackoffState;
      },
      getRetryBackoffResetCount() {
        return 0;
      },
      isRequestAborted() {
        return false;
      },
      runRequestAttempt,
      setIncrementalRetryBackoffState(nextIncrementalRetryBackoffState: IncrementalRetryBackoffState) {
        incrementalRetryBackoffState = nextIncrementalRetryBackoffState;

        return incrementalRetryBackoffState;
      },
    });

    expect(response).toBe('response');
    expect(runRequestAttempt).toHaveBeenCalledTimes(1);
    expect(waitForDurationInMilliseconds).not.toHaveBeenCalled();
    expect(incrementalRetryBackoffState.delayInMilliseconds).toBe(0);
  });

  it('waits with the incremented delay before retrying a retryable failure', async () => {
    const {abortableWait, waitForDurationInMilliseconds} = createIncrementalRetryBackoffRunnerDependenciesForTest();
    const incrementalRetryBackoffPolicy = createIncrementalRetryBackoffPolicy();
    const incrementalRetryBackoffRunner = createIncrementalRetryBackoffRunner({
      abortableWait,
      getStatusCode(error) {
        return Maybe.of((error as Partial<RetryableError>).statusCode);
      },
      incrementalRetryBackoffPolicy,
    });
    let incrementalRetryBackoffState = incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();
    const runRequestAttempt = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce({statusCode: 503})
      .mockResolvedValueOnce('response');

    const response = await incrementalRetryBackoffRunner.runWithIncrementalRetryBackoff({
      abortSignal: Maybe.nothing(),
      getIncrementalRetryBackoffState() {
        return incrementalRetryBackoffState;
      },
      getRetryBackoffResetCount() {
        return 0;
      },
      isRequestAborted() {
        return false;
      },
      runRequestAttempt,
      setIncrementalRetryBackoffState(nextIncrementalRetryBackoffState: IncrementalRetryBackoffState) {
        incrementalRetryBackoffState = nextIncrementalRetryBackoffState;

        return incrementalRetryBackoffState;
      },
    });

    expect(response).toBe('response');
    expect(runRequestAttempt).toHaveBeenCalledTimes(2);
    expect(waitForDurationInMilliseconds).toHaveBeenCalledWith(100, Maybe.nothing());
    expect(incrementalRetryBackoffState.delayInMilliseconds).toBe(100);
  });

  it('continues doubling the delay across multiple retryable failures', async () => {
    const {abortableWait, waitForDurationInMilliseconds} = createIncrementalRetryBackoffRunnerDependenciesForTest();
    const incrementalRetryBackoffPolicy = createIncrementalRetryBackoffPolicy();
    const incrementalRetryBackoffRunner = createIncrementalRetryBackoffRunner({
      abortableWait,
      getStatusCode(error) {
        return Maybe.of((error as Partial<RetryableError>).statusCode);
      },
      incrementalRetryBackoffPolicy,
    });
    let incrementalRetryBackoffState = incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();
    const runRequestAttempt = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce({statusCode: 503})
      .mockRejectedValueOnce({statusCode: 503})
      .mockResolvedValueOnce('response');

    const response = await incrementalRetryBackoffRunner.runWithIncrementalRetryBackoff({
      abortSignal: Maybe.nothing(),
      getIncrementalRetryBackoffState() {
        return incrementalRetryBackoffState;
      },
      getRetryBackoffResetCount() {
        return 0;
      },
      isRequestAborted() {
        return false;
      },
      runRequestAttempt,
      setIncrementalRetryBackoffState(nextIncrementalRetryBackoffState: IncrementalRetryBackoffState) {
        incrementalRetryBackoffState = nextIncrementalRetryBackoffState;

        return incrementalRetryBackoffState;
      },
    });

    expect(response).toBe('response');
    expect(runRequestAttempt).toHaveBeenCalledTimes(3);
    expect(waitForDurationInMilliseconds).toHaveBeenNthCalledWith(1, 100, Maybe.nothing());
    expect(waitForDurationInMilliseconds).toHaveBeenNthCalledWith(2, 200, Maybe.nothing());
    expect(incrementalRetryBackoffState.delayInMilliseconds).toBe(200);
  });

  it('rethrows non-retryable failures without waiting', async () => {
    const {abortableWait, waitForDurationInMilliseconds} = createIncrementalRetryBackoffRunnerDependenciesForTest();
    const incrementalRetryBackoffPolicy = createIncrementalRetryBackoffPolicy();
    const incrementalRetryBackoffRunner = createIncrementalRetryBackoffRunner({
      abortableWait,
      getStatusCode(error) {
        return Maybe.of((error as Partial<RetryableError>).statusCode);
      },
      incrementalRetryBackoffPolicy,
    });
    let incrementalRetryBackoffState = incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();
    const nonRetryableError = {statusCode: 400};
    const runRequestAttempt = jest.fn<Promise<string>, []>().mockRejectedValue(nonRetryableError);

    await expect(
      incrementalRetryBackoffRunner.runWithIncrementalRetryBackoff({
        abortSignal: Maybe.nothing(),
        getIncrementalRetryBackoffState() {
          return incrementalRetryBackoffState;
        },
        getRetryBackoffResetCount() {
          return 0;
        },
        isRequestAborted() {
          return false;
        },
        runRequestAttempt,
        setIncrementalRetryBackoffState(nextIncrementalRetryBackoffState: IncrementalRetryBackoffState) {
          incrementalRetryBackoffState = nextIncrementalRetryBackoffState;

          return incrementalRetryBackoffState;
        },
      }),
    ).rejects.toBe(nonRetryableError);

    expect(waitForDurationInMilliseconds).not.toHaveBeenCalled();
    expect(incrementalRetryBackoffState.delayInMilliseconds).toBe(0);
  });

  it('retries immediately when the retry backoff is reset while waiting', async () => {
    const waitForDurationInMilliseconds = jest.fn<Promise<void>, [number, Maybe<AbortSignal>]>();
    const incrementalRetryBackoffPolicy = createIncrementalRetryBackoffPolicy();
    const incrementalRetryBackoffRunner = createIncrementalRetryBackoffRunner({
      abortableWait: {
        waitForDurationInMilliseconds,
      },
      getStatusCode(error) {
        return Maybe.of((error as Partial<RetryableError>).statusCode);
      },
      incrementalRetryBackoffPolicy,
    });
    let incrementalRetryBackoffState = incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();
    let retryBackoffResetCount = 0;
    const resetAbortController = new AbortController();
    const runRequestAttempt = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce({statusCode: 503})
      .mockResolvedValueOnce('response');

    waitForDurationInMilliseconds.mockImplementationOnce(async (_durationInMilliseconds, abortSignal) => {
      retryBackoffResetCount = 1;
      resetAbortController.abort();

      await abortSignal.unwrapOr(undefined)?.throwIfAborted();
    });

    const response = await incrementalRetryBackoffRunner.runWithIncrementalRetryBackoff({
      abortSignal: Maybe.just(resetAbortController.signal),
      getIncrementalRetryBackoffState() {
        return incrementalRetryBackoffState;
      },
      getRetryBackoffResetCount() {
        return retryBackoffResetCount;
      },
      isRequestAborted() {
        return false;
      },
      runRequestAttempt,
      setIncrementalRetryBackoffState(nextIncrementalRetryBackoffState: IncrementalRetryBackoffState) {
        incrementalRetryBackoffState = nextIncrementalRetryBackoffState;

        return incrementalRetryBackoffState;
      },
    });

    expect(response).toBe('response');
    expect(runRequestAttempt).toHaveBeenCalledTimes(2);
    expect(waitForDurationInMilliseconds).toHaveBeenCalledTimes(1);
  });

  it('rethrows the wait error when the request is aborted while waiting', async () => {
    const waitForDurationInMilliseconds = jest.fn<Promise<void>, [number, Maybe<AbortSignal>]>();
    const incrementalRetryBackoffPolicy = createIncrementalRetryBackoffPolicy();
    const incrementalRetryBackoffRunner = createIncrementalRetryBackoffRunner({
      abortableWait: {
        waitForDurationInMilliseconds,
      },
      getStatusCode(error) {
        return Maybe.of((error as Partial<RetryableError>).statusCode);
      },
      incrementalRetryBackoffPolicy,
    });
    let incrementalRetryBackoffState = incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();
    const requestAbortController = new AbortController();
    const runRequestAttempt = jest.fn<Promise<string>, []>().mockRejectedValueOnce({statusCode: 503});

    waitForDurationInMilliseconds.mockImplementationOnce(async (_durationInMilliseconds, abortSignal) => {
      requestAbortController.abort();

      await abortSignal.unwrapOr(undefined)?.throwIfAborted();
    });

    const runWithIncrementalRetryBackoffPromise = incrementalRetryBackoffRunner.runWithIncrementalRetryBackoff({
      abortSignal: Maybe.just(requestAbortController.signal),
      getIncrementalRetryBackoffState() {
        return incrementalRetryBackoffState;
      },
      getRetryBackoffResetCount() {
        return 0;
      },
      isRequestAborted() {
        return true;
      },
      runRequestAttempt,
      setIncrementalRetryBackoffState(nextIncrementalRetryBackoffState: IncrementalRetryBackoffState) {
        incrementalRetryBackoffState = nextIncrementalRetryBackoffState;

        return incrementalRetryBackoffState;
      },
    });

    await expect(runWithIncrementalRetryBackoffPromise).rejects.toMatchObject({
      name: 'AbortError',
    });

    expect(runRequestAttempt).toHaveBeenCalledTimes(1);
    expect(waitForDurationInMilliseconds).toHaveBeenCalledTimes(1);
  });
});
