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

import {createDeterministicClock} from '@enormora/clock/deterministic-clock';
import {Maybe} from 'true-myth';

import {createConsoleOutput, type LogOutput} from '../../../logger/logOutput';
import {configureLogging, type Logger} from '../../../logger/getLogger';

import {HttpClient} from '../../http';
import {FeatureAPI, isBackendError} from './featureApi';
import {FEATURE_STATUS} from './featureList.types';

type FeatureConsoleOutput = Record<keyof Logger, jest.Mock<void, unknown[]>>;

function withFeatureLoggingTest(testBody: (output: FeatureConsoleOutput) => Promise<void>): () => Promise<void> {
  async function runFeatureLoggingTest(): Promise<void> {
    const clock = createDeterministicClock({initialUnixEpochMicroseconds: 0n});
    const output = {debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn()};

    try {
      configureLogging(
        Maybe.just({
          clock,
          output: createConsoleOutput(output),
          namespaces: Maybe.just('*'),
          persistenceOutput: Maybe.nothing<LogOutput>(),
        }),
      );
      await testBody(output);
    } finally {
      configureLogging(Maybe.nothing());
    }
  }

  return runFeatureLoggingTest;
}

describe('isBackendError()', () => {
  it('exposes the backend error predicate from the feature API module', () => {
    const backendError = Object.assign(new Error('Feature is locked'), {label: 'feature-locked'});

    expect(isBackendError(backendError)).toBe(true);
    expect(isBackendError(new Error('Network unavailable'))).toBe(false);
    expect(isBackendError({label: 'feature-locked'})).toBe(false);
  });
});

describe('FeatureAPI.getAllFeatures()', () => {
  it(
    'logs invalid responses and returns the original response unchanged',
    withFeatureLoggingTest(async output => {
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

      const featureApi = new FeatureAPI(httpClient);
      const actualResponse = await featureApi.getAllFeatures();

      expect(actualResponse).toBe(invalidResponse);
      expect(output.error).toHaveBeenCalledTimes(1);
      const actualLogRecord: unknown = JSON.parse(String(output.error.mock.calls[0]?.[0]));
      expect(actualLogRecord).toEqual(
        expect.objectContaining({
          component: '@wireapp/api-client/FeatureAPI',
          msg: expect.stringContaining('Feature flags response failed schema validation.'),
          validationErrors: expect.any(Object),
          receivedResponse: invalidResponse,
        }),
      );
    }),
  );
});
