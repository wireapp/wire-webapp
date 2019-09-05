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

/* eslint-disable no-magic-numbers */

const nock = require('nock');

const {APIClient} = require('@wireapp/api-client');
const {AUTH_TABLE_NAME, AuthAPI} = require('@wireapp/api-client/dist/commonjs/auth/');
const {UserAPI} = require('@wireapp/api-client/dist/commonjs/user/');
const {MemoryEngine} = require('@wireapp/store-engine');

describe('APIClient', () => {
  const baseUrl = APIClient.BACKEND.PRODUCTION.rest;

  let accessTokenData = {
    access_token:
      'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86a0-9adc8a15b3b4.c=15037015562284012115',
    expires_in: 900,
    token_type: 'Bearer',
    user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
  };

  describe('"constructor"', () => {
    it('constructs a client with production backend and StoreEngine by default', () => {
      const client = new APIClient();
      expect(client.transport.http.baseUrl).toBe(APIClient.BACKEND.PRODUCTION.rest);
      expect(client.transport.ws.baseUrl).toBe(APIClient.BACKEND.PRODUCTION.ws);
    });

    it('constructs StoreEngine when only the URLs is provided', () => {
      const client = new APIClient({urls: APIClient.BACKEND.PRODUCTION});
      expect(client.transport.http.baseUrl).toBe(APIClient.BACKEND.PRODUCTION.rest);
      expect(client.transport.ws.baseUrl).toBe(APIClient.BACKEND.PRODUCTION.ws);
    });

    it('constructs URLs when only the StoreEngine is provided', () => {
      const client = new APIClient({store: new MemoryEngine()});
      expect(client.transport.http.baseUrl).toBe(APIClient.BACKEND.PRODUCTION.rest);
      expect(client.transport.ws.baseUrl).toBe(APIClient.BACKEND.PRODUCTION.ws);
    });

    it('constructs schema callback when provided', () => {
      const schemaCallback = db => {
        db.version(1).stores({
          [AUTH_TABLE_NAME]: '',
        });
      };
      const client = new APIClient({
        schemaCallback,
        store: new MemoryEngine(),
      });
      expect(client.config.schemaCallback).toBe(schemaCallback);
    });
  });

  describe('"login"', () => {
    accessTokenData = {
      access_token:
        'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86a0-9adc8a15b3b4.c=15037015562284012115',
      expires_in: 900,
      token_type: 'Bearer',
      user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
    };

    const loginData = {
      clientType: 'temporary',
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
        .reply(200, accessTokenData);

      nock(baseUrl)
        .post(`${AuthAPI.URL.ACCESS}/${AuthAPI.URL.LOGOUT}`)
        .reply(200, undefined);
    });

    it('creates a context from a successful login', async () => {
      const client = new APIClient();
      const context = await client.login(loginData);
      expect(context.userId).toBe(accessTokenData.user);
      expect(client.accessTokenStore.accessToken.access_token).toBe(accessTokenData.access_token);
    });

    it('can login after a logout', async () => {
      const client = new APIClient();
      await client.login(loginData);
      return await client.logout();
    });

    it('refreshes an access token when it becomes invalid', async () => {
      const queriedHandle = 'webappbot';

      nock(baseUrl)
        .get(UserAPI.URL.USERS)
        .query({handles: queriedHandle})
        .once()
        .reply(401);

      nock(baseUrl)
        .get(UserAPI.URL.USERS)
        .query({handles: queriedHandle})
        .twice()
        .reply(200, userData);

      nock(baseUrl)
        .post(AuthAPI.URL.ACCESS)
        .reply(200, accessTokenData);

      const client = new APIClient();
      const context = await client.login(loginData);
      expect(context.userId).toBe(accessTokenData.user);
      // Make access token invalid
      client.accessTokenStore.accessToken.access_token = undefined;
      const response = await client.user.api.getUsers({handles: [queriedHandle]});
      expect(response.name).toBe(userData.name);
      expect(client.accessTokenStore.accessToken.access_token).toBeDefined();
    });
  });

  describe('"logout"', () => {
    beforeEach(() => {
      nock(baseUrl)
        .post(`${AuthAPI.URL.ACCESS}/${AuthAPI.URL.LOGOUT}`)
        .reply(200);
    });

    it('can logout a user', async () => {
      const client = new APIClient();

      const context = client.createContext(
        '3721e5d3-558d-45ac-b476-b4a64a8f74c1',
        'temporary',
        'dce3d529-51e6-40c2-9147-e091eef48e73',
      );

      await client.initEngine(context);

      await client.logout();
    });

    it('ignores errors when told to', async () => {
      const client = new APIClient();
      const testError = new Error('Test rejection');

      spyOn(client.auth.api, 'postLogout').and.returnValue(Promise.reject(testError));
      spyOn(client, 'disconnect').and.returnValue();
      spyOn(client.accessTokenStore, 'delete').and.returnValue();
      spyOn(client.logger, 'error').and.returnValue();

      await client.logout({ignoreError: true});
      expect(client.logger.error).toHaveBeenCalledWith(testError);
    });

    it('stops at errors when told to', async () => {
      const client = new APIClient();
      const testError = new Error('Test rejection');

      spyOn(client.auth.api, 'postLogout').and.returnValue(Promise.reject(testError));
      spyOn(client.logger, 'error').and.returnValue();

      try {
        await client.logout();
        fail('Did not throw error');
      } catch (error) {
        expect(error === testError);
        expect(client.logger.error).toHaveBeenCalledTimes(0);
      }
    });
  });

  describe('"register"', () => {
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
      nock(baseUrl)
        .post(AuthAPI.URL.REGISTER, registerData)
        .reply(200, registerData);

      nock(baseUrl)
        .post(AuthAPI.URL.ACCESS)
        .reply(200, accessTokenData);
    });

    it('automatically gets an access token after registration', async () => {
      const client = new APIClient({
        schemaCallback: db => {
          db.version(1).stores({
            [AUTH_TABLE_NAME]: '',
          });
        },
      });

      const context = await client.register(registerData);
      expect(context.userId).toBe(registerData.id);
      expect(client.accessTokenStore.accessToken.access_token).toBe(accessTokenData.access_token);
    });
  });
});
