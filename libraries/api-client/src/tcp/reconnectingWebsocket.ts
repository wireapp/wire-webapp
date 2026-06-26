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

import is from '@sindresorhus/is';
import logdown from 'logdown';
import PartySocketWebSocket, {type CloseEvent, type ErrorEvent, type Options} from 'partysocket/ws';
import {Maybe} from 'true-myth';

import {LogFactory, TimeUtil} from '@wireapp/commons';

import * as buffer from '../shims/node/buffer';
import {WebSocketNode} from '../shims/node/websocket';
import {onBackFromSleep} from '../utils/backFromSleepHandler/backFromSleepHandler';

export enum CloseEventCode {
  NORMAL_CLOSURE = 1000,
  GOING_AWAY = 1001,
  PROTOCOL_ERROR = 1002,
  UNSUPPORTED_DATA = 1003,
}

export enum WEBSOCKET_STATE {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}

export enum PingMessage {
  PING = 'ping',
  PONG = 'pong',
}

export type LongRunningRetryDetails = {
  readonly retryCount: number;
  readonly retryDurationInMilliseconds: number;
};

type IntervalIdentifier = ReturnType<typeof globalThis.setInterval>;

const longRunningRetryThresholdInMilliseconds = TimeUtil.TimeInMillis.MINUTE;
const connectingTimeoutInMilliseconds = TimeUtil.TimeInMillis.SECOND * 20;

type BackFromSleepHandler = typeof onBackFromSleep;

type ReconnectingWebsocketWrapper = Pick<
  PartySocketWebSocket,
  'binaryType' | 'close' | 'onclose' | 'onerror' | 'onmessage' | 'onopen' | 'readyState' | 'reconnect' | 'send'
>;

type TimeoutIdentifier = ReturnType<typeof globalThis.setTimeout>;
type WebSocketEventListener = (event: Event) => void;
type WebSocketConstructor = new (url: string, protocols?: string | string[]) => WebSocket;
type WebSocketWithEventListeners = WebSocket & {
  addEventListener: WebSocket['addEventListener'];
  removeEventListener: WebSocket['removeEventListener'];
};

export type ReconnectingWebsocketWallClock = {
  readonly currentTimestampInMilliseconds: number;
  readonly setTimeout: (callback: () => void, delayInMilliseconds: number) => TimeoutIdentifier;
  readonly clearTimeout: (timeoutIdentifier: TimeoutIdentifier) => void;
  readonly setInterval: (callback: () => void, delayInMilliseconds: number) => IntervalIdentifier;
  readonly clearInterval: (intervalIdentifier: IntervalIdentifier) => void;
};

type ReconnectingWebsocketOptions = {
  readonly backFromSleepHandler: Maybe<BackFromSleepHandler>;
  readonly pingInterval: Maybe<number>;
  readonly wallClock: ReconnectingWebsocketWallClock;
  readonly websocketFactory: Maybe<() => ReconnectingWebsocketWrapper>;
};

function normalizeMessageEventForPartysocket(event: Event): Event {
  if (!('data' in event)) {
    return event;
  }

  if ((event as MessageEvent).ports !== null) {
    return event;
  }

  return {
    data: (event as MessageEvent).data,
    lastEventId: (event as MessageEvent).lastEventId,
    origin: (event as MessageEvent).origin,
    ports: [],
    source: (event as MessageEvent).source,
    type: event.type,
  } as unknown as MessageEvent;
}

export function createPartysocketCompatibleWebSocketConstructor(
  WebSocketConstructor: WebSocketConstructor | undefined,
): WebSocketConstructor | undefined {
  if (is.undefined(WebSocketConstructor) || globalThis.WebSocket === WebSocketConstructor) {
    return WebSocketConstructor;
  }

  return function PartysocketCompatibleWebSocket(url: string, protocols?: string | string[]) {
    const socket = (
      is.undefined(protocols) ? new WebSocketConstructor(url) : new WebSocketConstructor(url, protocols)
    ) as WebSocketWithEventListeners;
    const originalAddEventListener = socket.addEventListener.bind(socket) as EventTarget['addEventListener'];
    const originalRemoveEventListener = socket.removeEventListener.bind(socket) as EventTarget['removeEventListener'];
    const wrappedMessageListeners = new WeakMap<WebSocketEventListener, WebSocketEventListener>();

    socket.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type !== 'message' || !is.function_(listener)) {
        originalAddEventListener(type, listener, options);
        return;
      }

      const wrappedListener = (event: Event) => {
        listener(normalizeMessageEventForPartysocket(event));
      };
      wrappedMessageListeners.set(listener as WebSocketEventListener, wrappedListener);
      originalAddEventListener(type, wrappedListener as EventListener, options);
    }) as WebSocket['addEventListener'];

    socket.removeEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ) => {
      if (type !== 'message' || !is.function_(listener)) {
        originalRemoveEventListener(type, listener, options);
        return;
      }

      const wrappedListener = wrappedMessageListeners.get(listener as WebSocketEventListener);
      originalRemoveEventListener(type, (wrappedListener ?? listener) as EventListener, options);
      wrappedMessageListeners.delete(listener as WebSocketEventListener);
    }) as WebSocket['removeEventListener'];

    return socket;
  } as unknown as WebSocketConstructor;
}

export class ReconnectingWebsocket {
  private static readonly RECONNECTING_OPTIONS: Options = {
    WebSocket: createPartysocketCompatibleWebSocketConstructor(WebSocketNode),
    connectionTimeout: TimeUtil.TimeInMillis.SECOND * 4,
    debug: false,
    maxReconnectionDelay: TimeUtil.TimeInMillis.SECOND * 10,
    maxRetries: Infinity,
    minReconnectionDelay: TimeUtil.TimeInMillis.SECOND * 4,
    reconnectionDelayGrowFactor: 1.3,
  };

  private readonly logger: logdown.Logger;
  private socket?: ReconnectingWebsocketWrapper;
  private pingerId?: IntervalIdentifier;
  private connectingTimeoutId?: TimeoutIdentifier;
  private readonly PING_INTERVAL = TimeUtil.TimeInMillis.SECOND * 20;
  private hasUnansweredPing: boolean;
  private onOpen?: (event: Event) => void;
  private onMessage?: (data: string) => void;
  private onError?: (error: ErrorEvent) => void;
  private onClose?: (event: CloseEvent) => void;
  private onLongRunningRetry?: (retryDetails: LongRunningRetryDetails) => void;
  /**
   * Cleanup function returned by onBackFromSleep to stop the sleep detection interval.
   * This prevents memory leaks by ensuring the interval is cleared when the WebSocket is disconnected.
   */
  private stopBackFromSleepHandler: Maybe<() => void> = Maybe.nothing();

  private isPingingEnabled = true;
  private readonly pendingHealthChecks = new Set<(isHealthy: boolean) => void>();
  private lastMessageTimestamp = 0;
  private reconnectAttemptCount = 0;
  private reconnectSequenceRetryCount = 0;
  private reconnectSequenceStartTimestamp: Maybe<number> = Maybe.nothing<number>();
  private hasReportedLongRunningRetry = false;

  constructor(
    private readonly onReconnect: () => Promise<string>,
    private readonly options: ReconnectingWebsocketOptions,
  ) {
    this.logger = LogFactory.getLogger('@wireapp/api-client/tcp/ReconnectingWebsocket');

    if (options.pingInterval.isJust) {
      this.PING_INTERVAL = options.pingInterval.value;
    }

    this.hasUnansweredPing = false;
    this.startBackFromSleepHandler();
  }

  private startBackFromSleepHandler(): void {
    if (this.stopBackFromSleepHandler.isJust) {
      return;
    }

    /**
     * According to https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine, navigator.onLine attribute and 'online' and 'offline' events are not reliable enough (especially when it's truthy).
     * We won't receive the 'offline' event when the system goes to sleep (e.g. closing the lid of a laptop).
     * In this case navigator.onLine will still return true, but the WebSocket connection could be closed.
     * To handle this, we need a custom approach to detect when the system goes to sleep and when it wakes up.
     *
     * IMPORTANT: Store the cleanup function returned by onBackFromSleep. This function clears
     * the internal setInterval and must be called when disconnecting to prevent memory leaks.
     * **/
    const backFromSleepHandler = this.options.backFromSleepHandler.unwrapOr(onBackFromSleep);
    const backFromSleepRegistration: Parameters<BackFromSleepHandler>[0] = {
      callback: this.handleBackFromSleep,
    };

    this.stopBackFromSleepHandler = Maybe.just(backFromSleepHandler(backFromSleepRegistration));
  }

  private readonly handleBackFromSleep = (): void => {
    Maybe.of(this.socket).match({
      Just: socket => {
        const state = this.getState();
        const timeSinceLastNonPongMessageInMilliseconds =
          this.lastMessageTimestamp > 0
            ? `${this.options.wallClock.currentTimestampInMilliseconds - this.lastMessageTimestamp}ms`
            : 'unavailable';
        this.logger.info(
          `Back from sleep detected, WebSocket state: ${WEBSOCKET_STATE[state]} (${state}), last non-pong message: ${timeSinceLastNonPongMessageInMilliseconds}, unanswered ping: ${this.hasUnansweredPing}, creating fresh WebSocket wrapper`,
        );

        this.stopPinging();
        this.hasUnansweredPing = false;
        this.replaceSocketWrapper(socket, 'Back from sleep');
      },
      Nothing: () => {
        this.logger.debug('Back from sleep detected, WebSocket instance does not exist, skipping reconnect');
      },
    });
  };

  private readonly internalOnError = (error: ErrorEvent) => {
    this.logger.warn('WebSocket connection error', error);
    if (this.onError) {
      this.onError(error);
    }
  };

  private readonly internalOnMessage = (event: MessageEvent) => {
    const data = buffer.bufferToString(event.data);

    if (data === PingMessage.PONG) {
      this.logger.debug('Received pong from WebSocket');
      this.hasUnansweredPing = false;
      this.resolvePendingHealthChecks(true);

      return;
    }

    this.logger.debug('Incoming message');
    this.lastMessageTimestamp = this.options.wallClock.currentTimestampInMilliseconds;
    this.onMessage?.(data);
  };

  private readonly internalOnOpen = (event: Event) => {
    this.logger.info(`WebSocket opened (reconnect attempt #${this.reconnectAttemptCount})`);
    this.stopConnectingWatchdog();
    this.resetLongRunningRetrySequence();
    if (this.socket) {
      this.socket.binaryType = 'arraybuffer';
    }
    if (this.onOpen) {
      this.onOpen(event);
    }
  };

  private readonly internalOnReconnect = async (): Promise<string> => {
    const attempt = this.reconnectAttemptCount + 1;
    this.logger.info(`Connecting to WebSocket (attempt #${attempt})`);
    this.recordReconnectAttempt(this.options.wallClock.currentTimestampInMilliseconds);
    const socket = this.socket;

    if (!is.undefined(socket)) {
      this.startConnectingWatchdog(socket);
    }

    // The ping is needed to keep the connection alive as long as possible.
    // Otherwise the connection would be closed after 1 min of inactivity and re-established.
    if (this.isPingingEnabled) {
      this.startPinging();
      this.logger.debug(`Ping started (interval: ${this.PING_INTERVAL}ms)`);
    }
    return this.onReconnect();
  };

  private readonly internalOnClose = (event: CloseEvent) => {
    this.logger.info(
      `WebSocket closed — code: ${event?.code}, reason: "${event?.reason || 'none'}", wasClean: ${event?.wasClean ?? 'unknown'}`,
    );
    this.stopConnectingWatchdog();
    this.stopPinging();
    this.resolvePendingHealthChecks(false);
    if (this.onClose) {
      this.onClose(event);
    }
  };

  private startPinging(): void {
    this.stopPinging();
    this.hasUnansweredPing = false;
    this.pingerId = this.options.wallClock.setInterval(this.sendPing, this.PING_INTERVAL);
  }

  private stopPinging(): void {
    if (this.pingerId) {
      this.options.wallClock.clearInterval(this.pingerId);
      this.pingerId = undefined;
    }
  }

  private readonly sendPing = (): void => {
    if (!this.socket) {
      this.logger.debug('WebSocket instance does not exist, skipping ping');
      return;
    }

    if (this.socket.readyState !== WEBSOCKET_STATE.OPEN) {
      this.logger.debug(`WebSocket is not OPEN (state: ${WEBSOCKET_STATE[this.socket.readyState]}), skipping ping`);
      return;
    }

    if (this.hasUnansweredPing) {
      this.logger.warn(
        `Ping timeout — no pong received within ${this.PING_INTERVAL}ms, WebSocket state: ${WEBSOCKET_STATE[this.getState()]} (${this.getState()}), forcing reconnect`,
      );
      this.stopPinging();
      this.socket.reconnect();
      return;
    }
    this.logger.debug('Sending ping');
    this.hasUnansweredPing = true;
    this.send(PingMessage.PING);
  };

  /**
   * Reconnect on the existing ReconnectingWebSocket wrapper instead of allocating a new one.
   * The library closes the current underlying WebSocket synchronously in `_disconnect` before
   * opening the next, so we never leave two `/await` sessions alive from the app.
   */
  private reconnectInPlace(socket: ReconnectingWebsocketWrapper): void {
    try {
      socket.reconnect(CloseEventCode.NORMAL_CLOSURE);
    } catch (error) {
      this.logger.warn('Failed to reconnect WebSocket in place', error);
    }
  }

  private startConnectingWatchdog(socket: ReconnectingWebsocketWrapper): void {
    this.stopConnectingWatchdog();
    this.logger.debug(
      `Starting WebSocket CONNECTING watchdog (state: ${WEBSOCKET_STATE[socket.readyState]} (${socket.readyState}), timeout: ${connectingTimeoutInMilliseconds}ms)`,
    );

    this.connectingTimeoutId = this.options.wallClock.setTimeout(() => {
      if (this.socket !== socket) {
        return;
      }

      this.connectingTimeoutId = undefined;

      if (socket.readyState !== WEBSOCKET_STATE.CONNECTING) {
        return;
      }

      this.logger.warn(
        `WebSocket wrapper stayed CONNECTING for ${connectingTimeoutInMilliseconds}ms, replacing wrapper`,
      );

      this.replaceSocketWrapper(socket, 'Connecting timeout');
    }, connectingTimeoutInMilliseconds);
  }

  private stopConnectingWatchdog(): void {
    if (is.undefined(this.connectingTimeoutId) === false) {
      this.options.wallClock.clearTimeout(this.connectingTimeoutId);
      this.connectingTimeoutId = undefined;
    }
  }

  private replaceSocketWrapper(socket: ReconnectingWebsocketWrapper, reason: string): void {
    if (this.socket !== socket) {
      return;
    }

    this.stopPinging();
    this.hasUnansweredPing = false;
    this.stopConnectingWatchdog();

    try {
      socket.close(CloseEventCode.NORMAL_CLOSURE, reason);
    } catch (error) {
      this.logger.warn(`Failed to close stale WebSocket wrapper during ${reason}`, error);
    }

    this.createAndBindSocketWrapper();
  }

  public connect(): void {
    this.logger.info('Initializing WebSocket connection');
    this.startBackFromSleepHandler();
    this.resetLongRunningRetrySequence();
    this.stopPinging();

    const existingSocket = this.socket;

    if (!is.undefined(existingSocket) && !this.isExistingSocketClosed(existingSocket)) {
      this.logger.warn(
        `Existing WebSocket instance detected in state ${WEBSOCKET_STATE[existingSocket.readyState]} (${existingSocket.readyState}); reconnecting in place`,
      );
      this.reconnectInPlace(existingSocket);
      this.startConnectingWatchdog(existingSocket);
      return;
    }

    if (!is.undefined(existingSocket)) {
      this.logger.info('Existing WebSocket wrapper is CLOSED, creating a fresh wrapper');
    }

    this.createAndBindSocketWrapper();
  }

  private isExistingSocketClosed(socket: ReconnectingWebsocketWrapper): boolean {
    return socket.readyState === WEBSOCKET_STATE.CLOSED;
  }

  private createAndBindSocketWrapper(): void {
    const nextSocket = this.getReconnectingWebsocket();
    this.socket = nextSocket;
    this.bindSocketHandlers(nextSocket);
    this.startConnectingWatchdog(nextSocket);
  }

  private bindSocketHandlers(socket: ReconnectingWebsocketWrapper): void {
    socket.onmessage = this.runIfActiveSocket(socket, this.internalOnMessage);
    socket.onerror = this.runIfActiveSocket(socket, this.internalOnError);
    socket.onopen = this.runIfActiveSocket(socket, this.internalOnOpen);
    socket.onclose = this.runIfActiveSocket(socket, this.internalOnClose);
  }

  // Ignore late async events emitted by a previously replaced socket instance.
  // This prevents stale callbacks from mutating state that now belongs to a newer socket.
  private runIfActiveSocket<T>(socket: ReconnectingWebsocketWrapper, handler: (event: T) => void): (event: T) => void {
    return event => {
      if (this.socket !== socket) {
        return;
      }
      handler(event);
    };
  }

  public send(message: any): void {
    this.socket?.send(message);
  }

  public getState(): WEBSOCKET_STATE {
    return this.socket ? this.socket.readyState : WEBSOCKET_STATE.CLOSED;
  }

  /**
   * Lightweight health probe that intelligently determines connection health.
   *
   * If the WebSocket is actively processing messages (i.e., received a message within the last 5 seconds),
   * it considers the connection healthy without sending a ping, as message processing
   * indicates the connection is working properly.
   *
   * If the WebSocket is idle, it sends a ping and expects a pong within the timeout.
   * This approach prevents false failures during high-load scenarios where pong responses
   * get queued behind many other messages.
   *
   * Does not close or reconnect the socket; callers can decide how to react to failures.
   */
  public checkHealth(timeoutMs = TimeUtil.TimeInMillis.SECOND * 10): Promise<boolean> {
    const state = this.getState();
    if (is.undefined(this.socket)) {
      this.logger.debug('Health check failed — socket instance does not exist');
      return Promise.resolve(false);
    }

    if (state === WEBSOCKET_STATE.CONNECTING || state === WEBSOCKET_STATE.CLOSING) {
      this.logger.debug(`Health check skipped — socket is transitioning (state: ${WEBSOCKET_STATE[state]})`);
      return Promise.resolve(true);
    }

    if (state !== WEBSOCKET_STATE.OPEN) {
      this.logger.debug(`Health check skipped — socket not OPEN (state: ${WEBSOCKET_STATE[state]})`);
      return Promise.resolve(false);
    }

    const now = this.options.wallClock.currentTimestampInMilliseconds;
    const timeSinceLastMessage = now - this.lastMessageTimestamp;

    // If we're actively processing messages during the last 5 seconds, consider the connection healthy
    if (timeSinceLastMessage < TimeUtil.TimeInMillis.SECOND * 5) {
      this.logger.debug(
        `WebSocket is actively processing messages (last: ${timeSinceLastMessage}ms ago), considering healthy`,
      );
      return Promise.resolve(true);
    }

    // If idle, use ping/pong to verify connection
    return new Promise<boolean>(resolve => {
      const timeoutId = this.options.wallClock.setTimeout(() => {
        this.pendingHealthChecks.delete(resolveHealthCheck);
        this.logger.debug('Health check timeout - no pong received within timeout');
        resolve(false);
      }, timeoutMs);

      const resolveHealthCheck = (isHealthy: boolean) => {
        this.options.wallClock.clearTimeout(timeoutId);
        resolve(isHealthy);
      };

      this.pendingHealthChecks.add(resolveHealthCheck);
      this.logger.debug('WebSocket is idle, sending ping for health check');
      this.send(PingMessage.PING);
    });
  }

  public disconnect(reason = 'Closed by client'): void {
    this.resetLongRunningRetrySequence();
    if (this.socket) {
      this.logger.info(`Disconnecting from WebSocket (reason: "${reason}")`);
      this.socket.close(CloseEventCode.NORMAL_CLOSURE, reason);
    }
    // Always cleanup resources even if socket doesn't exist
    this.cleanup();
  }

  /**
   * Cleans up all active intervals and timers to prevent memory leaks.
   * This includes:
   * - The ping interval (via stopPinging)
   * - The sleep detection interval (via stopBackFromSleepHandler)
   *
   * This method should be called whenever the WebSocket connection is terminated.
   */
  private cleanup(): void {
    this.stopPinging();
    this.stopConnectingWatchdog();
    if (this.stopBackFromSleepHandler.isJust) {
      this.stopBackFromSleepHandler.value();
    }
    this.stopBackFromSleepHandler = Maybe.nothing();
  }

  private getReconnectingWebsocket(): ReconnectingWebsocketWrapper {
    return this.options.websocketFactory.match({
      Just: websocketFactory => {
        return websocketFactory();
      },
      Nothing: () => {
        return new PartySocketWebSocket(
          this.internalOnReconnect,
          undefined,
          ReconnectingWebsocket.RECONNECTING_OPTIONS,
        );
      },
    });
  }

  private resolvePendingHealthChecks(isHealthy: boolean) {
    this.pendingHealthChecks.forEach(resolve => resolve(isHealthy));
    this.pendingHealthChecks.clear();
  }

  public setOnOpen(onOpen: (event: Event) => void): void {
    this.onOpen = onOpen;
  }

  public setOnMessage(onMessage: (data: string) => void): void {
    this.onMessage = onMessage;
  }

  public setOnError(onError: (error: ErrorEvent) => void): void {
    this.onError = onError;
  }

  public setOnClose(onClose: (event: CloseEvent) => void): void {
    this.onClose = onClose;
  }

  public setOnLongRunningRetry(onLongRunningRetry: (retryDetails: LongRunningRetryDetails) => void): void {
    this.onLongRunningRetry = onLongRunningRetry;
  }

  public disablePinging(): void {
    this.isPingingEnabled = false;
    this.stopPinging();
  }

  private recordReconnectAttempt(nowInMilliseconds: number): void {
    this.reconnectAttemptCount += 1;

    if (this.reconnectAttemptCount === 1) {
      this.logger.info('WebSocket initial connection attempt');
      return;
    }

    this.logger.warn(
      `WebSocket reconnect attempt #${this.reconnectAttemptCount} (sequence retry #${this.reconnectSequenceRetryCount + 1})`,
    );

    if (this.reconnectSequenceStartTimestamp.isNothing) {
      this.reconnectSequenceStartTimestamp = Maybe.just(nowInMilliseconds);
    }

    this.reconnectSequenceRetryCount += 1;
    this.reportLongRunningRetryIfNeeded(nowInMilliseconds);
  }

  private reportLongRunningRetryIfNeeded(nowInMilliseconds: number): void {
    if (this.hasReportedLongRunningRetry) {
      return;
    }

    const reconnectSequenceStartTimestamp = this.reconnectSequenceStartTimestamp.unwrapOr(undefined);

    if (!is.number(reconnectSequenceStartTimestamp)) {
      return;
    }

    const retryDurationInMilliseconds = nowInMilliseconds - reconnectSequenceStartTimestamp;

    if (retryDurationInMilliseconds < longRunningRetryThresholdInMilliseconds) {
      return;
    }

    this.hasReportedLongRunningRetry = true;
    this.logger.warn(
      `Long-running reconnect detected — retries: ${this.reconnectSequenceRetryCount}, duration: ${retryDurationInMilliseconds}ms`,
    );
    this.onLongRunningRetry?.({
      retryCount: this.reconnectSequenceRetryCount,
      retryDurationInMilliseconds,
    });
  }

  private resetLongRunningRetrySequence(): void {
    this.hasReportedLongRunningRetry = false;
    this.reconnectAttemptCount = 0;
    this.reconnectSequenceRetryCount = 0;
    this.reconnectSequenceStartTimestamp = Maybe.nothing<number>();
  }
}
