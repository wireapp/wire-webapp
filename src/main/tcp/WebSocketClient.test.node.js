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

const {WebSocketClient, WebSocketTopic} = require('@wireapp/api-client/dist/commonjs/tcp/WebSocketClient');
const {Server: WebSocketServer} = require('ws');

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

const WEBSOCKET_PORT = 8087;
const WEBSOCKET_URL = `ws://localhost:${WEBSOCKET_PORT}`;
let server = undefined;

function startEchoServer() {
  server = new WebSocketServer({port: WEBSOCKET_PORT});
  server.on('connection', ws => {
    ws.on('message', message => {
      server.clients.forEach(client => {
        const payload = {
          fromServer: `Echo: ${message}`,
        };

        const options = {
          binary: true,
          mask: false,
        };

        client.send(JSON.stringify(payload), options);
      });
    });
  });

  server.on('error', error => console.error(`Echo WebSocket server error: "${error.message}"`));
}

describe('WebSocketClient', () => {
  describe('"connect"', () => {
    beforeEach(() => startEchoServer());

    afterEach(done => {
      if (server) {
        server.close(() => {
          server = undefined;
          done();
        });
      }
    });

    it('connects to a WebSocket.', async done => {
      const message = 'Hello, World!';
      const client = new WebSocketClient(WEBSOCKET_URL, fakeHttpClient);
      spyOn(client, 'sendPing').and.returnValue();

      const webSocketClient = await client.connect();
      expect(webSocketClient).toBeDefined();

      webSocketClient.on(WebSocketTopic.ON_MESSAGE, data => {
        expect(data.fromServer).toBe(`Echo: ${message}`);
        done();
      });

      webSocketClient.socket.addEventListener('open', () => webSocketClient.socket.send(message));
    });

    it(
      'automatically reconnects with a WebSocket.',
      async done => {
        const client = new WebSocketClient(WEBSOCKET_URL, fakeHttpClient);
        spyOn(client, 'sendPing').and.returnValue();

        const webSocketClient = await client.connect();
        expect(webSocketClient).toBeDefined();
        // "open" listener which will be triggered on WebSocket reconnect which is expected after a WebSocket server restart
        webSocketClient.socket.addEventListener('open', done);
        // Restart WebSocket server
        server.close(() => startEchoServer());
      },
      WebSocketClient.RECONNECTING_OPTIONS.maxReconnectionDelay
    );
  });
});
