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

/* eslint-disable no-magic-numbers, dot-notation */

import nock from 'nock';
import {AccentColor} from '@wireapp/commons/lib';

import {APIClient, BackendVersionResponse} from './APIClient';
import {AuthAPI} from './auth/AuthAPI';
import {ClientType} from './client';
import {BackendErrorLabel, StatusCode} from './http';
import {Self, SelfAPI} from './self';
import {UserAPI} from './user/UserAPI';

describe('APIClient', () => {
  const baseUrl = APIClient.BACKEND.PRODUCTION.rest;

  let accessTokenData = {
    access_token:
      'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDP' +
      'OBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86' +
      'a0-9adc8a15b3b4.c=15037015562284012115',
    expires_in: 900,
    token_type: 'Bearer',
    user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
  };

  const selfExample: Self = {
    email: 'email@example.com',
    handle: 'exampleuser',
    locale: 'en',
    qualified_id: {
      domain: 'example.com',
      id: '024174ec-c098-4104-9424-3849804acb78',
    },
    accent_id: AccentColor.AccentColorID.BRIGHT_ORANGE,
    picture: [],
    name: 'Example User',
    id: '024174ec-c098-4104-9424-3849804acb78',
    assets: [],
  };

  beforeEach(() => {
    nock(baseUrl).get(SelfAPI.URL.SELF).reply(StatusCode.OK, selfExample);
  });

  describe('constructor', () => {
    it('constructs a client with production backend and StoreEngine by default', () => {
      const client = new APIClient();
      expect(client.transport.http['client'].defaults.baseURL).toBe(APIClient.BACKEND.PRODUCTION.rest);
      expect(client.transport.ws['baseUrl']).toBe(APIClient.BACKEND.PRODUCTION.ws);
    });

    it('constructs StoreEngine when only the URLs is provided', () => {
      const client = new APIClient({urls: APIClient.BACKEND.PRODUCTION});
      expect(client.transport.http['client'].defaults.baseURL).toBe(APIClient.BACKEND.PRODUCTION.rest);
      expect(client.transport.ws['baseUrl']).toBe(APIClient.BACKEND.PRODUCTION.ws);
    });

    it('constructs URLs when only the StoreEngine is provided', () => {
      const client = new APIClient();
      expect(client.transport.http['client'].defaults.baseURL).toBe(APIClient.BACKEND.PRODUCTION.rest);
      expect(client.transport.ws['baseUrl']).toBe(APIClient.BACKEND.PRODUCTION.ws);
    });
  });

  describe('useVersion', () => {
    it('fails if backend versions and accepted version have no common version', async () => {
      nock(baseUrl)
        .get('/api-version')
        .reply(200, {supported: [0, 1]});
      const client = new APIClient();
      try {
        await client.useVersion([2, 3]);
      } catch (error) {
        expect((error as any).message).toContain('does not support');
      }
    });

    it("uses version 0 if backend doesn't support /api-version endpoint", async () => {
      nock(baseUrl).get('/api-version').reply(404);
      const client = new APIClient();
      const {version} = await client.useVersion([0, 1, 2, 3]);
      expect(version).toBe(0);
    });

    it('uses highest common version', async () => {
      nock(baseUrl)
        .get('/api-version')
        .reply(200, {supported: [0, 1]});
      const client = new APIClient();
      const {version, isFederated, federationEndpoints} = await client.useVersion([0, 1, 2]);
      expect(version).toBe(1);
      expect(isFederated).toBe(false);
      expect(federationEndpoints).toBe(true);
    });

    it('uses version dev version if available and requested', async () => {
      nock(baseUrl)
        .get('/api-version')
        .reply(200, {supported: [0, 1], development: [2]});
      const client = new APIClient();
      const {version, isFederated, federationEndpoints} = await client.useVersion([0, 1, 2], true);
      expect(version).toBe(2);
      expect(isFederated).toBe(false);
      expect(federationEndpoints).toBe(true);
    });

    it('ignores dev version if not requested', async () => {
      nock(baseUrl)
        .get('/api-version')
        .reply(200, {supported: [0, 1], development: [2]});
      const client = new APIClient();
      const {version, isFederated, federationEndpoints} = await client.useVersion([0, 1, 2], false);
      expect(version).toBe(1);
      expect(isFederated).toBe(false);
      expect(federationEndpoints).toBe(true);
    });

    it('ignores dev version if not listed in the supported versions', async () => {
      nock(baseUrl)
        .get('/api-version')
        .reply(200, {supported: [0, 1], development: [2]});
      const client = new APIClient();
      const {version, isFederated, federationEndpoints} = await client.useVersion([0, 1], true);
      expect(version).toBe(1);
      expect(isFederated).toBe(false);
      expect(federationEndpoints).toBe(true);
    });

    it('returns the backend federation state', async () => {
      const response: BackendVersionResponse = {supported: [0, 1], federation: true};
      nock(baseUrl).get('/api-version').reply(200, response);
      const client = new APIClient();
      const {isFederated} = await client.useVersion([0, 1, 2]);
      expect(isFederated).toBe(true);
    });
  });

  describe('login', () => {
    accessTokenData = {
      access_token:
        'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsd' +
        'DPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c2' +
        '2-86a0-9adc8a15b3b4.c=15037015562284012115',
      expires_in: 900,
      token_type: 'Bearer',
      user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
    };

    const loginData = {
      clientType: ClientType.TEMPORARY,
      email: 'me@mail.com',
      password: 'top-secret',
    };

    const userData = [
      {
        accent_id: 0,
        assets: [],
        handle: 'webappbot',
        id: '062418ea-9b93-4d93-b59b-11aba3f702d8',
        name: 'Webapp Bot',
        picture: [
          {
            content_length: 7023,
            content_type: 'image/jpeg',
            data: null,
            id: 'bb5c861e-b133-46e1-a92b-555218ecdf52',
            info: {
              correlation_id: '83f6d538-fc38-4e24-97ae-312f079f3594',
              height: 280,
              nonce: '83f6d538-fc38-4e24-97ae-312f079f3594',
              original_height: 1080,
              original_width: 1920,
              public: true,
              tag: 'smallProfile',
              width: 280,
            },
          },
          {
            content_length: 94027,
            content_type: 'image/jpeg',
            data: null,
            id: 'efd732aa-2ff2-4959-968a-a621dda342b6',
            info: {
              correlation_id: '83f6d538-fc38-4e24-97ae-312f079f3594',
              height: 1080,
              nonce: '83f6d538-fc38-4e24-97ae-312f079f3594',
              original_height: 1080,
              original_width: 1920,
              public: true,
              tag: 'medium',
              width: 1920,
            },
          },
        ],
      },
    ];

    beforeEach(() => {
      nock(baseUrl)
        .post(`${AuthAPI.URL.LOGIN}`, {
          email: loginData.email,
          password: loginData.password,
        })
        .query({persist: loginData.clientType === 'permanent'})
        .reply(StatusCode.OK, accessTokenData);

      nock(baseUrl).post(`${AuthAPI.URL.ACCESS}/${AuthAPI.URL.LOGOUT}`).reply(StatusCode.OK, undefined);
    });

    it('creates a context from a successful login', async () => {
      const client = new APIClient();
      const context = await client.login(loginData);
      expect(context.userId).toBe(accessTokenData.user);
      expect(client['accessTokenStore'].accessToken?.access_token).toBe(accessTokenData.access_token);
    });

    it('can login after a logout', async () => {
      const client = new APIClient();
      await client.login(loginData);
      return client.logout();
    });

    it('refreshes an access token when it becomes invalid', async () => {
      const queriedHandle = 'webappbot';

      nock(baseUrl).get(UserAPI.URL.USERS).query({handles: queriedHandle}).once().reply(StatusCode.FORBIDDEN, {
        code: StatusCode.FORBIDDEN,
        label: BackendErrorLabel.INVALID_CREDENTIALS,
        message: 'Token expired',
      });

      nock(baseUrl).get(UserAPI.URL.USERS).query({handles: queriedHandle}).reply(StatusCode.OK, userData);

      nock(baseUrl).post(AuthAPI.URL.ACCESS).reply(StatusCode.OK, accessTokenData);

      const client = new APIClient();
      const context = await client.login(loginData);
      expect(context.userId).toBe(accessTokenData.user);
      // Make access token invalid
      delete (client['accessTokenStore'].accessToken as any)?.access_token;
      const response = await client.api.user.getUsers({handles: [queriedHandle]});
      expect(response[0].name).toBe(userData[0].name);
      expect(client['accessTokenStore'].accessToken?.access_token).toBeDefined();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      nock(baseUrl).post(`${AuthAPI.URL.ACCESS}/${AuthAPI.URL.LOGOUT}`).reply(StatusCode.OK);
    });

    it('can logout a user', async () => {
      const client = new APIClient();

      client.context = await client['createContext']('3721e5d3-558d-45ac-b476-b4a64a8f74c1', ClientType.TEMPORARY);

      await client.logout();
    });

    it('ignores errors', async () => {
      const client = new APIClient();
      const testError = new Error('Test rejection');

      jest.spyOn(client.api.auth, 'postLogout').mockReturnValue(Promise.reject(testError));
      jest.spyOn(client, 'disconnect').mockReturnValue();
      jest.spyOn(client['accessTokenStore'], 'delete').mockReturnValue(Promise.resolve(undefined));
      jest.spyOn(client['logger'], 'warn').mockReturnValue();

      await client.logout();
      expect(client['logger'].warn).toHaveBeenCalledWith(testError);
    });

    it('skips request when told to', async () => {
      const client = new APIClient();

      jest.spyOn(client.api.auth, 'postLogout');
      jest.spyOn(client, 'disconnect').mockReturnValue();
      jest.spyOn(client['accessTokenStore'], 'delete').mockReturnValue(Promise.resolve(undefined));
      jest.spyOn(client['logger'], 'warn').mockReturnValue();

      await client.logout({skipLogoutRequest: true});
      expect(client['logger'].warn).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const registerData = {
      accent_id: 0,
      assets: [],
      email: 'user@wire.com',
      id: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
      locale: 'de',
      name: 'unique_username',
      picture: [],
    };

    beforeEach(() => {
      nock(baseUrl).post(AuthAPI.URL.REGISTER, registerData).reply(StatusCode.OK, registerData);
      nock(baseUrl).post(AuthAPI.URL.ACCESS).reply(StatusCode.OK, accessTokenData);
      nock(baseUrl).get(SelfAPI.URL.SELF).reply(StatusCode.OK, selfExample);
    });

    it('automatically gets an access token after registration', async () => {
      const client = new APIClient();

      const context = await client.register(registerData);
      expect(context.userId).toBe(registerData.id);
      expect(client['accessTokenStore'].accessToken?.access_token).toBe(accessTokenData.access_token);
    });
  });
});
