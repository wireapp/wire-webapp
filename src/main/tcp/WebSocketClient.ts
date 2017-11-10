//
// Wire
// Copyright (C) 2017 Wire Swiss GmbH
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see http://www.gnu.org/licenses/.
//

import EventEmitter = require('events');
import {HttpClient} from '../http/';
import {IncomingNotification} from '../conversation/';

const buffer = require('../shims/node/buffer');
const Html5WebSocket = require('html5-websocket');
const ReconnectingWebsocket = require('reconnecting-websocket');

export default class WebSocketClient extends EventEmitter {
  private clientId: string;

  private socket: WebSocket;

  public static RECONNECTING_OPTIONS = {
    connectionTimeout: 4000,
    constructor: typeof window !== 'undefined' ? WebSocket : Html5WebSocket,
    debug: false,
    maxReconnectionDelay: 10000,
    maxRetries: Infinity,
    minReconnectionDelay: 4000,
    reconnectionDelayGrowFactor: 1.3,
  };

  public static TOPIC = {
    ON_MESSAGE: 'message',
  };

  constructor(private baseURL: string, public client: HttpClient) {
    super();
  }

  private buildWebSocketURL(accessToken: string = this.client.accessTokenStore.accessToken.access_token): string {
    let url = `${this.baseURL}/await?access_token=${accessToken}`;
    if (this.clientId) {
      // Note: If no client ID is given, then the WebSocket connection will receive all notifications for all clients of the connected user
      url += `&client=${this.clientId}`;
    }
    return url;
  }

  public connect(clientId?: string): Promise<WebSocketClient> {
    this.clientId = clientId;

    this.socket = new ReconnectingWebsocket(
      () => this.buildWebSocketURL(),
      undefined,
      WebSocketClient.RECONNECTING_OPTIONS
    );

    this.socket.onmessage = (event: MessageEvent) => {
      const notification: IncomingNotification = JSON.parse(buffer.bufferToString(event.data));
      this.emit(WebSocketClient.TOPIC.ON_MESSAGE, notification);
    };

    this.socket.onerror = () => this.client.refreshAccessToken();
    this.socket.onopen = () => (this.socket.binaryType = 'arraybuffer');

    return Promise.resolve(this);
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
    }
  }
}
