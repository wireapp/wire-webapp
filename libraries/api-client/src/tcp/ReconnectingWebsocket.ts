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

/* global globalThis */

import logdown from 'logdown';
import PartySocketWebSocket, {type CloseEvent, type ErrorEvent, type Options} from 'partysocket/ws';

import {LogFactory, TimeUtil} from '@wireapp/commons';

import * as buffer from '../shims/node/buffer';
import {WebSocketNode} from '../shims/node/websocket';
import {BackFromSleepDetails, onBackFromSleep} from '../utils/BackFromSleepHandler';

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

export type WebSocketReconnectContext = {
  readonly attemptId: number;
  readonly wrapperGeneration: number;
  readonly reconnectAttemptCount: number;
  readonly reconnectSequenceRetryCount: number;
};

export type WebSocketErrorHandler = (error: ErrorEvent, reconnectContext: WebSocketReconnectContext) => void;

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
  readonly backFromSleepHandler?: BackFromSleepHandler;
  readonly pingInterval?: number;
  readonly wallClock: ReconnectingWebsocketWallClock;
  readonly websocketFactory?: (resolveUrl: () => Promise<string>) => ReconnectingWebsocketWrapper;
};

function getWebSocketStateName(state: WEBSOCKET_STATE): string {
  return WEBSOCKET_STATE[state];
}

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
  if (WebSocketConstructor === undefined || globalThis.WebSocket === WebSocketConstructor) {
    return WebSocketConstructor;
  }

  return function PartysocketCompatibleWebSocket(url: string, protocols?: string | string[]) {
    const socket = (
      protocols === undefined ? new WebSocketConstructor(url) : new WebSocketConstructor(url, protocols)
    ) as WebSocketWithEventListeners;
    const originalAddEventListener = socket.addEventListener.bind(socket) as EventTarget['addEventListener'];
    const originalRemoveEventListener = socket.removeEventListener.bind(socket) as EventTarget['removeEventListener'];
    const wrappedMessageListeners = new WeakMap<WebSocketEventListener, WebSocketEventListener>();

    socket.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) => {
      if (type !== 'message' || typeof listener !== 'function') {
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
      if (type !== 'message' || typeof listener !== 'function') {
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

export function createWebSocketWallClock(): ReconnectingWebsocketWallClock {
  return {
    get currentTimestampInMilliseconds(): number {
      return Date.now();
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
  };
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
  private onOpen?: (event: Event, reconnectContext: WebSocketReconnectContext) => void;
  private onMessage?: (data: string) => void;
  private onError?: WebSocketErrorHandler;
  private onClose?: (event: CloseEvent) => void;
  private onLongRunningRetry?: (retryDetails: LongRunningRetryDetails) => void;
  /**
   * Cleanup function returned by onBackFromSleep to stop the sleep detection interval.
   * This prevents memory leaks by ensuring the interval is cleared when the WebSocket is disconnected.
   */
  private stopBackFromSleepHandler?: () => void;

  private isPingingEnabled = true;
  private readonly pendingHealthChecks = new Set<(isHealthy: boolean) => void>();
  private lastMessageTimestamp = 0;
  private reconnectAttemptCount = 0;
  private reconnectSequenceRetryCount = 0;
  private reconnectSequenceStartTimestamp?: number;
  private hasReportedLongRunningRetry = false;

  private connectionAttemptId = 0;
  private wrapperGeneration = 0;
  private activeConnectionAttemptId?: number;
  private activeConnectionAttemptStartTimestamp?: number;
  private activeWrapperGeneration?: number;
  private wrapperLifetime = new AbortController();
  private reconnectLifetime?: AbortController;

  private readonly options: ReconnectingWebsocketOptions;

  constructor(
    private readonly onReconnect: (context: WebSocketReconnectContext, signal: AbortSignal) => Promise<string>,
    options: Partial<ReconnectingWebsocketOptions> = {},
  ) {
    this.options = {...options, wallClock: options.wallClock ?? createWebSocketWallClock()};
    this.logger = LogFactory.getLogger('@wireapp/api-client/tcp/ReconnectingWebsocket');

    if (options.pingInterval !== undefined) {
      this.PING_INTERVAL = options.pingInterval;
    }

    this.hasUnansweredPing = false;
    this.startBackFromSleepHandler();
  }

  private startBackFromSleepHandler(): void {
    if (this.stopBackFromSleepHandler !== undefined) {
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
    const backFromSleepHandler = this.options.backFromSleepHandler ?? onBackFromSleep;
    const backFromSleepRegistration: Parameters<BackFromSleepHandler>[0] = {
      callback: this.handleBackFromSleep,
    };

    this.stopBackFromSleepHandler = backFromSleepHandler(backFromSleepRegistration);
  }

  private readonly handleBackFromSleep = (details?: BackFromSleepDetails): void => {
    this.logger.info(
      `[WebSocketLifecycle] event=runtime-resumed observedIntervalMs=${details?.observedIntervalMilliseconds ?? 'unavailable'} expectedIntervalMs=${details?.expectedIntervalMilliseconds ?? 'unavailable'} suspensionDurationMs=${details?.suspensionDurationMilliseconds ?? 'unavailable'} state=${getWebSocketStateName(this.getState())} ${this.getActiveLifecycleContext()}`,
    );
    const socket = this.socket;
    if (socket === undefined) {
      return;
    }

    this.stopPinging();
    this.hasUnansweredPing = false;
    this.replaceSocketWrapper(socket, 'Back from sleep');
  };

  private readonly internalOnError = (error: ErrorEvent): void => {
    const reconnectContext = this.getReconnectContext();
    // Error messages and close reasons are untrusted and may contain credentials or notification contents.
    this.logger.warn(`[WebSocketLifecycle] event=socket-error ${this.getLifecycleContext(reconnectContext)}`);
    if (this.onError !== undefined) {
      this.onError(error, reconnectContext);
    }
  };

  private readonly internalOnMessage = (event: MessageEvent) => {
    const data = buffer.bufferToString(event.data);

    if (data === PingMessage.PONG) {
      this.logger.debug(`[WebSocketLifecycle] event=pong-received ${this.getActiveLifecycleContext()}`);
      this.hasUnansweredPing = false;
      if (this.pendingHealthChecks.size > 0) {
        this.logger.debug(
          `[WebSocketLifecycle] event=health-check-pong state=${getWebSocketStateName(this.getState())} ${this.getActiveLifecycleContext()}`,
        );
      }
      this.resolvePendingHealthChecks(true);

      return;
    }

    this.logger.debug('Incoming message');
    this.lastMessageTimestamp = this.options.wallClock.currentTimestampInMilliseconds;
    this.onMessage?.(data);
  };

  private readonly internalOnOpen = (event: Event) => {
    const reconnectContext = this.getReconnectContext();
    const durationInMilliseconds = this.getActiveAttemptDurationInMilliseconds();
    this.logger.info(
      `[WebSocketLifecycle] event=socket-open ${this.getLifecycleContext(reconnectContext)} durationMs=${durationInMilliseconds} reconnectAttempt=${reconnectContext.reconnectAttemptCount} sequenceRetry=${reconnectContext.reconnectSequenceRetryCount}`,
    );
    this.stopConnectingWatchdog('socket-opened');
    this.resetLongRunningRetrySequence();
    if (this.socket !== undefined) {
      this.socket.binaryType = 'arraybuffer';
    }
    if (this.onOpen !== undefined) {
      this.onOpen(event, reconnectContext);
    }
  };

  private readonly internalOnReconnect = async (): Promise<string> => {
    this.reconnectLifetime?.abort();
    const reconnectLifetime = new AbortController();
    this.reconnectLifetime = reconnectLifetime;
    const nowInMilliseconds = this.options.wallClock.currentTimestampInMilliseconds;
    this.connectionAttemptId += 1;
    this.activeConnectionAttemptId = this.connectionAttemptId;
    this.activeConnectionAttemptStartTimestamp = nowInMilliseconds;
    this.recordReconnectAttempt(nowInMilliseconds);
    const reconnectingSocket = this.socket;
    const reconnectContext = this.getReconnectContext();

    this.logger.info(
      `[WebSocketLifecycle] event=reconnect-start ${this.getLifecycleContext(reconnectContext)} state=${getWebSocketStateName(this.getState())} reconnectAttempt=${reconnectContext.reconnectAttemptCount} sequenceRetry=${reconnectContext.reconnectSequenceRetryCount} pingEnabled=${this.isPingingEnabled} watchdogActive=${this.connectingTimeoutId !== undefined}`,
    );

    // The ping is needed to keep the connection alive as long as possible.
    // Otherwise the connection would be closed after 1 min of inactivity and re-established.
    if (this.isPingingEnabled) {
      this.startPinging();
    }

    this.logger.debug(`[WebSocketLifecycle] event=url-resolution-start ${this.getLifecycleContext(reconnectContext)}`);
    let websocketUrl: string;
    try {
      websocketUrl = await this.onReconnect(reconnectContext, reconnectLifetime.signal);
      reconnectLifetime.signal.throwIfAborted();
    } catch (error: unknown) {
      const durationInMilliseconds = this.options.wallClock.currentTimestampInMilliseconds - nowInMilliseconds;
      this.logger.warn(
        `[WebSocketLifecycle] event=url-resolution-failure ${this.getLifecycleContext(reconnectContext)} durationMs=${durationInMilliseconds}`,
      );
      throw error;
    }
    this.logger.info(
      `[WebSocketLifecycle] event=url-resolution-success ${this.getLifecycleContext(reconnectContext)} durationMs=${this.options.wallClock.currentTimestampInMilliseconds - nowInMilliseconds}`,
    );
    const socket = reconnectingSocket;

    if (this.socket !== socket) {
      return websocketUrl;
    }

    if (socket !== undefined && socket.readyState === WEBSOCKET_STATE.CONNECTING) {
      this.startConnectingWatchdog(socket, reconnectContext);
    }

    return websocketUrl;
  };

  private readonly internalOnClose = (event: CloseEvent) => {
    this.logger.info(
      `[WebSocketLifecycle] event=socket-close ${this.getActiveLifecycleContext()} state=${getWebSocketStateName(this.getState())} code=${event?.code ?? 'unknown'} wasClean=${event?.wasClean ?? 'unknown'} durationMs=${this.getActiveAttemptDurationInMilliseconds()}`,
    );
    this.stopConnectingWatchdog('socket-closed');
    this.stopPinging();
    this.resolvePendingHealthChecks(false);
    if (this.onClose !== undefined) {
      this.onClose(event);
    }
  };

  private startPinging(): void {
    this.stopPinging();
    this.hasUnansweredPing = false;
    this.pingerId = this.options.wallClock.setInterval(this.sendPing, this.PING_INTERVAL);
  }

  private stopPinging(): void {
    if (this.pingerId !== undefined) {
      this.options.wallClock.clearInterval(this.pingerId);
      this.pingerId = undefined;
    }
  }

  private readonly sendPing = (): void => {
    if (this.socket === undefined) {
      this.logger.debug(`[WebSocketLifecycle] event=ping-skip reason=no-wrapper ${this.getActiveLifecycleContext()}`);
      return;
    }

    if (this.socket.readyState !== WEBSOCKET_STATE.OPEN) {
      this.logger.debug(
        `[WebSocketLifecycle] event=ping-skip reason=not-open state=${getWebSocketStateName(this.socket.readyState)} ${this.getActiveLifecycleContext()}`,
      );
      return;
    }

    if (this.hasUnansweredPing) {
      this.logger.warn(
        `[WebSocketLifecycle] event=ping-timeout ${this.getActiveLifecycleContext()} timeoutMs=${this.PING_INTERVAL} state=${getWebSocketStateName(this.getState())} lastMessageAgeMs=${this.getLastMessageAgeInMilliseconds()}`,
      );
      this.stopPinging();
      this.socket.reconnect();
      return;
    }
    this.logger.debug(
      `[WebSocketLifecycle] event=ping-send ${this.getActiveLifecycleContext()} lastMessageAgeMs=${this.getLastMessageAgeInMilliseconds()}`,
    );
    this.hasUnansweredPing = true;
    this.send(PingMessage.PING);
  };

  /**
   * Reconnect on the existing ReconnectingWebSocket wrapper instead of allocating a new one.
   * The library closes the current underlying WebSocket synchronously in `_disconnect` before
   * opening the next, so we never leave two `/await` sessions alive from the app.
   */
  private reconnectInPlace(socket: ReconnectingWebsocketWrapper): void {
    this.reconnectLifetime?.abort();
    try {
      socket.reconnect(CloseEventCode.NORMAL_CLOSURE);
    } catch {
      this.logger.warn(`[WebSocketLifecycle] event=reconnect-in-place-failure ${this.getActiveLifecycleContext()}`);
    }
  }

  private startConnectingWatchdog(
    socket: ReconnectingWebsocketWrapper,
    reconnectContext: WebSocketReconnectContext,
  ): void {
    this.stopConnectingWatchdog('watchdog-restarted');
    this.logger.debug(
      `[WebSocketLifecycle] event=connecting-watchdog-start ${this.getLifecycleContext(reconnectContext)} state=${getWebSocketStateName(socket.readyState)} timeoutMs=${connectingTimeoutInMilliseconds}`,
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
        `[WebSocketLifecycle] event=connecting-watchdog-timeout ${this.getLifecycleContext(reconnectContext)} state=${getWebSocketStateName(socket.readyState)} durationMs=${connectingTimeoutInMilliseconds}`,
      );

      this.replaceSocketWrapper(socket, 'Connecting timeout');
    }, connectingTimeoutInMilliseconds);
  }

  private stopConnectingWatchdog(reason: string): void {
    if (this.connectingTimeoutId !== undefined) {
      this.options.wallClock.clearTimeout(this.connectingTimeoutId);
      this.connectingTimeoutId = undefined;
      this.logger.debug(
        `[WebSocketLifecycle] event=connecting-watchdog-stop ${this.getActiveLifecycleContext()} reason=${reason}`,
      );
    }
  }

  private replaceSocketWrapper(
    socket: ReconnectingWebsocketWrapper,
    closeReason: 'Back from sleep' | 'Connecting timeout',
  ): void {
    if (this.socket !== socket) {
      return;
    }

    this.stopPinging();
    this.hasUnansweredPing = false;
    this.stopConnectingWatchdog('wrapper-replaced');

    this.logger.info(
      `[WebSocketLifecycle] event=wrapper-replace oldWrapperGeneration=${this.activeWrapperGeneration ?? 0} ${this.getActiveLifecycleContext()} reason=${closeReason} state=${getWebSocketStateName(socket.readyState)}`,
    );

    try {
      socket.close(CloseEventCode.NORMAL_CLOSURE, closeReason);
    } catch {
      this.logger.warn(
        `[WebSocketLifecycle] event=wrapper-close-failure ${this.getActiveLifecycleContext()} reason=${closeReason}`,
      );
    }

    this.createAndBindSocketWrapper(closeReason);
  }

  public connect(): void {
    this.logger.info('[WebSocketLifecycle] event=connect-requested');
    this.startBackFromSleepHandler();
    this.resetLongRunningRetrySequence();
    this.stopPinging();

    const existingSocket = this.socket;

    if (existingSocket !== undefined && !this.isExistingSocketClosed(existingSocket)) {
      this.logger.warn(
        `Existing WebSocket instance detected in state ${WEBSOCKET_STATE[existingSocket.readyState]} (${existingSocket.readyState}); reconnecting in place`,
      );
      this.reconnectInPlace(existingSocket);
      return;
    }

    if (existingSocket !== undefined) {
      this.logger.info('[WebSocketLifecycle] event=closed-wrapper-replacement');
    }

    this.createAndBindSocketWrapper(existingSocket === undefined ? 'initial-connect' : 'closed-wrapper');
  }

  private isExistingSocketClosed(socket: ReconnectingWebsocketWrapper): boolean {
    return socket.readyState === WEBSOCKET_STATE.CLOSED;
  }

  private createAndBindSocketWrapper(reason: string): void {
    this.wrapperLifetime.abort();
    this.reconnectLifetime?.abort();
    this.wrapperLifetime = new AbortController();
    const nextSocket = this.getReconnectingWebsocket();
    this.wrapperGeneration += 1;
    this.activeWrapperGeneration = this.wrapperGeneration;
    this.socket = nextSocket;
    this.bindSocketHandlers(nextSocket);
    this.logger.info(
      `[WebSocketLifecycle] event=wrapper-created wrapperGeneration=${this.wrapperGeneration} state=${getWebSocketStateName(nextSocket.readyState)}`,
    );
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
    return this.socket !== undefined ? this.socket.readyState : WEBSOCKET_STATE.CLOSED;
  }

  /**
   * Lightweight health probe that intelligently determines connection health.
   *
   * If the WebSocket is actively processing messages (i.e., received a message within the last 5 seconds),
   * it considers the connection healthy without sending a ping, as message processing
   * indicates the connection is working properly.
   *
   * If the WebSocket is idle and its protocol supports application pings, it sends
   * a ping and expects a pong within the timeout.
   * This approach prevents false failures during high-load scenarios where pong responses
   * get queued behind many other messages.
   *
   * Async /events does not support these pings. For that protocol an OPEN result
   * only confirms local socket state, not end-to-end liveness. An idle connection
   * may legitimately receive no notifications, so silence is not a failure signal.
   * Recovery still relies on close/error events, wake detection and the connecting
   * watchdog; callers must not interpret this probe as a server acknowledgement.
   *
   * Does not close or reconnect the socket; callers can decide how to react to failures.
   */
  public checkHealth(timeoutMs = TimeUtil.TimeInMillis.SECOND * 10): Promise<boolean> {
    const state = this.getState();
    if (this.socket === undefined) {
      this.logger.debug(
        `[WebSocketLifecycle] event=health-check-no-wrapper state=${getWebSocketStateName(state)} ${this.getActiveLifecycleContext()}`,
      );
      return Promise.resolve(false);
    }

    if (state === WEBSOCKET_STATE.CONNECTING || state === WEBSOCKET_STATE.CLOSING) {
      this.logger.debug(
        `[WebSocketLifecycle] event=health-check-transitioning state=${getWebSocketStateName(state)} ${this.getActiveLifecycleContext()}`,
      );
      return Promise.resolve(true);
    }

    if (state !== WEBSOCKET_STATE.OPEN) {
      this.logger.debug(
        `[WebSocketLifecycle] event=health-check-not-open state=${getWebSocketStateName(state)} ${this.getActiveLifecycleContext()}`,
      );
      return Promise.resolve(false);
    }

    // Async notification sockets do not accept application-level ping messages.
    if (this.isPingingEnabled === false) {
      return Promise.resolve(true);
    }

    const now = this.options.wallClock.currentTimestampInMilliseconds;
    const timeSinceLastMessage = now - this.lastMessageTimestamp;

    // If we're actively processing messages during the last 5 seconds, consider the connection healthy
    if (timeSinceLastMessage < TimeUtil.TimeInMillis.SECOND * 5) {
      this.logger.debug(
        `[WebSocketLifecycle] event=health-check-active-messages state=${getWebSocketStateName(state)} ${this.getActiveLifecycleContext()} lastMessageAgeMs=${timeSinceLastMessage}`,
      );
      return Promise.resolve(true);
    }

    // If idle, use ping/pong to verify connection
    return new Promise<boolean>(resolve => {
      const timeoutId = this.options.wallClock.setTimeout(() => {
        this.pendingHealthChecks.delete(resolveHealthCheck);
        this.logger.warn(
          `[WebSocketLifecycle] event=health-check-timeout state=${getWebSocketStateName(this.getState())} ${this.getActiveLifecycleContext()} lastMessageAgeMs=${this.getLastMessageAgeInMilliseconds()} timeoutMs=${timeoutMs}`,
        );
        resolve(false);
      }, timeoutMs);

      const resolveHealthCheck = (isHealthy: boolean) => {
        this.options.wallClock.clearTimeout(timeoutId);
        resolve(isHealthy);
      };

      this.pendingHealthChecks.add(resolveHealthCheck);
      this.logger.debug(
        `[WebSocketLifecycle] event=health-check-ping-start state=${getWebSocketStateName(state)} ${this.getActiveLifecycleContext()} lastMessageAgeMs=${timeSinceLastMessage} timeoutMs=${timeoutMs}`,
      );
      this.send(PingMessage.PING);
    });
  }

  public disconnect(reason = 'Closed by client'): void {
    this.wrapperLifetime.abort();
    this.reconnectLifetime?.abort();
    this.resetLongRunningRetrySequence();
    if (this.socket !== undefined) {
      this.logger.info(`[WebSocketLifecycle] event=disconnect-requested ${this.getActiveLifecycleContext()}`);
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
    this.stopConnectingWatchdog('disconnect');
    if (this.stopBackFromSleepHandler !== undefined) {
      this.stopBackFromSleepHandler();
    }
    this.stopBackFromSleepHandler = undefined;
  }

  private getReconnectingWebsocket(): ReconnectingWebsocketWrapper {
    const wrapperSignal = this.wrapperLifetime.signal;
    const transport = this;
    async function resolveUrl(): Promise<string> {
      wrapperSignal.throwIfAborted();

      return transport.internalOnReconnect();
    }
    if (this.options.websocketFactory !== undefined) {
      return this.options.websocketFactory(resolveUrl);
    }

    return new PartySocketWebSocket(resolveUrl, undefined, ReconnectingWebsocket.RECONNECTING_OPTIONS);
  }

  private resolvePendingHealthChecks(isHealthy: boolean) {
    this.pendingHealthChecks.forEach(resolve => resolve(isHealthy));
    this.pendingHealthChecks.clear();
  }

  public setOnOpen(onOpen: (event: Event, reconnectContext: WebSocketReconnectContext) => void): void {
    this.onOpen = onOpen;
  }

  public setOnMessage(onMessage: (data: string) => void): void {
    this.onMessage = onMessage;
  }

  public setOnError(onError: WebSocketErrorHandler): void {
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
      return;
    }

    if (this.reconnectSequenceStartTimestamp === undefined) {
      this.reconnectSequenceStartTimestamp = nowInMilliseconds;
    }

    this.reconnectSequenceRetryCount += 1;
    this.reportLongRunningRetryIfNeeded(nowInMilliseconds);
  }

  private reportLongRunningRetryIfNeeded(nowInMilliseconds: number): void {
    if (this.hasReportedLongRunningRetry) {
      return;
    }

    const reconnectSequenceStartTimestamp = this.reconnectSequenceStartTimestamp;

    if (typeof reconnectSequenceStartTimestamp !== 'number') {
      return;
    }

    const retryDurationInMilliseconds = nowInMilliseconds - reconnectSequenceStartTimestamp;

    if (retryDurationInMilliseconds < longRunningRetryThresholdInMilliseconds) {
      return;
    }

    this.hasReportedLongRunningRetry = true;
    this.logger.warn(
      `[WebSocketLifecycle] event=long-running-reconnect ${this.getActiveLifecycleContext()} sequenceRetry=${this.reconnectSequenceRetryCount} durationMs=${retryDurationInMilliseconds}`,
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
    this.reconnectSequenceStartTimestamp = undefined;
  }

  private getReconnectContext(): WebSocketReconnectContext {
    return {
      attemptId: this.activeConnectionAttemptId ?? 0,
      reconnectAttemptCount: this.reconnectAttemptCount,
      reconnectSequenceRetryCount: this.reconnectSequenceRetryCount,
      wrapperGeneration: this.activeWrapperGeneration ?? 0,
    };
  }

  private getActiveLifecycleContext(): string {
    return this.getLifecycleContext(this.getReconnectContext());
  }

  private getLifecycleContext(reconnectContext: WebSocketReconnectContext): string {
    return `attemptId=${reconnectContext.attemptId} wrapperGeneration=${reconnectContext.wrapperGeneration}`;
  }

  private getActiveAttemptDurationInMilliseconds(): string {
    const startTimestampInMilliseconds = this.activeConnectionAttemptStartTimestamp;

    return startTimestampInMilliseconds === undefined
      ? 'unavailable'
      : String(this.options.wallClock.currentTimestampInMilliseconds - startTimestampInMilliseconds);
  }

  private getLastMessageAgeInMilliseconds(): number | string {
    if (this.lastMessageTimestamp === 0) {
      return 'unavailable';
    }

    return this.options.wallClock.currentTimestampInMilliseconds - this.lastMessageTimestamp;
  }
}
