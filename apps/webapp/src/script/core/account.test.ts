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

import {nodePlatform} from '../apiClient/shims/node/platform';

import {AuthAPI} from '../apiClient/auth/authApi';
import {isNullOrUndefined, isPlainObject} from '@sindresorhus/is';
import {ClientAPI} from '../apiClient/client/clientApi';
import {ClientCapability} from '../apiClient/client/clientCapability';
import {ClientClassification} from '../apiClient/client/clientClassification';
import {ClientType} from '../apiClient/client/clientType';
import {RegisteredClient} from '../apiClient/client/registeredClient';
import {MINIMUM_API_VERSION} from '../apiClient/config';
import {ConversationAPI} from '../apiClient/conversation/conversationApi/conversationApi';
import {BackendEvent} from '../apiClient/event/backendEvent';
import {USER_EVENT} from '../apiClient/event/userEvent';
import {BackendError} from '../apiClient/http/backendError';
import {BackendErrorLabel} from '../apiClient/http/backendErrorLabel';
import {NotificationAPI} from '../apiClient/notification/notificationApi/notificationApi';
import {ConsumableEvent} from '../apiClient/notification/consumableNotification';
import {Self} from '../apiClient/self/self';
import {SelfAPI} from '../apiClient/self/selfApi';
import {UserType} from '../apiClient/user/user';
import {
  ReconnectingWebsocket,
  type WebSocketLifecycleImplementation,
  WEBSOCKET_STATE,
} from '../apiClient/tcp/reconnectingWebsocket';
import {WebSocketClient} from '../apiClient/tcp/webSocketClient';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {WS} from 'jest-websocket-mock';
import nock from 'nock';
import {v4 as uuidv4} from 'uuid';

import {APIClient} from '../apiClient/apiClient';
import {AccentColor, ValidationUtil} from '../commons/util';
import {GenericMessage, Text} from '@wireapp/protocol-messaging';

// Mock ConversationService to avoid requiring MLSService in constructor during tests
jest.mock('./conversation', () => {
  const actual = jest.requireActual('./conversation');
  class FakeConversationService {
    // Return unhandled so NotificationService falls back to generic handling in tests
    handleEvent = jest.fn(async () => {
      return {status: 'unhandled' as const};
    });
    runDeferredEpochRecovery = jest.fn(async () => {
      return undefined;
    });
  }
  return {
    ...actual,
    ConversationService: FakeConversationService,
  };
});

import {Account, EVENTS} from './account';
import {Maybe, result, task} from 'true-myth';
import type {MetaClient} from './client/clientService';
import {ConnectionState} from './connectionState/connectionState';
import type {MLSService} from './messagingProtocols/mls';
import {NotificationSource} from './notification';

function getAccountServiceForTest(account: Account): NonNullable<Account['service']> {
  if (isNullOrUndefined(account.service)) {
    throw new Error('Expected account services to be initialized');
  }

  return account.service;
}

const BASE_URL = 'mock-backend.wire.com';
const MOCK_BACKEND = {
  name: 'mock',
  rest: `https://${BASE_URL}`,
  ws: `wss://${BASE_URL}`,
};

const apiClients: APIClient[] = [];

async function createAccount(
  webSocketLifecycleImplementation: WebSocketLifecycleImplementation = 'corrected',
): Promise<{account: Account; apiClient: APIClient}> {
  const apiClient = new APIClient({platform: nodePlatform, urls: MOCK_BACKEND, webSocketLifecycleImplementation});
  apiClients.push(apiClient);
  const account = new Account(apiClient);
  await account['initServices']({
    clientType: ClientType.TEMPORARY,
    userId: '',
  });
  return {account, apiClient};
}

const waitFor = (assertion: () => void): Promise<void> => {
  const maxAttempts = 500;
  let attempts = 0;
  return new Promise<void>(resolve => {
    const attempt = (): void => {
      attempts++;
      try {
        assertion();
        resolve();
      } catch (e: unknown) {
        if (attempts > maxAttempts) {
          throw e;
        }
        setTimeout(attempt, 10);
      }
    };
    attempt();
  });
};

describe('Account', () => {
  describe('getLocalClient', () => {
    it('returns Err when the client service has not been initialized', async () => {
      const apiClient = new APIClient({platform: nodePlatform, urls: MOCK_BACKEND});
      apiClients.push(apiClient);
      const account = new Account(apiClient);

      await expect(account.getLocalClient()).resolves.toEqual(
        result.err(new Error('Client service is not initialized.')),
      );
    });

    it.each([Maybe.just({id: 'local-client'} as MetaClient), Maybe.nothing<MetaClient>()])(
      'preserves the client lookup outcome %s',
      async localClient => {
        const {account} = await createAccount();
        jest.spyOn(getAccountServiceForTest(account).client, 'loadClient').mockReturnValue(task.resolve(localClient));

        await expect(account.getLocalClient()).resolves.toEqual(result.ok(localClient));
      },
    );

    it('preserves a failed client lookup', async () => {
      const {account} = await createAccount();
      const lookupError = new Error('Database unavailable');
      jest.spyOn(getAccountServiceForTest(account).client, 'loadClient').mockReturnValue(task.reject(lookupError));

      await expect(account.getLocalClient()).resolves.toEqual(result.err(lookupError));
    });
  });

  const CLIENT_ID = '4e37b32f57f6da55';

  afterEach(() => {
    apiClients.forEach(client => {
      client.dispose();
    });
    apiClients.length = 0;
  });

  // Fix for node 16, crypto.subtle.decrypt has a type problem
  jest.spyOn(global.crypto.subtle, 'decrypt').mockResolvedValue(new Uint8Array(32).buffer);
  const accessTokenData = {
    access_token:
      'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86a0-9adc8a15b3b4.c=15037015562284012115',
    expires_in: 900,
    token_type: 'Bearer',
    user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
  };

  const markerId = '90da5591-0a26-45f8-bbb2-6c0fc4a2df19';

  const websocketServerAddress = `${MOCK_BACKEND.ws}/v${MINIMUM_API_VERSION}/events?access_token=${accessTokenData.access_token}&marker=${markerId}`;

  beforeEach(() => {
    if (!nock.isActive()) {
      nock.activate();
    }

    nock(MOCK_BACKEND.rest)
      .post(AuthAPI.URL.LOGIN, body => {
        return body.email && body.password;
      })
      .query(() => {
        return true;
      })
      .reply(async (request: Request): Promise<nock.ReplyFnResult> => {
        const loginRequestBody: unknown = await request.json();

        if (isPlainObject(loginRequestBody) && loginRequestBody.password === 'wrong') {
          return [
            HTTP_STATUS.FORBIDDEN,
            JSON.stringify({
              code: HTTP_STATUS.FORBIDDEN,
              label: 'invalid-credentials',
              message: 'Authentication failed.',
            }),
          ];
        }

        return [HTTP_STATUS.OK, JSON.stringify(accessTokenData)];
      });

    nock(MOCK_BACKEND.rest).post(`${AuthAPI.URL.ACCESS}/${AuthAPI.URL.LOGOUT}`).reply(HTTP_STATUS.OK, undefined);

    nock(MOCK_BACKEND.rest).post(AuthAPI.URL.ACCESS).reply(HTTP_STATUS.OK, accessTokenData);

    nock(MOCK_BACKEND.rest).get(AuthAPI.URL.COOKIES).reply(HTTP_STATUS.OK, undefined);

    nock(MOCK_BACKEND.rest).post(ClientAPI.URL.CLIENTS).reply(HTTP_STATUS.OK, {id: CLIENT_ID});

    nock(MOCK_BACKEND.rest)
      .post(
        new RegExp(
          `${ConversationAPI.URL.CONVERSATIONS}/.*/${ConversationAPI.URL.OTR}/${ConversationAPI.URL.MESSAGES}`,
        ),
      )
      .query({ignore_missing: false})
      .reply(HTTP_STATUS.OK)
      .persist();

    nock(MOCK_BACKEND.rest)
      .get(`${NotificationAPI.URL.NOTIFICATION}/${NotificationAPI.URL.LAST}`)
      .query({client: CLIENT_ID})
      .reply(HTTP_STATUS.OK, {});

    nock(MOCK_BACKEND.rest)
      .get(`/api-version`)
      .reply(HTTP_STATUS.OK, {
        supported: [MINIMUM_API_VERSION],
        federation: false,
        development: [MINIMUM_API_VERSION + 1],
        domain: 'zinfra.io',
      });

    nock(MOCK_BACKEND.rest).get(`/v${MINIMUM_API_VERSION}${AuthAPI.URL.COOKIES}`).reply(HTTP_STATUS.OK, {}).persist();

    nock(MOCK_BACKEND.rest)
      .get(NotificationAPI.URL.NOTIFICATION)
      .query({client: CLIENT_ID, size: 10000})
      .reply(HTTP_STATUS.OK, {has_more: false, notifications: []})
      .persist();

    nock(MOCK_BACKEND.rest)
      .get(ClientAPI.URL.CLIENTS)
      .reply(HTTP_STATUS.OK, [{id: CLIENT_ID}] as RegisteredClient[]);

    nock(MOCK_BACKEND.rest)
      .put(/\/clients\/[\w-]+$/, {
        capabilities: ['legalhold-implicit-consent', 'consumable-notifications'],
      })
      .reply(HTTP_STATUS.OK);

    nock(MOCK_BACKEND.rest)
      .put(/\/clients\/[\w-]+$/, {
        capabilities: ['legalhold-implicit-consent'],
      })
      .reply(HTTP_STATUS.OK);

    nock(MOCK_BACKEND.rest)
      .get(SelfAPI.URL.SELF)
      .reply(HTTP_STATUS.OK, {
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
      } as Self);
  });

  afterEach(() => {
    nock.cleanAll();
    nock.restore();
  });

  const currentClient: RegisteredClient = {
    capabilities: [],
    id: CLIENT_ID,
    cookie: '',
    time: '',
    type: ClientType.TEMPORARY,
    class: ClientClassification.DESKTOP,
    mls_public_keys: {},
  };
  describe('"init"', () => {
    it('notifies consumers when services are replaced or cleared', async () => {
      const {account} = await createAccount();
      const previousNotificationService = getAccountServiceForTest(account).notification;
      const servicesAtNotification: Account['service'][] = [];
      account.on(EVENTS.SERVICES_CHANGED, () => {
        servicesAtNotification.push(account.service);
      });

      await account['initServices']({clientType: ClientType.TEMPORARY, userId: ''});

      expect(getAccountServiceForTest(account).notification).not.toBe(previousNotificationService);
      expect(servicesAtNotification).toEqual([account.service]);

      account['resetContext']();
      expect(servicesAtNotification).toEqual([servicesAtNotification[0], undefined]);
    });

    it('initializes the Protocol buffers', async () => {
      const apiClient = new APIClient({platform: nodePlatform});
      apiClients.push(apiClient);
      const account = new Account(apiClient);

      await account['initServices']({clientType: ClientType.TEMPORARY, userId: ''});

      expect(getAccountServiceForTest(account).conversation).toBeDefined();

      const message = GenericMessage.create({
        messageId: '2d7cb6d8-118f-11e8-b642-0ed5f89f718b',
        text: Text.create({content: 'Hello, World!'}),
      });

      expect(message.content).toBe('text');
    });
  });

  describe('"login"', () => {
    it('logs in with correct credentials', async () => {
      const apiClient = new APIClient({platform: nodePlatform, urls: MOCK_BACKEND});
      apiClients.push(apiClient);
      const account = new Account(apiClient);

      await account['initServices']({clientType: ClientType.TEMPORARY, userId: ''});
      const {clientType, userId} = await account.login({
        clientType: ClientType.TEMPORARY,
        email: 'hello@example.com',
        password: 'my-secret',
      });

      expect(ValidationUtil.isUUIDv4(userId)).toBe(true);
      expect(clientType).toBe(ClientType.TEMPORARY);
    });

    it('does not log in with incorrect credentials', async () => {
      const apiClient = new APIClient({platform: nodePlatform, urls: MOCK_BACKEND});
      apiClients.push(apiClient);
      const account = new Account(apiClient);
      let backendError;

      await account['initServices']({clientType: ClientType.TEMPORARY, userId: ''});

      try {
        await account.login({
          clientType: ClientType.TEMPORARY,
          email: 'hello@example.com',
          password: 'wrong',
        });
        throw new Error('Should not be logged in');
      } catch (error: unknown) {
        backendError = error as BackendError;
      } finally {
        const {code, label} = backendError as {code: number; label: string};
        expect(code).toBe(HTTP_STATUS.FORBIDDEN);
        expect(label).toBe(BackendErrorLabel.INVALID_CREDENTIALS);
      }
    });
  });

  describe('Websocket connection', () => {
    let dependencies: {account: Account; apiClient: APIClient};
    let server: WS;

    const mockNotifications = (size: number): void => {
      const notifications = Array.from(new Array(size)).map(() => {
        return {
          id: uuidv4(),
          payload: [{}] as BackendEvent[],
        };
      });
      jest.spyOn(dependencies.apiClient.api.notification, 'getAllNotifications').mockResolvedValue({notifications});
    };

    const callWhen = (desiredState: ConnectionState, callback: () => void, count: number = Infinity) => {
      let nbCalls = 0;
      return (state: ConnectionState) => {
        if (nbCalls >= count) {
          return;
        }
        if (state !== desiredState) {
          return;
        }
        nbCalls++;
        return callback();
      };
    };

    beforeAll(() => {
      // Forces the reconnecting websocket not to automatically reconnect (to avoid infinitely hanging tests)
      ReconnectingWebsocket['RECONNECTING_OPTIONS'].maxRetries = 0;
    });

    beforeEach(() => {
      server = new WS(websocketServerAddress); // isolate per test
    });

    async function initializeAccount(implementation: WebSocketLifecycleImplementation): Promise<void> {
      dependencies = await createAccount(implementation);
      const {account} = dependencies;
      await account.login({
        clientType: ClientType.TEMPORARY,
        email: 'hello@example.com',
        password: 'my-secret',
      });
      account['currentClient'] = currentClient;
      jest
        .spyOn(getAccountServiceForTest(dependencies.account).notification, 'handleNotification')
        .mockImplementation(notif => {
          return notif.payload as any;
        });
      jest
        .spyOn(getAccountServiceForTest(dependencies.account).notification['database'], 'getLastNotificationId')
        .mockResolvedValue('0');

      await account.useAPIVersion(MINIMUM_API_VERSION, MINIMUM_API_VERSION);

      jest
        .spyOn(dependencies.apiClient.transport.ws, 'buildWebSocketUrl')
        .mockResolvedValue(websocketServerAddress as never);
      jest.spyOn(dependencies.apiClient.transport.http, 'sendRequest').mockResolvedValue({} as never);
      jest.spyOn(dependencies.account, 'getNotificationEventTime').mockReturnValue('2025-10-01T00:00:00Z');
    }

    afterEach(() => {
      server.close(); // ensure server shutdown
      WS.clean();
    });

    describe('corrected lifecycle', () => {
      beforeEach(async () => {
        await initializeAccount('corrected');
      });
      it('delivers notifications when the previous disconnect callback is called again during setup', async () => {
        const {account, apiClient} = dependencies;
        const websocket = apiClient.transport.ws;
        const connect = jest.spyOn(apiClient, 'connect').mockReturnValue(websocket);
        const clientService = getAccountServiceForTest(account).client;
        const updateCapabilities = jest.spyOn(clientService, 'putClientCapabilities').mockResolvedValue(undefined);
        const disconnectPrevious = await account.listen({useLegacy: true});
        disconnectPrevious();

        const pendingCapabilities = Promise.withResolvers<void>();
        updateCapabilities.mockReturnValueOnce(pendingCapabilities.promise);
        const live = Promise.withResolvers<void>();
        const delivered = jest.fn();
        const pendingConnection = account.listen({
          useLegacy: true,
          onConnectionStateChanged: callWhen(ConnectionState.LIVE, live.resolve),
          onEvent: delivered,
        });

        // The repository used to retain and invoke the previous callback again on offline.
        disconnectPrevious();
        pendingCapabilities.resolve();
        const disconnectCurrent = await pendingConnection;
        mockNotifications(0);
        const openCurrentSocket = connect.mock.lastCall?.[0];
        if (openCurrentSocket === undefined) {
          throw new Error('Expected WebSocket open callback');
        }
        await openCurrentSocket(new AbortController(), {
          attemptId: 2,
          wrapperGeneration: 2,
          reconnectAttemptCount: 1,
          reconnectSequenceRetryCount: 0,
        });
        await live.promise;

        const incomingEvent: BackendEvent = {
          type: USER_EVENT.DELETE,
          id: 'example-user',
          qualified_id: {id: 'example-user', domain: 'example.com'},
        };
        websocket.emit(WebSocketClient.TOPIC.ON_MESSAGE, {id: uuidv4(), payload: [incomingEvent]});
        await account['notificationProcessingQueue'].queue.onIdle();
        expect(delivered).toHaveBeenCalledTimes(1);
        expect(delivered).toHaveBeenCalledWith(incomingEvent, NotificationSource.WEBSOCKET);

        disconnectCurrent();
      });

      it('reports each socket state once after repeated initialization failures', async () => {
        const {account, apiClient} = dependencies;
        const websocket = apiClient.transport.ws;
        jest.spyOn(apiClient, 'connect').mockReturnValue(websocket);
        const updateCapabilities = jest.spyOn(getAccountServiceForTest(account).client, 'putClientCapabilities');
        const failedAttemptStates = jest.fn();
        const successfulAttemptStates = jest.fn();
        const networkError = new Error('Network Error');

        for (let failure = 0; failure < 17; failure += 1) {
          updateCapabilities.mockRejectedValueOnce(networkError);
          await expect(
            account.listen({useLegacy: true, onConnectionStateChanged: failedAttemptStates}),
          ).rejects.toThrow(networkError);
        }

        updateCapabilities.mockResolvedValue(undefined);
        const disconnect = await account.listen({useLegacy: true, onConnectionStateChanged: successfulAttemptStates});
        websocket.emit(WebSocketClient.TOPIC.ON_STATE_CHANGE, WEBSOCKET_STATE.CONNECTING);
        websocket.emit(WebSocketClient.TOPIC.ON_STATE_CHANGE, WEBSOCKET_STATE.CLOSED);

        expect(successfulAttemptStates.mock.calls).toEqual([[ConnectionState.CONNECTING], [ConnectionState.CLOSED]]);
        expect(failedAttemptStates).not.toHaveBeenCalled();
        disconnect();
      });

      it('lets a new cycle start while an offline cycle still awaits capabilities', async () => {
        const {account, apiClient} = dependencies;
        const websocket = apiClient.transport.ws;
        const connect = jest.spyOn(apiClient, 'connect').mockReturnValue(websocket);
        const pendingCapabilities = Promise.withResolvers<void>();
        jest
          .spyOn(getAccountServiceForTest(account).client, 'putClientCapabilities')
          .mockReturnValueOnce(pendingCapabilities.promise)
          .mockResolvedValue(undefined);
        const offlineCycle = new AbortController();
        const offlineStates = jest.fn();
        const pendingConnection = account.listen({
          useLegacy: true,
          onConnectionStateChanged: offlineStates,
          connectionCycle: {signal: Maybe.just(offlineCycle.signal), connectCycleId: 1},
        });
        offlineCycle.abort('offline');
        const activeStates = jest.fn();
        const disconnect = await account.listen({useLegacy: true, onConnectionStateChanged: activeStates});

        pendingCapabilities.resolve();
        const disconnectObsolete = await pendingConnection;
        disconnectObsolete();
        websocket.emit(WebSocketClient.TOPIC.ON_STATE_CHANGE, WEBSOCKET_STATE.CONNECTING);

        expect(connect).toHaveBeenCalledTimes(1);
        expect(offlineStates).not.toHaveBeenCalled();
        expect(activeStates.mock.calls).toEqual([[ConnectionState.CONNECTING]]);
        disconnect();
      });

      it('delivers each legacy catch-up before buffered frames across consecutive socket opens', async () => {
        const {account, apiClient} = dependencies;
        const websocket = apiClient.transport.ws;
        const connect = jest.spyOn(apiClient, 'connect').mockReturnValue(websocket);
        const accountServices = getAccountServiceForTest(account);
        const readStream = jest.spyOn(accountServices.notification, 'legacyProcessNotificationStream');
        const onEvent = jest.fn();
        let live = Promise.withResolvers<void>();
        const disconnect = await account.listen({
          useLegacy: true,
          onEvent,
          onConnectionStateChanged(state) {
            if (state === ConnectionState.LIVE) {
              live.resolve();
            }
          },
        });
        const openSocket = connect.mock.lastCall?.[0];
        if (openSocket === undefined) {
          throw new Error('Expected WebSocket open callback');
        }

        for (let attemptId = 1; attemptId <= 3; attemptId += 1) {
          const streamEvent: BackendEvent = {
            type: USER_EVENT.DELETE,
            id: `stream-${attemptId}`,
            qualified_id: {id: `stream-${attemptId}`, domain: 'example.com'},
          };
          const frameEvent = {...streamEvent, id: `socket-${attemptId}`};
          const releaseCatchUp = Promise.withResolvers<void>();
          readStream.mockImplementationOnce(async handleNotification => {
            await releaseCatchUp.promise;
            await handleNotification({id: uuidv4(), payload: [streamEvent]}, NotificationSource.NOTIFICATION_STREAM, {
              done: 1,
              total: 1,
            });

            return {total: 1, success: 1, error: 0};
          });
          live = Promise.withResolvers<void>();
          const opening = openSocket(new AbortController(), {
            attemptId,
            wrapperGeneration: 1,
            reconnectAttemptCount: attemptId,
            reconnectSequenceRetryCount: 0,
          });
          websocket['onMessage'](JSON.stringify({id: uuidv4(), payload: [frameEvent]}));
          expect(onEvent).not.toHaveBeenCalled();

          releaseCatchUp.resolve();
          await opening;
          await live.promise;
          await account['notificationProcessingQueue'].queue.onIdle();
          expect(onEvent.mock.calls).toEqual([
            [streamEvent, NotificationSource.NOTIFICATION_STREAM],
            [frameEvent, NotificationSource.WEBSOCKET],
          ]);

          onEvent.mockClear();
          websocket.emit(WebSocketClient.TOPIC.ON_STATE_CHANGE, WEBSOCKET_STATE.CLOSED);
        }

        const globalRetryListener = jest.fn();
        websocket.on(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY, globalRetryListener);
        jest.spyOn(apiClient, 'logout').mockResolvedValue(undefined);
        await account.logout();
        disconnect();
        websocket.emit(WebSocketClient.TOPIC.ON_MESSAGE, {id: uuidv4(), payload: [{}]});
        websocket.emit(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY, {retryCount: 1, retryDurationInMilliseconds: 1});
        expect(onEvent).not.toHaveBeenCalled();
        expect(globalRetryListener).toHaveBeenCalledTimes(1);
      });

      it('ignores late catch-up results after the socket opens again', async () => {
        const {account, apiClient} = dependencies;
        const websocket = apiClient.transport.ws;
        const unlock = jest.spyOn(websocket, 'unlock');
        const connect = jest.spyOn(apiClient, 'connect').mockReturnValue(websocket);
        const pendingCatchUp = Promise.withResolvers<{total: number; success: number; error: number}>();
        const live = Promise.withResolvers<void>();
        const onLive = jest.fn(live.resolve);
        jest
          .spyOn(getAccountServiceForTest(account).notification, 'legacyProcessNotificationStream')
          .mockReturnValueOnce(pendingCatchUp.promise)
          .mockResolvedValue({total: 0, success: 0, error: 0});
        const disconnect = await account.listen({
          useLegacy: true,
          onConnectionStateChanged: callWhen(ConnectionState.LIVE, onLive),
        });
        const openSocket = connect.mock.lastCall?.[0];
        if (openSocket === undefined) {
          throw new Error('Expected WebSocket open callback');
        }

        const obsoleteOpening = openSocket(new AbortController(), {
          attemptId: 1,
          wrapperGeneration: 1,
          reconnectAttemptCount: 1,
          reconnectSequenceRetryCount: 0,
        });
        websocket.emit(WebSocketClient.TOPIC.ON_STATE_CHANGE, WEBSOCKET_STATE.CLOSED);
        await openSocket(new AbortController(), {
          attemptId: 2,
          wrapperGeneration: 2,
          reconnectAttemptCount: 1,
          reconnectSequenceRetryCount: 0,
        });
        await live.promise;
        pendingCatchUp.resolve({total: 0, success: 0, error: 0});
        await obsoleteOpening;
        await account['notificationProcessingQueue'].queue.onIdle();

        expect(onLive).toHaveBeenCalledTimes(1);
        expect(unlock).toHaveBeenCalledTimes(1);
        expect(websocket.isLocked()).toBe(false);
        disconnect();
      });

      it('delivers and acknowledges consumable notifications in order before going LIVE', async () => {
        const {account, apiClient} = dependencies;
        const websocket = apiClient.transport.ws;
        const connect = jest.spyOn(apiClient, 'connect').mockReturnValue(websocket);
        jest.spyOn(account, 'getClientCapabilities').mockReturnValue([ClientCapability.CONSUMABLE_NOTIFICATIONS]);
        const delivered = jest.fn();
        const acknowledgeEvent = jest.spyOn(websocket, 'acknowledgeNotification');
        const acknowledgeMarker = jest.spyOn(websocket, 'acknowledgeConsumableNotificationSynchronization');
        const marker = apiClient.transport.http.accessTokenStore.getNextMarkerToken();
        const live = Promise.withResolvers<void>();
        const disconnect = await account.listen({
          useLegacy: false,
          onConnectionStateChanged: callWhen(ConnectionState.LIVE, live.resolve),
          onEvent: delivered,
        });
        const openSocket = connect.mock.lastCall?.[0];
        if (openSocket === undefined) {
          throw new Error('Expected WebSocket open callback');
        }
        await openSocket(new AbortController(), {
          attemptId: 1,
          wrapperGeneration: 1,
          reconnectAttemptCount: 1,
          reconnectSequenceRetryCount: 0,
        });

        const event = {
          type: USER_EVENT.DELETE,
          id: 'example-user',
          qualified_id: {id: 'example-user', domain: 'example.com'},
        };
        const notification = {
          type: ConsumableEvent.EVENT,
          data: {delivery_tag: 1, event: {id: uuidv4(), payload: [event]}},
        };
        const synchronization = {
          type: ConsumableEvent.SYNCHRONIZATION,
          data: {delivery_tag: 2, marker_id: marker},
        };
        websocket['onMessage'](JSON.stringify(notification));
        websocket['onMessage'](JSON.stringify(synchronization));
        await live.promise;

        expect(delivered.mock.calls).toEqual([[event, NotificationSource.WEBSOCKET]]);
        expect(acknowledgeEvent).toHaveBeenCalledWith(notification);
        expect(acknowledgeMarker).toHaveBeenCalledWith(synchronization);
        expect(acknowledgeEvent.mock.invocationCallOrder[0]).toBeLessThan(
          acknowledgeMarker.mock.invocationCallOrder[0] ?? 0,
        );
        disconnect();
      });

      it('does not acknowledge an in-flight consumable delivery on a replacement socket', async () => {
        const {account, apiClient} = dependencies;
        const websocket = apiClient.transport.ws;
        const connect = jest.spyOn(apiClient, 'connect').mockReturnValue(websocket);
        jest.spyOn(account, 'getClientCapabilities').mockReturnValue([ClientCapability.CONSUMABLE_NOTIFICATIONS]);
        const acknowledge = jest.spyOn(websocket, 'acknowledgeNotification');
        const deliveryStarted = Promise.withResolvers<void>();
        const finishDelivery = Promise.withResolvers<void>();
        const onEvent = jest.fn().mockImplementationOnce(async () => {
          deliveryStarted.resolve();
          await finishDelivery.promise;
        });
        const disconnect = await account.listen({useLegacy: false, onEvent});
        const openSocket = connect.mock.lastCall?.[0];
        if (openSocket === undefined) {
          throw new Error('Expected WebSocket open callback');
        }

        const previousSocket = new AbortController();
        await openSocket(previousSocket, {
          attemptId: 1,
          wrapperGeneration: 1,
          reconnectAttemptCount: 1,
          reconnectSequenceRetryCount: 0,
        });
        const event = {
          type: ConsumableEvent.EVENT,
          data: {
            delivery_tag: 1,
            event: {id: uuidv4(), payload: [{type: USER_EVENT.DELETE, id: 'previous-delivery'}]},
          },
        };
        websocket['onMessage'](JSON.stringify(event));
        await deliveryStarted.promise;
        websocket.emit(WebSocketClient.TOPIC.ON_STATE_CHANGE, WEBSOCKET_STATE.CLOSED);
        await openSocket(new AbortController(), {
          attemptId: 2,
          wrapperGeneration: 2,
          reconnectAttemptCount: 1,
          reconnectSequenceRetryCount: 0,
        });
        finishDelivery.resolve();
        await account['notificationProcessingQueue'].queue.onIdle();
        expect(previousSocket.signal.aborted).toBe(true);
        expect(acknowledge).not.toHaveBeenCalled();

        const nextEvent = {...event, data: {...event.data, delivery_tag: 2}};
        websocket['onMessage'](JSON.stringify(nextEvent));
        await account['notificationProcessingQueue'].queue.onIdle();
        expect(acknowledge).toHaveBeenCalledTimes(1);
        expect(acknowledge).toHaveBeenCalledWith(nextEvent);
        disconnect();
      });

      it('replays the final legacy catch-up if the consumable socket closes before opening', async () => {
        const {account, apiClient} = dependencies;
        const websocket = apiClient.transport.ws;
        const connect = jest.spyOn(apiClient, 'connect').mockReturnValue(websocket);
        jest.spyOn(account, 'getClientCapabilities').mockReturnValue([]);
        const delivered = jest.fn();
        const live = Promise.withResolvers<void>();
        const streamEvent: BackendEvent = {
          type: USER_EVENT.DELETE,
          id: 'example-user',
          qualified_id: {id: 'example-user', domain: 'example.com'},
        };
        jest
          .spyOn(getAccountServiceForTest(account).notification, 'legacyProcessNotificationStream')
          .mockImplementation(async handleNotification => {
            await handleNotification({id: uuidv4(), payload: [streamEvent]}, NotificationSource.NOTIFICATION_STREAM, {
              done: 1,
              total: 1,
            });

            return {total: 1, success: 1, error: 0};
          });
        const disconnect = await account.listen({
          useLegacy: false,
          onConnectionStateChanged: callWhen(ConnectionState.LIVE, live.resolve),
          onEvent: delivered,
        });

        websocket.emit(WebSocketClient.TOPIC.ON_STATE_CHANGE, WEBSOCKET_STATE.CLOSED);
        const openSocket = connect.mock.lastCall?.[0];
        if (openSocket === undefined) {
          throw new Error('Expected WebSocket open callback');
        }
        await openSocket(new AbortController(), {
          attemptId: 2,
          wrapperGeneration: 1,
          reconnectAttemptCount: 2,
          reconnectSequenceRetryCount: 1,
        });
        await live.promise;

        expect(delivered.mock.calls).toEqual([[streamEvent, NotificationSource.NOTIFICATION_STREAM]]);
        expect(websocket.isLocked()).toBe(false);
        disconnect();
      });

      it('connects to websocket after the notification stream has been processed', async () => {
        jest
          .spyOn(dependencies.account, 'getClientCapabilities')
          .mockReturnValue([ClientCapability.LEGAL_HOLD_IMPLICIT_CONSENT]);

        return new Promise<void>(async resolve => {
          const nbNotifications = 10;
          const onNotificationStreamProgress = jest.fn();
          const onEvent = jest.fn();
          mockNotifications(nbNotifications);
          await dependencies.account.listen({
            useLegacy: false,
            onConnectionStateChanged: callWhen(ConnectionState.LIVE, async () => {
              expect(onNotificationStreamProgress).toHaveBeenCalledTimes(nbNotifications);
              expect(onEvent).toHaveBeenCalledTimes(nbNotifications);
              expect(onEvent).toHaveBeenCalledWith(expect.any(Object), NotificationSource.NOTIFICATION_STREAM);
              expect(onEvent).not.toHaveBeenCalledWith(expect.any(Object), NotificationSource.WEBSOCKET);
              onEvent.mockReset();
              await server.connected;
              jest
                .spyOn(getAccountServiceForTest(dependencies.account).notification as any, 'handleNotification')
                .mockReturnValue([{event: {testData: 1}}]);
              server.send(
                JSON.stringify({
                  type: ConsumableEvent.EVENT,
                  data: {
                    delivery_tag: 1000,
                    event: {id: uuidv4(), payload: []},
                  },
                }),
              );

              await waitFor(() => {
                return expect(onEvent).toHaveBeenCalledTimes(1);
              });
              expect(onEvent).not.toHaveBeenCalledWith(expect.any(Object), NotificationSource.NOTIFICATION_STREAM);
              expect(onEvent).toHaveBeenCalledWith(expect.any(Object), NotificationSource.WEBSOCKET);
              resolve();
            }),
            onEvent: onEvent,
            onNotificationStreamProgress: onNotificationStreamProgress,
          });
        });
      });

      it('sends information to consumer of the connection state change in order', async () => {
        await new Promise<void>(async resolve => {
          mockNotifications(10);

          const onConnectionStateChanged = jest.fn().mockImplementation((state: ConnectionState) => {
            switch (state) {
              case ConnectionState.LIVE:
                break;
              case ConnectionState.CLOSED:
                // Expect all states to have been called in order
                expect(onConnectionStateChanged).toHaveBeenNthCalledWith(1, ConnectionState.PROCESSING_NOTIFICATIONS);
                expect(onConnectionStateChanged).toHaveBeenNthCalledWith(2, ConnectionState.CONNECTING);
                expect(onConnectionStateChanged).toHaveBeenNthCalledWith(
                  3,
                  ConnectionState.LIVE,
                  expect.objectContaining({attemptId: expect.any(Number), wrapperGeneration: expect.any(Number)}),
                );
                resolve();
                break;
            }
          });

          const disconnect = await dependencies.account.listen({
            useLegacy: false,
            onConnectionStateChanged,
          });

          await waitFor(() => {
            return expect(onConnectionStateChanged).toHaveBeenCalledWith(
              ConnectionState.LIVE,
              expect.objectContaining({attemptId: expect.any(Number), wrapperGeneration: expect.any(Number)}),
            );
          });

          disconnect();
        });
      });

      it('warns consumer of the connection close', async () => {
        await new Promise<void>(async resolve => {
          mockNotifications(10);

          const onConnectionStateChanged = jest.fn().mockImplementation((state: ConnectionState) => {
            switch (state) {
              case ConnectionState.LIVE:
                break;
              case ConnectionState.CLOSED:
                // Expect all states to have been called in order
                expect(onConnectionStateChanged).toHaveBeenNthCalledWith(1, ConnectionState.PROCESSING_NOTIFICATIONS);
                expect(onConnectionStateChanged).toHaveBeenNthCalledWith(2, ConnectionState.CONNECTING);
                expect(onConnectionStateChanged).toHaveBeenNthCalledWith(3, ConnectionState.CLOSED);
                resolve();
                break;
            }
          });

          const disconnect = await dependencies.account.listen({
            useLegacy: false,
            onConnectionStateChanged,
          });

          await waitFor(() => {
            return expect(onConnectionStateChanged).toHaveBeenCalledWith(ConnectionState.PROCESSING_NOTIFICATIONS);
          });

          disconnect();
        });
      });

      it('processes notification stream upon connection', async () => {
        return new Promise<void>(async resolve => {
          const nbNotifications = 10;
          const onNotificationStreamProgress = jest.fn();
          const onEvent = jest.fn();
          mockNotifications(nbNotifications);
          await dependencies.account.listen({
            useLegacy: false,
            onConnectionStateChanged: callWhen(ConnectionState.LIVE, () => {
              expect(onNotificationStreamProgress).toHaveBeenCalledTimes(nbNotifications);
              expect(onEvent).toHaveBeenCalledTimes(nbNotifications);
              expect(onEvent).toHaveBeenCalledWith(expect.any(Object), NotificationSource.NOTIFICATION_STREAM);
              resolve();
            }),
            onEvent: onEvent,
            onNotificationStreamProgress: onNotificationStreamProgress,
          });
        });
      });

      it('does stop processing messages if websocket connection is aborted', async () => {
        jest
          .spyOn(dependencies.account, 'getClientCapabilities')
          .mockReturnValue([ClientCapability.LEGAL_HOLD_IMPLICIT_CONSENT, ClientCapability.CONSUMABLE_NOTIFICATIONS]);
        const nbNotifications = 10;
        const onNotificationStreamProgress = jest.fn();

        const onEvent = jest
          .fn()
          .mockReturnValueOnce(undefined)
          .mockImplementationOnce(() => {
            // abort websocket connection after the second notification is processeed
            server.close({reason: 'Aborted by test', code: 2000, wasClean: true});
          });

        return new Promise<void>(async resolve => {
          return dependencies.account.listen({
            useLegacy: false,
            onConnectionStateChanged: async state => {
              switch (state) {
                case ConnectionState.CONNECTING:
                  await server.connected;
                  for (let i = 0; i < nbNotifications; i++) {
                    server.send(
                      JSON.stringify({
                        type: ConsumableEvent.EVENT,
                        data: {
                          delivery_tag: 1000,
                          event: {id: uuidv4(), payload: [{domain: 'zinfra.io', type: 'federation.delete'}]},
                        },
                      }),
                    );
                  }
                  break;
                case ConnectionState.CLOSED:
                  expect(onNotificationStreamProgress).toHaveBeenCalledTimes(2);
                  expect(onEvent).toHaveBeenCalledTimes(2);
                  expect(onEvent).toHaveBeenCalledWith(
                    {domain: 'zinfra.io', type: 'federation.delete'},
                    NotificationSource.WEBSOCKET,
                  );
                  expect(
                    getAccountServiceForTest(dependencies.account).notification.handleNotification,
                  ).toHaveBeenCalledTimes(2);
                  resolve();
              }
            },
            onEvent: onEvent,
            onNotificationStreamProgress: onNotificationStreamProgress,
          });
        });
      });

      it('emits CLOSED without unlocking websocket when legacy notification catch-up fails after websocket open', async () => {
        const catchUpError = new Error('Legacy catch-up failed');
        jest
          .spyOn(getAccountServiceForTest(dependencies.account).notification, 'legacyProcessNotificationStream')
          .mockRejectedValue(catchUpError);
        const unlock = jest.spyOn(dependencies.apiClient.transport.ws, 'unlock');
        const onConnectionStateChanged = jest.fn<void, [ConnectionState]>();

        const disconnect = await dependencies.account.listen({
          useLegacy: true,
          onConnectionStateChanged,
        });

        await waitFor(() => {
          return expect(onConnectionStateChanged).toHaveBeenCalledWith(
            ConnectionState.CLOSED,
            expect.objectContaining({attemptId: expect.any(Number), wrapperGeneration: expect.any(Number)}),
          );
        });

        expect(onConnectionStateChanged).toHaveBeenCalledWith(
          ConnectionState.PROCESSING_NOTIFICATIONS,
          expect.objectContaining({attemptId: expect.any(Number), wrapperGeneration: expect.any(Number)}),
        );
        expect(
          onConnectionStateChanged.mock.calls.some(([connectionState]) => {
            return connectionState === ConnectionState.LIVE;
          }),
        ).toBe(false);
        expect(unlock).not.toHaveBeenCalled();

        disconnect();
      });
    });
    describe('legacy lifecycle', () => {
      beforeEach(async () => {
        await initializeAccount('legacy');
      });

      it.each([true, false])('delivers a WebSocket notification with useLegacy=%s', async useLegacy => {
        const {account, apiClient} = dependencies;
        const websocket = apiClient.transport.ws;
        mockNotifications(0);
        jest.spyOn(account, 'getClientCapabilities').mockReturnValue([ClientCapability.CONSUMABLE_NOTIFICATIONS]);
        const live = Promise.withResolvers<void>();
        const received = Promise.withResolvers<void>();
        const onEvent = jest.fn(async () => {
          received.resolve();
        });
        const disconnect = await account.listen({
          useLegacy,
          onEvent,
          onConnectionStateChanged: callWhen(ConnectionState.LIVE, live.resolve),
        });
        await server.connected;
        if (useLegacy) {
          await live.promise;
        }
        const backendEvent = {
          type: USER_EVENT.DELETE,
          id: 'example-user',
          qualified_id: {id: 'example-user', domain: 'example.com'},
        };
        const notification = {id: uuidv4(), payload: [backendEvent]};
        const frame = useLegacy
          ? notification
          : {type: ConsumableEvent.EVENT, data: {delivery_tag: 1, event: notification}};
        server.send(JSON.stringify(frame));
        await received.promise;
        await account['notificationProcessingQueue'].queue.onIdle();

        expect(onEvent.mock.calls).toEqual([[backendEvent, NotificationSource.WEBSOCKET]]);
        disconnect();
        expect(websocket.listenerCount(WebSocketClient.TOPIC.ON_MESSAGE)).toBe(0);
        expect(websocket.listenerCount(WebSocketClient.TOPIC.ON_STATE_CHANGE)).toBe(0);
      });
    });
  });

  describe('MLS pending-proposals rehydration is deferred to the LIVE transition', () => {
    // Regression guard for rehydrateMlsPendingProposalsTasksOnLiveTransition (account.ts):
    // persisted timers must not be rehydrated during initClient. We drive the legacy
    // notification stream processor directly to avoid websocket/login setup in this file.

    type MlsServiceStub = {
      isEnabled: boolean;
      initialisePendingProposalsTasks: jest.Mock<Promise<void>, []>;
    };

    const buildMlsServiceStub = (): MlsServiceStub => {
      return {
        isEnabled: true,
        initialisePendingProposalsTasks: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
      };
    };

    const setup = async (mlsService: MlsServiceStub): Promise<{account: Account}> => {
      const {account, apiClient} = await createAccount();

      if (!account.service) {
        throw new Error('Service is not set');
      }

      // Override the (heavy) real MLS service with a minimal stub. We only care about
      // whether/when initialisePendingProposalsTasks is invoked, not what it does.
      account.service.mls = mlsService as unknown as MLSService;

      // Drain the legacy notification stream synchronously with no notifications.
      jest
        .spyOn(account.service.notification, 'legacyProcessNotificationStream')
        .mockResolvedValue({total: 0, error: 0, success: 0});

      // Avoid touching the websocket transport during the test.
      jest.spyOn(apiClient.transport.ws, 'lock').mockImplementation(() => {
        return undefined;
      });
      jest.spyOn(apiClient.transport.ws, 'unlock').mockImplementation(() => {
        return undefined;
      });

      // The legacy processor pushes its "transition to LIVE" task onto a queue that the
      // production code resumes from `connect()`. Since we invoke the factory directly
      // here, we need to resume that queue so the pushed task actually runs.
      account['notificationProcessingQueue'].queue.start();

      return {account};
    };

    const indexOfFirstLiveTransition = (mock: jest.Mock<void, [ConnectionState]>): number => {
      return mock.mock.calls.findIndex(([state]) => {
        return state === ConnectionState.LIVE;
      });
    };

    it('rehydrates pending-proposals before emitting the LIVE connection state, after the legacy stream is drained', async () => {
      const mlsService = buildMlsServiceStub();
      const {account} = await setup(mlsService);

      const onConnectionStateChanged = jest.fn<void, [ConnectionState]>();

      const processStream = account['createLegacyNotificationStreamProcessor']({
        handleLegacyNotification: jest.fn().mockResolvedValue(undefined),
        handleMissedNotifications: jest.fn().mockResolvedValue(undefined),
        onConnectionStateChanged,
      });

      await processStream();

      // The LIVE transition is dispatched via the notificationProcessingQueue (async).
      await waitFor(() => {
        return expect(onConnectionStateChanged).toHaveBeenCalledWith(ConnectionState.LIVE);
      });

      expect(mlsService.initialisePendingProposalsTasks).toHaveBeenCalledTimes(1);

      // Crucial ordering: rehydration happens BEFORE the LIVE transition is announced.
      const rehydrateOrder = mlsService.initialisePendingProposalsTasks.mock.invocationCallOrder[0];
      const liveOrder =
        onConnectionStateChanged.mock.invocationCallOrder[indexOfFirstLiveTransition(onConnectionStateChanged)];
      expect(rehydrateOrder).toBeLessThan(liveOrder);
    });

    it('rehydrates pending-proposals only once when the legacy stream processor runs multiple times', async () => {
      const mlsService = buildMlsServiceStub();
      const {account} = await setup(mlsService);

      const onConnectionStateChanged = jest.fn<void, [ConnectionState]>();
      const liveTransitionCount = (): number => {
        return onConnectionStateChanged.mock.calls.filter(([state]) => {
          return state === ConnectionState.LIVE;
        }).length;
      };

      const processStream = account['createLegacyNotificationStreamProcessor']({
        handleLegacyNotification: jest.fn().mockResolvedValue(undefined),
        handleMissedNotifications: jest.fn().mockResolvedValue(undefined),
        onConnectionStateChanged,
      });

      await processStream();
      await waitFor(() => {
        return expect(liveTransitionCount()).toBe(1);
      });
      expect(mlsService.initialisePendingProposalsTasks).toHaveBeenCalledTimes(1);

      await processStream();
      await waitFor(() => {
        return expect(liveTransitionCount()).toBe(2);
      });
      expect(mlsService.initialisePendingProposalsTasks).toHaveBeenCalledTimes(1);
    });

    it('does NOT rehydrate pending-proposals when MLS is not enabled for the client', async () => {
      const mlsService: MlsServiceStub = {...buildMlsServiceStub(), isEnabled: false};
      const {account} = await setup(mlsService);

      const onConnectionStateChanged = jest.fn<void, [ConnectionState]>();

      const processStream = account['createLegacyNotificationStreamProcessor']({
        handleLegacyNotification: jest.fn().mockResolvedValue(undefined),
        handleMissedNotifications: jest.fn().mockResolvedValue(undefined),
        onConnectionStateChanged,
      });

      await processStream();
      await waitFor(() => {
        return expect(onConnectionStateChanged).toHaveBeenCalledWith(ConnectionState.LIVE);
      });

      expect(mlsService.initialisePendingProposalsTasks).not.toHaveBeenCalled();
    });
  });
});
