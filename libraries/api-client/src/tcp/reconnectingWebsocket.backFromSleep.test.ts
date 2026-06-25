/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import type {CloseEvent, ErrorEvent} from 'partysocket/ws';
import {Maybe} from 'true-myth';

import {
  CloseEventCode,
  ReconnectingWebsocket,
  ReconnectingWebsocketWallClock,
  WEBSOCKET_STATE,
} from './reconnectingWebsocket';

type BackFromSleepRegistrationWithoutDisconnectedGate = {
  readonly callback: () => void;
};

type BackFromSleepRegistrationWithDisconnectedGate = {
  readonly callback: () => void;
  readonly isDisconnected: () => boolean;
};

type BackFromSleepRegistration =
  | BackFromSleepRegistrationWithoutDisconnectedGate
  | BackFromSleepRegistrationWithDisconnectedGate;

type BackFromSleepHandlerTestDependencies = {
  readonly backFromSleepHandler: jest.Mock<() => void, [BackFromSleepRegistration]>;
  readonly registrations: BackFromSleepRegistration[];
  readonly stopBackFromSleepHandler: jest.Mock;
};

type MockSocket = {
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

type MockWebsocketFactory = jest.Mock<MockSocket, []>;

function createTestWallClock(currentTimestampInMilliseconds: number): ReconnectingWebsocketWallClock {
  return {
    clearInterval: globalThis.clearInterval.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),

    get currentTimestampInMilliseconds() {
      return currentTimestampInMilliseconds;
    },

    setInterval: globalThis.setInterval.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };
}

function expectSocketHandlersToBeBound(socket: MockSocket): void {
  expect(socket.onclose).toEqual(expect.any(Function));
  expect(socket.onerror).toEqual(expect.any(Function));
  expect(socket.onmessage).toEqual(expect.any(Function));
  expect(socket.onopen).toEqual(expect.any(Function));
}

function createMockSocket(readyState: WEBSOCKET_STATE): MockSocket {
  return {
    binaryType: 'blob',
    close: jest.fn(),
    onclose: null,
    onerror: null,
    onmessage: null,
    onopen: null,
    readyState,
    reconnect: jest.fn(),
    send: jest.fn(),
  };
}

function createMockWebsocketFactory(...sockets: MockSocket[]): MockWebsocketFactory {
  const websocketFactory = jest.fn<MockSocket, []>();

  sockets.forEach(socket => {
    websocketFactory.mockReturnValueOnce(socket);
  });

  return websocketFactory;
}

function createBackFromSleepHandlerTestDependencies(): BackFromSleepHandlerTestDependencies {
  const registrations: BackFromSleepRegistration[] = [];
  const stopBackFromSleepHandler = jest.fn();
  const backFromSleepHandler = jest.fn((registration: BackFromSleepRegistration) => {
    registrations.push(registration);
    return stopBackFromSleepHandler;
  });

  return {
    backFromSleepHandler,
    registrations,
    stopBackFromSleepHandler,
  };
}

function getLatestBackFromSleepRegistration(registrations: BackFromSleepRegistration[]): BackFromSleepRegistration {
  const latestRegistration = registrations[registrations.length - 1];

  if (!latestRegistration) {
    throw new Error('Expected onBackFromSleep to have been called');
  }

  return latestRegistration;
}

describe('ReconnectingWebsocket back from sleep handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers onBackFromSleep without an isDisconnected gate', () => {
    const {backFromSleepHandler, registrations} = createBackFromSleepHandlerTestDependencies();

    new ReconnectingWebsocket(jest.fn(), {
      backFromSleepHandler: Maybe.just(backFromSleepHandler),
      pingInterval: Maybe.nothing(),
      wallClock: createTestWallClock(0),
      websocketFactory: Maybe.nothing(),
    });

    expect(backFromSleepHandler).toHaveBeenCalledTimes(1);
    expect(getLatestBackFromSleepRegistration(registrations)).not.toHaveProperty('isDisconnected');
  });

  it('replaces the socket wrapper when back from sleep is detected while the socket is OPEN', () => {
    const {backFromSleepHandler, registrations} = createBackFromSleepHandlerTestDependencies();
    const oldSocket = createMockSocket(WEBSOCKET_STATE.OPEN);
    const newSocket = createMockSocket(WEBSOCKET_STATE.CONNECTING);
    const websocketFactory = createMockWebsocketFactory(oldSocket, newSocket);
    const websocket = new ReconnectingWebsocket(jest.fn(), {
      backFromSleepHandler: Maybe.just(backFromSleepHandler),
      pingInterval: Maybe.nothing(),
      wallClock: createTestWallClock(0),
      websocketFactory: Maybe.just(websocketFactory),
    });
    websocket.connect();
    websocket['hasUnansweredPing'] = true;

    getLatestBackFromSleepRegistration(registrations).callback();

    expect(oldSocket.close).toHaveBeenCalledTimes(1);
    expect(oldSocket.close).toHaveBeenCalledWith(CloseEventCode.NORMAL_CLOSURE, 'Back from sleep');
    expect(oldSocket.reconnect).not.toHaveBeenCalled();
    expect(websocketFactory).toHaveBeenCalledTimes(2);
    expect(websocket['socket']).toBe(newSocket);
    expectSocketHandlersToBeBound(newSocket);
    expect(websocket['hasUnansweredPing']).toBe(false);
  });

  it('replaces the socket wrapper when back from sleep is detected while the socket is CLOSED', () => {
    const {backFromSleepHandler, registrations} = createBackFromSleepHandlerTestDependencies();
    const oldSocket = createMockSocket(WEBSOCKET_STATE.CLOSED);
    const newSocket = createMockSocket(WEBSOCKET_STATE.CONNECTING);
    const websocketFactory = createMockWebsocketFactory(oldSocket, newSocket);
    const websocket = new ReconnectingWebsocket(jest.fn(), {
      backFromSleepHandler: Maybe.just(backFromSleepHandler),
      pingInterval: Maybe.nothing(),
      wallClock: createTestWallClock(0),
      websocketFactory: Maybe.just(websocketFactory),
    });
    websocket.connect();

    getLatestBackFromSleepRegistration(registrations).callback();

    expect(oldSocket.close).toHaveBeenCalledTimes(1);
    expect(oldSocket.close).toHaveBeenCalledWith(CloseEventCode.NORMAL_CLOSURE, 'Back from sleep');
    expect(oldSocket.reconnect).not.toHaveBeenCalled();
    expect(websocketFactory).toHaveBeenCalledTimes(2);
    expect(websocket['socket']).toBe(newSocket);
  });

  it('replaces the socket wrapper when closing the stale socket after wake fails', () => {
    const {backFromSleepHandler, registrations} = createBackFromSleepHandlerTestDependencies();
    const closeError = new Error('close failed');
    const oldSocket = createMockSocket(WEBSOCKET_STATE.CLOSED);
    const newSocket = createMockSocket(WEBSOCKET_STATE.CONNECTING);
    const websocketFactory = createMockWebsocketFactory(oldSocket, newSocket);
    const websocket = new ReconnectingWebsocket(jest.fn(), {
      backFromSleepHandler: Maybe.just(backFromSleepHandler),
      pingInterval: Maybe.nothing(),
      wallClock: createTestWallClock(0),
      websocketFactory: Maybe.just(websocketFactory),
    });
    oldSocket.close.mockImplementation(() => {
      throw closeError;
    });
    websocket.connect();

    expect(() => getLatestBackFromSleepRegistration(registrations).callback()).not.toThrow();

    expect(oldSocket.close).toHaveBeenCalledTimes(1);
    expect(oldSocket.reconnect).not.toHaveBeenCalled();
    expect(websocketFactory).toHaveBeenCalledTimes(2);
    expect(websocket['socket']).toBe(newSocket);
  });

  it('ignores late events from the stale socket after back-from-sleep replacement', () => {
    const {backFromSleepHandler, registrations} = createBackFromSleepHandlerTestDependencies();
    const oldSocket = createMockSocket(WEBSOCKET_STATE.OPEN);
    const newSocket = createMockSocket(WEBSOCKET_STATE.CONNECTING);
    const websocketFactory = createMockWebsocketFactory(oldSocket, newSocket);
    const onOpen = jest.fn();
    const onMessage = jest.fn();
    const openEvent = {type: 'open'} as Event;
    const staleMessage = {data: Buffer.from('stale message', 'utf-8')} as MessageEvent;
    const activeMessage = {data: Buffer.from('active message', 'utf-8')} as MessageEvent;
    const websocket = new ReconnectingWebsocket(jest.fn(), {
      backFromSleepHandler: Maybe.just(backFromSleepHandler),
      pingInterval: Maybe.nothing(),
      wallClock: createTestWallClock(0),
      websocketFactory: Maybe.just(websocketFactory),
    });
    websocket.setOnOpen(onOpen);
    websocket.setOnMessage(onMessage);
    websocket.connect();

    getLatestBackFromSleepRegistration(registrations).callback();
    oldSocket.onopen?.(openEvent);
    oldSocket.onmessage?.(staleMessage);

    expect(onOpen).not.toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();

    newSocket.onopen?.(openEvent);
    newSocket.onmessage?.(activeMessage);

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledWith('active message');
  });

  it('does not throw or reconnect when back from sleep is detected without a socket instance', () => {
    const {backFromSleepHandler, registrations} = createBackFromSleepHandlerTestDependencies();
    new ReconnectingWebsocket(jest.fn(), {
      backFromSleepHandler: Maybe.just(backFromSleepHandler),
      pingInterval: Maybe.nothing(),
      wallClock: createTestWallClock(0),
      websocketFactory: Maybe.nothing(),
    });

    expect(() => getLatestBackFromSleepRegistration(registrations).callback()).not.toThrow();
  });

  it('restarts the sleep handler after disconnect and does not register duplicates while active', () => {
    const {backFromSleepHandler, stopBackFromSleepHandler} = createBackFromSleepHandlerTestDependencies();
    const socket = createMockSocket(WEBSOCKET_STATE.OPEN);
    const websocket = new ReconnectingWebsocket(jest.fn(), {
      backFromSleepHandler: Maybe.just(backFromSleepHandler),
      pingInterval: Maybe.nothing(),
      wallClock: createTestWallClock(0),
      websocketFactory: Maybe.just(() => {
        return socket;
      }),
    });

    websocket.connect();

    expect(backFromSleepHandler).toHaveBeenCalledTimes(1);

    websocket.disconnect();

    expect(stopBackFromSleepHandler).toHaveBeenCalledTimes(1);

    socket.readyState = WEBSOCKET_STATE.CLOSED;
    websocket.connect();
    websocket.connect();

    expect(backFromSleepHandler).toHaveBeenCalledTimes(2);
    expect(stopBackFromSleepHandler).toHaveBeenCalledTimes(1);

    websocket.disconnect();
  });
});
