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

import is from '@sindresorhus/is';
import logdown from 'logdown';
import type {ErrorEvent} from 'partysocket/ws';
import {Maybe} from 'true-myth';

import {EventEmitter} from 'events';

import {LogFactory} from '@wireapp/commons';

import {AcknowledgeType} from './acknowledgeEvent.types';
import {
  LongRunningRetryDetails,
  ReconnectingWebsocket,
  ReconnectingWebsocketWallClock,
  WEBSOCKET_STATE,
} from './reconnectingWebsocket';

import {InvalidTokenError, MissingCookieAndTokenError, MissingCookieError} from '../auth/';
import {MINIMUM_API_VERSION} from '../config';
import {HttpClient, NetworkError} from '../http/';
import {Notification} from '../notification';
import {
  ConsumableNotification,
  ConsumableNotificationEvent,
  ConsumableNotificationSchema,
  ConsumableNotificationSynchronization,
} from '../notification/consumableNotification';

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

export type OnConnect = (abortHandler: AbortController) => void;

export type WebSocketClientOptions = {
  readonly wallClock: ReconnectingWebsocketWallClock;
};

export class WebSocketClient extends EventEmitter {
  private clientId?: string;
  private accessTokenRefreshPromise?: Promise<void>;
  private readonly baseUrl: string;
  private readonly logger: logdown.Logger;
  private readonly socket: ReconnectingWebsocket;
  private readonly wallClock: ReconnectingWebsocketWallClock;
  private websocketState: WEBSOCKET_STATE;
  public client: HttpClient;
  private isSocketLocked: boolean;
  private bufferedMessages: string[];
  private abortHandler?: AbortController;
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
    this.socket = new ReconnectingWebsocket(this.onReconnect, {
      backFromSleepHandler: Maybe.nothing(),
      pingInterval: Maybe.nothing(),
      wallClock: options.wallClock,
      websocketFactory: Maybe.nothing(),
    });
    this.websocketState = this.socket.getState();

    this.logger = LogFactory.getLogger('@wireapp/api-client/tcp/WebSocketClient');
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

  private readonly onMessage = (data: string) => {
    if (data.length === 0) {
      this.logger.warn('Received empty message from WebSocket');
      return;
    }

    if (this.isLocked()) {
      this.bufferedMessages.push(data);
    } else {
      const notification = this.useLegacySocket
        ? JSON.parse(data)
        : ConsumableNotificationSchema.parse(JSON.parse(data));
      this.emit(WebSocketClient.TOPIC.ON_MESSAGE, notification);
    }
  };

  private readonly onError = async (error: ErrorEvent) => {
    this.onStateChange(this.socket.getState());
    this.emit(WebSocketClient.TOPIC.ON_ERROR, error);
    try {
      await this.refreshAccessToken();
    } catch {
      // Refresh failures are already emitted by refreshAccessToken().
    }
  };

  private readonly onReconnect = async () => {
    await this.waitForValidAccessTokenBeforeReconnect();

    return this.buildWebSocketUrl();
  };

  private readonly onOpen = () => {
    this.onStateChange(this.socket.getState());
  };

  private readonly onClose = () => {
    this.abortHandler?.abort();
    this.bufferedMessages = [];
    this.onStateChange(this.socket.getState());
  };

  private readonly onLongRunningRetry = (retryDetails: LongRunningRetryDetails) => {
    this.emit(WebSocketClient.TOPIC.ON_LONG_RUNNING_RETRY, retryDetails);
  };

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

    this.onStateChange(WEBSOCKET_STATE.CONNECTING);
    this.socket.setOnMessage(this.onMessage);
    this.socket.setOnError(this.onError);
    this.socket.setOnLongRunningRetry(this.onLongRunningRetry);
    this.socket.setOnOpen(() => {
      this.onOpen();
      if (onConnect !== null && onConnect !== undefined) {
        this.abortHandler = new AbortController();
        void onConnect(this.abortHandler);
      }
    });
    this.socket.setOnClose(this.onClose);

    this.socket.connect();
    return this;
  }

  private async refreshAccessToken(): Promise<void> {
    if (is.promise(this.accessTokenRefreshPromise)) {
      return this.accessTokenRefreshPromise;
    }

    this.accessTokenRefreshPromise = this.refreshAccessTokenWithCleanup();

    return this.accessTokenRefreshPromise;
  }

  private async waitForValidAccessTokenBeforeReconnect(): Promise<void> {
    let retryCount = 0;

    while (!this.client.hasValidAccessToken()) {
      this.logger.info(`WebSocket reconnect waiting for access-token refresh. retry count: ${retryCount}`);

      try {
        await this.refreshAccessToken();
      } catch (error: unknown) {
        if (this.isInvalidSessionError(error)) {
          this.logger.warn(
            'WebSocket reconnect stopped because access-token refresh failed with an invalid session. Logout handling should take over.',
            error,
          );
          throw error;
        }

        retryCount += 1;
        const nextRetryDelayInMilliseconds = this.getAccessTokenRefreshRetryDelayInMilliseconds(retryCount);
        this.logger.warn(
          `WebSocket reconnect access-token refresh failed transiently. retry count: ${retryCount}, next retry delay: ${nextRetryDelayInMilliseconds}ms`,
          error,
        );
        await this.waitForNextAccessTokenRefreshRetry(nextRetryDelayInMilliseconds);
        continue;
      }

      if (this.client.hasValidAccessToken()) {
        this.logger.info('WebSocket reconnect access-token refresh succeeded; building WebSocket URL');
        return;
      }

      retryCount += 1;
      const nextRetryDelayInMilliseconds = this.getAccessTokenRefreshRetryDelayInMilliseconds(retryCount);
      this.logger.warn(
        `WebSocket reconnect access-token refresh completed but token is still invalid. retry count: ${retryCount}, next retry delay: ${nextRetryDelayInMilliseconds}ms`,
      );
      await this.waitForNextAccessTokenRefreshRetry(nextRetryDelayInMilliseconds);
    }
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
      if (error instanceof NetworkError) {
        this.logger.warn(error);
      } else if (
        error instanceof InvalidTokenError ||
        error instanceof MissingCookieError ||
        error instanceof MissingCookieAndTokenError
      ) {
        // On invalid cookie the application is supposed to logout.
        this.logger.warn(
          `[WebSocket] Cannot renew access token because cookie/token is invalid: ${error.message}`,
          error,
        );
        this.emit(WebSocketClient.TOPIC.ON_INVALID_TOKEN, error);
      } else {
        this.emit(WebSocketClient.TOPIC.ON_ERROR, error);
      }

      throw error;
    }
  }

  public disconnect(reason?: string): void {
    if (this.socket !== undefined) {
      this.socket.disconnect(reason);
    }
  }

  /**
   * Unlocks the websocket.
   * When unlocking the websocket all buffered messages between
   * connecting the websocket and the unlocking the websocket will be emitted.
   */
  public readonly unlock = () => {
    this.logger.info(`Unlocking WebSocket - Emitting "${this.bufferedMessages.length}" unprocessed messages`);
    this.isSocketLocked = false;
    for (const bufferedMessage of this.bufferedMessages) {
      this.onMessage(bufferedMessage);
    }
    this.bufferedMessages = [];
  };

  /**
   * Locks the websocket so messages are buffered instead of being emitted.
   * Once the websocket gets unlocked buffered messages get emitted.
   * This behaviour is needed in order to not miss any messages
   * during fetching notifications from the notification stream.
   */
  public readonly lock = () => {
    this.logger.info('Locking WebSocket');
    this.isSocketLocked = true;
  };

  public isLocked(): boolean {
    return this.isSocketLocked;
  }

  public buildWebSocketUrl(): string {
    const {
      accessTokenStore: {getAccessToken, getNextMarkerToken},
    } = this.client;
    const accessToken = getAccessToken?.() ?? '';
    const markerToken = getNextMarkerToken?.() ?? '';

    if (accessToken.length === 0) {
      this.logger.warn('Reconnecting WebSocket with unset token');
    }

    if (this.versionPrefix.length === 0) {
      throw new Error('Missing backend API version: cannot establish WebSocket connection');
    }

    const queryParams = new URLSearchParams({
      access_token: accessToken,
    });

    if (markerToken.length > 0 && !this.useLegacySocket) {
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

    const redactedQueryParams = new URLSearchParams(queryParams);
    redactedQueryParams.set('access_token', '[redacted]');
    const redactedWebsocketAddress = this.useLegacySocket
      ? `${this.baseUrl}/await?${redactedQueryParams.toString()}`
      : `${this.baseUrl}${this.versionPrefix}/events?${redactedQueryParams.toString()}`;

    this.logger.info(`WebSocket URL: ${redactedWebsocketAddress}`);

    return websocketAddress;
  }

  public useAsyncNotificationsSocket() {
    this.useLegacySocket = false;
    // we shouldn't send ping to the new async notifications sockets otherwise the backend will close the connection
    this.socket.disablePinging();
  }

  public acknowledgeMissedNotification() {
    const jsonEvent = JSON.stringify({
      type: AcknowledgeType.ACK_FULL_SYNC,
    });

    this.socket.send(jsonEvent);
  }

  public acknowledgeConsumableNotificationSynchronization(notification: ConsumableNotificationSynchronization) {
    const jsonEvent = JSON.stringify({
      type: AcknowledgeType.ACK,
      data: {
        multiple: false,
        delivery_tag: notification.data.delivery_tag,
      },
    });

    this.socket.send(jsonEvent);
  }

  public acknowledgeNotification(notification: ConsumableNotificationEvent) {
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
