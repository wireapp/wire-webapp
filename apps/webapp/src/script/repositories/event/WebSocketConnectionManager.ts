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

import {HandledEventPayload, NotificationSource} from '@wireapp/core/lib/notification';

import {Account, ConnectionState} from '@wireapp/core';

import {getLogger, Logger} from 'Util/Logger';

import {Warnings} from '../../view_model/WarningsContainer';

/**
 * Configuration for WebSocket connection management.
 */
export interface WebSocketConnectionConfig {
  /** Delay in milliseconds before retrying a failed connection */
  retryDelayMs: number;
  /** Interval in milliseconds for heartbeat health checks */
  heartbeatIntervalMs: number;
  /** Timeout in milliseconds for initial connection establishment */
  connectionTimeoutMs: number;
}

/**
 * Manages WebSocket connection lifecycle, including:
 * - Connection establishment with retry logic
 * - Health monitoring via periodic heartbeat checks
 * - Browser online/offline event handling
 * - Cleanup of resources and event listeners
 */
export class WebSocketConnectionManager {
  private readonly logger: Logger;

  // Connection state
  private currentState: ConnectionState = ConnectionState.CLOSED;
  private activeConnectionAttempt: Promise<void> | undefined;
  private disconnectFn: (() => void) | undefined;

  // Timers for health monitoring and reconnection
  private heartbeatMonitoringTimerId: number | undefined;
  private reconnectRetryTimerId: number | undefined;

  // Event handlers for browser connectivity events
  private onlineEventHandler: (() => void) | undefined;
  private offlineEventHandler: (() => void) | undefined;

  constructor(
    private readonly account: Account,
    private readonly config: WebSocketConnectionConfig,
    private readonly dryRun: boolean,
    private readonly useLegacy: boolean,
    private readonly onConnectionStateChanged: (state: ConnectionState) => void,
    private readonly onIncomingEvent: (payload: HandledEventPayload, source: NotificationSource) => Promise<void>,
    private readonly onMissedNotifications: (missedNotificationId: string) => Promise<void>,
    private readonly onNotificationStreamProgress: (currentProcessingNotificationTimestamp: string) => void,
  ) {
    this.logger = getLogger('WebSocketConnectionManager');
  }

  // LOGIC IMPROVEMENT: connect() can be called multiple times without cleaning up previous connections and timers
  /**
   * Initiates the WebSocket connection with automatic retry and health monitoring.
   * @returns Promise that resolves when the connection reaches LIVE state
   */
  async connect(): Promise<void> {
    this.logger.info('Starting WebSocket connection manager, connect() called');
    this.setupConnectivityHandlers();
    this.startHeartbeatMonitoring();
    return this.establishConnection();
  }

  /**
   * Disconnects the WebSocket but keeps heartbeat monitoring active.
   */
  disconnect(): void {
    this.disconnectFn?.();
    // Clear retry timer but keep heartbeat running to detect when connectivity returns
    if (this.reconnectRetryTimerId) {
      window.clearTimeout(this.reconnectRetryTimerId);
      this.reconnectRetryTimerId = undefined;
    }
  }

  /**
   * Establishes a WebSocket connection.
   * Returns the existing connection attempt if one is already in progress.
   */
  private establishConnection(): Promise<void> {
    // Return existing connection attempt to prevent concurrent connections
    if (this.activeConnectionAttempt) {
      return this.activeConnectionAttempt;
    }

    this.logger.info('Trying to establish WebSocket connection... with ConnectionState:', this.currentState);

    // LOGIC FLAW: We either always disconnect before connecting, or return early if already connected
    // Ensure there is only one active connection to the WebSocket
    if (this.currentState !== ConnectionState.LIVE && this.currentState !== ConnectionState.CONNECTING) {
      this.disconnectFn?.();
    } else {
      this.logger.info('WebSocket is already connected or connecting, skipping new connection attempt');
      return Promise.resolve();
    }

    this.activeConnectionAttempt = new Promise<void>((resolve, reject) => {
      let connectionTimeoutHandle: number | undefined;
      let hasConnectionSettled = false;

      const clearConnectionTimeout = () => {
        if (connectionTimeoutHandle) {
          window.clearTimeout(connectionTimeoutHandle);
          connectionTimeoutHandle = undefined;
        }
      };

      /**
       * Settles the connection promise (resolve or reject).
       * On failure, schedules a retry attempt.
       * Ensures the promise is only settled once.
       */
      const settleConnectionAttempt = (isSuccessful: boolean, error?: Error) => {
        if (hasConnectionSettled) {
          return;
        }
        hasConnectionSettled = true;
        clearConnectionTimeout();

        if (!isSuccessful) {
          this.scheduleDelayedReconnect(() => this.establishConnection());
          reject(error);
          return;
        }
        resolve();
      };

      // Start timeout timer - connection must reach LIVE state within this time
      connectionTimeoutHandle = window.setTimeout(() => {
        settleConnectionAttempt(false, new Error('WebSocket connection timeout'));
      }, this.config.connectionTimeoutMs);

      this.account
        .listen({
          useLegacy: this.useLegacy,
          onConnectionStateChanged: connectionState => {
            this.handleConnectionStateChanged(connectionState);

            // Connection successfully reached LIVE state
            if (connectionState === ConnectionState.LIVE) {
              settleConnectionAttempt(true);
            }

            // Connection closed before reaching LIVE state
            if (connectionState === ConnectionState.CLOSED) {
              settleConnectionAttempt(false, new Error('WebSocket connection closed'));
            }
          },
          onEvent: this.onIncomingEvent,
          onMissedNotifications: this.onMissedNotifications,
          onNotificationStreamProgress: this.onNotificationStreamProgress,
          dryRun: this.dryRun,
        })
        .then(disconnect => {
          this.disconnectFn = disconnect;
        })
        .catch(error => {
          this.logger.error('Failed to establish WebSocket connection', error);
          settleConnectionAttempt(false, error);
        });
    }).finally(() => {
      // Clean up the reference once the connection attempt settles
      this.activeConnectionAttempt = undefined;
    });

    return this.activeConnectionAttempt;
  }

  /**
   * Handles connection state changes and updates UI warnings accordingly.
   */
  private handleConnectionStateChanged(state: ConnectionState): void {
    this.currentState = state;
    this.onConnectionStateChanged(state);

    switch (state) {
      case ConnectionState.CONNECTING: {
        Warnings.hideWarning(Warnings.TYPE.NO_INTERNET);
        Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
        break;
      }
      case ConnectionState.PROCESSING_NOTIFICATIONS: {
        Warnings.hideWarning(Warnings.TYPE.NO_INTERNET);
        Warnings.hideWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
        Warnings.showWarning(Warnings.TYPE.CONNECTIVITY_RECOVERY);
        break;
      }
      case ConnectionState.CLOSED: {
        Warnings.showWarning(Warnings.TYPE.NO_INTERNET);
        break;
      }
      case ConnectionState.LIVE: {
        Warnings.hideWarning(Warnings.TYPE.NO_INTERNET);
        Warnings.hideWarning(Warnings.TYPE.CONNECTIVITY_RECONNECT);
        Warnings.hideWarning(Warnings.TYPE.CONNECTIVITY_RECOVERY);
        break;
      }
    }
  }

  /**
   * Schedules a reconnection attempt after a delay.
   * Ensures only one retry is scheduled at a time.
   */
  private scheduleDelayedReconnect(reconnectFn: () => Promise<void>): void {
    // Don't schedule if a retry is already pending
    if (this.reconnectRetryTimerId) {
      return;
    }

    this.reconnectRetryTimerId = window.setTimeout(() => {
      this.reconnectRetryTimerId = undefined;
      reconnectFn().catch(error => {
        this.logger.error('Scheduled reconnection failed', error);
      });
    }, this.config.retryDelayMs);
  }

  /**
   * Sets up browser online/offline event handlers.
   */
  private setupConnectivityHandlers(): void {
    this.onlineEventHandler = () => {
      this.logger.info('Internet connection regained. Re-establishing WebSocket connection...');
      this.establishConnection().catch(error => {
        this.logger.error('Failed to reconnect on online event', error);
      });
    };

    this.offlineEventHandler = () => {
      this.logger.warn('Internet connection lost');
      this.disconnect();
      Warnings.showWarning(Warnings.TYPE.NO_INTERNET);

      // Cancel any pending retry since we're explicitly offline
      // Note: We do NOT stop the heartbeat monitoring, as it will detect when connectivity returns
      if (this.reconnectRetryTimerId) {
        window.clearTimeout(this.reconnectRetryTimerId);
        this.reconnectRetryTimerId = undefined;
      }
    };

    window.addEventListener('online', this.onlineEventHandler);
    window.addEventListener('offline', this.offlineEventHandler);
  }

  /**
   * Starts periodic heartbeat monitoring to detect stale connections.
   * This handles cases where the 'online' event never fires (e.g., after system sleep).
   */
  private startHeartbeatMonitoring(): void {
    this.heartbeatMonitoringTimerId = window.setInterval(async () => {
      try {
        this.logger.debug('Performing periodic WebSocket health check via heartbeat');

        // If browser reports we're offline, skip the heartbeat check
        if (navigator.onLine === false) {
          this.logger.debug('Periodic WebSocket health check: browser reports offline, skipping heartbeat');
          return;
        }

        // Use heartbeat to check connection health without disconnecting
        const isWebsocketHealthy = await this.account.isWebsocketHealthy();
        if (isWebsocketHealthy) {
          this.logger.debug('Periodic WebSocket health check: heartbeat succeeded, skipping reconnect');
          return;
        }

        this.logger.info('Periodic WebSocket health check: attempting reconnect (heartbeat failed)');
        this.establishConnection().catch(error => {
          this.logger.error('Periodic health check reconnection failed', error);
        });
      } catch (error) {
        this.logger.error('Error during periodic WebSocket health check', error);
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Cleans up monitoring resources (timers) but keeps online/offline event handlers active.
   */
  private cleanupMonitoring(): void {
    if (this.reconnectRetryTimerId) {
      window.clearTimeout(this.reconnectRetryTimerId);
      this.reconnectRetryTimerId = undefined;
    }

    if (this.heartbeatMonitoringTimerId) {
      window.clearInterval(this.heartbeatMonitoringTimerId);
      this.heartbeatMonitoringTimerId = undefined;
    }
  }

  /**
   * Cleans up all resources including event listeners.
   * Call this when the WebSocketConnectionManager is being destroyed.
   */
  cleanup(): void {
    if (this.onlineEventHandler) {
      window.removeEventListener('online', this.onlineEventHandler);
      this.onlineEventHandler = undefined;
    }

    if (this.offlineEventHandler) {
      window.removeEventListener('offline', this.offlineEventHandler);
      this.offlineEventHandler = undefined;
    }

    this.cleanupMonitoring();
  }
}
