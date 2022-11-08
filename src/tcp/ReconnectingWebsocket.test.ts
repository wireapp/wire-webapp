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

import {Server as WebSocketServer} from 'ws';

import {AddressInfo} from 'net';

import {TimeUtil} from '@wireapp/commons';

import {ReconnectingWebsocket} from './ReconnectingWebsocket';

const reservedPorts: number[] = [];

function startEchoServer(): WebSocketServer {
  const getWebsocketPort = () => {
    const WEBSOCKET_START_PORT = 8087;
    let currentPort = WEBSOCKET_START_PORT;
    while (currentPort++) {
      if (!reservedPorts.includes(currentPort)) {
        reservedPorts.push(currentPort);
        break;
      }
    }
    return currentPort;
  };
  const PORT = getWebsocketPort();
  const server = new WebSocketServer({port: PORT});
  server.on('connection', ws => {
    ws.on('message', message => {
      server.clients.forEach(client => {
        if (message.toString() === 'terminate') {
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
  return server;
}

/* eslint-disable jest/no-done-callback */

describe('ReconnectingWebsocket', () => {
  let server: WebSocketServer | undefined;
  const getServerAddress = () => {
    if (server) {
      const address: AddressInfo = server.address() as AddressInfo;
      return Promise.resolve(`ws://127.0.0.1:${address.port}`);
    }
    throw new Error('Server is undefined');
  };

  beforeEach(() => {
    server = startEchoServer();
  });

  afterEach(done => {
    if (server) {
      server.close(() => {
        server = undefined;
        done();
      });
    }
  });

  it('calls "onReconnect", "onOpen" and "onClose"', done => {
    const onReconnect = jest.fn().mockReturnValue(getServerAddress());
    const RWS = new ReconnectingWebsocket(onReconnect);
    RWS.setOnOpen(() => {
      expect(onReconnect).toHaveBeenCalledTimes(1);
      RWS.disconnect();
    });
    RWS.setOnClose(event => {
      expect(event.wasClean).toBe(true);
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
    const onReconnect = jest.fn().mockReturnValue(getServerAddress());
    const RWS = new ReconnectingWebsocket(onReconnect);

    RWS.connect();

    RWS.setOnOpen(() => {
      reconnectCalls++;
      expect(onReconnect).toHaveBeenCalledTimes(reconnectCalls);
      if (reconnectCalls === 1) {
        RWS['socket']!.reconnect();
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

  it('sends ping messages', done => {
    const RWS = new ReconnectingWebsocket(() => getServerAddress(), {pingInterval: TimeUtil.TimeInMillis.SECOND});
    RWS.setOnMessage((data: string) => {
      expect(JSON.parse(data)).toEqual({fromServer: 'Echo: ping'});
      RWS.disconnect();
    });
    RWS.setOnClose(event => {
      expect(event.wasClean).toBe(true);
      done();
    });
    RWS.connect();
  });
});
