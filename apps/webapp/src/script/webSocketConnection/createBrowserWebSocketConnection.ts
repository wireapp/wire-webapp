/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {
  CreateWebSocketConnection,
  WebSocketConnectionEventType,
  WebSocketConnectionTransport,
} from './createManagedWebSocketConnection';

type BrowserWebSocketConnection = {
  readonly readyState: number;
  readonly send: (message: string) => void;
  readonly close: () => void;
  readonly addEventListener: (type: WebSocketConnectionEventType, listener: () => void) => void;
  readonly removeEventListener: (type: WebSocketConnectionEventType, listener: () => void) => void;
};

type CreateBrowserWebSocketConnectionDependencies = {
  readonly createWebSocket: (connectionUrl: string) => BrowserWebSocketConnection;
};

export function createBrowserWebSocketConnection(
  dependencies: CreateBrowserWebSocketConnectionDependencies,
): CreateWebSocketConnection {
  const {createWebSocket} = dependencies;

  return function createWebSocketConnection(connectionUrl: string): WebSocketConnectionTransport {
    const webSocketConnection = createWebSocket(connectionUrl);

    return {
      get readyState() {
        return webSocketConnection.readyState;
      },

      send(message) {
        webSocketConnection.send(message);
      },

      close() {
        webSocketConnection.close();
      },

      addEventListener(type, listener) {
        webSocketConnection.addEventListener(type, listener);
      },

      removeEventListener(type, listener) {
        webSocketConnection.removeEventListener(type, listener);
      },
    };
  };
}
