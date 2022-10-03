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

import {EventEmitter} from 'events';
import logdown from 'logdown';
import {CloseEvent, ErrorEvent} from 'reconnecting-websocket';

import {HttpClient, NetworkError} from '../http/';
import {InvalidTokenError, MissingCookieError} from '../auth/';
import {ReconnectingWebsocket, WEBSOCKET_STATE} from './ReconnectingWebsocket';
import {Notification} from '../notification/';

enum TOPIC {
  ON_ERROR = 'WebSocketClient.TOPIC.ON_ERROR',
  ON_INVALID_TOKEN = 'WebSocketClient.TOPIC.ON_INVALID_TOKEN',
  ON_MESSAGE = 'WebSocketClient.TOPIC.ON_MESSAGE',
  ON_STATE_CHANGE = 'WebSocketClient.TOPIC.ON_STATE_CHANGE',
}

export interface WebSocketClient {
  on(event: TOPIC.ON_ERROR, listener: (error: Error | ErrorEvent) => void): this;
  on(event: TOPIC.ON_INVALID_TOKEN, listener: (error: InvalidTokenError | MissingCookieError) => void): this;
  on(event: TOPIC.ON_MESSAGE, listener: (notification: Notification) => void): this;
  on(event: TOPIC.ON_STATE_CHANGE, listener: (state: WEBSOCKET_STATE) => void): this;
}

export class AbortHandler {
  private aborted = false;

  abort = () => {
    this.aborted = true;
  };

  isAborted = () => this.aborted;
}

export type OnConnect = (abortHandler: AbortHandler) => Promise<void>;

export class WebSocketClient extends EventEmitter {
  private clientId?: string;
  private isRefreshingAccessToken: boolean;
  private readonly baseUrl: string;
  private readonly logger: logdown.Logger;
  private readonly socket: ReconnectingWebsocket;
  private websocketState: WEBSOCKET_STATE;
  public client: HttpClient;
  private isSocketLocked: boolean;
  private bufferedMessages: string[];
  private abortHandler?: AbortHandler;

  public static readonly TOPIC = TOPIC;

  constructor(baseUrl: string, client: HttpClient) {
    super();

    this.bufferedMessages = [];
    this.isSocketLocked = false;
    this.baseUrl = baseUrl;
    this.client = client;
    this.isRefreshingAccessToken = false;
    this.socket = new ReconnectingWebsocket(this.onReconnect);
    this.websocketState = this.socket.getState();

    this.logger = logdown('@wireapp/api-client/tcp/WebSocketClient', {
      logger: console,
      markdown: false,
    });
  }

  private onStateChange(newState: WEBSOCKET_STATE): void {
    if (newState !== this.websocketState) {
      this.websocketState = newState;
      this.emit(WebSocketClient.TOPIC.ON_STATE_CHANGE, this.websocketState);
    }
  }

  private readonly onMessage = (data: string) => {
    if (this.isLocked()) {
      this.bufferedMessages.push(data);
    } else {
      const notification: Notification = JSON.parse(data);
      this.emit(WebSocketClient.TOPIC.ON_MESSAGE, notification);
    }
  };

  private readonly onError = async (error: ErrorEvent) => {
    this.onStateChange(this.socket.getState());
    this.emit(WebSocketClient.TOPIC.ON_ERROR, error);
    await this.refreshAccessToken();
  };

  private readonly onReconnect = async () => {
    if (!this.client.hasValidAccessToken()) {
      // before we try any connection, we first refresh the access token to make sure we will avoid concurrent accessToken refreshes
      await this.refreshAccessToken();
    }
    return this.buildWebSocketUrl();
  };

  private readonly onOpen = () => {
    this.onStateChange(this.socket.getState());
  };

  private readonly onClose = (event: CloseEvent) => {
    this.abortHandler?.abort();
    this.bufferedMessages = [];
    this.onStateChange(this.socket.getState());
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
    this.socket.setOnOpen(() => {
      this.onOpen();
      if (onConnect) {
        this.abortHandler = new AbortHandler();
        void onConnect(this.abortHandler);
      }
    });
    this.socket.setOnClose(this.onClose);

    this.socket.connect();
    return this;
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.isRefreshingAccessToken) {
      return;
    }
    this.isRefreshingAccessToken = true;

    try {
      await this.client.refreshAccessToken();
    } catch (error) {
      if (error instanceof NetworkError) {
        this.logger.warn(error);
      } else if (error instanceof InvalidTokenError || error instanceof MissingCookieError) {
        // On invalid cookie the application is supposed to logout.
        this.logger.warn(
          `[WebSocket] Cannot renew access token because cookie/token is invalid: ${error.message}`,
          error,
        );
        this.emit(WebSocketClient.TOPIC.ON_INVALID_TOKEN, error);
      } else {
        this.emit(WebSocketClient.TOPIC.ON_ERROR, error);
      }
    } finally {
      this.isRefreshingAccessToken = false;
    }
  }

  public disconnect(reason?: string, keepClosed = true): void {
    if (this.socket) {
      this.socket.disconnect(reason, keepClosed);
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

  private buildWebSocketUrl(): string {
    const store = this.client.accessTokenStore.accessToken;
    const token = store && store.access_token ? store.access_token : '';
    if (!token) {
      this.logger.warn('Reconnecting WebSocket with unset token');
    }
    let url = `${this.baseUrl}/await?access_token=${token}`;
    if (this.clientId) {
      // Note: If no client ID is given, then the WebSocket connection will receive all notifications for all clients
      // of the connected user
      url += `&client=${this.clientId}`;
    }
    return url;
  }
}
