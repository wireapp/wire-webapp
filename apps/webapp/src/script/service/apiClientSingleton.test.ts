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

import {Config} from '../Config';
import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {APIClient} from './apiClientSingleton';

describe('APIClientSingleton', () => {
  it('uses the injected Clock for API client timestamps', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 1_234_000n});
    const apiClient = new APIClient({clock});

    try {
      expect(apiClient.config.wallClock.currentTimestampInMilliseconds).toBe(1_234);

      clock.advanceByMilliseconds(10);

      expect(apiClient.config.wallClock.currentTimestampInMilliseconds).toBe(1_244);
    } finally {
      apiClient.disconnect();
    }
  });

  it('executes API client timeouts when the injected Clock advances', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const apiClient = new APIClient({clock});
    const timeoutCallback = jest.fn();

    try {
      apiClient.config.wallClock.setTimeout(timeoutCallback, 100);

      clock.advanceByMilliseconds(99);
      expect(timeoutCallback).not.toHaveBeenCalled();

      clock.advanceByMilliseconds(1);
      expect(timeoutCallback).toHaveBeenCalledTimes(1);
    } finally {
      apiClient.disconnect();
    }
  });

  it('clears API client timeouts through the injected Clock', () => {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const apiClient = new APIClient({clock});
    const timeoutCallback = jest.fn();

    try {
      const timeoutIdentifier = apiClient.config.wallClock.setTimeout(timeoutCallback, 100);
      apiClient.config.wallClock.clearTimeout(timeoutIdentifier);

      clock.advanceByMilliseconds(100);

      expect(timeoutCallback).not.toHaveBeenCalled();
    } finally {
      apiClient.disconnect();
    }
  });

  it('configures wire client metadata headers for backend requests', () => {
    const apiClient = new APIClient({clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n})});

    try {
      expect(apiClient.config.headers).toEqual({
        'Wire-Client': 'Web',
        'Wire-Client-Version': Config.getConfig().VERSION,
      });
    } finally {
      apiClient.disconnect();
    }
  });

  it('uses the incremental http retry backoff http client by default', () => {
    const apiClient = new APIClient({clock: createDeterministicClock({initialUnixEpochMicroseconds: 0n})});

    try {
      expect(apiClient.transport.http['incrementalRetryBackoffRunner']).toBeDefined();
    } finally {
      apiClient.disconnect();
    }
  });
});
