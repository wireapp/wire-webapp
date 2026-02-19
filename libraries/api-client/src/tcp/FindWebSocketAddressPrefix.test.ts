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

import assert from 'node:assert';

import {findWebSocketAddressPrefix, FindWebSocketAddressPrefixOptions} from './FindWebSocketAddressPrefix';

type FakeSocket = {
  close: jest.Mock;
  onopen: (() => void) | null;
  onerror: (() => void) | null;
};

type FakeWebSocketFactory = {
  fakeWebSocket: jest.Mock;
  closeFunction: jest.Mock;
};

type DependencyOverrides = {
  webSocket?: jest.Mock;
  baseUrl?: string;
  queryString?: string;
  connectionTimeoutInMilliseconds?: number;
};

function createFakeWebSocketThatOpens(): FakeWebSocketFactory {
  const closeFunction = jest.fn();
  const fakeWebSocket = jest.fn().mockImplementation(() => {
    const socket: FakeSocket = {close: closeFunction, onopen: null, onerror: null};
    setTimeout(() => socket.onopen?.(), 0);
    return socket;
  });
  return {fakeWebSocket, closeFunction};
}

function createFakeWebSocketThatErrors(): FakeWebSocketFactory {
  const closeFunction = jest.fn();
  const fakeWebSocket = jest.fn().mockImplementation(() => {
    const socket: FakeSocket = {close: closeFunction, onopen: null, onerror: null};
    setTimeout(() => socket.onerror?.(), 0);
    return socket;
  });
  return {fakeWebSocket, closeFunction};
}

function createFakeWebSocketThatNeverConnects(): FakeWebSocketFactory {
  const closeFunction = jest.fn();
  const fakeWebSocket = jest.fn().mockImplementation(() => {
    const socket: FakeSocket = {close: closeFunction, onopen: null, onerror: null};
    return socket;
  });
  return {fakeWebSocket, closeFunction};
}

function createFakeWebSocketThatThrows(): jest.Mock {
  return jest.fn(() => {
    throw new Error('WebSocket constructor failed');
  });
}

function createDependencies(overrides: DependencyOverrides = {}): FindWebSocketAddressPrefixOptions {
  return {
    baseUrl: overrides.baseUrl ?? 'http://localhost:3000',
    queryString: overrides.queryString ?? 'test=1',
    webSocket: (overrides.webSocket ?? jest.fn()) as unknown as typeof WebSocket,
    connectionTimeoutInMilliseconds: overrides.connectionTimeoutInMilliseconds ?? 5000,
  };
}

describe('findWebSocketAddressPrefix', () => {
  it('returns Ok when the connection opens successfully', async () => {
    const {fakeWebSocket} = createFakeWebSocketThatOpens();
    const dependencies = createDependencies({webSocket: fakeWebSocket});

    const result = await findWebSocketAddressPrefix(dependencies);

    assert(result.isOk);
  });

  it('returns Err when the websocket fires onerror', async () => {
    const {fakeWebSocket} = createFakeWebSocketThatErrors();
    const dependencies = createDependencies({webSocket: fakeWebSocket});

    const result = await findWebSocketAddressPrefix(dependencies);

    assert(result.isErr);
  });

  it('returns Err when the WebSocket constructor throws', async () => {
    const fakeWebSocket = createFakeWebSocketThatThrows();
    const dependencies = createDependencies({webSocket: fakeWebSocket});

    const result = await findWebSocketAddressPrefix(dependencies);

    assert(result.isErr);
  });

  it('returns Err when the connection times out', async () => {
    const {fakeWebSocket} = createFakeWebSocketThatNeverConnects();
    const dependencies = createDependencies({
      webSocket: fakeWebSocket,
      connectionTimeoutInMilliseconds: 50,
    });

    const result = await findWebSocketAddressPrefix(dependencies);

    assert(result.isErr);
  });

  it('constructs the websocket URL from baseUrl and queryString', async () => {
    const {fakeWebSocket} = createFakeWebSocketThatOpens();
    const dependencies = createDependencies({
      webSocket: fakeWebSocket,
      baseUrl: 'https://prod.example.com',
      queryString: 'client=abc123',
    });

    await findWebSocketAddressPrefix(dependencies);

    expect(fakeWebSocket).toHaveBeenCalledWith('https://prod.example.com/websocket?client=abc123');
  });

  it('passes different query strings correctly in the URL', async () => {
    const {fakeWebSocket} = createFakeWebSocketThatOpens();
    const dependencies = createDependencies({
      webSocket: fakeWebSocket,
      baseUrl: 'http://localhost:8080',
      queryString: 'foo=bar&baz=qux',
    });

    await findWebSocketAddressPrefix(dependencies);

    expect(fakeWebSocket).toHaveBeenCalledWith('http://localhost:8080/websocket?foo=bar&baz=qux');
  });

  it('handles an empty query string', async () => {
    const {fakeWebSocket} = createFakeWebSocketThatOpens();
    const dependencies = createDependencies({
      webSocket: fakeWebSocket,
      queryString: '',
    });

    await findWebSocketAddressPrefix(dependencies);

    expect(fakeWebSocket).toHaveBeenCalledWith('http://localhost:3000/websocket?');
  });

  it('closes the socket after a successful connection', async () => {
    const {fakeWebSocket, closeFunction} = createFakeWebSocketThatOpens();
    const dependencies = createDependencies({webSocket: fakeWebSocket});

    await findWebSocketAddressPrefix(dependencies);

    expect(closeFunction).toHaveBeenCalledTimes(1);
  });

  it('does not close the socket when it errors (socket never opened)', async () => {
    const {fakeWebSocket, closeFunction} = createFakeWebSocketThatErrors();
    const dependencies = createDependencies({webSocket: fakeWebSocket});

    await findWebSocketAddressPrefix(dependencies);

    expect(closeFunction).not.toHaveBeenCalled();
  });

  it('instantiates the websocket exactly once per call', async () => {
    const {fakeWebSocket} = createFakeWebSocketThatOpens();
    const dependencies = createDependencies({webSocket: fakeWebSocket});

    await findWebSocketAddressPrefix(dependencies);

    expect(fakeWebSocket).toHaveBeenCalledTimes(1);
  });

  it('Ok result value is void on success', async () => {
    const {fakeWebSocket} = createFakeWebSocketThatOpens();
    const dependencies = createDependencies({webSocket: fakeWebSocket});

    const result = await findWebSocketAddressPrefix(dependencies);

    assert(result.isOk);
    expect(result.value).toBeUndefined();
  });

  it('succeeds if the connection opens before the timeout', async () => {
    const {fakeWebSocket} = createFakeWebSocketThatOpens();
    const dependencies = createDependencies({
      webSocket: fakeWebSocket,
      connectionTimeoutInMilliseconds: 5000,
    });

    const result = await findWebSocketAddressPrefix(dependencies);

    assert(result.isOk);
  });

  it('returns Err with a TimeoutError when the connection is too slow', async () => {
    const closeFunction = jest.fn();
    const fakeWebSocket = jest.fn().mockImplementation(() => {
      const socket: FakeSocket = {close: closeFunction, onopen: null, onerror: null};
      setTimeout(() => socket.onopen?.(), 10_000);
      return socket;
    });
    const dependencies = createDependencies({
      webSocket: fakeWebSocket,
      connectionTimeoutInMilliseconds: 50,
    });

    const result = await findWebSocketAddressPrefix(dependencies);

    assert(result.isErr);
    expect((result.error as Error).name).toBe('TimeoutError');
  });

  it('can be called multiple times independently', async () => {
    const {fakeWebSocket: fakeWebSocket1} = createFakeWebSocketThatOpens();
    const {fakeWebSocket: fakeWebSocket2} = createFakeWebSocketThatErrors();

    const result1 = await findWebSocketAddressPrefix(createDependencies({webSocket: fakeWebSocket1}));
    const result2 = await findWebSocketAddressPrefix(createDependencies({webSocket: fakeWebSocket2}));

    assert(result1.isOk);
    assert(result2.isErr);
  });
});
