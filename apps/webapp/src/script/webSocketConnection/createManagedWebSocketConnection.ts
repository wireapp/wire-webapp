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

import {createActor} from 'xstate';

import {
  createWebSocketConnectionStateMachine,
  webSocketConnectionStateMachineEventType,
  WebSocketConnectionStateMachineState,
} from './webSocketConnectionStateMachine';

import {createCleanupStack} from '../cleanupStack/cleanupStack';

export type WebSocketConnectionEventType = 'open' | 'close' | 'error';

export type WebSocketConnectionStateListener = (state: WebSocketConnectionStateMachineState) => void;

export type WebSocketConnectionTransport = {
  readonly readyState: number;
  readonly send: (message: string) => void;
  readonly close: () => void;
  readonly addEventListener: (type: WebSocketConnectionEventType, listener: (event: Event) => void) => void;
  readonly removeEventListener: (type: WebSocketConnectionEventType, listener: (event: Event) => void) => void;
};

export type CreateWebSocketConnection = (connectionUrl: string) => WebSocketConnectionTransport;

export type ManagedWebSocketConnection = {
  readonly currentConnectionState: WebSocketConnectionStateMachineState;
  readonly subscribeToConnectionState: (listener: WebSocketConnectionStateListener) => () => void;
  readonly connect: (connectionUrl: string) => void;
  readonly disconnect: () => void;
  readonly sendMessage: (message: string) => boolean;
  readonly dispose: () => void;
};

type CreateManagedWebSocketConnectionDependencies = {
  readonly createWebSocketConnection: CreateWebSocketConnection;
};

type ActiveManagedWebSocketConnection = {
  readonly webSocketConnection: WebSocketConnectionTransport;
  readonly runCleanup: () => void;
};

const webSocketConnectionOpenReadyState = 1;

export function createBrowserWebSocketConnection(connectionUrl: string): WebSocketConnectionTransport {
  return new WebSocket(connectionUrl);
}

export function createManagedWebSocketConnection(
  dependencies: CreateManagedWebSocketConnectionDependencies,
): ManagedWebSocketConnection {
  const {createWebSocketConnection} = dependencies;
  const webSocketConnectionStateMachineActor = createActor(createWebSocketConnectionStateMachine());
  const connectionStateListenerSet = new Set<WebSocketConnectionStateListener>();
  const managedWebSocketConnectionCleanupStack = createCleanupStack();
  let activeManagedWebSocketConnection: ActiveManagedWebSocketConnection | undefined;

  webSocketConnectionStateMachineActor.start();

  const actorSubscription = webSocketConnectionStateMachineActor.subscribe(snapshot => {
    const currentConnectionState = snapshot.value as WebSocketConnectionStateMachineState;

    connectionStateListenerSet.forEach(connectionStateListener => {
      return connectionStateListener(currentConnectionState);
    });
  });

  managedWebSocketConnectionCleanupStack.addCleanup(() => {
    actorSubscription.unsubscribe();
    connectionStateListenerSet.clear();
    webSocketConnectionStateMachineActor.stop();
  });

  function disconnectActiveManagedWebSocketConnection(): void {
    activeManagedWebSocketConnection?.runCleanup();
    activeManagedWebSocketConnection = undefined;
  }

  return {
    get currentConnectionState() {
      return webSocketConnectionStateMachineActor.getSnapshot().value as WebSocketConnectionStateMachineState;
    },

    subscribeToConnectionState(listener) {
      connectionStateListenerSet.add(listener);
      listener(webSocketConnectionStateMachineActor.getSnapshot().value as WebSocketConnectionStateMachineState);

      return function unsubscribeFromConnectionState(): void {
        connectionStateListenerSet.delete(listener);
      };
    },

    connect(connectionUrl) {
      disconnectActiveManagedWebSocketConnection();

      const webSocketConnection = createWebSocketConnection(connectionUrl);
      const activeManagedWebSocketConnectionCleanupStack = createCleanupStack();

      function onOpen(): void {
        return webSocketConnectionStateMachineActor.send({
          type: webSocketConnectionStateMachineEventType.connectionBecameOnline,
        });
      }

      function onClose(): void {
        return webSocketConnectionStateMachineActor.send({
          type: webSocketConnectionStateMachineEventType.connectionBecameOffline,
        });
      }

      function onError(): void {
        return webSocketConnectionStateMachineActor.send({
          type: webSocketConnectionStateMachineEventType.connectionBecameOffline,
        });
      }

      webSocketConnection.addEventListener('open', onOpen);
      webSocketConnection.addEventListener('close', onClose);
      webSocketConnection.addEventListener('error', onError);

      activeManagedWebSocketConnectionCleanupStack.addCleanup(() => {
        webSocketConnection.removeEventListener('open', onOpen);
        webSocketConnection.removeEventListener('close', onClose);
        webSocketConnection.removeEventListener('error', onError);
        webSocketConnection.close();
      });

      activeManagedWebSocketConnection = {
        webSocketConnection,
        runCleanup: activeManagedWebSocketConnectionCleanupStack.runAllCleanups,
      };
    },

    disconnect() {
      disconnectActiveManagedWebSocketConnection();
      webSocketConnectionStateMachineActor.send({
        type: webSocketConnectionStateMachineEventType.connectionBecameOffline,
      });
    },

    sendMessage(message) {
      if (activeManagedWebSocketConnection === undefined) {
        return false;
      }

      const {webSocketConnection} = activeManagedWebSocketConnection;

      if (webSocketConnection.readyState !== webSocketConnectionOpenReadyState) {
        return false;
      }

      webSocketConnection.send(message);

      return true;
    },

    dispose() {
      disconnectActiveManagedWebSocketConnection();
      managedWebSocketConnectionCleanupStack.runAllCleanups();
    },
  };
}
