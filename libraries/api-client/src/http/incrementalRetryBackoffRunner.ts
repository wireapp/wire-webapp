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
import {IncrementalRetryBackoffPolicy, IncrementalRetryBackoffState} from './incrementalRetryBackoff';

export type IncrementalRetryBackoffRunnerDependencies = {
  readonly abortableWait: AbortableWait;
  readonly getStatusCode: (error: unknown) => Maybe<number>;
  readonly incrementalRetryBackoffPolicy: IncrementalRetryBackoffPolicy;
};

export type RunWithIncrementalRetryBackoffDependencies<ResponseValue> = {
  readonly abortSignal: Maybe<AbortSignal>;
  readonly getIncrementalRetryBackoffState: () => IncrementalRetryBackoffState;
  readonly getRetryBackoffResetCount: () => number;
  readonly isRequestAborted: () => boolean;
  readonly onIncrementalRetryBackoffStateChanged?: (incrementalRetryBackoffState: IncrementalRetryBackoffState) => void;
  readonly runRequestAttempt: () => Promise<ResponseValue>;
  readonly setIncrementalRetryBackoffState: (
    incrementalRetryBackoffState: IncrementalRetryBackoffState,
  ) => IncrementalRetryBackoffState;
};

export type IncrementalRetryBackoffRunner = {
  readonly runWithIncrementalRetryBackoff: <ResponseValue>(
    dependencies: RunWithIncrementalRetryBackoffDependencies<ResponseValue>,
  ) => Promise<Awaited<ResponseValue>>;
};

export function createIncrementalRetryBackoffRunner(
  dependencies: IncrementalRetryBackoffRunnerDependencies,
): IncrementalRetryBackoffRunner {
  const {abortableWait, getStatusCode, incrementalRetryBackoffPolicy} = dependencies;

  return {
    async runWithIncrementalRetryBackoff<ResponseValue>(
      runWithIncrementalRetryBackoffDependencies: RunWithIncrementalRetryBackoffDependencies<ResponseValue>,
    ): Promise<Awaited<ResponseValue>> {
      const {
        abortSignal,
        getIncrementalRetryBackoffState,
        getRetryBackoffResetCount,
        isRequestAborted,
        onIncrementalRetryBackoffStateChanged,
        runRequestAttempt,
        setIncrementalRetryBackoffState,
      } = runWithIncrementalRetryBackoffDependencies;

      async function runRequestAttemptWithRetry(): Promise<Awaited<ResponseValue>> {
        try {
          return await runRequestAttempt();
        } catch (error: unknown) {
          const statusCode = getStatusCode(error);
          const shouldRetry = incrementalRetryBackoffPolicy.shouldRetryWithIncrementalBackoff(statusCode);

          if (!shouldRetry) {
            throw error;
          }

          const nextIncrementalRetryBackoffState = incrementalRetryBackoffPolicy.advanceState(
            getIncrementalRetryBackoffState(),
          );

          setIncrementalRetryBackoffState(nextIncrementalRetryBackoffState);
          onIncrementalRetryBackoffStateChanged?.(nextIncrementalRetryBackoffState);

          const retryBackoffResetCount = getRetryBackoffResetCount();

          try {
            await abortableWait.waitForDurationInMilliseconds(
              nextIncrementalRetryBackoffState.delayInMilliseconds,
              abortSignal,
            );
          } catch (error: unknown) {
            const hasRetryBackoffBeenReset = retryBackoffResetCount !== getRetryBackoffResetCount();
            const wasRequestAborted = isRequestAborted();

            if (hasRetryBackoffBeenReset && !wasRequestAborted) {
              return runRequestAttemptWithRetry();
            }

            throw error;
          }

          return runRequestAttemptWithRetry();
        }
      }

      return runRequestAttemptWithRetry();
    },
  };
}
