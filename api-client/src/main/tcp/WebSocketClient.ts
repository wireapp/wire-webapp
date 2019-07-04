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

import {TimeUtil} from '@wireapp/commons';
import EventEmitter from 'events';
import Html5WebSocket from 'html5-websocket';
import logdown from 'logdown';

import {InvalidTokenError} from '../auth/';
import {IncomingNotification} from '../conversation/';
import {BackendErrorMapper, HttpClient, NetworkError} from '../http/';
import * as buffer from '../shims/node/buffer';

const ReconnectingWebsocket = require('reconnecting-websocket');

export enum WebSocketTopic {
  ON_DISCONNECT = 'WebSocketTopic.ON_DISCONNECT',
  ON_ERROR = 'WebSocketTopic.ON_ERROR',
  ON_MESSAGE = 'WebSocketTopic.ON_MESSAGE',
  ON_OFFLINE = 'WebSocketTopic.ON_OFFLINE',
  ON_RECONNECT = 'WebSocketTopic.ON_RECONNECT',
}

export enum CloseEventCode {
  GOING_AWAY = 1001,
  NORMAL_CLOSURE = 1000,
  PROTOCOL_ERROR = 1002,
  UNSUPPORTED_DATA = 1003,
}

export enum PingMessage {
  PING = 'ping',
  PONG = 'pong',
}

export class WebSocketClient extends EventEmitter {
  public static CONFIG = {
    PING_INTERVAL: TimeUtil.TimeInMillis.SECOND * 5,
  };

  public static RECONNECTING_OPTIONS = {
    connectionTimeout: TimeUtil.TimeInMillis.SECOND * 4,
    constructor: typeof window !== 'undefined' ? WebSocket : Html5WebSocket,
    debug: false,
    maxReconnectionDelay: TimeUtil.TimeInMillis.SECOND * 10,
    maxRetries: Infinity,
    minReconnectionDelay: TimeUtil.TimeInMillis.SECOND * 4,
    reconnectionDelayGrowFactor: 1.3,
  };
  public client: HttpClient;
  public isOnline: boolean;
  private readonly baseUrl: string;
  private readonly logger: logdown.Logger;
  private clientId?: string;
  private hasUnansweredPing: boolean;
  private pingInterval?: NodeJS.Timeout;
  private socket?: WebSocket;

  constructor(baseUrl: string, client: HttpClient) {
    super();

    this.baseUrl = baseUrl;
    this.client = client;
    this.hasUnansweredPing = false;
    this.isOnline = false;

    this.logger = logdown('@wireapp/api-client/tcp/WebSocketClient', {
      logger: console,
      markdown: false,
    });
  }

  public async connect(clientId?: string): Promise<WebSocketClient> {
    this.clientId = clientId;

    this.socket = new ReconnectingWebsocket(
      () => this.buildWebSocketUrl(),
      undefined,
      WebSocketClient.RECONNECTING_OPTIONS,
    ) as WebSocket;

    this.socket.onmessage = (event: MessageEvent) => {
      const data = buffer.bufferToString(event.data);
      if (data === PingMessage.PONG) {
        this.logger.debug('Received pong from WebSocket');
        this.hasUnansweredPing = false;
      } else {
        const notification: IncomingNotification = JSON.parse(data);
        this.emit(WebSocketTopic.ON_MESSAGE, notification);
      }
    };

    this.socket.onerror = event => {
      this.logger.warn(`WebSocket connection error: "${(event as any).message}"`);
      return this.refreshAccessToken();
    };

    this.socket.onopen = async () => {
      if (this.socket) {
        this.socket.binaryType = 'arraybuffer';
      }

      this.logger.info(`Connected WebSocket to "${this.baseUrl}"`);
      this.pingInterval = setInterval(this.sendPing, WebSocketClient.CONFIG.PING_INTERVAL);

      if (!this.isOnline) {
        this.emit(WebSocketTopic.ON_RECONNECT);
        await this.refreshAccessToken();
      }
    };

    return this;
  }

  public disconnect(reason = 'Unknown reason', keepClosed = true): void {
    if (this.socket) {
      this.logger.info(`Disconnecting from WebSocket (reason: "${reason}")`);
      // TODO: 'any' can be removed once this issue is resolved:
      // https://github.com/pladaria/reconnecting-websocket/issues/44
      (this.socket as any).close(CloseEventCode.NORMAL_CLOSURE, reason, {
        delay: 0,
        fastClose: true,
        keepClosed,
      });

      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.emit(WebSocketTopic.ON_OFFLINE);
      }
    }

    this.isOnline = false;
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

  private async refreshAccessToken(): Promise<void> {
    try {
      await this.client.refreshAccessToken();
    } catch (error) {
      if (error instanceof NetworkError) {
        this.logger.warn(error);
      } else {
        const mappedError = BackendErrorMapper.map(error);
        this.emit(
          error instanceof InvalidTokenError ? WebSocketTopic.ON_DISCONNECT : WebSocketTopic.ON_ERROR,
          mappedError,
        );
      }
    }
  }

  private readonly sendPing = (): void => {
    if (this.socket) {
      if (this.hasUnansweredPing) {
        this.logger.warn('Ping interval check failed');
        return this.disconnect('Failed ping check', false);
      }
      this.logger.debug('Sending ping to WebSocket');
      this.hasUnansweredPing = true;
      return this.socket.send(PingMessage.PING);
    }
  };
}
