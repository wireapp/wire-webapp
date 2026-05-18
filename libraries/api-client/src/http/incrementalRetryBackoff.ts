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

import {StatusCodes} from 'http-status-codes';
import {Maybe} from 'true-myth';

export type IncrementalRetryBackoffState = {
  readonly delayInMilliseconds: number;
  readonly retryCount: number;
  readonly totalRetryDelayInMilliseconds: number;
};

export type IncrementalRetryBackoffPolicy = {
  readonly advanceState: (incrementalRetryBackoffState: IncrementalRetryBackoffState) => IncrementalRetryBackoffState;
  readonly createInitialIncrementalRetryBackoffState: () => IncrementalRetryBackoffState;
  readonly shouldRetryWithIncrementalBackoff: (statusCode: Maybe<number>) => boolean;
};

const initialRetryDelayInMilliseconds = 100;
const maximumRetryDelayInMilliseconds = 10 * 60 * 1000;
const nonStandardRetryableStatusCode = StatusCodes.METHOD_FAILURE;
const serverErrorStatusCodeRangeStart = StatusCodes.INTERNAL_SERVER_ERROR;
const serverErrorStatusCodeRangeEnd = StatusCodes.NETWORK_AUTHENTICATION_REQUIRED;

export function createIncrementalRetryBackoffPolicy(): IncrementalRetryBackoffPolicy {
  return {
    advanceState(incrementalRetryBackoffState) {
      const currentDelayInMilliseconds = incrementalRetryBackoffState.delayInMilliseconds;
      const nextDelayInMilliseconds =
        currentDelayInMilliseconds === 0 ? initialRetryDelayInMilliseconds : currentDelayInMilliseconds * 2;
      const boundedDelayInMilliseconds = Math.min(nextDelayInMilliseconds, maximumRetryDelayInMilliseconds);

      return {
        delayInMilliseconds: boundedDelayInMilliseconds,
        retryCount: incrementalRetryBackoffState.retryCount + 1,
        totalRetryDelayInMilliseconds:
          incrementalRetryBackoffState.totalRetryDelayInMilliseconds + boundedDelayInMilliseconds,
      };
    },

    createInitialIncrementalRetryBackoffState() {
      return {
        delayInMilliseconds: 0,
        retryCount: 0,
        totalRetryDelayInMilliseconds: 0,
      };
    },

    shouldRetryWithIncrementalBackoff(statusCode) {
      return statusCode
        .map((statusCodeValue): boolean => {
          if (statusCodeValue === nonStandardRetryableStatusCode || statusCodeValue === StatusCodes.TOO_MANY_REQUESTS) {
            return true;
          }

          return (
            statusCodeValue >= serverErrorStatusCodeRangeStart &&
            statusCodeValue <= serverErrorStatusCodeRangeEnd &&
            statusCodeValue !== StatusCodes.SERVICE_UNAVAILABLE
          );
        })
        .unwrapOr(false);
    },
  };
}
