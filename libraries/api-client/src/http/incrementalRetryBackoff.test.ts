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

import {
  createIncrementalRetryBackoffPolicy,
} from './incrementalRetryBackoff';

const badRequestStatusCode = 400;
const unauthorizedStatusCode = 401;
const notFoundStatusCode = 404;
const tooManyRequestsStatusCode = 429;
const internalServerErrorStatusCode = 500;
const badGatewayStatusCode = 502;
const serviceUnavailableStatusCode = 503;

describe('IncrementalRetryBackoff', function () {
  const incrementalRetryBackoffPolicy = createIncrementalRetryBackoffPolicy();

  it('returns no delay before the first retry', () => {
    const incrementalRetryBackoffState = incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();

    expect(incrementalRetryBackoffState.delayInMilliseconds).toBe(0);
    expect(incrementalRetryBackoffState.retryCount).toBe(0);
    expect(incrementalRetryBackoffState.totalRetryDelayInMilliseconds).toBe(0);
  });

  it('starts the retry progression at 100 milliseconds', () => {
    const currentIncrementalRetryBackoffState =
      incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();

    const nextIncrementalRetryBackoffState =
      incrementalRetryBackoffPolicy.advanceState(currentIncrementalRetryBackoffState);

    expect(nextIncrementalRetryBackoffState.delayInMilliseconds).toBe(100);
    expect(nextIncrementalRetryBackoffState.retryCount).toBe(1);
    expect(nextIncrementalRetryBackoffState.totalRetryDelayInMilliseconds).toBe(100);
  });

  it('doubles the retry delay on each advancement', () => {
    const initialIncrementalRetryBackoffState =
      incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();
    const firstIncrementalRetryBackoffState =
      incrementalRetryBackoffPolicy.advanceState(initialIncrementalRetryBackoffState);
    const secondIncrementalRetryBackoffState =
      incrementalRetryBackoffPolicy.advanceState(firstIncrementalRetryBackoffState);
    const thirdIncrementalRetryBackoffState =
      incrementalRetryBackoffPolicy.advanceState(secondIncrementalRetryBackoffState);

    expect(firstIncrementalRetryBackoffState.delayInMilliseconds).toBe(100);
    expect(secondIncrementalRetryBackoffState.delayInMilliseconds).toBe(200);
    expect(thirdIncrementalRetryBackoffState.delayInMilliseconds).toBe(400);
    expect(firstIncrementalRetryBackoffState.retryCount).toBe(1);
    expect(secondIncrementalRetryBackoffState.retryCount).toBe(2);
    expect(thirdIncrementalRetryBackoffState.retryCount).toBe(3);
    expect(firstIncrementalRetryBackoffState.totalRetryDelayInMilliseconds).toBe(100);
    expect(secondIncrementalRetryBackoffState.totalRetryDelayInMilliseconds).toBe(300);
    expect(thirdIncrementalRetryBackoffState.totalRetryDelayInMilliseconds).toBe(700);
  });

  it('caps the retry delay at ten minutes', () => {
    let incrementalRetryBackoffState = incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();

    for (let retryNumber = 0; retryNumber < 20; retryNumber += 1) {
      incrementalRetryBackoffState = incrementalRetryBackoffPolicy.advanceState(incrementalRetryBackoffState);
    }

    expect(incrementalRetryBackoffState.delayInMilliseconds).toBe(10 * 60 * 1000);
  });

  it('resets back to no delay before the next retry', () => {
    const initialIncrementalRetryBackoffState =
      incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();
    const advancedIncrementalRetryBackoffState =
      incrementalRetryBackoffPolicy.advanceState(initialIncrementalRetryBackoffState);

    const resetBackoffState = incrementalRetryBackoffPolicy.createInitialIncrementalRetryBackoffState();

    expect(advancedIncrementalRetryBackoffState.delayInMilliseconds).toBe(100);
    expect(advancedIncrementalRetryBackoffState.retryCount).toBe(1);
    expect(advancedIncrementalRetryBackoffState.totalRetryDelayInMilliseconds).toBe(100);
    expect(resetBackoffState.delayInMilliseconds).toBe(0);
    expect(resetBackoffState.retryCount).toBe(0);
    expect(resetBackoffState.totalRetryDelayInMilliseconds).toBe(0);
  });

  it('treats 420, 429, and 5xx statuses as retryable', () => {
    expect(incrementalRetryBackoffPolicy.shouldRetryWithIncrementalBackoff(Maybe.just(420))).toBe(true);
    expect(incrementalRetryBackoffPolicy.shouldRetryWithIncrementalBackoff(Maybe.just(tooManyRequestsStatusCode))).toBe(
      true,
    );
    expect(
      incrementalRetryBackoffPolicy.shouldRetryWithIncrementalBackoff(Maybe.just(internalServerErrorStatusCode)),
    ).toBe(true);
    expect(incrementalRetryBackoffPolicy.shouldRetryWithIncrementalBackoff(Maybe.just(badGatewayStatusCode))).toBe(
      true,
    );
    expect(
      incrementalRetryBackoffPolicy.shouldRetryWithIncrementalBackoff(Maybe.just(serviceUnavailableStatusCode)),
    ).toBe(true);
  });

  it('does not treat unrelated statuses as retryable', () => {
    expect(incrementalRetryBackoffPolicy.shouldRetryWithIncrementalBackoff(Maybe.nothing())).toBe(false);
    expect(incrementalRetryBackoffPolicy.shouldRetryWithIncrementalBackoff(Maybe.just(badRequestStatusCode))).toBe(
      false,
    );
    expect(
      incrementalRetryBackoffPolicy.shouldRetryWithIncrementalBackoff(Maybe.just(unauthorizedStatusCode)),
    ).toBe(false);
    expect(incrementalRetryBackoffPolicy.shouldRetryWithIncrementalBackoff(Maybe.just(notFoundStatusCode))).toBe(
      false,
    );
  });
});
