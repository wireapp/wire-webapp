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
  });
});
