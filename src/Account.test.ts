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

import {AuthAPI} from '@wireapp/api-client/lib/auth';
import {
  ClientAPI,
  ClientCapability,
  ClientClassification,
  ClientType,
  RegisteredClient,
} from '@wireapp/api-client/lib/client';
import {MINIMUM_API_VERSION} from '@wireapp/api-client/lib/Config';
import {ConversationAPI} from '@wireapp/api-client/lib/conversation';
import {BackendEvent} from '@wireapp/api-client/lib/event';
import {BackendError, BackendErrorLabel} from '@wireapp/api-client/lib/http';
import {NotificationAPI} from '@wireapp/api-client/lib/notification';
import {ConsumableEvent} from '@wireapp/api-client/lib/notification/ConsumableNotification';
import {Self, SelfAPI} from '@wireapp/api-client/lib/self';
import {ReconnectingWebsocket} from '@wireapp/api-client/lib/tcp/ReconnectingWebsocket';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import {WS} from 'jest-websocket-mock';
import nock, {cleanAll} from 'nock';
import {v4 as uuidv4} from 'uuid';

import {APIClient} from '@wireapp/api-client';
import {AccentColor, ValidationUtil} from '@wireapp/commons';
import {GenericMessage, Text} from '@wireapp/protocol-messaging';

import {Account, ConnectionState} from './Account';
import {NotificationSource} from './notification';

const BASE_URL = 'mock-backend.wire.com';
const MOCK_BACKEND = {
  name: 'mock',
  rest: `https://${BASE_URL}`,
  ws: `wss://${BASE_URL}`,
};

async function createAccount(): Promise<{account: Account; apiClient: APIClient}> {
  const apiClient = new APIClient({urls: MOCK_BACKEND});
  const account = new Account(apiClient);
  await account['initServices']({
    clientType: ClientType.TEMPORARY,
    userId: '',
  });
  return {account, apiClient};
}

const waitFor = (assertion: () => void) => {
  const maxAttempts = 500;
  let attempts = 0;
  return new Promise<void>(resolve => {
    const attempt = () => {
      attempts++;
      try {
        assertion();
        resolve();
      } catch (e) {
        if (attempts > maxAttempts) {
          throw e;
        }
        setTimeout(attempt, 10);
      }
    };
    attempt();
  });
};

/* eslint-disable jest/no-conditional-expect */

describe('Account', () => {
  const CLIENT_ID = '4e37b32f57f6da55';

  // Fix for node 16, crypto.subtle.decrypt has a type problem
  jest.spyOn(global.crypto.subtle, 'decrypt').mockResolvedValue(new Uint8Array(32));
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
    nock(MOCK_BACKEND.rest)
      .post(AuthAPI.URL.LOGIN, body => body.email && body.password)
      .query(() => true)
      .reply((_, body: any) => {
        if (body.password === 'wrong') {
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
      } as Self);
  });

  afterEach(() => {
    cleanAll();
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
    it('initializes the Protocol buffers', async () => {
      const account = new Account();

      await account['initServices']({clientType: ClientType.TEMPORARY, userId: ''});

      expect(account.service!.conversation).toBeDefined();

      const message = GenericMessage.create({
        messageId: '2d7cb6d8-118f-11e8-b642-0ed5f89f718b',
        text: Text.create({content: 'Hello, World!'}),
      });

      expect(message.content).toBe('text');
    });
  });

  describe('"login"', () => {
    it('logs in with correct credentials', async () => {
      const apiClient = new APIClient({urls: MOCK_BACKEND});
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
      const apiClient = new APIClient({urls: MOCK_BACKEND});
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
      } catch (error) {
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

    const mockNotifications = (size: number) => {
      const notifications = Array.from(new Array(size)).map(() => ({
        id: uuidv4(),
        payload: [{}] as BackendEvent[],
      }));
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

    beforeEach(async () => {
      server = new WS(websocketServerAddress); // isolate per test

      dependencies = await createAccount();
      const {account} = dependencies;
      await account.login({
        clientType: ClientType.TEMPORARY,
        email: 'hello@example.com',
        password: 'my-secret',
      });
      account['currentClient'] = currentClient;
      jest
        .spyOn(dependencies.account.service!.notification, 'handleNotification')
        .mockImplementation(notif => notif.payload as any);
      jest
        .spyOn(dependencies.account.service!.notification['database'], 'getLastNotificationId')
        .mockResolvedValue('0');

      await account.useAPIVersion(MINIMUM_API_VERSION, MINIMUM_API_VERSION);

      jest
        .spyOn(dependencies.apiClient.transport.ws, 'buildWebSocketUrl')
        .mockResolvedValue(websocketServerAddress as never);
      jest.spyOn(dependencies.account, 'getNotificationEventTime').mockReturnValue('2025-10-01T00:00:00Z');
    });

    afterEach(() => {
      server.close(); // ensure server shutdown
      WS.clean();
    });

    describe('listen', () => {
      it('connects to websocket after the notification stream has been processed', async () => {
        jest
          .spyOn(dependencies.account, 'getClientCapabilities')
          .mockReturnValue([ClientCapability.LEGAL_HOLD_IMPLICIT_CONSENT]);

        return new Promise<void>(async resolve => {
          const nbNotifications = 10;
          const onNotificationStreamProgress = jest.fn();
          const onEvent = jest.fn().mockImplementation(() => {});
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
                .spyOn(dependencies.account.service!.notification as any, 'handleNotification')
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

              await waitFor(() => expect(onEvent).toHaveBeenCalledTimes(1));
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
                expect(onConnectionStateChanged).toHaveBeenNthCalledWith(3, ConnectionState.LIVE);
                resolve();
                break;
            }
          });

          const disconnect = await dependencies.account.listen({
            useLegacy: false,
            onConnectionStateChanged,
          });

          await waitFor(() => expect(onConnectionStateChanged).toHaveBeenCalledWith(ConnectionState.LIVE));

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

          await waitFor(() =>
            expect(onConnectionStateChanged).toHaveBeenCalledWith(ConnectionState.PROCESSING_NOTIFICATIONS),
          );

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
          .mockImplementationOnce(() => {})
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
                  expect(dependencies.account.service!.notification.handleNotification).toHaveBeenCalledTimes(2);
                  resolve();
              }
            },
            onEvent: onEvent,
            onNotificationStreamProgress: onNotificationStreamProgress,
          });
        });
      });
    });
  });
});
