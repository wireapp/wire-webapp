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

import {LogFactory} from '@wireapp/commons';

import {HttpClient} from '../../http';
import {FeatureAPI} from './featureApi';
import {FEATURE_STATUS} from './featureList.types';

describe('FeatureAPI.getAllFeatures()', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs invalid responses and returns the original response unchanged', async () => {
    const invalidResponse = {
      appLock: {
        status: FEATURE_STATUS.ENABLED,
        config: {
          enforceAppLock: 'enabled',
          inactivityTimeoutSecs: 300,
        },
      },
      nextFeature: {status: 'enabled'},
    };
    const httpClient = {
      sendJSON: jest.fn().mockResolvedValue({data: invalidResponse}),
    } as unknown as HttpClient;
    const featureLogger = LogFactory.getLogger('@wireapp/api-client/FeatureAPI');
    const errorLogSpy = jest.spyOn(featureLogger, 'error');

    jest.spyOn(LogFactory, 'getLogger').mockReturnValue(featureLogger);

    const featureApi = new FeatureAPI(httpClient);
    const actualResponse = await featureApi.getAllFeatures();

    expect(actualResponse).toBe(invalidResponse);
    expect(errorLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Feature flags response failed schema validation.'),
      expect.objectContaining({
        validationErrors: expect.any(Object),
        receivedResponse: invalidResponse,
      }),
    );
  });
});
