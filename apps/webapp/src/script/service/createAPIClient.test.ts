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

import {incrementalHttpRetryBackoffFeatureToggleName} from '../featureToggles/startupFeatureToggleNames';

import {createAPIClient} from './createAPIClient';

describe('createAPIClient', () => {
  it('enables incremental http retry backoff when the startup feature toggle reader returns true', () => {
    const apiClient = createAPIClient(featureToggleName => {
      return featureToggleName === incrementalHttpRetryBackoffFeatureToggleName;
    });

    try {
      expect(apiClient.transport.http['shouldUseIncrementalRetryBackoff']).toBe(true);
    } finally {
      apiClient.disconnect();
    }
  });

  it('keeps incremental http retry backoff disabled when the startup feature toggle reader returns false', () => {
    const apiClient = createAPIClient(() => {
      return false;
    });

    try {
      expect(apiClient.transport.http['shouldUseIncrementalRetryBackoff']).toBe(false);
    } finally {
      apiClient.disconnect();
    }
  });
});
