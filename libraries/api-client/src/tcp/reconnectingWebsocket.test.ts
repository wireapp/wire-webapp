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

import is from '@sindresorhus/is';
import {once} from 'events';
import type {CloseEvent, ErrorEvent} from 'partysocket/ws';
import {Maybe} from 'true-myth';
import {Server as WebSocketServer} from 'ws';

import {AddressInfo} from 'net';

import {
  CloseEventCode,
  PingMessage,
  ReconnectingWebsocket,
  ReconnectingWebsocketWallClock,
  WEBSOCKET_STATE,
} from './reconnectingWebsocket';

type TimeoutRegistration = {
  readonly execute: () => void;
  readonly executionTimestampInMilliseconds: number;
};

type DeterministicTimeoutWallClock = ReconnectingWebsocketWallClock & {
  readonly advanceByMilliseconds: (delayInMilliseconds: number) => void;
};

type MockReconnectingWebsocketWrapper = {
  binaryType: BinaryType;
  close: jest.Mock;
  onclose: ((event: CloseEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onopen: ((event: Event) => void) | null;
  readyState: WEBSOCKET_STATE;
  reconnect: jest.Mock;
  send: jest.Mock;
};

function createMockReconnectingWebsocketWrapper(readyState: WEBSOCKET_STATE): MockReconnectingWebsocketWrapper {
  const socket: MockReconnectingWebsocketWrapper = {
    binaryType: 'blob',
    close: jest.fn(() => {
      socket.readyState = WEBSOCKET_STATE.CLOSED;
    }),
    onclose: null,
    onerror: null,
    onmessage: null,
    onopen: null,
    readyState,
    reconnect: jest.fn(),
    send: jest.fn(),
  };

  return socket;
}

function expectSocketHandlersToBeBound(socket: MockReconnectingWebsocketWrapper): void {
  expect(socket.onclose).toEqual(expect.any(Function));
  expect(socket.onerror).toEqual(expect.any(Function));
  expect(socket.onmessage).toEqual(expect.any(Function));
  expect(socket.onopen).toEqual(expect.any(Function));
}

function createDeterministicTimeoutWallClock(
  initialCurrentTimestampInMilliseconds: number,
): DeterministicTimeoutWallClock {
  let currentTimestampInMilliseconds = initialCurrentTimestampInMilliseconds;
  let nextTimeoutIdentifier = 0;
  const timeoutRegistrations = new Map<number, TimeoutRegistration>();

  function runDueTimeoutRegistrations(): void {
    const dueTimeoutRegistrations = Array.from(timeoutRegistrations.entries())
      .filter(([, timeoutRegistration]) => {
        return timeoutRegistration.executionTimestampInMilliseconds <= currentTimestampInMilliseconds;
      })
      .toSorted((firstTimeoutEntry, secondTimeoutEntry) => {
        const [firstTimeoutIdentifier, firstTimeoutRegistration] = firstTimeoutEntry;
        const [secondTimeoutIdentifier, secondTimeoutRegistration] = secondTimeoutEntry;

        if (
          firstTimeoutRegistration.executionTimestampInMilliseconds !==
          secondTimeoutRegistration.executionTimestampInMilliseconds
        ) {
          return (
            firstTimeoutRegistration.executionTimestampInMilliseconds -
            secondTimeoutRegistration.executionTimestampInMilliseconds
          );
        }

        return firstTimeoutIdentifier - secondTimeoutIdentifier;
      });

    dueTimeoutRegistrations.forEach(([timeoutIdentifier, timeoutRegistration]) => {
      timeoutRegistrations.delete(timeoutIdentifier);
      timeoutRegistration.execute();
    });
  }

  return {
    advanceByMilliseconds(delayInMilliseconds: number): void {
      currentTimestampInMilliseconds += delayInMilliseconds;
      runDueTimeoutRegistrations();
    },

    clearInterval: globalThis.clearInterval.bind(globalThis),

    clearTimeout(timeoutIdentifier): void {
      timeoutRegistrations.delete(timeoutIdentifier as unknown as number);
    },

    get currentTimestampInMilliseconds() {
      return currentTimestampInMilliseconds;
    },

    setInterval: globalThis.setInterval.bind(globalThis),

    setTimeout(handler, delayInMilliseconds, ...handlerArguments) {
      const timeoutIdentifier = nextTimeoutIdentifier;
      nextTimeoutIdentifier += 1;

      timeoutRegistrations.set(timeoutIdentifier, {
        execute: () => {
          handler(...handlerArguments);
        },
        executionTimestampInMilliseconds: currentTimestampInMilliseconds + delayInMilliseconds,
      });

      return timeoutIdentifier as unknown as ReturnType<typeof globalThis.setTimeout>;
    },
  };
}

async function startEchoServer(): Promise<WebSocketServer> {
  const server = new WebSocketServer({host: '127.0.0.1', port: 0});
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
  await once(server, 'listening');
  return server;
}

/* eslint-disable jest/no-done-callback */

describe('ReconnectingWebsocket', () => {
  let server: WebSocketServer | undefined;
  let currentTimestampInMilliseconds = 1_000_000;
  const activeConnections: ReconnectingWebsocket[] = [];
  const testWallClock = {
    clearInterval: globalThis.clearInterval.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),

    get currentTimestampInMilliseconds() {
      return currentTimestampInMilliseconds;
    },

    setInterval: globalThis.setInterval.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };
  const defaultReconnectingWebsocketTestOptions = {
    backFromSleepHandler: Maybe.nothing(),
    pingInterval: Maybe.nothing<number>(),
    wallClock: testWallClock,
    websocketFactory: Maybe.nothing(),
  };

  const getServerAddress = () => {
    if (is.undefined(server) === false) {
      const address = server.address();
      if (is.nullOrUndefined(address) === true || is.string(address) === true) {
        throw new Error('Server address is unavailable');
      }
      return Promise.resolve(`ws://127.0.0.1:${address.port}`);
    }
    throw new Error('Server is undefined');
  };

  function createRWS(
    onReconnect: () => Promise<string>,
    options = defaultReconnectingWebsocketTestOptions,
  ): ReconnectingWebsocket {
    const rws = new ReconnectingWebsocket(onReconnect, options);
    activeConnections.push(rws);
    return rws;
  }

  beforeEach(async () => {
    currentTimestampInMilliseconds = 1_000_000;
    server = await startEchoServer();
  });

  afterEach(done => {
    // Cleanup all active connections
    activeConnections.forEach(rws => {
      try {
        rws.disconnect();
      } catch (e: unknown) {
        // Ignore errors during cleanup
      }
    });
    activeConnections.length = 0;

    if (is.undefined(server) === false) {
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

  it('reconnects in place when connect is called on an open socket', () => {
    const onReconnect = jest.fn().mockReturnValue(getServerAddress());
    const socket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.OPEN);
    const websocketFactory = jest.fn(() => {
      return socket;
    });
    const RWS = createRWS(onReconnect, {
      ...defaultReconnectingWebsocketTestOptions,
      websocketFactory: Maybe.just(websocketFactory),
    });

    RWS.connect();
    RWS.connect();

    expect(websocketFactory).toHaveBeenCalledTimes(1);
    expect(socket.reconnect).toHaveBeenCalledTimes(1);
    expect(socket.reconnect).toHaveBeenCalledWith(CloseEventCode.NORMAL_CLOSURE);
    expect(socket.close).not.toHaveBeenCalled();
    expect(RWS['socket']).toBe(socket);

    RWS.disconnect();
  });

  it('creates a fresh wrapper when connect is called on an existing closed socket', () => {
    const onReconnect = jest.fn().mockReturnValue(getServerAddress());
    const closedSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CLOSED);
    const nextSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
    const sockets = [closedSocket, nextSocket];
    const websocketFactory = jest.fn(() => {
      const socket = sockets[websocketFactory.mock.calls.length - 1];

      if (!socket) {
        throw new Error('Unexpected websocketFactory call');
      }

      return socket;
    });
    const RWS = createRWS(onReconnect, {
      ...defaultReconnectingWebsocketTestOptions,
      websocketFactory: Maybe.just(websocketFactory),
    });

    RWS.connect();
    expect(RWS['socket']).toBe(closedSocket);

    RWS.connect();

    expect(closedSocket.reconnect).not.toHaveBeenCalled();
    expect(websocketFactory).toHaveBeenCalledTimes(2);
    expect(RWS['socket']).toBe(nextSocket);
    expectSocketHandlersToBeBound(nextSocket);

    RWS.disconnect();
  });

  it('creates a fresh wrapper when reconnecting after disconnect left the existing socket closed', () => {
    const onReconnect = jest.fn().mockReturnValue(getServerAddress());
    const firstSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.OPEN);
    const secondSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
    const sockets = [firstSocket, secondSocket];
    const websocketFactory = jest.fn(() => {
      const socket = sockets[websocketFactory.mock.calls.length - 1];

      if (!socket) {
        throw new Error('Unexpected websocketFactory call');
      }

      return socket;
    });
    const RWS = createRWS(onReconnect, {
      ...defaultReconnectingWebsocketTestOptions,
      websocketFactory: Maybe.just(websocketFactory),
    });

    RWS.connect();
    RWS.disconnect();

    expect(firstSocket.close).toHaveBeenCalledWith(CloseEventCode.NORMAL_CLOSURE, 'Closed by client');
    expect(firstSocket.readyState).toBe(WEBSOCKET_STATE.CLOSED);

    RWS.connect();

    expect(firstSocket.reconnect).not.toHaveBeenCalled();
    expect(websocketFactory).toHaveBeenCalledTimes(2);
    expect(RWS['socket']).toBe(secondSocket);
    expectSocketHandlersToBeBound(secondSocket);

    RWS.disconnect();
  });

  describe('connecting watchdog', () => {
    const connectingTimeoutInMilliseconds = 20_000;

    function createSocketFactory(
      ...sockets: MockReconnectingWebsocketWrapper[]
    ): jest.Mock<MockReconnectingWebsocketWrapper, []> {
      const websocketFactory = jest.fn<MockReconnectingWebsocketWrapper, []>();

      sockets.forEach(socket => {
        websocketFactory.mockReturnValueOnce(socket);
      });

      return websocketFactory;
    }

    it('replaces the socket wrapper when it stays CONNECTING past the watchdog timeout', () => {
      const deterministicWallClock = createDeterministicTimeoutWallClock(0);
      const firstSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const secondSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const websocketFactory = createSocketFactory(firstSocket, secondSocket);
      const RWS = createRWS(jest.fn(), {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: deterministicWallClock,
        websocketFactory: Maybe.just(websocketFactory),
      });

      RWS.connect();

      deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds - 1);

      expect(websocketFactory).toHaveBeenCalledTimes(1);
      expect(RWS['socket']).toBe(firstSocket);
      expect(firstSocket.close).not.toHaveBeenCalled();

      deterministicWallClock.advanceByMilliseconds(1);

      expect(firstSocket.close).toHaveBeenCalledTimes(1);
      expect(firstSocket.close).toHaveBeenCalledWith(CloseEventCode.NORMAL_CLOSURE, 'Connecting timeout');
      expect(websocketFactory).toHaveBeenCalledTimes(2);
      expect(RWS['socket']).toBe(secondSocket);
      expectSocketHandlersToBeBound(secondSocket);
    });

    it('restarts the watchdog from internalOnReconnect after close stopped it', async () => {
      const deterministicWallClock = createDeterministicTimeoutWallClock(0);
      const firstSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const secondSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const websocketFactory = createSocketFactory(firstSocket, secondSocket);
      const RWS = createRWS(jest.fn().mockResolvedValue('ws://example.invalid'), {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: deterministicWallClock,
        websocketFactory: Maybe.just(websocketFactory),
      });

      RWS.connect();

      expect(RWS['connectingTimeoutId']).toBeDefined();

      firstSocket.onclose?.({code: CloseEventCode.NORMAL_CLOSURE, reason: 'closed', wasClean: true} as CloseEvent);

      expect(RWS['connectingTimeoutId']).toBeUndefined();

      firstSocket.readyState = WEBSOCKET_STATE.CONNECTING;
      await RWS['internalOnReconnect']();

      expect(RWS['connectingTimeoutId']).toBeDefined();

      deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds);

      expect(firstSocket.close).toHaveBeenCalledTimes(1);
      expect(firstSocket.close).toHaveBeenCalledWith(CloseEventCode.NORMAL_CLOSURE, 'Connecting timeout');
      expect(websocketFactory).toHaveBeenCalledTimes(2);
      expect(RWS['socket']).toBe(secondSocket);
    });

    it('does not throw when internalOnReconnect runs before a socket is assigned', async () => {
      const RWS = createRWS(jest.fn().mockResolvedValue('ws://example.invalid'));

      await expect(RWS['internalOnReconnect']()).resolves.toBe('ws://example.invalid');
    });

    it('starts the watchdog from internalOnReconnect before the socket becomes CONNECTING', async () => {
      const deterministicWallClock = createDeterministicTimeoutWallClock(0);
      const firstSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.OPEN);
      const secondSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const websocketFactory = createSocketFactory(firstSocket, secondSocket);
      const RWS = createRWS(jest.fn().mockResolvedValue('ws://example.invalid'), {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: deterministicWallClock,
        websocketFactory: Maybe.just(websocketFactory),
      });

      RWS.connect();
      firstSocket.onopen?.({type: 'open'} as Event);

      expect(RWS['connectingTimeoutId']).toBeUndefined();

      await RWS['internalOnReconnect']();

      expect(RWS['connectingTimeoutId']).toBeDefined();

      deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds);

      expect(firstSocket.close).not.toHaveBeenCalled();
      expect(websocketFactory).toHaveBeenCalledTimes(1);
      expect(RWS['socket']).toBe(firstSocket);
      expect(RWS['connectingTimeoutId']).toBeUndefined();
    });

    it('starts the watchdog when reconnecting in place', () => {
      const deterministicWallClock = createDeterministicTimeoutWallClock(0);
      const firstSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.OPEN);
      const secondSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const websocketFactory = createSocketFactory(firstSocket, secondSocket);
      firstSocket.reconnect.mockImplementation(() => {
        firstSocket.readyState = WEBSOCKET_STATE.CONNECTING;
      });
      const RWS = createRWS(jest.fn(), {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: deterministicWallClock,
        websocketFactory: Maybe.just(websocketFactory),
      });

      RWS.connect();
      firstSocket.onopen?.({type: 'open'} as Event);

      expect(RWS['connectingTimeoutId']).toBeUndefined();

      RWS.connect();

      expect(firstSocket.reconnect).toHaveBeenCalledTimes(1);
      expect(RWS['connectingTimeoutId']).toBeDefined();

      deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds);

      expect(firstSocket.close).toHaveBeenCalledTimes(1);
      expect(firstSocket.close).toHaveBeenCalledWith(CloseEventCode.NORMAL_CLOSURE, 'Connecting timeout');
      expect(websocketFactory).toHaveBeenCalledTimes(2);
      expect(RWS['socket']).toBe(secondSocket);
    });

    it('does not let repeated internalOnReconnect watchdog timers replace a newer socket wrapper', async () => {
      const deterministicWallClock = createDeterministicTimeoutWallClock(0);
      let shouldClearTimeout = true;
      const wallClockWithOptionalClear: DeterministicTimeoutWallClock = {
        advanceByMilliseconds: deterministicWallClock.advanceByMilliseconds,
        clearInterval: deterministicWallClock.clearInterval,
        clearTimeout(timeoutIdentifier): void {
          if (shouldClearTimeout) {
            deterministicWallClock.clearTimeout(timeoutIdentifier);
          }
        },
        get currentTimestampInMilliseconds() {
          return deterministicWallClock.currentTimestampInMilliseconds;
        },
        setInterval: deterministicWallClock.setInterval,
        setTimeout: deterministicWallClock.setTimeout,
      };
      const firstSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const secondSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const websocketFactory = createSocketFactory(firstSocket, secondSocket);
      const RWS = createRWS(jest.fn().mockResolvedValue('ws://example.invalid'), {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: wallClockWithOptionalClear,
        websocketFactory: Maybe.just(websocketFactory),
      });

      RWS.connect();
      firstSocket.onclose?.({code: CloseEventCode.NORMAL_CLOSURE, reason: 'closed', wasClean: true} as CloseEvent);
      firstSocket.readyState = WEBSOCKET_STATE.CONNECTING;
      shouldClearTimeout = false;

      await RWS['internalOnReconnect']();
      await RWS['internalOnReconnect']();

      deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds / 2);
      RWS['replaceSocketWrapper'](firstSocket, 'Manual replacement');

      deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds / 2);

      expect(firstSocket.close).toHaveBeenCalledTimes(1);
      expect(firstSocket.close).toHaveBeenCalledWith(CloseEventCode.NORMAL_CLOSURE, 'Manual replacement');
      expect(websocketFactory).toHaveBeenCalledTimes(2);
      expect(RWS['socket']).toBe(secondSocket);
    });

    it('clears the watchdog when a socket opens after internalOnReconnect', async () => {
      const deterministicWallClock = createDeterministicTimeoutWallClock(0);
      const firstSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const secondSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const websocketFactory = createSocketFactory(firstSocket, secondSocket);
      const RWS = createRWS(jest.fn().mockResolvedValue('ws://example.invalid'), {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: deterministicWallClock,
        websocketFactory: Maybe.just(websocketFactory),
      });

      RWS.connect();
      await RWS['internalOnReconnect']();
      firstSocket.readyState = WEBSOCKET_STATE.OPEN;
      firstSocket.onopen?.({type: 'open'} as Event);

      expect(RWS['connectingTimeoutId']).toBeUndefined();

      deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds);

      expect(websocketFactory).toHaveBeenCalledTimes(1);
      expect(firstSocket.close).not.toHaveBeenCalled();
      expect(RWS['socket']).toBe(firstSocket);
    });

    it('does not replace the socket wrapper if it opens before the watchdog timeout', () => {
      const deterministicWallClock = createDeterministicTimeoutWallClock(0);
      const socket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const websocketFactory = createSocketFactory(socket);
      const RWS = createRWS(jest.fn(), {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: deterministicWallClock,
        websocketFactory: Maybe.just(websocketFactory),
      });

      RWS.connect();
      socket.readyState = WEBSOCKET_STATE.OPEN;
      socket.onopen?.({type: 'open'} as Event);

      deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds);

      expect(websocketFactory).toHaveBeenCalledTimes(1);
      expect(socket.close).not.toHaveBeenCalled();
      expect(RWS['socket']).toBe(socket);
    });

    it('does not let a stale watchdog replace a newer socket wrapper', () => {
      const deterministicWallClock = createDeterministicTimeoutWallClock(0);
      const staleTimeoutWallClock: DeterministicTimeoutWallClock = {
        ...deterministicWallClock,
        clearTimeout: jest.fn(),
      };
      const firstSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const secondSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const websocketFactory = createSocketFactory(firstSocket, secondSocket);
      const RWS = createRWS(jest.fn(), {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: staleTimeoutWallClock,
        websocketFactory: Maybe.just(websocketFactory),
      });

      RWS.connect();
      deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds / 2);
      RWS['replaceSocketWrapper'](firstSocket, 'Manual replacement');

      deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds / 2);

      expect(firstSocket.close).toHaveBeenCalledTimes(1);
      expect(firstSocket.close).toHaveBeenCalledWith(CloseEventCode.NORMAL_CLOSURE, 'Manual replacement');
      expect(websocketFactory).toHaveBeenCalledTimes(2);
      expect(RWS['socket']).toBe(secondSocket);
    });

    it('clears the connecting watchdog on disconnect', () => {
      const deterministicWallClock = createDeterministicTimeoutWallClock(0);
      const firstSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const secondSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const websocketFactory = createSocketFactory(firstSocket, secondSocket);
      const RWS = createRWS(jest.fn(), {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: deterministicWallClock,
        websocketFactory: Maybe.just(websocketFactory),
      });

      RWS.connect();
      RWS.disconnect();
      deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds);

      expect(websocketFactory).toHaveBeenCalledTimes(1);
      expect(RWS['socket']).toBe(firstSocket);
    });

    it('creates a fresh socket wrapper when closing the stale CONNECTING wrapper fails', () => {
      const deterministicWallClock = createDeterministicTimeoutWallClock(0);
      const firstSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const secondSocket = createMockReconnectingWebsocketWrapper(WEBSOCKET_STATE.CONNECTING);
      const websocketFactory = createSocketFactory(firstSocket, secondSocket);
      const RWS = createRWS(jest.fn(), {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: deterministicWallClock,
        websocketFactory: Maybe.just(websocketFactory),
      });
      firstSocket.close.mockImplementation(() => {
        throw new Error('close failed');
      });

      RWS.connect();

      expect(() => deterministicWallClock.advanceByMilliseconds(connectingTimeoutInMilliseconds)).not.toThrow();
      expect(firstSocket.close).toHaveBeenCalledTimes(1);
      expect(websocketFactory).toHaveBeenCalledTimes(2);
      expect(RWS['socket']).toBe(secondSocket);
    });
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

    it('returns false when socket is in CLOSED state', async () => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      // Inject a mock socket in CLOSED state (distinct from CONNECTING/CLOSING which return true)
      RWS['socket'] = {
        readyState: WEBSOCKET_STATE.CLOSED,
        close: jest.fn(),
        send: jest.fn(),
        reconnect: jest.fn(),
        onmessage: undefined,
        onerror: undefined,
        onopen: undefined,
        onclose: undefined,
      } as any;

      const result = await RWS.checkHealth();

      expect(result).toBe(false);
    });

    it('returns true and skips ping when socket is CONNECTING (transitioning guard)', async () => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);
      const sendSpy = jest.spyOn(RWS, 'send');

      // Inject a mock socket in CONNECTING state
      RWS['socket'] = {
        readyState: WEBSOCKET_STATE.CONNECTING,
        close: jest.fn(),
        send: jest.fn(),
        reconnect: jest.fn(),
        onmessage: undefined,
        onerror: undefined,
        onopen: undefined,
        onclose: undefined,
      } as any;

      const result = await RWS.checkHealth();

      expect(result).toBe(true);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('returns true and skips ping when socket is CLOSING (transitioning guard)', async () => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);
      const sendSpy = jest.spyOn(RWS, 'send');

      // Inject a mock socket in CLOSING state
      RWS['socket'] = {
        readyState: WEBSOCKET_STATE.CLOSING,
        close: jest.fn(),
        send: jest.fn(),
        reconnect: jest.fn(),
        onmessage: undefined,
        onerror: undefined,
        onopen: undefined,
        onclose: undefined,
      } as any;

      const result = await RWS.checkHealth();

      expect(result).toBe(true);
      expect(sendSpy).not.toHaveBeenCalled();
    });

    it('returns true when pong is received before timeout', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect);

      RWS.setOnOpen(async () => {
        // Mock the socket to respond with pong
        const originalSend = RWS.send.bind(RWS);
        RWS.send = jest.fn((message: string | Uint8Array) => {
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
      const deterministicWallClock = createDeterministicTimeoutWallClock(currentTimestampInMilliseconds);
      const RWS = createRWS(onReconnect, {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: deterministicWallClock,
      });

      RWS.setOnOpen(async () => {
        RWS.send = jest.fn();

        const resultPromise = RWS.checkHealth();

        let hasResolvedBeforeDefaultTimeout = false;
        resultPromise.then(() => {
          hasResolvedBeforeDefaultTimeout = true;
        });

        deterministicWallClock.advanceByMilliseconds(9_999);
        await Promise.resolve();

        expect(hasResolvedBeforeDefaultTimeout).toBe(false);

        deterministicWallClock.advanceByMilliseconds(1);
        const result = await resultPromise;

        expect(result).toBe(false);

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
        RWS.send = jest.fn((message: string | Uint8Array) => {
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
      const clearHealthCheckTimeout = jest.fn(globalThis.clearTimeout.bind(globalThis));
      const RWS = createRWS(onReconnect, {
        ...defaultReconnectingWebsocketTestOptions,
        wallClock: {
          ...testWallClock,
          clearTimeout: clearHealthCheckTimeout,
        },
      });

      RWS.setOnOpen(async () => {
        const originalSend = RWS.send.bind(RWS);

        RWS.send = jest.fn((message: string | Uint8Array) => {
          originalSend(message);
          if (message === PingMessage.PING) {
            setTimeout(() => {
              RWS['internalOnMessage']({data: Buffer.from(PingMessage.PONG)} as MessageEvent);
            }, 100);
          }
        });

        await RWS.checkHealth(1000);

        // clearTimeout should have been called when pong was received
        expect(clearHealthCheckTimeout).toHaveBeenCalled();

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
        RWS['lastMessageTimestamp'] = currentTimestampInMilliseconds - 1_000;

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
        RWS['lastMessageTimestamp'] = currentTimestampInMilliseconds - 6_000;

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
        expect(updatedTimestamp).toBe(currentTimestampInMilliseconds);

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
        RWS['lastMessageTimestamp'] = currentTimestampInMilliseconds - 500;

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
        RWS['lastMessageTimestamp'] = currentTimestampInMilliseconds - 10_000;

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
            RWS['lastMessageTimestamp'] = currentTimestampInMilliseconds - 1_000;
            let result = await RWS.checkHealth(1000);
            expect(result).toBe(true);
            expect(sendSpy).not.toHaveBeenCalled();
            sendSpy.mockClear();

            // Test 2: Idle - should send ping
            RWS['lastMessageTimestamp'] = currentTimestampInMilliseconds - 6_000;
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
          } catch (error: unknown) {
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
      const RWS = createRWS(onReconnect, {
        backFromSleepHandler: Maybe.nothing(),
        pingInterval: Maybe.just(customInterval),
        wallClock: testWallClock,
        websocketFactory: Maybe.nothing(),
      });

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
      const RWS = createRWS(onReconnect, {
        backFromSleepHandler: Maybe.nothing(),
        pingInterval: Maybe.just(200),
        wallClock: testWallClock,
        websocketFactory: Maybe.nothing(),
      });

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

    it('triggers reconnect after unanswered ping timeout', done => {
      const onReconnect = jest.fn().mockReturnValue(getServerAddress());
      const RWS = createRWS(onReconnect, {
        backFromSleepHandler: Maybe.nothing(),
        pingInterval: Maybe.just(100),
        wallClock: testWallClock,
        websocketFactory: Maybe.nothing(),
      });

      RWS.setOnOpen(() => {
        const reconnectSpy = jest.spyOn(RWS['socket']!, 'reconnect');
        RWS['hasUnansweredPing'] = true;
        setTimeout(() => {
          RWS['sendPing']();
          expect(reconnectSpy).toHaveBeenCalledTimes(1);
          RWS.disconnect();
        }, 50);
      });

      RWS.setOnClose(() => {
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
