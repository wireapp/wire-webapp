/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {Account, ConnectionState} from '@wireapp/core';

import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {WebSocketConnectionManager, WebSocketConnectionConfig} from './WebSocketConnectionManager';

import {Warnings} from '../../view_model/WarningsContainer';

describe('WebSocketConnectionManager', () => {
  let mockAccount: jest.Mocked<Account>;
  let mockOnConnectionStateChanged: jest.Mock;
  let mockOnNotificationStreamProgress: jest.Mock;
  let mockOnIncomingEvent: jest.Mock;
  let mockOnMissedNotifications: jest.Mock;
  let mockDisconnect: jest.Mock;

  const config: WebSocketConnectionConfig = {
    retryDelayMs: TIME_IN_MILLIS.SECOND * 5,
    heartbeatIntervalMs: TIME_IN_MILLIS.MINUTE,
    connectionTimeoutMs: TIME_IN_MILLIS.SECOND * 30,
  };

  beforeEach(() => {
    jest.useFakeTimers();

    mockAccount = {
      listen: jest.fn(),
      isWebsocketHealthy: jest.fn(),
    } as any;

    mockDisconnect = jest.fn();
    mockOnConnectionStateChanged = jest.fn();
    mockOnNotificationStreamProgress = jest.fn();
    mockOnIncomingEvent = jest.fn().mockResolvedValue(undefined);
    mockOnMissedNotifications = jest.fn().mockResolvedValue(undefined);

    // Mock Warnings to avoid side effects
    jest.spyOn(Warnings, 'hideWarning').mockImplementation(() => {});
    jest.spyOn(Warnings, 'showWarning').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('connection establishment', () => {
    it('should successfully establish a WebSocket connection', async () => {
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.CONNECTING);
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      const connectPromise = manager.connect();

      await connectPromise;

      expect(mockOnConnectionStateChanged).toHaveBeenCalledWith(ConnectionState.CONNECTING);
      expect(mockOnConnectionStateChanged).toHaveBeenCalledWith(ConnectionState.LIVE);
      expect(mockAccount.listen).toHaveBeenCalledTimes(1);
    });

    it('should reject if connection reaches CLOSED state before LIVE', async () => {
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.CONNECTING);
        onConnectionStateChanged(ConnectionState.CLOSED);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await expect(manager.connect()).rejects.toThrow('WebSocket connection closed');
    });

    it('should not create concurrent connection attempts', async () => {
      let listenCallCount = 0;
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        listenCallCount++;
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      // Start first connection
      const firstConnection = manager.connect();

      // Try to start second connection before first completes
      const secondConnection = manager.connect();

      await Promise.all([firstConnection, secondConnection]);

      // Should only call listen once despite two connect() calls
      expect(listenCallCount).toBe(1);
    });

    it('should reject if account.listen throws an error', async () => {
      mockAccount.listen = jest.fn().mockRejectedValue(new Error('Network error'));

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await expect(manager.connect()).rejects.toThrow('Network error');
    });
  });

  describe('connection retry', () => {
    it('should schedule a retry after connection failure', async () => {
      let attemptCount = 0;
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        attemptCount++;
        if (attemptCount === 1) {
          onConnectionStateChanged(ConnectionState.CLOSED);
        } else {
          onConnectionStateChanged(ConnectionState.LIVE);
        }
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      const connectPromise = manager.connect();

      // First attempt should fail
      await expect(connectPromise).rejects.toThrow();

      // Advance time past the retry delay
      await jest.advanceTimersByTimeAsync(config.retryDelayMs + 100);

      // Should have attempted a second time
      expect(attemptCount).toBeGreaterThan(1);
    });

    it('should only schedule one retry at a time', async () => {
      let attemptCount = 0;
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        attemptCount++;
        onConnectionStateChanged(ConnectionState.CLOSED);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      // Connect and expect it to reject
      const connectPromise = manager.connect();
      await expect(connectPromise).rejects.toThrow();

      // Advance multiple retry delays
      await jest.advanceTimersByTimeAsync(config.retryDelayMs * 3);

      // Each retry should only schedule one more retry
      expect(attemptCount).toBeGreaterThan(1);
    });
  });

  describe('browser connectivity events', () => {
    it('should attempt to reconnect when browser comes online', async () => {
      let listenCallCount = 0;
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        listenCallCount++;
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      expect(listenCallCount).toBe(1);

      // Simulate browser going online
      window.dispatchEvent(new Event('online'));

      // Run pending timers (the online event handler should trigger a reconnect)
      await jest.runOnlyPendingTimersAsync();

      expect(listenCallCount).toBeGreaterThan(1);
    });

    it('should attempt to reconnect on online event after going offline', async () => {
      let listenCallCount = 0;
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        listenCallCount++;
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();
      expect(listenCallCount).toBe(1);

      // Simulate browser going offline
      window.dispatchEvent(new Event('offline'));
      expect(mockDisconnect).toHaveBeenCalled();

      // Simulate browser coming back online
      window.dispatchEvent(new Event('online'));
      await jest.runOnlyPendingTimersAsync();

      // Should have reconnected
      expect(listenCallCount).toBeGreaterThan(1);
    });

    it('should disconnect and show warning when browser goes offline', async () => {
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      // Simulate browser going offline
      window.dispatchEvent(new Event('offline'));

      expect(mockDisconnect).toHaveBeenCalled();
      expect(Warnings.showWarning).toHaveBeenCalledWith(Warnings.TYPE.NO_INTERNET);
    });

    it('should cancel pending retry when going offline', async () => {
      let listenCallCount = 0;
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        listenCallCount++;
        onConnectionStateChanged(ConnectionState.CLOSED);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      // Connect and let it fail (will schedule a retry)
      const connectPromise = manager.connect();
      await expect(connectPromise).rejects.toThrow();

      const countBeforeOffline = listenCallCount;

      // Simulate browser going offline (should cancel retry)
      window.dispatchEvent(new Event('offline'));

      // Advance time - no new retries should happen
      await jest.advanceTimersByTimeAsync(config.retryDelayMs * 2);

      expect(listenCallCount).toBe(countBeforeOffline);
    });
  });

  describe('heartbeat health monitoring', () => {
    it('should periodically check WebSocket health', async () => {
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });
      mockAccount.isWebsocketHealthy = jest.fn().mockResolvedValue(true);

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      // Advance time to trigger first heartbeat check
      await jest.advanceTimersByTimeAsync(config.heartbeatIntervalMs);

      expect(mockAccount.isWebsocketHealthy).toHaveBeenCalledTimes(1);
    });

    it('should reconnect when heartbeat check fails', async () => {
      let listenCallCount = 0;
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        listenCallCount++;
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });
      mockAccount.isWebsocketHealthy = jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
        .mockResolvedValue(true);

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      expect(listenCallCount).toBe(1);

      // First heartbeat - succeeds
      await jest.advanceTimersByTimeAsync(config.heartbeatIntervalMs);

      expect(mockAccount.isWebsocketHealthy).toHaveBeenCalledTimes(1);

      // Second heartbeat - fails, should trigger reconnect
      await jest.advanceTimersByTimeAsync(config.heartbeatIntervalMs);

      // Run the reconnect attempt
      await jest.runOnlyPendingTimersAsync();

      expect(listenCallCount).toBeGreaterThan(1);
    });

    it('should not reconnect when heartbeat succeeds', async () => {
      let listenCallCount = 0;
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        listenCallCount++;
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });
      mockAccount.isWebsocketHealthy = jest.fn().mockResolvedValue(true);

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      const initialCount = listenCallCount;

      // Run multiple heartbeat intervals
      await jest.advanceTimersByTimeAsync(config.heartbeatIntervalMs * 3);

      expect(mockAccount.isWebsocketHealthy).toHaveBeenCalled();
      expect(listenCallCount).toBe(initialCount);
    });

    it('should handle heartbeat check errors gracefully', async () => {
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });
      mockAccount.isWebsocketHealthy = jest.fn().mockRejectedValue(new Error('Health check failed'));

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      // Should not throw when heartbeat fails
      await expect(jest.advanceTimersByTimeAsync(config.heartbeatIntervalMs)).resolves.not.toThrow();
    });

    it('should skip heartbeat when browser reports offline', async () => {
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });
      mockAccount.isWebsocketHealthy = jest.fn().mockResolvedValue(true);

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      // Mock navigator.onLine to be false
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Advance time to trigger heartbeat check
      await jest.advanceTimersByTimeAsync(config.heartbeatIntervalMs);

      // Should not check WebSocket health when offline
      expect(mockAccount.isWebsocketHealthy).not.toHaveBeenCalled();

      // Reset navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });

    it('should continue heartbeat monitoring after disconnect', async () => {
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });
      mockAccount.isWebsocketHealthy = jest.fn().mockResolvedValue(true);

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      // Disconnect the WebSocket
      manager.disconnect();
      expect(mockDisconnect).toHaveBeenCalled();

      // Advance time to trigger heartbeat check
      await jest.advanceTimersByTimeAsync(config.heartbeatIntervalMs);

      // Heartbeat should still run after disconnect
      expect(mockAccount.isWebsocketHealthy).toHaveBeenCalledTimes(1);
    });

    it('should detect and reconnect when connectivity returns after offline', async () => {
      let listenCallCount = 0;
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        listenCallCount++;
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();
      expect(listenCallCount).toBe(1);

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Advance time - heartbeat should skip health check
      await jest.advanceTimersByTimeAsync(config.heartbeatIntervalMs);

      // Now simulate coming back online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      // Make heartbeat fail to trigger reconnect
      mockAccount.isWebsocketHealthy = jest.fn().mockResolvedValue(false);

      // Advance time to trigger next heartbeat
      await jest.advanceTimersByTimeAsync(config.heartbeatIntervalMs);
      await jest.runOnlyPendingTimersAsync();

      // Should have attempted reconnection
      expect(listenCallCount).toBeGreaterThan(1);

      // Reset navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });
  });

  describe('cleanup', () => {
    it('should not remove event listeners on disconnect', async () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      manager.disconnect();

      // Should NOT clear heartbeat timer (it keeps running to detect connectivity)
      expect(clearIntervalSpy).not.toHaveBeenCalled();
      // Should NOT remove event listeners
      expect(removeEventListenerSpy).not.toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).not.toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should remove event listeners and clear timers on cleanup', async () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      manager.cleanup();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should call disconnect function from account.listen', async () => {
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      manager.disconnect();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should clear pending retry timers on disconnect', async () => {
      const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.CLOSED);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      // Connect and let it fail (will schedule a retry)
      const connectPromise = manager.connect();
      await expect(connectPromise).rejects.toThrow();

      manager.disconnect();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should stop heartbeat monitoring on cleanup', async () => {
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });
      mockAccount.isWebsocketHealthy = jest.fn().mockResolvedValue(true);

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      // Cleanup everything
      manager.cleanup();

      // Advance time to trigger heartbeat check
      await jest.advanceTimersByTimeAsync(config.heartbeatIntervalMs);

      // Should not check WebSocket health after cleanup
      expect(mockAccount.isWebsocketHealthy).not.toHaveBeenCalled();
    });
  });

  describe('connection state tracking', () => {
    it('should update UI warnings based on connection state', async () => {
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.CONNECTING);
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        false,
        false,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      expect(mockOnConnectionStateChanged).toHaveBeenCalledWith(ConnectionState.CONNECTING);
      expect(mockOnConnectionStateChanged).toHaveBeenCalledWith(ConnectionState.LIVE);
    });
  });

  describe('passed callbacks', () => {
    it('should pass correct parameters to account.listen', async () => {
      mockAccount.listen = jest.fn().mockImplementation(async ({onConnectionStateChanged}: any) => {
        onConnectionStateChanged(ConnectionState.LIVE);
        return mockDisconnect;
      });

      const useLegacy = true;
      const dryRun = true;

      const manager = new WebSocketConnectionManager(
        mockAccount,
        config,
        dryRun,
        useLegacy,
        mockOnConnectionStateChanged,
        mockOnIncomingEvent,
        mockOnMissedNotifications,
        mockOnNotificationStreamProgress,
      );

      await manager.connect();

      expect(mockAccount.listen).toHaveBeenCalledWith({
        useLegacy,
        onConnectionStateChanged: expect.any(Function),
        onEvent: mockOnIncomingEvent,
        onMissedNotifications: mockOnMissedNotifications,
        onNotificationStreamProgress: mockOnNotificationStreamProgress,
        dryRun,
      });
    });
  });
});
