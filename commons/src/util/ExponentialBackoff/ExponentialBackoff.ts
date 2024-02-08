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

import {TimeInMillis} from '../TimeUtil';

const delaysMap = new Map<string, {retryCount: number; timeoutId?: NodeJS.Timeout}>();

const defaultConfig = {
  minDelay: TimeInMillis.SECOND / 2,
  maxDelay: TimeInMillis.SECOND * 32,
  multiplyBy: 2,
  maxRetries: 10,
};

type ExponentialBackoffConfig = {
  maxDelay?: number;
  minDelay?: number;
  maxRetries?: number;
  multiplyBy?: number;
};

/**
 * Exponential backoff function creator.
 * It will return a function that will back off exponentially (wait) passed callback every time it is called.
 *
 * @param key - The key to identify the backoff
 * @param config - The configuration for the backoff
 * @param config.maxDelay - The maximum delay to wait (default 32 seconds)
 * @param config.minDelay - The minimum delay to wait (default 500ms)
 * @param config.maxRetries - The maximum number of retries (default 10)
 * @param config.multiplyBy - The number to multiply the delay by (default 2)
 * @returns - The backoff function and the reset function
 */
export function exponentialBackoff(
  key: string,
  config: ExponentialBackoffConfig = defaultConfig,
): {
  backOff: <T>(callback: () => Promise<T>, onRetryLimitReached?: () => void) => Promise<T>;
  resetBackOff: () => void;
} {
  const {
    maxDelay = defaultConfig.maxDelay,
    minDelay = defaultConfig.minDelay,
    maxRetries = defaultConfig.maxRetries,
    multiplyBy = defaultConfig.multiplyBy,
  } = config;

  const resetBackOff = () => {
    clearTimeout(delaysMap.get(key)?.timeoutId);
    delaysMap.delete(key);
  };

  return {
    backOff: async <T>(callback: () => Promise<T>, onRetryLimitReached?: () => void): Promise<T> => {
      const entry = delaysMap.get(key);

      const retryCount = entry?.retryCount || 0;
      const retryTimeout = entry?.timeoutId;

      const delay = Math.pow(multiplyBy, retryCount) * minDelay;
      const clampedDelay = Math.min(delay, maxDelay);

      // If we have reached the retry limit or the delay is greater than the max delay, we reset the backoff
      if (retryCount > maxRetries - 1 || delay > maxDelay) {
        resetBackOff();
        if (!onRetryLimitReached) {
          throw new Error('Exponential backoff retry limit reached');
        }
        onRetryLimitReached();
      }

      // We wait for the delay to pass
      return new Promise(resolve => {
        clearTimeout(retryTimeout);

        const tid = setTimeout(async () => {
          delaysMap.set(key, {retryCount: retryCount + 1, timeoutId: undefined});
          resolve(callback());
        }, clampedDelay);

        delaysMap.set(key, {retryCount, timeoutId: tid});
      });
    },

    resetBackOff,
  };
}
