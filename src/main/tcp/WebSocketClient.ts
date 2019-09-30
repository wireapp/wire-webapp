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

import EventEmitter from 'events';
import logdown from 'logdown';
import {CloseEvent, ErrorEvent, Event} from 'reconnecting-websocket';

import {InvalidTokenError} from '../auth/';
import {BackendErrorMapper, HttpClient, NetworkError} from '../http/';
import {ReconnectingWebsocket, WEBSOCKET_STATE} from './ReconnectingWebsocket';

export enum WebSocketTopic {
  ON_ERROR = 'WebSocketTopic.ON_ERROR',
  ON_INVALID_TOKEN = 'WebSocketTopic.ON_INVALID_TOKEN',
  ON_MESSAGE = 'WebSocketTopic.ON_MESSAGE',
  ON_STATE_CHANGE = 'WebSocketTopic.ON_STATE_CHANGE',
}

export class WebSocketClient extends EventEmitter {
  private clientId?: string;
  private isRefreshingAccessToken: boolean;
  private readonly baseUrl: string;
  private readonly logger: logdown.Logger;
  private readonly socket: ReconnectingWebsocket;
  private websocketState: WEBSOCKET_STATE;
  public client: HttpClient;

  constructor(baseUrl: string, client: HttpClient) {
    super();

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
      this.emit(WebSocketTopic.ON_STATE_CHANGE, this.websocketState);
    }
  }

  private readonly onMessage = (data: string) => {
    const notification: Notification = JSON.parse(data);
    this.emit(WebSocketTopic.ON_MESSAGE, notification);
  };

  private readonly onError = async (error: ErrorEvent) => {
    this.onStateChange(this.socket.getState());
    this.emit(WebSocketTopic.ON_ERROR, error);
    await this.refreshAccessToken();
  };

  private readonly onReconnect = () => {
    this.onStateChange(this.socket.getState());
    return this.buildWebSocketUrl();
  };

  private readonly onOpen = (event: Event) => {
    this.onStateChange(this.socket.getState());
  };

  private readonly onClose = (event: CloseEvent) => {
    this.onStateChange(this.socket.getState());
  };

  public async connect(clientId?: string): Promise<WebSocketClient> {
    this.clientId = clientId;

    this.socket.setOnMessage(this.onMessage);
    this.socket.setOnError(this.onError);
    this.socket.setOnOpen(this.onOpen);
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
      } else {
        const mappedError = BackendErrorMapper.map(error);
        // On invalid token the WebSocket is supposed to get closed by the client
        this.emit(
          error instanceof InvalidTokenError ? WebSocketTopic.ON_INVALID_TOKEN : WebSocketTopic.ON_ERROR,
          mappedError,
        );
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

  private buildWebSocketUrl(accessToken = this.client.accessTokenStore.accessToken!.access_token): string {
    let url = `${this.baseUrl}/await?access_token=${accessToken}`;
    if (this.clientId) {
      // Note: If no client ID is given, then the WebSocket connection will receive all notifications for all clients
      // of the connected user
      url += `&client=${this.clientId}`;
    }
    return url;
  }
}
