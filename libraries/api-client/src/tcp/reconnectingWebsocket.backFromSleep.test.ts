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

import {CloseEvent, ErrorEvent, Event} from 'reconnecting-websocket';
import {Maybe} from 'true-myth';

import {ReconnectingWebsocket, WEBSOCKET_STATE} from './reconnectingWebsocket';

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

function createTestWallClock(currentTimestampInMilliseconds: number) {
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

  it('reconnects in place when back from sleep is detected while the socket is OPEN', () => {
    const {backFromSleepHandler, registrations} = createBackFromSleepHandlerTestDependencies();
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
    websocket['hasUnansweredPing'] = true;

    getLatestBackFromSleepRegistration(registrations).callback();

    expect(socket.reconnect).toHaveBeenCalledTimes(1);
    expect(websocket['socket']).toBe(socket);
    expect(websocket['hasUnansweredPing']).toBe(false);
  });

  it('reconnects in place when back from sleep is detected while the socket is CLOSED', () => {
    const {backFromSleepHandler, registrations} = createBackFromSleepHandlerTestDependencies();
    const socket = createMockSocket(WEBSOCKET_STATE.CLOSED);
    const websocket = new ReconnectingWebsocket(jest.fn(), {
      backFromSleepHandler: Maybe.just(backFromSleepHandler),
      pingInterval: Maybe.nothing(),
      wallClock: createTestWallClock(0),
      websocketFactory: Maybe.just(() => {
        return socket;
      }),
    });
    websocket.connect();

    getLatestBackFromSleepRegistration(registrations).callback();

    expect(socket.reconnect).toHaveBeenCalledTimes(1);
    expect(websocket['socket']).toBe(socket);
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
