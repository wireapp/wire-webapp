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
import {Account, ConnectionState, WebSocketConnectionContext} from '@wireapp/core';
import {InvalidTokenError} from '@wireapp/api-client/lib/auth';
import {BackendError} from '@wireapp/api-client/lib/http';

import {Warnings} from '../../view_model/WarningsContainer';
import {EventRepository} from './EventRepository';
import {NOTIFICATION_HANDLING_STATE} from './NotificationHandlingState';

type RepositoryInputs = ConstructorParameters<typeof EventRepository>;
type ListenOptions = Parameters<Account['listen']>[0];

function noop(): void {}

async function flushConnectionCallbacks(): Promise<void> {
  for (let turn = 0; turn < 20; turn += 1) {
    await Promise.resolve();
  }
}

describe('WebSocket recovery orchestration', () => {
  let repository: EventRepository;
  let connectionStateChanged: ((state: ConnectionState, context?: WebSocketConnectionContext) => void) | undefined;
  let heartbeat: (() => void) | undefined;
  let automaticallySynchronize = true;
  let readinessDeadline: (() => void) | undefined;
  const clearReadinessTimeout = jest.fn();
  const disconnect = jest.fn();
  const listen = jest.fn<Promise<() => void>, [ListenOptions]>();
  const isWebsocketHealthy = jest.fn<Promise<boolean>, []>();
  const account = {listen, isWebsocketHealthy} as unknown as Account;

  beforeEach(() => {
    clearReadinessTimeout.mockClear();
    connectionStateChanged = undefined;
    heartbeat = undefined;
    automaticallySynchronize = true;
    disconnect.mockReset();
    listen.mockReset().mockImplementation(async options => {
      connectionStateChanged = options.onConnectionStateChanged;
      if (automaticallySynchronize === true) {
        connectionStateChanged?.(ConnectionState.LIVE);
      }

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
      {
        setTimeout(callback): number { readinessDeadline = callback; return 456; },
        clearTimeout: clearReadinessTimeout,
      },
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
    automaticallySynchronize = false;
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
  it('correlates application recovery cycles with the transport context', async () => {
    const information = jest.spyOn(repository.logger, 'info');
    await connect();
    connectionStateChanged?.(ConnectionState.CLOSED, {attemptId: 12, wrapperGeneration: 4});
    runHeartbeat();
    await flushConnectionCallbacks();

    expect(information).toHaveBeenCalledWith(expect.stringContaining('connectCycleId=1 state=CLOSED attemptId=12 wrapperGeneration=4'));
    expect(information).toHaveBeenCalledWith(expect.stringContaining('event=connect-start trigger=heartbeat-closed connectCycleId=2'));
    expect(listen).toHaveBeenCalledTimes(1);
  });

  it('logs setup failures without serializing their sensitive contents', async () => {
    const warning = jest.spyOn(repository.logger, 'warn');
    listen.mockRejectedValue(new Error('private-notification Cookie: secret-cookie'));
    await expect(repository.connectWebSocket(account, true, noop)).rejects.toThrow('WebSocket initialization failed');

    expect(warning).toHaveBeenCalledWith(expect.stringContaining('event=connect-failure trigger=initial connectCycleId=1'));
    expect(JSON.stringify(warning.mock.calls)).not.toMatch(/private-notification|secret-cookie/);
  });

  it.each([true, false])('waits for notification synchronization with useLegacy=%s', async useLegacy => {
    listen.mockImplementation(async options => {
      connectionStateChanged = options.onConnectionStateChanged;
      connectionStateChanged?.(ConnectionState.PROCESSING_NOTIFICATIONS);
      return disconnect;
    });
    let ready = false;
    async function initialize(): Promise<void> {
      await repository.connectWebSocket(account, useLegacy, noop);
      ready = true;
    }
    const initialization = initialize();
    await flushConnectionCallbacks();
    expect(ready).toBe(false);
    setConnectionState(ConnectionState.LIVE);
    await initialization;
    expect(ready).toBe(true);
    expect(clearReadinessTimeout).toHaveBeenCalledWith(456);
  });

  it.each([true, false])('allows transport recovery during initialization with useLegacy=%s', async useLegacy => {
    listen.mockImplementation(async options => {
      connectionStateChanged = options.onConnectionStateChanged;
      return disconnect;
    });
    const initialization = repository.connectWebSocket(account, useLegacy, noop);
    const completed = expect(initialization).resolves.toBeUndefined();
    await flushConnectionCallbacks();
    setConnectionState(ConnectionState.CLOSED);
    setConnectionState(ConnectionState.CONNECTING);
    runHeartbeat();
    await flushConnectionCallbacks();
    expect(listen).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();
    setConnectionState(ConnectionState.PROCESSING_NOTIFICATIONS);
    expect(clearReadinessTimeout).not.toHaveBeenCalled();
    setConnectionState(ConnectionState.LIVE);
    await completed;
  });

  it.each([{isAxiosError: true, code: 'ERR_NETWORK'}, new BackendError('Unavailable', undefined, 503)])(
    'recovers transient setup failure without competing attempts: %s', async failure => {
      listen.mockRejectedValueOnce(failure);
      const initialization = repository.connectWebSocket(account, false, noop);
      const completed = expect(initialization).resolves.toBeUndefined();
      await flushConnectionCallbacks();
      expect(clearReadinessTimeout).not.toHaveBeenCalled();
      runHeartbeat();
      window.dispatchEvent(new Event('online'));
      await completed;
      expect(listen).toHaveBeenCalledTimes(2);
      expect(listen.mock.calls[0]?.[0].signal?.aborted).toBe(true);
    },
  );

  it('rejects an invalid-session setup failure without retrying', async () => {
    listen.mockRejectedValueOnce(new InvalidTokenError('Session expired'));
    await expect(repository.connectWebSocket(account, true, noop)).rejects.toThrow('WebSocket initialization failed');
    runHeartbeat();
    window.dispatchEvent(new Event('online'));
    await flushConnectionCallbacks();
    expect(listen).toHaveBeenCalledTimes(1);
    expect(window.clearInterval).toHaveBeenCalledWith(123);
  });

  it('terminates startup when an established listener reports an invalid session', async () => {
    automaticallySynchronize = false;
    const initialization = repository.connectWebSocket(account, false, noop);
    const rejected = expect(initialization).rejects.toThrow('session expired');
    await flushConnectionCallbacks();
    listen.mock.calls[0]?.[0].onSessionExpired?.();
    await rejected;
    runHeartbeat();
    await flushConnectionCallbacks();
    expect(listen).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('recovers after going offline during setup and ignores the obsolete setup result', async () => {
    let finishFirstSetup: (cleanup: () => void) => void = noop;
    const obsoleteDisconnect = jest.fn();
    listen.mockImplementationOnce(async options => {
      connectionStateChanged = options.onConnectionStateChanged;

      return new Promise(resolve => { finishFirstSetup = resolve; });
    });
    const initialization = repository.connectWebSocket(account, true, noop);
    const completed = expect(initialization).resolves.toBeUndefined();
    await flushConnectionCallbacks();
    window.dispatchEvent(new Event('offline'));
    expect(listen.mock.calls[0]?.[0].signal?.aborted).toBe(true);
    window.dispatchEvent(new Event('online'));
    await completed;
    finishFirstSetup(obsoleteDisconnect);
    await flushConnectionCallbacks();
    expect(listen).toHaveBeenCalledTimes(2);
    expect(obsoleteDisconnect).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();
  });

  it('cancels pending startup recovery and removes all recovery sources', async () => {
    listen.mockRejectedValueOnce({isAxiosError: true, code: 'ERR_NETWORK'});
    const initialization = repository.connectWebSocket(account, true, noop);
    const cancelled = expect(initialization).rejects.toThrow('cancelled');
    await flushConnectionCallbacks();
    repository.disconnectWebSocket();
    await cancelled;
    runHeartbeat();
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
    await flushConnectionCallbacks();
    expect(listen).toHaveBeenCalledTimes(1);
    expect(clearReadinessTimeout).toHaveBeenCalledWith(456);
    expect(window.clearInterval).toHaveBeenCalledWith(123);
  });

  it('rejects a stalled setup at the injected readiness deadline and ignores late LIVE', async () => {
    listen.mockImplementation(async options => {
      connectionStateChanged = options.onConnectionStateChanged;
      return new Promise<() => void>(() => {});
    });
    const initialization = repository.connectWebSocket(account, false, noop);
    const rejected = expect(initialization).rejects.toThrow('timed out');
    await flushConnectionCallbacks();
    readinessDeadline?.();
    await rejected;
    setConnectionState(ConnectionState.LIVE);
    expect(repository.notificationHandlingState()).not.toBe(NOTIFICATION_HANDLING_STATE.WEB_SOCKET);
    expect(listen.mock.calls[0]?.[0].signal?.aborted).toBe(true);
    expect(window.clearInterval).toHaveBeenCalledWith(123);
    runHeartbeat();
    window.dispatchEvent(new Event('online'));
    await flushConnectionCallbacks();
    expect(listen).toHaveBeenCalledTimes(1);
  });

  it('cancels overlapping initialization and ignores obsolete connection callbacks', async () => {
    const callbacks: ListenOptions[] = [];
    listen.mockImplementation(async options => {
      callbacks.push(options);
      return disconnect;
    });
    const first = repository.connectWebSocket(account, true, noop);
    const firstRejected = expect(first).rejects.toThrow('cancelled');
    await flushConnectionCallbacks();
    let secondReady = false;
    async function initializeSecond(): Promise<void> {
      await repository.connectWebSocket(account, false, noop);
      secondReady = true;
    }
    const second = initializeSecond();
    await firstRejected;
    await flushConnectionCallbacks();
    callbacks[0]?.onConnectionStateChanged?.(ConnectionState.LIVE);
    await flushConnectionCallbacks();
    expect(secondReady).toBe(false);
    expect(callbacks[0]?.signal?.aborted).toBe(true);
    callbacks[1]?.onConnectionStateChanged?.(ConnectionState.LIVE);
    await second;
    expect(secondReady).toBe(true);
  });

  it('does not reconnect after a pending health check completes following disconnect', async () => {
    await connect();
    let finishProbe: (healthy: boolean) => void = noop;
    isWebsocketHealthy.mockReturnValue(new Promise(resolve => { finishProbe = resolve; }));
    runHeartbeat();
    repository.disconnectWebSocket();
    finishProbe(false);
    await flushConnectionCallbacks();
    expect(listen).not.toHaveBeenCalled();
  });

});
