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

import {ManagedWebSocketConnection, WebSocketConnectionStateListener} from './createManagedWebSocketConnection';
import {
  webSocketConnectionStateMachineState,
  WebSocketConnectionStateMachineState,
} from './webSocketConnectionStateMachine';

function ignoreConnectRequest(unusedConnectionUrl: string): void {
  return undefined;
}

function ignoreDisconnectRequest(): void {
  return undefined;
}

export function createNoopManagedWebSocketConnection(): ManagedWebSocketConnection {
  const connectionStateListenerSet = new Set<WebSocketConnectionStateListener>();

  return {
    get currentConnectionState(): WebSocketConnectionStateMachineState {
      return webSocketConnectionStateMachineState.offline;
    },

    subscribeToConnectionState(listener): () => void {
      connectionStateListenerSet.add(listener);
      listener(webSocketConnectionStateMachineState.offline);

      return function unsubscribeFromConnectionState(): void {
        connectionStateListenerSet.delete(listener);
      };
    },

    connect: ignoreConnectRequest,
    disconnect: ignoreDisconnectRequest,

    sendMessage(): boolean {
      return false;
    },

    dispose(): void {
      connectionStateListenerSet.clear();
    },
  };
}
