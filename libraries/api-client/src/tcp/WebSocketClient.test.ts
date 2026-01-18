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

import {WebSocketClient} from './WebSocketClient';

import {InvalidTokenError} from '../auth/AuthenticationError';
import {MINIMUM_API_VERSION} from '../Config';
import {TEAM_EVENT} from '../event/';
import {ConsumableEvent, ConsumableNotification} from '../notification/ConsumableNotification';

const accessTokenPayload = {
  access_token:
    'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86a0-9adc8a15b3b4.c=15037015562284012115',
  expires_in: 900,
  token_type: 'Bearer',
  user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
};

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

const webSocketClients: WebSocketClient[] = [];

describe('WebSocketClient', () => {
  afterAll(() => {
    webSocketClients.forEach(client => client.disconnect());
  });

  describe('handler', () => {
    it('calls "onOpen" when WebSocket opens', async () => {
      const websocketClient = new WebSocketClient('ws://url', fakeHttpClient);
      webSocketClients.push(websocketClient);
      const onOpenSpy = jest.spyOn(websocketClient as any, 'onOpen');
      const socket = websocketClient['socket'];
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      await websocketClient.connect();
      fakeSocket.onopen();

      expect(onOpenSpy).toHaveBeenCalledTimes(1);
    });

    it('calls "onClose" when WebSocket closes', async () => {
      const websocketClient = new WebSocketClient('ws://url', fakeHttpClient);
      webSocketClients.push(websocketClient);
      const onCloseSpy = jest.spyOn(websocketClient as any, 'onClose');
      const socket = websocketClient['socket'];
      jest.spyOn(socket as any, 'getReconnectingWebsocket').mockReturnValue(fakeSocket);

      await websocketClient.connect();
      fakeSocket.onclose();

      expect(onCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('calls "onError" when WebSocket received error', async () => {
      const websocketClient = new WebSocketClient('ws://url', fakeHttpClient);
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
      const websocketClient = new WebSocketClient('ws://url', fakeHttpClient);
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
      const websocketClient = new WebSocketClient('ws://url', fakeHttpClient);
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
      const websocketClient = new WebSocketClient('ws://url', invalidTokenHttpClient);
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
      const websocketClient = new WebSocketClient('ws://url', fakeHttpClient);
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
      const websocketClient = new WebSocketClient('ws://url', fakeHttpClient);
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
  });
});
