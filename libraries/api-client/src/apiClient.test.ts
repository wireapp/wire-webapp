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

import {nodePlatform} from './shims/node/platform';

import {AccentColor} from '@wireapp/commons/lib';
import nock from 'nock';

import {APIClient} from './apiClient';
import {AccessTokenData} from './auth/accessTokenData';
import {AuthAPI} from './auth/authApi';
import {Cookie} from './auth/cookie';
import {CookieStore} from './auth/cookieStore';
import {ClientType} from './client';
import {Config, MINIMUM_API_VERSION} from './config';
import {BackendErrorLabel, StatusCode} from './http';
import {Self, SelfAPI} from './self';
import {UserAPI, UserType} from './user';

const testConfig: Config = {urls: APIClient.BACKEND.PRODUCTION};

const apiClients: APIClient[] = [];

describe('APIClient', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    apiClients.forEach(client => {
      client.dispose();
    });
    apiClients.length = 0;
  });

  const baseUrl = APIClient.BACKEND.PRODUCTION.rest;

  let accessTokenData: AccessTokenData = {
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
    type: UserType.REGULAR,
  };

  beforeEach(() => {
    nock(baseUrl).get(SelfAPI.URL.SELF).reply(StatusCode.OK, selfExample);
  });

  describe('cookie refresh lifecycle', () => {
    const refreshedCookie = new Cookie('session-cookie', '2099-01-01T00:00:00.000Z');
    let previousCookie: Cookie | undefined;

    beforeEach(() => {
      previousCookie = CookieStore.getCookie();
    });

    afterEach(() => {
      apiClients.forEach(client => {
        client.dispose();
      });
      CookieStore.setCookie(previousCookie);
    });

    function createCookieRefreshClient(): APIClient {
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      jest.spyOn(client.transport.ws, 'connect').mockReturnValue(client.transport.ws);

      return client;
    }

    it('forwards cookies before opening a WebSocket', () => {
      const client = createCookieRefreshClient();
      const onCookieRefresh = jest.fn();
      client.on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);

      CookieStore.setCookie(refreshedCookie);

      expect(onCookieRefresh.mock.calls).toEqual([[refreshedCookie]]);
    });

    it('releases each subscription across repeated client creation and disposal', () => {
      const initialListenerCount = CookieStore.emitter.listenerCount(CookieStore.TOPIC.COOKIE_REFRESH);
      const onCookieRefresh = jest.fn();
      const lifecycleRepetitions = 50;

      for (let repetition = 0; repetition < lifecycleRepetitions; repetition++) {
        const client = createCookieRefreshClient();
        client.on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);
        client.dispose();
        client.dispose();
      }
      CookieStore.setCookie(refreshedCookie);

      expect(onCookieRefresh).not.toHaveBeenCalled();
      expect(CookieStore.emitter.listenerCount(CookieStore.TOPIC.COOKIE_REFRESH)).toBe(initialListenerCount);
    });

    it('keeps notifications active across WebSocket disconnects and reconnects without duplicates', () => {
      const client = createCookieRefreshClient();
      const onCookieRefresh = jest.fn();
      client.on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);

      client.disconnect();
      CookieStore.setCookie(refreshedCookie);
      expect(onCookieRefresh.mock.calls).toEqual([[refreshedCookie]]);

      client.connect();
      client.connect();
      CookieStore.setCookie(refreshedCookie);
      client.disconnect();
      client.connect();
      CookieStore.setCookie(refreshedCookie);

      expect(onCookieRefresh.mock.calls).toEqual([[refreshedCookie], [refreshedCookie], [refreshedCookie]]);
    });

    it('disposes only its own subscription without changing the shared cookie', () => {
      const firstClient = createCookieRefreshClient();
      const secondClient = createCookieRefreshClient();
      const onFirstCookieRefresh = jest.fn();
      const onSecondCookieRefresh = jest.fn();
      firstClient.on(APIClient.TOPIC.COOKIE_REFRESH, onFirstCookieRefresh);
      secondClient.on(APIClient.TOPIC.COOKIE_REFRESH, onSecondCookieRefresh);

      CookieStore.setCookie(refreshedCookie);
      firstClient.dispose();
      expect(CookieStore.getCookie()).toBe(refreshedCookie);
      CookieStore.deleteCookie();

      expect(onFirstCookieRefresh.mock.calls).toEqual([[refreshedCookie]]);
      expect(onSecondCookieRefresh.mock.calls).toEqual([[refreshedCookie], [undefined]]);
    });

    it.each(['dispose', Symbol.dispose] as const)(
      'stops cookie notifications even if %s fails and permits cleanup to be retried',
      disposalMethod => {
        const client = createCookieRefreshClient();
        const onCookieRefresh = jest.fn();
        client.on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);
        const disconnectFailure = new Error('WebSocket disconnection failed');
        jest.spyOn(client.transport.ws, 'disconnect').mockImplementationOnce(() => {
          throw disconnectFailure;
        });

        expect(() => {
          client[disposalMethod]();
        }).toThrow(disconnectFailure);
        CookieStore.setCookie(refreshedCookie);
        expect(onCookieRefresh).not.toHaveBeenCalled();

        expect(() => {
          client[disposalMethod]();
          client[disposalMethod]();
        }).not.toThrow();
        CookieStore.setCookie(refreshedCookie);
        expect(onCookieRefresh).not.toHaveBeenCalled();
      },
    );

    it('releases its cookie subscription and disconnects through the Disposable protocol', () => {
      const client = createCookieRefreshClient();
      const disposable: Disposable = client;
      const onCookieRefresh = jest.fn();
      const disconnect = jest.spyOn(client.transport.ws, 'disconnect');
      client.on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);

      disposable[Symbol.dispose]();
      disposable[Symbol.dispose]();
      CookieStore.setCookie(refreshedCookie);

      expect(onCookieRefresh).not.toHaveBeenCalled();
      expect(disconnect.mock.calls).toEqual([['Closed by client disposal'], ['Closed by client disposal']]);
    });

    it('automatically releases its cookie subscription at scope exit', () => {
      const initialListenerCount = CookieStore.emitter.listenerCount(CookieStore.TOPIC.COOKIE_REFRESH);
      const onCookieRefresh = jest.fn();

      {
        using client = new APIClient({...testConfig, platform: nodePlatform});
        client.on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);
        CookieStore.setCookie(refreshedCookie);
        expect(onCookieRefresh.mock.calls).toEqual([[refreshedCookie]]);
        onCookieRefresh.mockClear();
      }
      CookieStore.setCookie(refreshedCookie);

      expect(onCookieRefresh).not.toHaveBeenCalled();
      expect(CookieStore.emitter.listenerCount(CookieStore.TOPIC.COOKIE_REFRESH)).toBe(initialListenerCount);
    });

    it('automatically releases its cookie subscription when a scope throws', () => {
      const initialListenerCount = CookieStore.emitter.listenerCount(CookieStore.TOPIC.COOKIE_REFRESH);
      const onCookieRefresh = jest.fn();
      const scopeFailure = new Error('Resource scope failed');

      expect(() => {
        using client = new APIClient({...testConfig, platform: nodePlatform});
        client.on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);

        throw scopeFailure;
      }).toThrow(scopeFailure);
      CookieStore.setCookie(refreshedCookie);

      expect(onCookieRefresh).not.toHaveBeenCalled();
      expect(CookieStore.emitter.listenerCount(CookieStore.TOPIC.COOKIE_REFRESH)).toBe(initialListenerCount);
    });

    it('delivers notifications when initializing an HTTP-only session after disconnect', async () => {
      const client = createCookieRefreshClient();
      const onCookieRefresh = jest.fn();
      client.on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);
      jest.spyOn(client.transport.http, 'refreshAccessToken').mockResolvedValue(accessTokenData);
      client.disconnect();

      await client.init(ClientType.NONE, refreshedCookie);

      expect(onCookieRefresh.mock.calls).toEqual([[refreshedCookie]]);
    });

    it('delivers cookie deletion and login notifications across logout and repeated login', async () => {
      const client = createCookieRefreshClient();
      const onCookieRefresh = jest.fn();
      client.on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);
      jest.spyOn(client.api.auth, 'postLogout').mockResolvedValue(undefined);
      jest.spyOn(client.api.self, 'getSelf').mockResolvedValue(selfExample);
      jest.spyOn(client.api.auth, 'postLogin').mockImplementation(async () => {
        CookieStore.setCookie(refreshedCookie);

        return accessTokenData;
      });
      const loginCredentials = {clientType: ClientType.NONE, email: 'user@example.com', password: 'password'};

      await client.logout();
      expect(onCookieRefresh.mock.calls).toEqual([[undefined]]);

      await client.login(loginCredentials);
      await client.login(loginCredentials);

      expect(onCookieRefresh.mock.calls).toEqual([[undefined], [refreshedCookie], [undefined], [refreshedCookie]]);
    });

    it('keeps notifications active when logging in with a token after disconnect', async () => {
      const client = createCookieRefreshClient();
      const onCookieRefresh = jest.fn();
      client.on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);
      client.disconnect();

      await client.loginWithToken(accessTokenData.access_token);
      CookieStore.setCookie(refreshedCookie);

      expect(onCookieRefresh.mock.calls).toEqual([[refreshedCookie]]);
    });

    it('delivers cookie notifications when registration replaces an existing session', async () => {
      const client = createCookieRefreshClient();
      const onCookieRefresh = jest.fn();
      client.on(APIClient.TOPIC.COOKIE_REFRESH, onCookieRefresh);
      client.context = {clientType: ClientType.NONE, userId: accessTokenData.user};
      jest.spyOn(client.api.auth, 'postLogout').mockResolvedValue(undefined);
      jest.spyOn(client.api.self, 'getSelf').mockResolvedValue(selfExample);
      jest.spyOn(client.transport.http, 'refreshAccessToken').mockResolvedValue(accessTokenData);
      jest.spyOn(client.api.auth, 'postRegister').mockImplementation(async () => {
        CookieStore.setCookie(refreshedCookie);

        return selfExample;
      });

      await client.register({name: 'Example User', email: 'user@example.com', password: 'password'});

      expect(onCookieRefresh.mock.calls).toEqual([[undefined], [refreshedCookie], [refreshedCookie]]);
    });
  });

  describe('constructor', () => {
    it('constructs a client with production backend and StoreEngine by default', () => {
      using client = new APIClient({...testConfig, platform: nodePlatform});
      expect(client.transport.http['client'].defaults.baseURL).toBe(APIClient.BACKEND.PRODUCTION.rest);
      expect(client.transport.ws['baseUrl']).toBe(APIClient.BACKEND.PRODUCTION.ws);
    });

    it('constructs StoreEngine when only the URLs is provided', () => {
      using client = new APIClient({platform: nodePlatform, urls: APIClient.BACKEND.PRODUCTION});
      expect(client.transport.http['client'].defaults.baseURL).toBe(APIClient.BACKEND.PRODUCTION.rest);
      expect(client.transport.ws['baseUrl']).toBe(APIClient.BACKEND.PRODUCTION.ws);
    });

    it('constructs URLs when only the StoreEngine is provided', () => {
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      expect(client.transport.http['client'].defaults.baseURL).toBe(APIClient.BACKEND.PRODUCTION.rest);
      expect(client.transport.ws['baseUrl']).toBe(APIClient.BACKEND.PRODUCTION.ws);
    });

    it('constructs an http client with incremental retry backoff support', () => {
      const client = new APIClient({...testConfig, platform: nodePlatform});

      apiClients.push(client);

      expect(client.transport.http['incrementalRetryBackoffRunner']).toBeDefined();
    });
  });

  describe('useVersion', () => {
    it('fails if backend versions and accepted version have no common version', async () => {
      nock(baseUrl)
        .get('/api-version')
        .reply(200, {supported: [MINIMUM_API_VERSION, MINIMUM_API_VERSION + 1]});
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      let errorMessage;
      try {
        await client.useVersion(MINIMUM_API_VERSION + 2, MINIMUM_API_VERSION + 3);
      } catch (error: unknown) {
        errorMessage = error instanceof Error ? error.message : String(error);
      } finally {
        expect(errorMessage).toContain('No compatible API version in range');
      }
    });

    it("throws error if backend doesn't support /api-version endpoint", async () => {
      nock(baseUrl).get('/api-version').reply(404);
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      let errorMessage;
      try {
        await client.useVersion(0, 3);
      } catch (error: unknown) {
        errorMessage = error instanceof Error ? error.message : String(error);
      } finally {
        expect(errorMessage).toContain(`Minimum supported API version is ${MINIMUM_API_VERSION}. Received: 0`);
      }
    });

    it('uses highest common version', async () => {
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      jest
        .spyOn(client.transport.http, 'sendRequest')
        .mockReturnValue({data: {supported: [MINIMUM_API_VERSION, MINIMUM_API_VERSION + 1]}} as any);
      const {version, isFederated, federationEndpoints} = await client.useVersion(
        MINIMUM_API_VERSION,
        MINIMUM_API_VERSION + 2,
      );
      expect(version).toBe(MINIMUM_API_VERSION + 1);
      expect(isFederated).toBe(false);
      expect(federationEndpoints).toBe(true);
    });

    it('uses dev version if available and requested', async () => {
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      jest.spyOn(client.transport.http, 'sendRequest').mockReturnValue({
        data: {supported: [MINIMUM_API_VERSION, MINIMUM_API_VERSION + 1], development: [MINIMUM_API_VERSION + 2]},
      } as any);
      const {version, isFederated, federationEndpoints} = await client.useVersion(
        MINIMUM_API_VERSION,
        MINIMUM_API_VERSION + 2,
        true,
      );
      expect(version).toBe(MINIMUM_API_VERSION + 2);
      expect(isFederated).toBe(false);
      expect(federationEndpoints).toBe(true);
    });

    it('ignores dev version if not requested', async () => {
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      jest.spyOn(client.transport.http, 'sendRequest').mockReturnValue({
        data: {supported: [MINIMUM_API_VERSION, MINIMUM_API_VERSION + 1], development: [MINIMUM_API_VERSION + 2]},
      } as any);
      const {version, isFederated, federationEndpoints} = await client.useVersion(
        MINIMUM_API_VERSION,
        MINIMUM_API_VERSION + 2,
        false,
      );
      expect(version).toBe(MINIMUM_API_VERSION + 1);
      expect(isFederated).toBe(false);
      expect(federationEndpoints).toBe(true);
    });

    it('ignores dev version if not listed in the supported versions', async () => {
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      jest.spyOn(client.transport.http, 'sendRequest').mockReturnValue({
        data: {supported: [MINIMUM_API_VERSION, MINIMUM_API_VERSION + 1], development: [MINIMUM_API_VERSION + 2]},
      } as any);
      const {version, isFederated, federationEndpoints} = await client.useVersion(
        MINIMUM_API_VERSION,
        MINIMUM_API_VERSION + 1,
        true,
      );
      expect(version).toBe(MINIMUM_API_VERSION + 1);
      expect(isFederated).toBe(false);
      expect(federationEndpoints).toBe(true);
    });

    it('returns the backend federation state', async () => {
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      jest
        .spyOn(client.transport.http, 'sendRequest')
        .mockReturnValue({data: {supported: [MINIMUM_API_VERSION, MINIMUM_API_VERSION + 1], federation: true}} as any);
      const {isFederated} = await client.useVersion(MINIMUM_API_VERSION, MINIMUM_API_VERSION + 2);
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
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      const context = await client.login(loginData);
      expect(context.userId).toBe(accessTokenData.user);
      expect(client['accessTokenStore'].accessTokenData?.access_token).toBe(accessTokenData.access_token);
    });

    it('can login after a logout', async () => {
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      await client.login(loginData);
      return client.logout();
    });

    it('refreshes an access token when it becomes invalid', async () => {
      const queriedHandle = 'webappbot';

      nock(baseUrl).get(`/${UserAPI.URL.USERS}`).query({handles: queriedHandle}).once().reply(StatusCode.FORBIDDEN, {
        code: StatusCode.FORBIDDEN,
        label: BackendErrorLabel.INVALID_CREDENTIALS,
        message: 'Token expired',
      });

      nock(baseUrl).get(`/${UserAPI.URL.USERS}`).query({handles: queriedHandle}).reply(StatusCode.OK, userData);

      nock(baseUrl).post(AuthAPI.URL.ACCESS).reply(StatusCode.OK, accessTokenData);

      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      const context = await client.login(loginData);
      expect(context.userId).toBe(accessTokenData.user);
      // Make access token invalid
      delete (client['accessTokenStore'].accessTokenData as any)?.access_token;
      const response = await client.api.user.getUsers({handles: [queriedHandle]});
      expect(response[0].name).toBe(userData[0].name);
      expect(client['accessTokenStore'].accessTokenData?.access_token).toBeDefined();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      nock(baseUrl).post(`${AuthAPI.URL.ACCESS}/${AuthAPI.URL.LOGOUT}`).reply(StatusCode.OK);
    });

    it('can logout a user', async () => {
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);

      client.context = await client['createContext']('3721e5d3-558d-45ac-b476-b4a64a8f74c1', ClientType.TEMPORARY);

      await client.logout();
    });

    it('ignores errors', async () => {
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);
      const testError = new Error('Test rejection');

      jest.spyOn(client.api.auth, 'postLogout').mockReturnValue(Promise.reject(testError));
      jest.spyOn(client['accessTokenStore'], 'delete').mockReturnValue(Promise.resolve(undefined));
      jest.spyOn(client['logger'], 'warn').mockReturnValue(undefined);

      await client.logout();
      expect(client['logger'].warn).toHaveBeenCalledWith(testError);
    });

    it('skips request when told to', async () => {
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);

      jest.spyOn(client.api.auth, 'postLogout');
      jest.spyOn(client['accessTokenStore'], 'delete').mockReturnValue(Promise.resolve(undefined));
      jest.spyOn(client['logger'], 'warn').mockReturnValue(undefined);

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
      const client = new APIClient({...testConfig, platform: nodePlatform});
      apiClients.push(client);

      const context = await client.register(registerData);
      expect(context.userId).toBe(registerData.id);
      expect(client['accessTokenStore'].accessTokenData?.access_token).toBe(accessTokenData.access_token);
    });
  });
});
