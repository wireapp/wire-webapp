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

import {createBulkJobPollingPolicy} from './createBulkJobPollingPolicy';

describe('createBulkJobPollingPolicy', () => {
  it('polls every second, retries unknown reads five times and never stops on its own', () => {
    const policy = createBulkJobPollingPolicy(() => {
      return 0.5;
    });

    expect(policy.pollIntervalMs).toBe(1000);
    expect(policy.maxUnknownRetries).toBe(5);
    expect(policy.maxPollAttempts).toEqual(Maybe.nothing());
  });

  it.each([
    {random: 0, retryIndex: 0, expectedDelayMs: 750},
    {random: 0.5, retryIndex: 0, expectedDelayMs: 1000},
    {random: 1, retryIndex: 0, expectedDelayMs: 1250},
    {random: 0.5, retryIndex: 3, expectedDelayMs: 8000},
  ])('backs off exponentially with jitter (random $random, retry $retryIndex)', ({random, retryIndex, expectedDelayMs}) => {
    const policy = createBulkJobPollingPolicy(() => {
      return random;
    });

    expect(policy.getUnknownRetryDelay(retryIndex)).toBe(expectedDelayMs);
  });
});
