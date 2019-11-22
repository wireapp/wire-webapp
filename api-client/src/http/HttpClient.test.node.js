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

const {HttpClient, StatusCode} = require('@wireapp/api-client/dist/http/');
const axios = require('axios');

describe('HttpClient', () => {
  describe('"_sendRequest"', () => {
    it('retries on 401 unauthorized error', async () => {
      const mockedAccessTokenStore = {
        accessToken: {
          access_token:
            'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86a0-9adc8a15b3b4.c=15037015562284012115',
          expires_in: 900,
          token_type: 'Bearer',
          user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
        },
      };

      const client = new HttpClient('https://test.zinfra.io', mockedAccessTokenStore, undefined);
      const requestSpy = spyOn(axios, 'request');
      // eslint-disable-next-line prefer-promise-reject-errors
      requestSpy.and.returnValue(Promise.reject({response: {status: StatusCode.UNAUTHORIZED}}));
      client.refreshAccessToken = () => {
        requestSpy.and.returnValue(Promise.resolve());
        return Promise.resolve(mockedAccessTokenStore.access_token);
      };

      await client._sendRequest({});
    });

    it('does not retry on 403 forbidden error', async () => {
      const mockedAccessTokenStore = {
        accessToken: {
          access_token:
            'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86a0-9adc8a15b3b4.c=15037015562284012115',
          expires_in: 900,
          token_type: 'Bearer',
          user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
        },
      };
      const errorMessage = 'cookie invalid';

      const client = new HttpClient('https://test.zinfra.io', mockedAccessTokenStore, undefined);
      spyOn(axios, 'request').and.returnValue(
        // eslint-disable-next-line prefer-promise-reject-errors
        Promise.reject({
          response: {
            data: {
              code: StatusCode.FORBIDDEN,
              label: 'invalid-credentials',
              message: errorMessage,
            },
            status: StatusCode.FORBIDDEN,
          },
        }),
      );
      client.refreshAccessToken = () => {
        return Promise.reject(new Error('Should not refresh access token'));
      };

      try {
        await client._sendRequest({});
        fail();
      } catch (error) {
        expect(error.message).toBe(errorMessage);
      }
    });
  });
});
