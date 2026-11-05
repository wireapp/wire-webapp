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

import {Runtime} from '@wireapp/commons';
import {Account, ConnectionState} from '@wireapp/core';

import {Warnings} from '../../view_model/WarningsContainer';
import {EventRepository} from './EventRepository';
import {NOTIFICATION_HANDLING_STATE} from './NotificationHandlingState';

type RepositoryInputs = ConstructorParameters<typeof EventRepository>;
type ListenOptions = Parameters<Account['listen']>[0];

function noop(): void {}

async function flushConnectionCallbacks(): Promise<void> {
  await new Promise<void>(resolve => {
    setTimeout(resolve, 0);
  });
}

describe('WebSocket recovery orchestration', () => {
  let repository: EventRepository;
  let connectionStateChanged: ((state: ConnectionState) => void) | undefined;
  let heartbeat: (() => void) | undefined;
  const disconnect = jest.fn();
  const listen = jest.fn<Promise<() => void>, [ListenOptions]>();
  const isWebsocketHealthy = jest.fn<Promise<boolean>, []>();
  const account = {listen, isWebsocketHealthy} as unknown as Account;

  beforeEach(() => {
    connectionStateChanged = undefined;
    heartbeat = undefined;
    disconnect.mockReset();
    listen.mockReset().mockImplementation(async options => {
      connectionStateChanged = options.onConnectionStateChanged;

      return disconnect;
    });
    isWebsocketHealthy.mockReset().mockResolvedValue(true);
    jest.spyOn(Runtime, 'isElectron').mockReturnValue(false);
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    jest.spyOn(window, 'setInterval').mockImplementation(callback => {
      if (typeof callback !== 'function') {
        throw new Error('Expected heartbeat callback');
      }
      heartbeat = callback as () => void;

      return 123;
    });
    jest.spyOn(window, 'clearInterval');
    jest.spyOn(Warnings, 'showWarning').mockImplementation(noop);
    jest.spyOn(Warnings, 'hideWarning').mockImplementation(noop);
    repository = new EventRepository(
      {} as RepositoryInputs[0],
      {getServerTime: jest.fn().mockResolvedValue('2026-01-01T00:00:00Z')} as unknown as RepositoryInputs[1],
      {computeTimeOffset: noop} as unknown as RepositoryInputs[2],
      {} as RepositoryInputs[3],
    );
  });

  afterEach(() => {
    repository.disconnectWebSocket();
    jest.restoreAllMocks();
  });

  function setConnectionState(state: ConnectionState): void {
    if (connectionStateChanged === undefined) {
      throw new Error('Expected connection-state subscription');
    }
    connectionStateChanged(state);
  }

  function runHeartbeat(): void {
    if (heartbeat === undefined) {
      throw new Error('Expected registered heartbeat');
    }
    heartbeat();
  }

  async function connect(): Promise<void> {
    await repository.connectWebSocket(account, true, noop);
    setConnectionState(ConnectionState.LIVE);
    listen.mockClear();
  }

  it('reconnects a CLOSED connection without probing it', async () => {
    await connect();
    setConnectionState(ConnectionState.CLOSED);

    document.dispatchEvent(new Event('visibilitychange'));
    await flushConnectionCallbacks();

    expect(repository.notificationHandlingState()).toBe(NOTIFICATION_HANDLING_STATE.CLOSED);
    expect(isWebsocketHealthy).not.toHaveBeenCalled();
    expect(listen).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it.each([ConnectionState.CONNECTING, ConnectionState.PROCESSING_NOTIFICATIONS])(
    'does not interrupt a connection in %s',
    async state => {
      await connect();
      setConnectionState(state);

      runHeartbeat();
      document.dispatchEvent(new Event('visibilitychange'));
      await flushConnectionCallbacks();

      expect(isWebsocketHealthy).not.toHaveBeenCalled();
      expect(listen).not.toHaveBeenCalled();
    },
  );

  it('reconnects an unhealthy connection on heartbeat', async () => {
    await connect();
    isWebsocketHealthy.mockResolvedValue(false);

    runHeartbeat();
    await flushConnectionCallbacks();

    expect(isWebsocketHealthy).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledTimes(1);
  });

  it('keeps a healthy connection when the tab becomes visible', async () => {
    await connect();

    document.dispatchEvent(new Event('visibilitychange'));
    await flushConnectionCallbacks();

    expect(isWebsocketHealthy).toHaveBeenCalledTimes(1);
    expect(listen).not.toHaveBeenCalled();
  });

  it('recovers when the health probe rejects', async () => {
    await connect();
    isWebsocketHealthy.mockRejectedValue(new Error('Probe failed'));

    runHeartbeat();
    await flushConnectionCallbacks();

    expect(listen).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent visibility and heartbeat health checks', async () => {
    await connect();
    let resolveHealthCheck: ((healthy: boolean) => void) | undefined;
    isWebsocketHealthy.mockReturnValue(
      new Promise<boolean>(resolve => {
        resolveHealthCheck = resolve;
      }),
    );

    document.dispatchEvent(new Event('visibilitychange'));
    runHeartbeat();
    document.dispatchEvent(new Event('visibilitychange'));
    if (resolveHealthCheck === undefined) {
      throw new Error('Expected pending health check');
    }
    resolveHealthCheck(false);
    await flushConnectionCallbacks();

    expect(isWebsocketHealthy).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledTimes(1);
  });

  it('uses focus recovery in Electron', async () => {
    jest.spyOn(Runtime, 'isElectron').mockReturnValue(true);
    await connect();
    isWebsocketHealthy.mockResolvedValue(false);

    window.dispatchEvent(new Event('focus'));
    await flushConnectionCallbacks();

    expect(listen).toHaveBeenCalledTimes(1);
  });

  it('does not reconnect while offline', async () => {
    await connect();
    jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    runHeartbeat();
    window.dispatchEvent(new Event('online'));
    await flushConnectionCallbacks();

    expect(isWebsocketHealthy).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
  });

  it('removes event subscriptions and heartbeat on disconnect', async () => {
    await connect();
    repository.disconnectWebSocket();
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
    await flushConnectionCallbacks();

    expect(window.clearInterval).toHaveBeenCalledWith(123);
    expect(listen).not.toHaveBeenCalled();
    expect(isWebsocketHealthy).not.toHaveBeenCalled();
  });
});
