/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import nock from 'nock';

import {BackendErrorLabel} from './BackendErrorLabel';
import {HttpClient} from './HttpClient';

import {AccessTokenStore, AuthAPI} from '../auth';

import {BackendError, StatusCode} from '.';

type HttpClientDependenciesForTest = {
  readonly clearTimeout: jest.Mock<void, [ReturnType<typeof globalThis.setTimeout>]>;
  readonly observedDelayInMilliseconds: number[];
  readonly setTimeout: jest.Mock<ReturnType<typeof globalThis.setTimeout>, [() => void, number]>;
};

function createHttpClientDependenciesForTest(): HttpClientDependenciesForTest {
  const observedDelayInMilliseconds: number[] = [];
  const setTimeout = jest.fn((handler: () => void, delayInMilliseconds: number) => {
    observedDelayInMilliseconds.push(delayInMilliseconds);
    handler();

    return 1 as ReturnType<typeof globalThis.setTimeout>;
  });
  const clearTimeout = jest.fn();

  return {
    clearTimeout,
    observedDelayInMilliseconds,
    setTimeout,
  };
}

function createRetryableBackendError(statusCode: number): BackendError {
  return new BackendError('Retryable backend error', undefined, statusCode);
}

describe('HttpClient', () => {
  const testConfig = {urls: {rest: 'https://test.zinfra.io', ws: '', name: 'test'}};
  const mockedAccessTokenStore: Partial<AccessTokenStore> = {
    accessTokenData: {
      access_token:
        'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsd' +
        'DPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c2' +
        '2-86a0-9adc8a15b3b4.c=15037015562284012115',
      expires_in: 900,
      token_type: 'Bearer',
      user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
    },
  };

  describe('"_sendRequest"', () => {
    // eslint-disable-next-line jest/expect-expect
    it('retries on 403 token expired error', async () => {
      nock(testConfig.urls.rest).get(AuthAPI.URL.ACCESS).once().reply(StatusCode.FORBIDDEN, {
        code: StatusCode.FORBIDDEN,
        label: BackendErrorLabel.INVALID_CREDENTIALS,
        message: 'Token expired',
      });

      nock(testConfig.urls.rest).get(AuthAPI.URL.ACCESS).reply(StatusCode.OK, mockedAccessTokenStore.accessTokenData);

      const client = new HttpClient(testConfig, mockedAccessTokenStore as AccessTokenStore);
      client.refreshAccessToken = () => {
        return Promise.resolve(mockedAccessTokenStore.accessTokenData!);
      };

      await client._sendRequest({config: {method: 'GET', baseURL: testConfig.urls.rest, url: AuthAPI.URL.ACCESS}});
    });

    it('does not retry on 403 invalid token', async () => {
      nock(testConfig.urls.rest).get(AuthAPI.URL.ACCESS).reply(StatusCode.FORBIDDEN, {
        code: StatusCode.FORBIDDEN,
        label: BackendErrorLabel.INVALID_CREDENTIALS,
        message: 'Invalid token',
      });

      const client = new HttpClient(testConfig, mockedAccessTokenStore as AccessTokenStore);
      client.refreshAccessToken = () => {
        return Promise.reject(new Error('Should not refresh access token'));
      };
      let backendError;

      try {
        await client._sendRequest({config: {method: 'GET', baseURL: testConfig.urls.rest, url: AuthAPI.URL.ACCESS}});
        throw new Error('Should not resolve');
      } catch (error) {
        backendError = error;
      } finally {
        expect((backendError as BackendError).message).toBe('Authentication failed because the token is invalid.');
      }
    });
  });

  it('does not retry on 403 missing cookie', async () => {
    nock(testConfig.urls.rest).get(AuthAPI.URL.ACCESS).reply(StatusCode.FORBIDDEN, {
      code: StatusCode.FORBIDDEN,
      label: BackendErrorLabel.INVALID_CREDENTIALS,
      message: 'Missing cookie',
    });

    const client = new HttpClient(testConfig, mockedAccessTokenStore as AccessTokenStore);

    client.refreshAccessToken = () => {
      return Promise.reject(new Error('Should not refresh access token'));
    };
    let backendError;
    try {
      await client._sendRequest({config: {method: 'GET', baseURL: testConfig.urls.rest, url: AuthAPI.URL.ACCESS}});
      throw new Error('Should not resolve');
    } catch (error) {
      backendError = error;
    } finally {
      expect((backendError as BackendError).message).toBe('Authentication failed because the cookie is missing.');
    }
  });

  describe('hasValidAccessToken', () => {
    (
      [
        [Date.now() - 100_000, false],
        [Date.now() + 100_000, true],
      ] as const
    ).forEach(([expirationDate, expected]) => {
      const client = new HttpClient(testConfig, mockedAccessTokenStore as AccessTokenStore);

      it(`returns the validation state (${JSON.stringify(expirationDate)})`, () => {
        mockedAccessTokenStore.tokenExpirationDate = expirationDate;
        expect(client.hasValidAccessToken()).toBe(expected);
      });
    });
  });

  describe('sendRequest with incremental retry backoff', () => {
    it('retries retryable backend errors when incremental retry backoff is enabled', async () => {
      const httpClientDependenciesForTest = createHttpClientDependenciesForTest();
      const client = new HttpClient(
        testConfig,
        mockedAccessTokenStore as AccessTokenStore,
        {
          dependencies: httpClientDependenciesForTest,
          shouldUseIncrementalRetryBackoff: true,
        },
      );
      const response = {data: {ok: true}} as any;

      client._sendRequest = jest
        .fn()
        .mockRejectedValueOnce(createRetryableBackendError(StatusCode.SERVICE_UNAVAILABLE))
        .mockResolvedValueOnce(response);

      const result = await client.sendRequest({method: 'GET', url: '/conversations'});

      expect(result).toBe(response);
      expect(client._sendRequest).toHaveBeenCalledTimes(2);
      expect(httpClientDependenciesForTest.observedDelayInMilliseconds).toEqual([100]);
    });

    it('does not retry non-retryable backend errors when incremental retry backoff is enabled', async () => {
      const httpClientDependenciesForTest = createHttpClientDependenciesForTest();
      const client = new HttpClient(
        testConfig,
        mockedAccessTokenStore as AccessTokenStore,
        {
          dependencies: httpClientDependenciesForTest,
          shouldUseIncrementalRetryBackoff: true,
        },
      );
      const nonRetryableBackendError = new BackendError('Bad request', undefined, StatusCode.BAD_REQUEST);

      client._sendRequest = jest.fn().mockRejectedValueOnce(nonRetryableBackendError);

      await expect(client.sendRequest({method: 'GET', url: '/conversations'})).rejects.toBe(nonRetryableBackendError);
      expect(client._sendRequest).toHaveBeenCalledTimes(1);
      expect(httpClientDependenciesForTest.observedDelayInMilliseconds).toEqual([]);
    });

    it('preserves the existing behavior when incremental retry backoff is disabled', async () => {
      const httpClientDependenciesForTest = createHttpClientDependenciesForTest();
      const client = new HttpClient(
        testConfig,
        mockedAccessTokenStore as AccessTokenStore,
        {dependencies: httpClientDependenciesForTest},
      );
      const tooManyRequestsBackendError = new BackendError('Too many requests', undefined, StatusCode.TOO_MANY_REQUESTS);

      client._sendRequest = jest.fn().mockRejectedValueOnce(tooManyRequestsBackendError);

      await expect(client.sendRequest({method: 'GET', url: '/conversations'})).rejects.toBe(tooManyRequestsBackendError);
      expect(client._sendRequest).toHaveBeenCalledTimes(1);
      expect(httpClientDependenciesForTest.observedDelayInMilliseconds).toEqual([]);
    });

    it('restarts with the initial retry delay after the retry backoff is reset', async () => {
      const httpClientDependenciesForTest = createHttpClientDependenciesForTest();
      const client = new HttpClient(
        testConfig,
        mockedAccessTokenStore as AccessTokenStore,
        {
          dependencies: httpClientDependenciesForTest,
          shouldUseIncrementalRetryBackoff: true,
        },
      );
      const response = {data: {ok: true}} as any;

      client._sendRequest = jest
        .fn()
        .mockRejectedValueOnce(createRetryableBackendError(StatusCode.SERVICE_UNAVAILABLE))
        .mockResolvedValueOnce(response)
        .mockRejectedValueOnce(createRetryableBackendError(StatusCode.SERVICE_UNAVAILABLE))
        .mockResolvedValueOnce(response)
        .mockRejectedValueOnce(createRetryableBackendError(StatusCode.SERVICE_UNAVAILABLE))
        .mockResolvedValueOnce(response);

      await client.sendRequest({method: 'GET', url: '/conversations'});
      await client.sendRequest({method: 'GET', url: '/conversations'});

      client.resetRetryBackoff();

      await client.sendRequest({method: 'GET', url: '/conversations'});

      expect(httpClientDependenciesForTest.observedDelayInMilliseconds).toEqual([100, 200, 100]);
    });
  });
});
