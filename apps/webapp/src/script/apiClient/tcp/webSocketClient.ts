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

import {isEmptyString, isPromise, isUndefined} from '@sindresorhus/is';
import type {ErrorEvent} from 'partysocket/ws';
import {Maybe} from 'true-myth';

import {EventEmitter} from 'events';

import {AcknowledgeType} from './acknowledgeEvent.types';
import {
  LongRunningRetryDetails,
  ReconnectingWebsocket,
  ReconnectingWebsocketWallClock,
  WebSocketReconnectContext,
  type WebSocketLifecycleImplementation,
  WEBSOCKET_STATE,
} from './reconnectingWebsocket';

import {StringUtil} from '../../commons/util';
import {getLogger, type Logger} from '../../logger/getLogger';
import {AuthAPI, InvalidTokenError, MissingCookieAndTokenError, MissingCookieError} from '../auth/';
import {MINIMUM_API_VERSION} from '../config';
import {HttpClient, NetworkError} from '../http/';
import {Notification} from '../notification';
import {
  ConsumableNotification,
  ConsumableNotificationEvent,
  ConsumableNotificationSchema,
  ConsumableNotificationSynchronization,
} from '../notification/consumableNotification';
import type {WebSocketPlatform} from '../platform';

enum TOPIC {
  ON_ERROR = 'WebSocketClient.TOPIC.ON_ERROR',
  ON_INVALID_TOKEN = 'WebSocketClient.TOPIC.ON_INVALID_TOKEN',
  ON_LONG_RUNNING_RETRY = 'WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY',
  ON_MESSAGE = 'WebSocketClient.TOPIC.ON_MESSAGE',
  ON_STATE_CHANGE = 'WebSocketClient.TOPIC.ON_STATE_CHANGE',
}

const accessTokenRefreshRetryInitialDelayInMilliseconds = 1_000;
const accessTokenRefreshRetryMaximumDelayInMilliseconds = 10_000;
const accessTokenRefreshRetryBackoffFactor = 2;
const firstRetryAttemptOffset = 1;

export interface WebSocketClient {
  on(event: TOPIC.ON_ERROR, listener: (error: Error | ErrorEvent) => void): this;
  on(event: TOPIC.ON_INVALID_TOKEN, listener: (error: InvalidTokenError | MissingCookieError) => void): this;
  on(event: TOPIC.ON_LONG_RUNNING_RETRY, listener: (retryDetails: LongRunningRetryDetails) => void): this;
  on(event: TOPIC.ON_MESSAGE, listener: (notification: Notification | ConsumableNotification) => void): this;
  on(event: TOPIC.ON_STATE_CHANGE, listener: (state: WEBSOCKET_STATE) => void): this;
}

export type OnConnect = (abortHandler: AbortController, reconnectContext: WebSocketReconnectContext) => void;

export type WebSocketClientOptions = {
  readonly lifecycleImplementation?: WebSocketLifecycleImplementation;
  readonly platform: WebSocketPlatform;
  readonly wallClock: ReconnectingWebsocketWallClock;
};

export class WebSocketClient extends EventEmitter {
  private clientId?: string;
  private accessTokenRefreshPromise?: Promise<void>;
  private readonly baseUrl: string;
  private readonly logger: Logger;
  private readonly socket: ReconnectingWebsocket;
  private readonly wallClock: ReconnectingWebsocketWallClock;
  public readonly lifecycleImplementation: WebSocketLifecycleImplementation;
  private readonly usesCorrectedLifecycle: boolean;
  private websocketState: WEBSOCKET_STATE;
  public client: HttpClient;
  private isSocketLocked: boolean;
  private bufferedMessages: string[];
  private abortHandler: Maybe<AbortController> = Maybe.nothing();
  private connectionRequest: Maybe<{readonly onConnect: Maybe<OnConnect>}> = Maybe.nothing();
  private openConnectionContext: Maybe<WebSocketReconnectContext> = Maybe.nothing();
  private warnedAboutMissingConsumer = false;
  private versionPrefix = '';

  public static readonly TOPIC = TOPIC;

  private useLegacySocket: boolean = true;

  constructor(baseUrl: string, client: HttpClient, options: WebSocketClientOptions) {
    super();

    this.bufferedMessages = [];
    this.isSocketLocked = false;
    this.baseUrl = baseUrl;
    this.client = client;
    this.wallClock = options.wallClock;
    this.lifecycleImplementation = options.lifecycleImplementation ?? 'legacy';
    this.usesCorrectedLifecycle = this.lifecycleImplementation === 'corrected';
    this.socket = new ReconnectingWebsocket(this.onReconnect, {
      lifecycleImplementation: this.lifecycleImplementation,
      platform: options.platform,
      backFromSleepHandler: Maybe.nothing(),
      pingInterval: Maybe.nothing(),
      wallClock: options.wallClock,
      websocketFactory: Maybe.nothing(),
    });
    this.websocketState = this.socket.getState();

    this.logger = getLogger('@wireapp/api-client/tcp/WebSocketClient');
  }

  public useVersion(version: number): void {
    if (version < MINIMUM_API_VERSION) {
      throw new Error(`Minium supported api version is ${MINIMUM_API_VERSION} `);
    }
    this.versionPrefix = version > 0 ? `/v${version}` : '';
  }

  private onStateChange(newState: WEBSOCKET_STATE): void {
    if (newState !== this.websocketState) {
      this.websocketState = newState;
      this.emit(WebSocketClient.TOPIC.ON_STATE_CHANGE, this.websocketState);
    }
  }

  private readonly onMessage = (message: string): void => {
    if (isEmptyString(message)) {
      this.logger.warn('Received empty message from WebSocket');
      return;
    }

    const notificationListenerCount = this.listenerCount(TOPIC.ON_MESSAGE);
    if (notificationListenerCount === 0) {
      if (!this.warnedAboutMissingConsumer) {
        this.warnedAboutMissingConsumer = true;
        this.logger.warn('WebSocket application frame has no notification consumer', {
          subsystem: 'websocket-lifecycle',
          event: 'notification-consumer-missing',
          implementation: this.lifecycleImplementation,
          ...this.openConnectionContext.unwrapOr({}),
          locked: this.isLocked(),
        });
      }
    }

    if (this.isLocked()) {
      this.bufferedMessages.push(message);
      return;
    }
    const shouldSkipDispatch = this.usesCorrectedLifecycle && notificationListenerCount === 0;
    if (shouldSkipDispatch) {
      return;
    }

    let notification: Notification | ConsumableNotification;
    try {
      notification = this.useLegacySocket
        ? JSON.parse(message)
        : ConsumableNotificationSchema.parse(JSON.parse(message));
    } catch (error: unknown) {
      this.logger.warn('Could not parse WebSocket notification', {
        subsystem: 'websocket-lifecycle',
        event: 'notification-parse-failed',
        implementation: this.lifecycleImplementation,
        ...this.openConnectionContext.unwrapOr({}),
        errorName: StringUtil.getSafeErrorDetails(error).errorName,
      });
      if (!this.usesCorrectedLifecycle) {
        throw error;
      }
      return;
    }
    this.logger.debug('WebSocket notification parsed and ready for dispatch', {
      subsystem: 'websocket-lifecycle',
      event: 'notification-dispatch',
      implementation: this.lifecycleImplementation,
      ...this.openConnectionContext.unwrapOr({}),
      notificationListenerCount,
    });
    this.emit(TOPIC.ON_MESSAGE, notification);
  };

  private readonly onError = async (error: ErrorEvent, reconnectContext: WebSocketReconnectContext): Promise<void> => {
    this.onStateChange(this.socket.getState());
    this.emit(WebSocketClient.TOPIC.ON_ERROR, error);
    try {
      await this.refreshAccessToken();
    } catch (refreshError: unknown) {
      const {errorMessage, errorName} = StringUtil.getSafeErrorDetails(refreshError);
      this.logger.warn('WebSocket access token refresh failed', {
        subsystem: 'websocket-lifecycle',
        event: 'token-refresh-failure',
        source: 'socket-error',
        attemptId: reconnectContext.attemptId,
        wrapperGeneration: reconnectContext.wrapperGeneration,
        fatal: this.isInvalidSessionError(refreshError),
        errorName,
        errorMessage,
      });
    }
  };

  private readonly onReconnect = async (
    reconnectContext: WebSocketReconnectContext,
    isCurrentAttempt: () => boolean = () => {
      return true;
    },
  ): Promise<string> => {
    const websocket = this;
    function assertCurrentAttempt(): void {
      const attemptIsObsolete = websocket.usesCorrectedLifecycle && !isCurrentAttempt();
      if (attemptIsObsolete) {
        throw new DOMException('WebSocket attempt was cancelled', 'AbortError');
      }
    }

    assertCurrentAttempt();
    await this.waitForValidAccessTokenBeforeReconnect(reconnectContext, assertCurrentAttempt);
    assertCurrentAttempt();
    await this.verifyAuthenticatedSessionBeforeReconnect(reconnectContext);
    assertCurrentAttempt();

    return this.buildWebSocketUrl(reconnectContext);
  };

  private readonly onOpen = (): void => {
    this.onStateChange(this.socket.getState());
  };

  private readonly onClose = (): void => {
    this.abortOpenConnection();
    this.openConnectionContext = Maybe.nothing();
    this.bufferedMessages = [];
    if (this.usesCorrectedLifecycle) {
      this.isSocketLocked = false;
    }
    this.onStateChange(this.socket.getState());
  };

  private readonly onLongRunningRetry = (retryDetails: LongRunningRetryDetails): void => {
    this.emit(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY, retryDetails);
  };

  private abortOpenConnection(): void {
    if (this.abortHandler.isJust) {
      this.abortHandler.value.abort();
    }
  }

  /**
   * Attaches all listeners to the websocket and establishes the connection.
   *
   * @param clientId
   * When provided the websocket will get messages specific to the client.
   * If omitted the websocket will receive global messages for the account.
   *
   * @param onConnect
   * Handler that is executed before the websocket is fully connected.
   * Essentially the websocket will lock before execution of this function and
   * unlocks after the execution of the handler and pushes all buffered messages.
   */
  public connect(clientId?: string, onConnect?: OnConnect): WebSocketClient {
    this.clientId = clientId;
    const connectionRequest = Maybe.just({onConnect: Maybe.of(onConnect)});
    if (this.usesCorrectedLifecycle) {
      this.connectionRequest = connectionRequest;
      this.abortOpenConnection();
    }

    this.onStateChange(WEBSOCKET_STATE.CONNECTING);
    const requestWasReplaced = this.usesCorrectedLifecycle && this.connectionRequest !== connectionRequest;
    if (requestWasReplaced) {
      return this;
    }
    this.socket.setOnMessage(this.onMessage);
    this.socket.setOnError(this.onError);
    this.socket.setOnLongRunningRetry(this.onLongRunningRetry);
    this.socket.setOnOpen((_event, reconnectContext) => {
      this.warnedAboutMissingConsumer = false;
      if (!this.usesCorrectedLifecycle) {
        this.openConnectionContext = Maybe.just(reconnectContext);
        this.onOpen();
        if (!isUndefined(onConnect)) {
          const abortController = new AbortController();
          this.abortHandler = Maybe.just(abortController);
          onConnect(abortController, reconnectContext);
        }
        return;
      }
      this.abortOpenConnection();
      const abortController = new AbortController();
      this.abortHandler = Maybe.just(abortController);
      // A replaced wrapper can close after the new wrapper is already active.
      if (this.openConnectionContext.isJust) {
        this.bufferedMessages = [];
        this.isSocketLocked = false;
        this.onStateChange(WEBSOCKET_STATE.CLOSED);
      }
      if (abortController.signal.aborted) {
        return;
      }
      this.openConnectionContext = Maybe.just(reconnectContext);
      this.onOpen();
      if (!abortController.signal.aborted) {
        const connect = this.connectionRequest.andThen(request => {
          return request.onConnect;
        });
        if (connect.isJust) {
          connect.value(abortController, reconnectContext);
        }
      }
    });
    this.socket.setOnClose(this.onClose);

    this.socket.connect();
    return this;
  }

  private async refreshAccessToken(): Promise<void> {
    if (isPromise(this.accessTokenRefreshPromise)) {
      return this.accessTokenRefreshPromise;
    }

    this.accessTokenRefreshPromise = this.refreshAccessTokenWithCleanup();

    return this.accessTokenRefreshPromise;
  }

  private async waitForValidAccessTokenBeforeReconnect(
    reconnectContext: WebSocketReconnectContext,
    assertCurrentAttempt: () => void,
  ): Promise<void> {
    let retryCount = 0;
    const tokenValidationStartTimestampInMilliseconds = this.wallClock.currentTimestampInMilliseconds;
    const tokenIsValid = this.client.hasValidAccessToken();
    this.logger.debug('Validating access token before WebSocket reconnect', {
      subsystem: 'websocket-lifecycle',
      event: 'token-validation-start',
      attemptId: reconnectContext.attemptId,
      wrapperGeneration: reconnectContext.wrapperGeneration,
      tokenValid: tokenIsValid,
      refreshInFlight: isPromise(this.accessTokenRefreshPromise),
    });

    if (tokenIsValid) {
      this.logger.info('Access token is valid for WebSocket reconnect', {
        subsystem: 'websocket-lifecycle',
        event: 'token-validation-success',
        attemptId: reconnectContext.attemptId,
        wrapperGeneration: reconnectContext.wrapperGeneration,
        refreshed: false,
        durationMs: 0,
      });
      return;
    }

    while (true) {
      assertCurrentAttempt();
      const refreshStartTimestampInMilliseconds = this.wallClock.currentTimestampInMilliseconds;
      this.logger.debug('Refreshing access token before WebSocket reconnect', {
        subsystem: 'websocket-lifecycle',
        event: 'token-refresh-start',
        attemptId: reconnectContext.attemptId,
        wrapperGeneration: reconnectContext.wrapperGeneration,
        retry: retryCount,
      });

      try {
        await this.refreshAccessToken();
      } catch (error: unknown) {
        assertCurrentAttempt();
        if (this.isInvalidSessionError(error)) {
          const {errorMessage, errorName} = StringUtil.getSafeErrorDetails(error);
          this.logger.warn('WebSocket access token refresh failed', {
            subsystem: 'websocket-lifecycle',
            event: 'token-refresh-failure',
            attemptId: reconnectContext.attemptId,
            wrapperGeneration: reconnectContext.wrapperGeneration,
            fatal: true,
            errorName,
            errorMessage,
          });
          throw error;
        }

        retryCount += 1;
        const nextRetryDelayInMilliseconds = this.getAccessTokenRefreshRetryDelayInMilliseconds(retryCount);
        const {errorMessage, errorName} = StringUtil.getSafeErrorDetails(error);
        this.logger.warn('Scheduling another access token refresh before WebSocket reconnect', {
          subsystem: 'websocket-lifecycle',
          event: 'token-refresh-retry',
          attemptId: reconnectContext.attemptId,
          wrapperGeneration: reconnectContext.wrapperGeneration,
          retry: retryCount,
          nextDelayMs: nextRetryDelayInMilliseconds,
          errorName,
          errorMessage,
        });
        await this.waitForNextAccessTokenRefreshRetry(nextRetryDelayInMilliseconds);
        continue;
      }

      if (this.client.hasValidAccessToken()) {
        this.logger.info('Access token refreshed for WebSocket reconnect', {
          subsystem: 'websocket-lifecycle',
          event: 'token-refresh-success',
          attemptId: reconnectContext.attemptId,
          wrapperGeneration: reconnectContext.wrapperGeneration,
          retry: retryCount,
          durationMs: this.wallClock.currentTimestampInMilliseconds - refreshStartTimestampInMilliseconds,
        });
        this.logger.info('Access token is valid for WebSocket reconnect', {
          subsystem: 'websocket-lifecycle',
          event: 'token-validation-success',
          attemptId: reconnectContext.attemptId,
          wrapperGeneration: reconnectContext.wrapperGeneration,
          refreshed: true,
          durationMs: this.wallClock.currentTimestampInMilliseconds - tokenValidationStartTimestampInMilliseconds,
        });
        return;
      }

      retryCount += 1;
      const nextRetryDelayInMilliseconds = this.getAccessTokenRefreshRetryDelayInMilliseconds(retryCount);
      this.logger.warn('Scheduling another access token refresh before WebSocket reconnect', {
        subsystem: 'websocket-lifecycle',
        event: 'token-refresh-retry',
        attemptId: reconnectContext.attemptId,
        wrapperGeneration: reconnectContext.wrapperGeneration,
        retry: retryCount,
        nextDelayMs: nextRetryDelayInMilliseconds,
        errorName: 'InvalidAccessTokenState',
        errorMessage: 'Token remains invalid after refresh',
      });
      await this.waitForNextAccessTokenRefreshRetry(nextRetryDelayInMilliseconds);
    }
  }

  private async verifyAuthenticatedSessionBeforeReconnect(reconnectContext: WebSocketReconnectContext): Promise<void> {
    const preflightStartTimestampInMilliseconds = this.wallClock.currentTimestampInMilliseconds;
    this.logger.debug('WebSocket authentication preflight started', {
      subsystem: 'websocket-lifecycle',
      event: 'auth-preflight-start',
      attemptId: reconnectContext.attemptId,
      wrapperGeneration: reconnectContext.wrapperGeneration,
      endpoint: 'cookies',
    });

    try {
      await this.client.sendRequest({
        method: 'get',
        url: AuthAPI.URL.COOKIES,
      });
    } catch (error: unknown) {
      const {errorMessage, errorName} = StringUtil.getSafeErrorDetails(error);
      this.logger.warn('WebSocket authentication preflight failed', {
        subsystem: 'websocket-lifecycle',
        event: 'auth-preflight-failure',
        attemptId: reconnectContext.attemptId,
        wrapperGeneration: reconnectContext.wrapperGeneration,
        durationMs: this.wallClock.currentTimestampInMilliseconds - preflightStartTimestampInMilliseconds,
        errorName,
        errorMessage,
      });
      throw error;
    }

    this.logger.info('WebSocket authentication preflight passed', {
      subsystem: 'websocket-lifecycle',
      event: 'auth-preflight-success',
      attemptId: reconnectContext.attemptId,
      wrapperGeneration: reconnectContext.wrapperGeneration,
      durationMs: this.wallClock.currentTimestampInMilliseconds - preflightStartTimestampInMilliseconds,
    });
  }

  private isInvalidSessionError(error: unknown): boolean {
    return (
      error instanceof InvalidTokenError ||
      error instanceof MissingCookieError ||
      error instanceof MissingCookieAndTokenError
    );
  }

  private getAccessTokenRefreshRetryDelayInMilliseconds(retryCount: number): number {
    const delayInMilliseconds =
      accessTokenRefreshRetryInitialDelayInMilliseconds *
      accessTokenRefreshRetryBackoffFactor ** (retryCount - firstRetryAttemptOffset);

    return Math.min(delayInMilliseconds, accessTokenRefreshRetryMaximumDelayInMilliseconds);
  }

  private waitForNextAccessTokenRefreshRetry(delayInMilliseconds: number): Promise<void> {
    return new Promise(resolve => {
      this.wallClock.setTimeout(resolve, delayInMilliseconds);
    });
  }

  private async refreshAccessTokenWithCleanup(): Promise<void> {
    try {
      await this.refreshAccessTokenOnce();
    } finally {
      this.accessTokenRefreshPromise = undefined;
    }
  }

  private async refreshAccessTokenOnce(): Promise<void> {
    try {
      await this.client.refreshAccessToken();
    } catch (error: unknown) {
      if (
        error instanceof InvalidTokenError ||
        error instanceof MissingCookieError ||
        error instanceof MissingCookieAndTokenError
      ) {
        // On invalid cookie the application is supposed to logout.
        this.emit(WebSocketClient.TOPIC.ON_INVALID_TOKEN, error);
      } else if (!(error instanceof NetworkError)) {
        this.emit(WebSocketClient.TOPIC.ON_ERROR, error);
      }

      throw error;
    }
  }

  public disconnect(reason?: string): void {
    if (!this.usesCorrectedLifecycle) {
      this.socket.disconnect(reason);
      return;
    }
    this.abortOpenConnection();
    this.abortHandler = Maybe.nothing();
    this.connectionRequest = Maybe.nothing();
    this.openConnectionContext = Maybe.nothing();
    this.bufferedMessages = [];
    this.isSocketLocked = false;
    try {
      this.socket.disconnect(reason);
    } finally {
      this.onStateChange(WEBSOCKET_STATE.CLOSED);
    }
  }

  /**
   * Unlocks the websocket.
   * When unlocking the websocket all buffered messages between
   * connecting the websocket and the unlocking the websocket will be emitted.
   */
  public readonly unlock = (): void => {
    const signal = this.usesCorrectedLifecycle
      ? this.abortHandler.map(controller => {
          return controller.signal;
        })
      : Maybe.nothing<AbortSignal>();
    const bufferedMessages = this.bufferedMessages;
    if (this.usesCorrectedLifecycle) {
      this.bufferedMessages = [];
    }
    this.logger.debug('WebSocket unlocked', {
      subsystem: 'websocket-lifecycle',
      event: 'socket-unlocked',
      ...this.openConnectionContext.unwrapOr({}),
      bufferedNotificationCount: bufferedMessages.length,
    });
    this.isSocketLocked = false;
    for (const bufferedMessage of bufferedMessages) {
      const socketClosed = signal.isJust && signal.value.aborted;
      if (socketClosed) {
        break;
      }
      this.onMessage(bufferedMessage);
    }
    if (!this.usesCorrectedLifecycle) {
      this.bufferedMessages = [];
    }
  };

  /**
   * Locks the websocket so messages are buffered instead of being emitted.
   * Once the websocket gets unlocked buffered messages get emitted.
   * This behaviour is needed in order to not miss any messages
   * during fetching notifications from the notification stream.
   */
  public readonly lock = (): void => {
    const alreadyLocked = this.usesCorrectedLifecycle && this.isSocketLocked;
    if (alreadyLocked) {
      return;
    }
    this.isSocketLocked = true;
    this.logger.debug('WebSocket locked', {
      subsystem: 'websocket-lifecycle',
      event: 'socket-locked',
      ...this.openConnectionContext.unwrapOr({}),
    });
  };

  public isLocked(): boolean {
    return this.isSocketLocked;
  }

  public buildWebSocketUrl(reconnectContext?: WebSocketReconnectContext): string {
    const {
      accessTokenStore: {getAccessToken, getNextMarkerToken},
    } = this.client;
    const accessToken = getAccessToken?.() ?? '';
    const skipMarker = this.usesCorrectedLifecycle && this.useLegacySocket;
    const markerToken = skipMarker ? '' : (getNextMarkerToken?.() ?? '');
    const markerIncluded = !this.useLegacySocket && markerToken.length > 0;

    if (!Boolean(this.versionPrefix)) {
      throw new Error('Missing backend API version: cannot establish WebSocket connection');
    }

    const queryParams = new URLSearchParams({
      access_token: accessToken,
    });

    if (markerIncluded) {
      queryParams.append('sync_marker', markerToken);
    }

    /**
     * @note If no client ID is given, then the WebSocket connection
     * will receive all notifications for all clients of the connected user
     */
    if (this.clientId !== undefined && this.clientId.length > 0) {
      queryParams.append('client', this.clientId);
    }

    const queryString = queryParams.toString();

    const websocketAddress = this.useLegacySocket
      ? `${this.baseUrl}/await?${queryString}`
      : `${this.baseUrl}${this.versionPrefix}/events?${queryString}`;

    const attemptId = reconnectContext?.attemptId ?? 0;
    const wrapperGeneration = reconnectContext?.wrapperGeneration ?? 0;
    const endpoint = this.useLegacySocket ? 'legacy-await' : 'async-events';
    const accessTokenPresent = accessToken.length > 0;
    const clientPresent = this.clientId !== undefined && this.clientId.length > 0;
    if (!accessTokenPresent) {
      this.logger.warn('WebSocket URL created without an access token', {
        subsystem: 'websocket-lifecycle',
        event: 'url-created-without-access-token',
        attemptId,
        wrapperGeneration,
        endpoint,
        clientPresent,
        markerIncluded,
      });
    }
    this.logger.info('WebSocket URL created', {
      subsystem: 'websocket-lifecycle',
      event: 'url-created',
      attemptId,
      wrapperGeneration,
      endpoint,
      accessTokenPresent,
      clientPresent,
      markerIncluded,
    });

    return websocketAddress;
  }

  public useAsyncNotificationsSocket(): void {
    this.useLegacySocket = false;
    // we shouldn't send ping to the new async notifications sockets otherwise the backend will close the connection
    this.socket.disablePinging();
  }

  public acknowledgeMissedNotification(): void {
    const jsonEvent = JSON.stringify({
      type: AcknowledgeType.ACK_FULL_SYNC,
    });

    this.socket.send(jsonEvent);
  }

  public acknowledgeConsumableNotificationSynchronization(notification: ConsumableNotificationSynchronization): void {
    const jsonEvent = JSON.stringify({
      type: AcknowledgeType.ACK,
      data: {
        multiple: false,
        delivery_tag: notification.data.delivery_tag,
      },
    });

    this.socket.send(jsonEvent);
  }

  public acknowledgeNotification(notification: ConsumableNotificationEvent): void {
    if (this.socket?.getState() !== WebSocket.OPEN) {
      return;
    }

    const jsonEvent = JSON.stringify({
      type: AcknowledgeType.ACK,
      data: {
        delivery_tag: notification.data.delivery_tag,
        // Note: this can be used when implementing batch proccessing
        multiple: false,
      },
    });

    this.socket.send(jsonEvent);
  }

  /**
   * Performs a lightweight health check on the WebSocket connection.
   * Sends a ping and waits for a pong response without closing or reconnecting the socket.
   * The default timeout is 5 seconds; this may be configurable depending on the socket implementation.
   * This method does not disrupt the existing connection.
   * @returns A promise that resolves to true if a pong is received within the timeout, false otherwise.
   */
  public checkHealth(): Promise<boolean> {
    return this.socket.checkHealth();
  }
}
