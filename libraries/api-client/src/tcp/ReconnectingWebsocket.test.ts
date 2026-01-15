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

import {PingMessage, ReconnectingWebsocket, WEBSOCKET_STATE} from './ReconnectingWebsocket';

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
  const activeConnections: ReconnectingWebsocket[] = [];

  const getServerAddress = () => {
    if (server) {
      const address: AddressInfo = server.address() as AddressInfo;
      return Promise.resolve(`ws://127.0.0.1:${address.port}`);
    }
    throw new Error('Server is undefined');
  };

  const createRWS = (onReconnect: () => Promise<string>, options?: {pingInterval?: number}) => {
    const rws = new ReconnectingWebsocket(onReconnect, options);
    activeConnections.push(rws);
    return rws;
  };

  beforeEach(() => {
    server = startEchoServer();
  });

  afterEach(done => {
    // Cleanup all active connections
    activeConnections.forEach(rws => {
      try {
        rws.disconnect();
      } catch (e) {
        // Ignore errors during cleanup
      }
    });
    activeConnections.length = 0;

    if (server) {
      server.close(() => {
        server = undefined;
        done();
      });
    } else {
      done();
    }
  });

  it('calls "onReconnect", "onOpen" and "onClose"', done => {
    const onReconnect = jest.fn().mockReturnValue(getServerAddress());
    const RWS = createRWS(onReconnect);
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
    const RWS = createRWS(onReconnect);

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

  describe('checkHealth', () => {
    it('returns false when socket does not exist', async () => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      const result = await RWS.checkHealth();

      expect(result).toBe(false);
      RWS.disconnect();
    });

    it('returns false when socket is not in OPEN state', async () => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.connect();

      // Check health while connecting (before open)
      const result = await RWS.checkHealth();

      expect(result).toBe(false);

      RWS.disconnect();
    });

    it('returns true when pong is received before timeout', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        // Mock the socket to respond with pong
        const originalSend = RWS.send.bind(RWS);
        RWS.send = jest.fn((message: any) => {
          originalSend(message);
          if (message === PingMessage.PING) {
            // Simulate pong response
            setTimeout(() => {
              RWS['internalOnMessage']({data: Buffer.from(PingMessage.PONG)} as MessageEvent);
            }, 100);
          }
        });

        const result = await RWS.checkHealth(1000);

        expect(result).toBe(true);
        expect(RWS.send).toHaveBeenCalledWith(PingMessage.PING);

        RWS.disconnect();
        done();
      });

      RWS.connect();
    }, 5000);

    it('returns false when pong is not received before timeout', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        // Mock the socket to never respond with pong
        RWS.send = jest.fn();

        const result = await RWS.checkHealth(100);

        expect(result).toBe(false);
        expect(RWS.send).toHaveBeenCalledWith(PingMessage.PING);

        RWS.disconnect();
        done();
      });

      RWS.connect();
    }, 5000);

    it('uses default timeout of 10 seconds when not specified', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        RWS.send = jest.fn();

        const startTime = Date.now();
        const result = await RWS.checkHealth();
        const duration = Date.now() - startTime;

        expect(result).toBe(false);
        // Should be approximately 10000ms (with some tolerance)
        expect(duration).toBeGreaterThanOrEqual(9900);
        expect(duration).toBeLessThan(10500);

        RWS.disconnect();
        done();
      });

      RWS.connect();
    }, 15000);

    it('handles multiple concurrent health checks', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        const originalSend = RWS.send.bind(RWS);
        RWS.send = jest.fn((message: any) => {
          originalSend(message);
          if (message === PingMessage.PING) {
            // Simulate pong response after 200ms
            setTimeout(() => {
              RWS['internalOnMessage']({data: Buffer.from(PingMessage.PONG)} as MessageEvent);
            }, 200);
          }
        });

        // Start multiple health checks concurrently
        const check1 = RWS.checkHealth(1000);
        const check2 = RWS.checkHealth(1000);
        const check3 = RWS.checkHealth(1000);

        const [result1, result2, result3] = await Promise.all([check1, check2, check3]);

        expect(result1).toBe(true);
        expect(result2).toBe(true);
        expect(result3).toBe(true);

        RWS.disconnect();
        done();
      });

      RWS.connect();
    }, 5000);

    it('clears timeout when pong is received', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        const originalSend = RWS.send.bind(RWS);
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

        RWS.send = jest.fn((message: any) => {
          originalSend(message);
          if (message === PingMessage.PING) {
            setTimeout(() => {
              RWS['internalOnMessage']({data: Buffer.from(PingMessage.PONG)} as MessageEvent);
            }, 100);
          }
        });

        await RWS.checkHealth(1000);

        // clearTimeout should have been called when pong was received
        expect(clearTimeoutSpy).toHaveBeenCalled();

        clearTimeoutSpy.mockRestore();
        RWS.disconnect();
        done();
      });

      RWS.connect();
    }, 5000);

    it('removes health check callback from pendingHealthChecks on timeout', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        RWS.send = jest.fn();

        // Start a health check that will timeout
        await RWS.checkHealth(100);

        // The pending health check should be removed after timeout
        expect(RWS['pendingHealthChecks'].size).toBe(0);

        RWS.disconnect();
        done();
      });

      RWS.connect();
    }, 5000);

    it('resolves all pending health checks as false when socket closes', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        // Mock send to prevent actual ping
        RWS.send = jest.fn();

        // Start a health check with long timeout
        const healthCheckPromise = RWS.checkHealth(10000);

        // Close the socket before the health check resolves
        setTimeout(() => {
          RWS.disconnect();
        }, 100);

        const result = await healthCheckPromise;

        // Should resolve as false when socket closes
        expect(result).toBe(false);

        done();
      });

      RWS.connect();
    }, 5000);

    it('considers connection healthy when messages are actively being processed', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        const sendSpy = jest.spyOn(RWS, 'send');

        // Simulate recent message activity (within 5 seconds)
        RWS['lastMessageTimestamp'] = Date.now() - 1000; // 1 second ago

        const result = await RWS.checkHealth(1000);

        expect(result).toBe(true);
        // Should NOT send a ping when messages are actively being processed
        expect(sendSpy).not.toHaveBeenCalled();

        sendSpy.mockRestore();
        RWS.disconnect();
        done();
      });

      RWS.connect();
    });

    it('sends ping when connection is idle (no messages for 5+ seconds)', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        const sendSpy = jest.spyOn(RWS, 'send');

        // Simulate idle connection (no messages for 6 seconds)
        RWS['lastMessageTimestamp'] = Date.now() - 6000; // 6 seconds ago

        const checkPromise = RWS.checkHealth(1000);

        // Should send a ping when idle
        expect(sendSpy).toHaveBeenCalledWith(PingMessage.PING);

        // Simulate pong response
        setTimeout(() => {
          RWS['internalOnMessage']({data: Buffer.from(PingMessage.PONG)} as MessageEvent);
        }, 100);

        const result = await checkPromise;
        expect(result).toBe(true);

        sendSpy.mockRestore();
        RWS.disconnect();
        done();
      });

      RWS.connect();
    });

    it('updates lastMessageTimestamp when non-PONG messages are received', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);
      const testMessage = JSON.stringify({test: 'data'});

      RWS.setOnOpen(() => {
        const initialTimestamp = RWS['lastMessageTimestamp'];
        expect(initialTimestamp).toBe(0);

        // Simulate receiving a message
        RWS['internalOnMessage']({data: Buffer.from(testMessage)} as MessageEvent);

        const updatedTimestamp = RWS['lastMessageTimestamp'];
        expect(updatedTimestamp).toBeGreaterThan(initialTimestamp);
        expect(updatedTimestamp).toBeGreaterThan(Date.now() - 1000);

        RWS.disconnect();
        done();
      });

      RWS.connect();
    });

    it('does not update lastMessageTimestamp for PONG messages', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(() => {
        RWS['lastMessageTimestamp'] = 12345; // Set a specific timestamp

        // Receive a PONG message
        RWS['internalOnMessage']({data: Buffer.from(PingMessage.PONG)} as MessageEvent);

        // Timestamp should not be updated for PONG
        expect(RWS['lastMessageTimestamp']).toBe(12345);

        RWS.disconnect();
        done();
      });

      RWS.connect();
    });

    it('prevents false negatives during high message volume', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        const sendSpy = jest.spyOn(RWS, 'send');

        // Simulate high message activity - messages received very recently
        RWS['lastMessageTimestamp'] = Date.now() - 500; // 500ms ago

        // Even with a very short timeout, should still return true due to recent activity
        const result = await RWS.checkHealth(100); // Very short timeout

        expect(result).toBe(true);
        expect(sendSpy).not.toHaveBeenCalled(); // No ping sent

        sendSpy.mockRestore();
        RWS.disconnect();
        done();
      });

      RWS.connect();
    });

    it('returns false for idle connection when pong not received', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        const sendSpy = jest.spyOn(RWS, 'send');

        // Simulate idle connection
        RWS['lastMessageTimestamp'] = Date.now() - 10000; // 10 seconds ago

        // Don't mock pong response - should timeout
        const result = await RWS.checkHealth(200);

        expect(result).toBe(false);
        expect(sendSpy).toHaveBeenCalledWith(PingMessage.PING);

        sendSpy.mockRestore();
        RWS.disconnect();
        done();
      });

      RWS.connect();
    });

    it('handles mixed scenarios - recent activity then idle', async () => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.connect();

      return new Promise<void>((resolve, reject) => {
        RWS.setOnOpen(async () => {
          try {
            const sendSpy = jest.spyOn(RWS, 'send');

            // Test 1: Recent activity - should be healthy without ping
            RWS['lastMessageTimestamp'] = Date.now() - 1000; // 1 second ago
            let result = await RWS.checkHealth(1000);
            expect(result).toBe(true);
            expect(sendSpy).not.toHaveBeenCalled();
            sendSpy.mockClear();

            // Test 2: Idle - should send ping
            RWS['lastMessageTimestamp'] = Date.now() - 6000; // 6 seconds ago
            const checkPromise = RWS.checkHealth(1000);
            expect(sendSpy).toHaveBeenCalledWith(PingMessage.PING);

            // Simulate pong
            setTimeout(() => {
              RWS['internalOnMessage']({data: Buffer.from(PingMessage.PONG)} as MessageEvent);
            }, 100);

            result = await checkPromise;
            expect(result).toBe(true);

            sendSpy.mockRestore();
            RWS.disconnect();
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });
    });
  });

  describe('constructor', () => {
    it('accepts custom pingInterval option', () => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const customInterval = 10000;
      const RWS = createRWS(onReconnect, {pingInterval: customInterval});

      expect(RWS['PING_INTERVAL']).toBe(customInterval);
      RWS.disconnect();
    });

    it('uses default pingInterval when not provided', () => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      expect(RWS['PING_INTERVAL']).toBe(20000);
      RWS.disconnect();
    });
  });

  describe('getState', () => {
    it('returns CLOSED when socket does not exist', () => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      expect(RWS.getState()).toBe(WEBSOCKET_STATE.CLOSED);
      RWS.disconnect();
    });

    it('returns socket readyState when socket exists', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(() => {
        expect(RWS.getState()).toBe(WEBSOCKET_STATE.OPEN);
        RWS.disconnect();
        done();
      });

      RWS.connect();
    });
  });

  describe('message handling', () => {
    it('calls onMessage callback with non-PONG messages', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);
      const testMessage = JSON.stringify({test: 'data'});

      RWS.setOnOpen(() => {
        RWS.send(testMessage);
      });

      RWS.setOnMessage(data => {
        const parsed = JSON.parse(data);
        expect(parsed.fromServer).toBe(`Echo: ${testMessage}`);
        RWS.disconnect();
        done();
      });

      RWS.connect();
    });

    it('does not call onMessage for PONG messages', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);
      const onMessageSpy = jest.fn();

      RWS.setOnOpen(() => {
        RWS['internalOnMessage']({data: Buffer.from(PingMessage.PONG)} as MessageEvent);

        setTimeout(() => {
          expect(onMessageSpy).not.toHaveBeenCalled();
          RWS.disconnect();
          done();
        }, 100);
      });

      RWS.setOnMessage(onMessageSpy);
      RWS.connect();
    });
  });

  describe('error handling', () => {
    it('calls onError callback when error occurs', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);
      const testError = new Event('error') as ErrorEvent;

      RWS.setOnError(error => {
        expect(error).toBe(testError);
        RWS.disconnect();
        done();
      });

      RWS.setOnOpen(() => {
        RWS['internalOnError'](testError);
      });

      RWS.connect();
    });
  });

  describe('disablePinging', () => {
    it('stops active pinging', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(() => {
        const hadPinger = !!RWS['pingerId'];
        expect(hadPinger).toBe(true);

        RWS.disablePinging();

        expect(RWS['isPingingEnabled']).toBe(false);
        RWS.disconnect();
        done();
      });

      RWS.connect();
    });

    it('prevents pinging on reconnect', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.disablePinging();

      RWS.setOnOpen(() => {
        expect(RWS['pingerId']).toBeUndefined();
        RWS.disconnect();
        done();
      });

      RWS.connect();
    });
  });

  describe('disconnect', () => {
    it('disconnects with custom reason', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);
      const customReason = 'Test disconnect';

      RWS.setOnOpen(() => {
        RWS.disconnect(customReason);
      });

      RWS.setOnClose(event => {
        expect(event.reason).toBe(customReason);
        done();
      });

      RWS.connect();
    });

    it('cleans up resources even when socket does not exist', () => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);
      const cleanupSpy = jest.spyOn(RWS as any, 'cleanup');

      RWS.disconnect();

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('sends message when socket exists', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);
      const testMessage = 'test';

      RWS.setOnOpen(() => {
        const sendSpy = jest.spyOn(RWS['socket']!, 'send');
        RWS.send(testMessage);

        expect(sendSpy).toHaveBeenCalledWith(testMessage);
        RWS.disconnect();
        done();
      });

      RWS.connect();
    });

    it('does not throw when socket does not exist', () => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      expect(() => RWS.send('test')).not.toThrow();
      RWS.disconnect();
    });
  });

  describe('ping mechanism', () => {
    it('sends ping automatically at intervals', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect, {pingInterval: 200});

      RWS.setOnOpen(() => {
        const sendSpy = jest.spyOn(RWS, 'send');

        setTimeout(() => {
          expect(sendSpy).toHaveBeenCalledWith(PingMessage.PING);
          RWS.disconnect();
          done();
        }, 300);
      });

      RWS.connect();
    }, 2000);

    it('closes socket after unanswered ping timeout', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect, {pingInterval: 100});

      RWS.setOnOpen(() => {
        RWS['hasUnansweredPing'] = true;
        setTimeout(() => RWS['sendPing'](), 50);
      });

      RWS.setOnClose(event => {
        expect(event.reason).toBe('Ping timeout');
        done();
      });

      RWS.connect();
    }, 2000);

    it('resets hasUnansweredPing flag when pong received', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(() => {
        RWS['hasUnansweredPing'] = true;

        RWS['internalOnMessage']({data: Buffer.from(PingMessage.PONG)} as MessageEvent);

        expect(RWS['hasUnansweredPing']).toBe(false);
        RWS.disconnect();
        done();
      });

      RWS.connect();
    });
  });

  describe('internalOnOpen', () => {
    it('sets binaryType to arraybuffer', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(() => {
        expect(RWS['socket']!.binaryType).toBe('arraybuffer');
        RWS.disconnect();
        done();
      });

      RWS.connect();
    });
  });
});
