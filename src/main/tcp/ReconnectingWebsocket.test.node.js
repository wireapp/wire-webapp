/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

const {ReconnectingWebsocket} = require('@wireapp/api-client/dist/commonjs/tcp/ReconnectingWebsocket');
const {Server: WebSocketServer} = require('ws');

const WEBSOCKET_PORT = 8087;
const WEBSOCKET_URL = `ws://127.0.0.1:${WEBSOCKET_PORT}`;
let server = undefined;

function startEchoServer() {
  server = new WebSocketServer({port: WEBSOCKET_PORT});
  server.on('connection', ws => {
    ws.on('message', message => {
      server.clients.forEach(client => {
        if (message === 'terminate') {
          client.close();
          return;
        }
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

describe('ReconnectingWebsocket', () => {
  beforeEach(() => startEchoServer());

  afterEach(done => {
    if (server) {
      server.close(() => {
        server = undefined;
        done();
      });
    }
  });

  it('calls "onReconnect", "onOpen" and "onClose"', done => {
    const onReconnect = jasmine.createSpy().and.returnValue(WEBSOCKET_URL);
    const RWS = new ReconnectingWebsocket(onReconnect);
    RWS.setOnOpen(() => {
      expect(onReconnect.calls.count()).toBe(1);
      RWS.disconnect();
    });
    RWS.setOnClose(event => {
      expect(event.wasClean).toBe(true);
      done();
    });
    RWS.connect();
  });

  it('closes the connection without reconnecting when server terminates the connection', done => {
    const onReconnect = jasmine.createSpy().and.returnValue(WEBSOCKET_URL);
    const RWS = new ReconnectingWebsocket(onReconnect);
    RWS.setOnOpen(() => {
      expect(onReconnect.calls.count()).toBe(1);
      RWS.send('terminate');
    });
    RWS.setOnClose(event => {
      expect(event.wasClean).toBe(true);
      expect(onReconnect.calls.count()).toBe(1);
      done();
    });
    RWS.connect();
  });

  /**
   * Note that on a real interruption of the connection the ReconnectingWebsocket will not call "onClose" and "onOpen" again
   * but it will call "onReconnect" again. So this test checks at least the second call of "onReconnect".
   */
  it('reconnects', done => {
    let reconnectCalls = 0;
    const onReconnect = jasmine.createSpy().and.returnValue(WEBSOCKET_URL);
    const RWS = new ReconnectingWebsocket(onReconnect);

    RWS.connect();

    RWS.setOnOpen(() => {
      reconnectCalls++;
      expect(onReconnect.calls.count()).toBe(reconnectCalls);
      if (reconnectCalls === 1) {
        RWS.socket.reconnect();
      } else {
        RWS.disconnect();
      }
    });

    RWS.setOnClose(event => {
      expect(event.wasClean).toBe(true);
      if (reconnectCalls > 1) {
        done();
      }
    });
  }, 2000);
});
