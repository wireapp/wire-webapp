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

/* eslint-disable dot-notation */

import {WebSocketClient} from './webSocketClient';
import {ReconnectingWebsocketWallClock} from './reconnectingWebsocket';
import {noop} from 'noop-esm';

import {InvalidTokenError} from '../auth/authenticationError';
import {MINIMUM_API_VERSION} from '../config';
import {TEAM_EVENT} from '../event/';
import {ConsumableEvent, ConsumableNotification} from '../notification/consumableNotification';

const accessTokenPayload = {
  access_token:
    'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86a0-9adc8a15b3b4.c=15037015562284012115',
  expires_in: 900,
  token_type: 'Bearer',
  user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
};

const reconnectPendingMarker = 'reconnect-pending';

const fakeHttpClient: any = {
  accessTokenStore: {
    accessToken: accessTokenPayload,
  },
  refreshAccessToken: () => Promise.resolve(accessTokenPayload),
  hasValidAccessToken: () => true,
};

const invalidTokenHttpClient: any = {
  accessTokenStore: {
    accessToken: accessTokenPayload,
  },
  refreshAccessToken: () => Promise.reject(new InvalidTokenError('Invalid token')),
  hasValidAccessToken: () => true,
};

const fakeSocket = {
  close: jest.fn(),
  onclose: () => {},
  onerror: (error: Error) => {},
  onmessage: ({}) => {},
  onopen: () => {},
};

let currentTimestampInMilliseconds = 1_000_000;

const testWallClock: ReconnectingWebsocketWallClock = {
  clearInterval(intervalIdentifier) {
    return globalThis.clearInterval(intervalIdentifier);
  },
  clearTimeout(timeoutIdentifier) {
    return globalThis.clearTimeout(timeoutIdentifier);
  },

  get currentTimestampInMilliseconds() {
    return currentTimestampInMilliseconds;
  },

  setInterval(callback, delayInMilliseconds) {
    return globalThis.setInterval(callback, delayInMilliseconds);
  },
  setTimeout(callback, delayInMilliseconds) {
    return globalThis.setTimeout(callback, delayInMilliseconds);
  },
};

type WebSocketHttpClient = ConstructorParameters<typeof WebSocketClient>[1];
type WebSocketReconnectHttpClient = Pick<
  WebSocketHttpClient,
  'accessTokenStore' | 'refreshAccessToken' | 'hasValidAccessToken'
>;
type WebSocketReconnectHttpClientOptions = Pick<
  WebSocketReconnectHttpClient,
  'refreshAccessToken' | 'hasValidAccessToken'
>;
type RetryDelayCallback = () => void;
type ManualRetryWallClock = {
  readonly retryDelaysInMilliseconds: number[];
  readonly runNextRetryDelay: () => void;
  readonly wallClock: ReconnectingWebsocketWallClock;
};
type ManualRetryTimeoutIdentifier = ReturnType<ReconnectingWebsocketWallClock['setTimeout']>;

function createWebSocketClient(
  baseUrl: string,
  client: WebSocketHttpClient,
  wallClock: ReconnectingWebsocketWallClock,
): WebSocketClient {
  return new WebSocketClient(baseUrl, client, {
    wallClock,
  });
}

function createWebSocketClientWithTestWallClock(baseUrl: string, client: WebSocketHttpClient): WebSocketClient {
  return createWebSocketClient(baseUrl, client, testWallClock);
}

function createWebSocketReconnectHttpClient(
  webSocketReconnectHttpClient: WebSocketReconnectHttpClientOptions,
): WebSocketHttpClient {
  const httpClient: WebSocketReconnectHttpClient = {
    accessTokenStore: fakeHttpClient.accessTokenStore,
    refreshAccessToken: webSocketReconnectHttpClient.refreshAccessToken,
    hasValidAccessToken: webSocketReconnectHttpClient.hasValidAccessToken,
  };

  return httpClient as WebSocketHttpClient;
}

function createManualRetryTimeoutIdentifier(): ManualRetryTimeoutIdentifier {
  const timeoutIdentifier = testWallClock.setTimeout(noop, 0);

  testWallClock.clearTimeout(timeoutIdentifier);

  return timeoutIdentifier;
}

function createManualRetryWallClock(): ManualRetryWallClock {
  const retryDelayCallbacks: RetryDelayCallback[] = [];
  const retryDelaysInMilliseconds: number[] = [];
  const wallClock: ReconnectingWebsocketWallClock = {
    clearInterval: testWallClock.clearInterval,
    clearTimeout: testWallClock.clearTimeout,

    get currentTimestampInMilliseconds() {
      return currentTimestampInMilliseconds;
    },

    setInterval: testWallClock.setInterval,
    setTimeout: (callback, delayInMilliseconds) => {
      retryDelayCallbacks.push(callback);
      retryDelaysInMilliseconds.push(delayInMilliseconds);

      return createManualRetryTimeoutIdentifier();
    },
  };

  return {
    retryDelaysInMilliseconds,
    runNextRetryDelay: () => {
      retryDelayCallbacks.shift()?.();
    },
    wallClock,
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

const webSocketClients: WebSocketClient[] = [];

describe('WebSocketClient', () => {
  beforeEach(() => {
    currentTimestampInMilliseconds = 1_000_000;
  });

  afterAll(() => {
    webSocketClients.forEach(client => client.disconnect());
  });

  describe('handler', () => {
    it('calls "onOpen" when WebSocket opens', async () => {
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', fakeHttpClient);
      webSocketClients.push(websocketClient);
      const onOpenSpy = jest.spyOn(websocketClient as any, 'onOpen');
      const socket = websocketClient['socket'];
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      await websocketClient.connect();
      fakeSocket.onopen();

      expect(onOpenSpy).toHaveBeenCalledTimes(1);
    });

    it('calls "onClose" when WebSocket closes', async () => {
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', fakeHttpClient);
      webSocketClients.push(websocketClient);
      const onCloseSpy = jest.spyOn(websocketClient as any, 'onClose');
      const socket = websocketClient['socket'];
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      await websocketClient.connect();
      fakeSocket.onclose();

      expect(onCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('calls "onError" when WebSocket received error', async () => {
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', fakeHttpClient);
      webSocketClients.push(websocketClient);
      const onErrorSpy = jest.spyOn(websocketClient as any, 'onError');
      const refreshTokenSpy = jest.spyOn(websocketClient as any, 'refreshAccessToken');
      const socket = websocketClient['socket'];
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      await websocketClient.connect();
      fakeSocket.onerror(new Error('error'));

      expect(onErrorSpy).toHaveBeenCalledTimes(1);
      expect(refreshTokenSpy).toHaveBeenCalledTimes(1);
    });

    it('calls "onMessage" when WebSocket received message', async () => {
      const message = {type: ConsumableEvent.MISSED};
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', fakeHttpClient);
      webSocketClients.push(websocketClient);
      const onMessageSpy = jest.spyOn(websocketClient as any, 'onMessage');
      const socket = websocketClient['socket'];
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      await websocketClient.connect();
      fakeSocket.onmessage({data: Buffer.from(JSON.stringify(message), 'utf-8')});

      expect(onMessageSpy).toHaveBeenCalledTimes(1);
    });

    it('calls "onConnect" when "onReconnect" is called', async () => {
      const onConnectResult = jest.fn().mockReturnValue(Promise.resolve());
      const onConnect = () => {
        return onConnectResult();
      };
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', fakeHttpClient);
      webSocketClients.push(websocketClient);
      const socket = websocketClient['socket'];
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      websocketClient.useVersion(MINIMUM_API_VERSION);
      websocketClient.connect(undefined, onConnect);
      fakeSocket.onopen();
      await websocketClient['onReconnect']();
      expect(onConnectResult).toHaveBeenCalledTimes(1);
    });
  });

  describe('refreshAccessToken', () => {
    // eslint-disable-next-line jest/expect-expect
    it('emits the correct message for invalid tokens', async () => {
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', invalidTokenHttpClient);
      webSocketClients.push(websocketClient);
      const socket = websocketClient['socket'];
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      await websocketClient.connect();

      return new Promise<void>(resolve => {
        websocketClient.on(WebSocketClient.TOPIC.ON_INVALID_TOKEN, () => resolve());

        fakeSocket.onerror(new Error('error'));
      });
    });
  });

  describe('onReconnect', () => {
    it('waits for the same in-flight access-token refresh before building reconnect URLs', async () => {
      let resolveRefreshAccessToken: () => void = noop;
      const refreshAccessTokenPromise = new Promise<void>(resolve => {
        resolveRefreshAccessToken = resolve;
      });
      let accessTokenIsValid = false;
      const refreshAccessToken = jest.fn(async () => {
        await refreshAccessTokenPromise;
        accessTokenIsValid = true;
        return accessTokenPayload;
      });
      const httpClient = createWebSocketReconnectHttpClient({
        refreshAccessToken,
        hasValidAccessToken: () => accessTokenIsValid,
      });
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', httpClient);
      webSocketClients.push(websocketClient);
      const buildWebSocketUrl = jest.spyOn(websocketClient, 'buildWebSocketUrl').mockReturnValue('ws://url/await');

      const firstReconnect = websocketClient['onReconnect']();
      const secondReconnect = websocketClient['onReconnect']();

      await Promise.resolve();

      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(buildWebSocketUrl).not.toHaveBeenCalled();

      resolveRefreshAccessToken();

      await expect(Promise.all([firstReconnect, secondReconnect])).resolves.toEqual([
        'ws://url/await',
        'ws://url/await',
      ]);
      expect(buildWebSocketUrl).toHaveBeenCalledTimes(2);
    });

    it('retries transient refresh failures without rejecting reconnect before building a WebSocket URL', async () => {
      const refreshError = new Error('Network changed');
      const manualRetryWallClock = createManualRetryWallClock();
      let accessTokenIsValid = false;
      const refreshAccessToken = jest
        .fn()
        .mockRejectedValueOnce(refreshError)
        .mockImplementationOnce(async () => {
          accessTokenIsValid = true;
          return accessTokenPayload;
        });
      const httpClient = createWebSocketReconnectHttpClient({
        refreshAccessToken,
        hasValidAccessToken: () => accessTokenIsValid,
      });
      const websocketClient = createWebSocketClient('ws://url', httpClient, manualRetryWallClock.wallClock);
      webSocketClients.push(websocketClient);
      const buildWebSocketUrl = jest.spyOn(websocketClient, 'buildWebSocketUrl').mockReturnValue('ws://url/await');

      const reconnectPromise = websocketClient['onReconnect']();

      await flushPromises();

      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      await expect(Promise.race([reconnectPromise, Promise.resolve(reconnectPendingMarker)])).resolves.toBe(
        reconnectPendingMarker,
      );
      expect(buildWebSocketUrl).not.toHaveBeenCalled();
      expect(manualRetryWallClock.retryDelaysInMilliseconds).toEqual([1_000]);

      manualRetryWallClock.runNextRetryDelay();

      await expect(reconnectPromise).resolves.toBe('ws://url/await');
      expect(refreshAccessToken).toHaveBeenCalledTimes(2);
      expect(buildWebSocketUrl).toHaveBeenCalledTimes(1);
    });

    it('emits invalid-token event, rejects reconnect, and does not build a WebSocket URL when refresh fails with invalid token', async () => {
      const invalidTokenError = new InvalidTokenError('Invalid token');
      const httpClient = createWebSocketReconnectHttpClient({
        refreshAccessToken: jest.fn().mockRejectedValue(invalidTokenError),
        hasValidAccessToken: () => false,
      });
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', httpClient);
      webSocketClients.push(websocketClient);
      const buildWebSocketUrl = jest.spyOn(websocketClient, 'buildWebSocketUrl').mockReturnValue('ws://url/await');
      const invalidTokenListener = jest.fn();

      websocketClient.on(WebSocketClient.TOPIC.ON_INVALID_TOKEN, invalidTokenListener);

      await expect(websocketClient['onReconnect']()).rejects.toBe(invalidTokenError);

      expect(invalidTokenListener).toHaveBeenCalledTimes(1);
      expect(invalidTokenListener).toHaveBeenCalledWith(invalidTokenError);
      expect(buildWebSocketUrl).not.toHaveBeenCalled();
    });

    it('builds a WebSocket URL without refreshing when the access token is already valid', async () => {
      const refreshAccessToken = jest.fn().mockResolvedValue(accessTokenPayload);
      const httpClient = createWebSocketReconnectHttpClient({
        refreshAccessToken,
        hasValidAccessToken: () => true,
      });
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', httpClient);
      webSocketClients.push(websocketClient);
      const buildWebSocketUrl = jest.spyOn(websocketClient, 'buildWebSocketUrl').mockReturnValue('ws://url/await');

      await expect(websocketClient['onReconnect']()).resolves.toBe('ws://url/await');

      expect(refreshAccessToken).not.toHaveBeenCalled();
      expect(buildWebSocketUrl).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildWebSocketUrl', () => {
    function createHttpClientWithWebSocketTokens(accessToken: string, nextMarkerToken: string): WebSocketHttpClient {
      return {
        ...fakeHttpClient,
        accessTokenStore: {
          getAccessToken: () => accessToken,
          getNextMarkerToken: () => nextMarkerToken,
        },
      };
    }

    it('builds a legacy await WebSocket URL without the async sync marker', () => {
      const websocketClient = createWebSocketClientWithTestWallClock(
        'wss://websocket.example.test',
        createHttpClientWithWebSocketTokens('access-token', 'marker-token'),
      );
      webSocketClients.push(websocketClient);

      websocketClient.useVersion(MINIMUM_API_VERSION);
      websocketClient['clientId'] = 'client-id';

      expect(websocketClient.buildWebSocketUrl()).toBe(
        'wss://websocket.example.test/await?access_token=access-token&client=client-id',
      );
    });

    it('builds an async events WebSocket URL with the sync marker', () => {
      const websocketClient = createWebSocketClientWithTestWallClock(
        'wss://websocket.example.test',
        createHttpClientWithWebSocketTokens('access-token', 'marker-token'),
      );
      webSocketClients.push(websocketClient);

      websocketClient.useVersion(MINIMUM_API_VERSION);
      websocketClient.useAsyncNotificationsSocket();
      websocketClient['clientId'] = 'client-id';

      expect(websocketClient.buildWebSocketUrl()).toBe(
        `wss://websocket.example.test/v${MINIMUM_API_VERSION}/events?access_token=access-token&sync_marker=marker-token&client=client-id`,
      );
    });
  });

  describe('connect', () => {
    const fakeNotification: ConsumableNotification = {
      type: ConsumableEvent.EVENT,
      data: {
        delivery_tag: 1,
        event: {
          id: 'event-id',
          payload: [
            {
              data: {
                user: 'Bob',
              },
              team: '456',
              time: new Date().toISOString(),
              type: TEAM_EVENT.MEMBER_JOIN,
            },
          ],
        },
      },
    };

    it('does not lock websocket by default', async () => {
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', fakeHttpClient);
      webSocketClients.push(websocketClient);
      const onMessageSpy = jest.spyOn(websocketClient as any, 'onMessage');
      const socket = websocketClient['socket'];
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      await websocketClient.connect();
      expect(websocketClient.isLocked()).toBe(false);

      return new Promise<void>(resolve => {
        websocketClient.on(WebSocketClient.TOPIC.ON_MESSAGE, notification => {
          expect(onMessageSpy).toHaveBeenCalledTimes(1);
          expect(websocketClient['bufferedMessages'].length).toBe(0);
          expect(notification).toEqual(fakeNotification);
          resolve();
        });
        fakeSocket.onmessage({data: Buffer.from(JSON.stringify(fakeNotification), 'utf-8')});
      });
    });

    it('emits buffered messages when unlocked', async () => {
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', fakeHttpClient);
      webSocketClients.push(websocketClient);
      const onMessageSpy = jest.spyOn(websocketClient as any, 'onMessage');
      const socket = websocketClient['socket'];
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      websocketClient.lock();
      await websocketClient.connect();
      expect(websocketClient.isLocked()).toBe(true);

      fakeSocket.onmessage({data: Buffer.from(JSON.stringify(fakeNotification), 'utf-8')});
      expect(onMessageSpy).toHaveBeenCalledTimes(1);
      expect(websocketClient['bufferedMessages'].length).toBe(1);

      return new Promise<void>(resolve => {
        websocketClient.on(WebSocketClient.TOPIC.ON_MESSAGE, notification => {
          expect(notification).toEqual(notification);
          expect(onMessageSpy).toHaveBeenCalledTimes(2);
          resolve();
        });
        websocketClient.unlock();
      });
    });

    it('emits a long-running retry event once reconnect retries reach one minute', async () => {
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', fakeHttpClient);
      webSocketClients.push(websocketClient);
      const retryDetailsListener = jest.fn();
      const socket = websocketClient['socket'];

      websocketClient.useVersion(MINIMUM_API_VERSION);
      websocketClient.on(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY, retryDetailsListener);
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      currentTimestampInMilliseconds = 0;
      websocketClient.connect();
      await socket['internalOnReconnect']();
      currentTimestampInMilliseconds = 1_000;
      await socket['internalOnReconnect']();
      currentTimestampInMilliseconds = 61_000;
      await socket['internalOnReconnect']();

      expect(retryDetailsListener).toHaveBeenCalledTimes(1);
      expect(retryDetailsListener).toHaveBeenCalledWith({
        retryCount: 2,
        retryDurationInMilliseconds: 60000,
      });
    });

    it('does not emit a long-running retry event before reconnect retries reach one minute', async () => {
      const websocketClient = createWebSocketClientWithTestWallClock('ws://url', fakeHttpClient);
      webSocketClients.push(websocketClient);
      const retryDetailsListener = jest.fn();
      const socket = websocketClient['socket'];

      websocketClient.useVersion(MINIMUM_API_VERSION);
      websocketClient.on(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY, retryDetailsListener);
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      currentTimestampInMilliseconds = 0;
      websocketClient.connect();
      await socket['internalOnReconnect']();
      currentTimestampInMilliseconds = 1_000;
      await socket['internalOnReconnect']();
      currentTimestampInMilliseconds = 60_000;
      await socket['internalOnReconnect']();

      expect(retryDetailsListener).not.toHaveBeenCalled();
    });
  });
});
