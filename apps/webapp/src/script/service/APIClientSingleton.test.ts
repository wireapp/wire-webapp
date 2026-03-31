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
import {APIClient} from './APIClientSingleton';

describe('APIClientSingleton', () => {
  it('configures wire client metadata headers for backend requests', () => {
    const apiClient = new APIClient();

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
    const apiClient = new APIClient();

    try {
      expect(apiClient.transport.http['incrementalRetryBackoffRunner']).toBeDefined();
    } finally {
      apiClient.disconnect();
    }
  });
});
