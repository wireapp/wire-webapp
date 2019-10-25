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

const {WebSocketClient} = require('@wireapp/api-client/dist/commonjs/tcp/WebSocketClient');
const {InvalidTokenError} = require('@wireapp/api-client/dist/commonjs/auth/');

const accessTokenPayload = {
  access_token:
    'iJCRCjc8oROO-dkrkqCXOade997oa8Jhbz6awMUQPBQo80VenWqp_oNvfY6AnU5BxEsdDPOBfBP-uz_b0gAKBQ==.v=1.k=1.d=1498600993.t=a.l=.u=aaf9a833-ef30-4c22-86a0-9adc8a15b3b4.c=15037015562284012115',
  expires_in: 900,
  token_type: 'Bearer',
  user: 'aaf9a833-ef30-4c22-86a0-9adc8a15b3b4',
};

const fakeHttpClient = {
  accessTokenStore: {
    accessToken: accessTokenPayload,
  },
  refreshAccessToken: () => Promise.resolve(accessTokenPayload),
};

const invalidTokenHttpClient = {
  accessTokenStore: {
    accessToken: accessTokenPayload,
  },
  refreshAccessToken: () => Promise.reject(new InvalidTokenError('Invalid token')),
};

describe('WebSocketClient', () => {
  describe('handler', () => {
    it('calls "onOpen" when WebSocket opens', async () => {
      const websocketClient = new WebSocketClient('url', fakeHttpClient);
      const onOpenSpy = spyOn(websocketClient, 'onOpen').and.callThrough();
      const fakeSocket = {};
      const socket = websocketClient.socket;
      spyOn(socket, 'getReconnectingWebsocket').and.returnValue(fakeSocket);

      await websocketClient.connect();
      fakeSocket.onopen();

      expect(onOpenSpy.calls.count()).toBe(1);
    });

    it('calls "onClose" when WebSocket closes', async () => {
      const websocketClient = new WebSocketClient('url', fakeHttpClient);
      const onCloseSpy = spyOn(websocketClient, 'onClose').and.callThrough();
      const fakeSocket = {};
      const socket = websocketClient.socket;
      spyOn(socket, 'getReconnectingWebsocket').and.returnValue(fakeSocket);

      await websocketClient.connect();
      fakeSocket.onclose();

      expect(onCloseSpy.calls.count()).toBe(1);
    });

    it('calls "onError" when WebSocket received error', async () => {
      const websocketClient = new WebSocketClient('url', fakeHttpClient);
      const onErrorSpy = spyOn(websocketClient, 'onError').and.callThrough();
      const refreshTokenSpy = spyOn(websocketClient, 'refreshAccessToken').and.callThrough();
      const fakeSocket = {};
      const socket = websocketClient.socket;
      spyOn(socket, 'getReconnectingWebsocket').and.returnValue(fakeSocket);

      await websocketClient.connect();
      fakeSocket.onerror(new Error('error'));

      expect(onErrorSpy.calls.count()).toBe(1);
      expect(refreshTokenSpy.calls.count()).toBe(1);
    });

    it('calls "onMessage" when WebSocket received message', async () => {
      const message = 'hello';
      const websocketClient = new WebSocketClient('url', fakeHttpClient);
      const onMessageSpy = spyOn(websocketClient, 'onMessage').and.callThrough();
      const fakeSocket = {};
      const socket = websocketClient.socket;
      spyOn(socket, 'getReconnectingWebsocket').and.returnValue(fakeSocket);

      await websocketClient.connect();
      fakeSocket.onmessage({data: Buffer.from(JSON.stringify({message}), 'utf-8')});

      expect(onMessageSpy.calls.count()).toBe(1);
    });

    it('calls "onBeforeConnect" when "onReconnect" is called', async () => {
      const onBeforeConnectResult = jasmine.createSpy().and.returnValue(Promise.resolve());
      const onBeforeConnect = () => {
        expect(websocketClient.isLocked()).toBe(true);
        return onBeforeConnectResult();
      };
      const websocketClient = new WebSocketClient('url', fakeHttpClient);
      const fakeSocket = {};
      const socket = websocketClient.socket;
      spyOn(socket, 'getReconnectingWebsocket').and.returnValue(fakeSocket);

      await websocketClient.connect(undefined, onBeforeConnect);
      expect(websocketClient.isLocked()).toBe(false);
      await websocketClient.onReconnect();
      expect(onBeforeConnectResult.calls.count()).toBe(1);
      expect(websocketClient.isLocked()).toBe(false);
    });

    it('emits error when "onBeforeConnect" fails during "onReconnect"', async () => {
      const testError = new Error('oh no!');
      let errorHandlerCalled = false;
      const onBeforeConnectResult = jasmine.createSpy().and.returnValue(Promise.reject(testError));
      const onBeforeConnect = () => {
        expect(websocketClient.isLocked()).toBe(true);
        return onBeforeConnectResult();
      };
      const websocketClient = new WebSocketClient('url', fakeHttpClient);
      const fakeSocket = {};
      const socket = websocketClient.socket;
      spyOn(socket, 'getReconnectingWebsocket').and.returnValue(fakeSocket);

      websocketClient.on(WebSocketClient.TOPIC.ON_ERROR, error => {
        expect(onBeforeConnectResult.calls.count()).toBe(1);
        expect(error).toBe(testError);
        errorHandlerCalled = true;
      });

      await websocketClient.connect(undefined, onBeforeConnect);
      expect(websocketClient.isLocked()).toBe(false);
      await websocketClient.onReconnect();
      expect(websocketClient.isLocked()).toBe(false);
      expect(errorHandlerCalled).toBe(true);
    });
  });

  describe('refreshAccessToken', () => {
    it('emits the correct message for invalid tokens', async done => {
      const websocketClient = new WebSocketClient('url', invalidTokenHttpClient);
      const fakeSocket = {
        close: () => {},
      };
      const socket = websocketClient.socket;
      spyOn(socket, 'getReconnectingWebsocket').and.returnValue(fakeSocket);

      await websocketClient.connect();

      websocketClient.on(WebSocketClient.TOPIC.ON_INVALID_TOKEN, () => done());

      fakeSocket.onerror(new Error('error'));
    });
  });

  describe('connect', () => {
    it('does not lock websocket by default', async done => {
      const websocketClient = new WebSocketClient('url', fakeHttpClient);
      const onMessageSpy = spyOn(websocketClient, 'onMessage').and.callThrough();
      const fakeSocket = {};
      const socket = websocketClient.socket;
      spyOn(socket, 'getReconnectingWebsocket').and.returnValue(fakeSocket);

      await websocketClient.connect();
      expect(websocketClient.isLocked()).toBe(false);

      const message = 'hello';
      websocketClient.on(WebSocketClient.TOPIC.ON_MESSAGE, notification => {
        expect(onMessageSpy.calls.count()).toBe(1);
        expect(websocketClient.bufferedMessages.length).toBe(0);
        expect(notification).toEqual({message});
        done();
      });

      fakeSocket.onmessage({data: Buffer.from(JSON.stringify({message}), 'utf-8')});
    });

    it('emits buffered messages when unlocked', async done => {
      const websocketClient = new WebSocketClient('url', fakeHttpClient);
      const onMessageSpy = spyOn(websocketClient, 'onMessage').and.callThrough();
      const fakeSocket = {};
      const socket = websocketClient.socket;
      spyOn(socket, 'getReconnectingWebsocket').and.returnValue(fakeSocket);

      websocketClient.lock();
      await websocketClient.connect();
      expect(websocketClient.isLocked()).toBe(true);

      const message = 'hello';
      fakeSocket.onmessage({data: Buffer.from(JSON.stringify({message}), 'utf-8')});
      expect(onMessageSpy.calls.count()).toBe(1);
      expect(websocketClient.bufferedMessages.length).toBe(1);

      websocketClient.on(WebSocketClient.TOPIC.ON_MESSAGE, notification => {
        expect(notification).toEqual({message});
        expect(onMessageSpy.calls.count()).toBe(2);
        done();
      });

      websocketClient.unlock();
    });
  });
});
