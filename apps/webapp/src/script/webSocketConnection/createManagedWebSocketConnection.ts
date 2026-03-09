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
  createManagedWebSocketConnectionStateMachine,
  managedWebSocketConnectionStateMachineEventType,
} from './managedWebSocketConnectionStateMachine';
import type {
  CreateManagedWebSocketConnectionTransport,
  ManagedWebSocketConnectionEventType,
  ManagedWebSocketConnectionTransport,
  SubscribeToConnectivityStatusChanges,
} from './managedWebSocketConnectionStateMachine';
import {webSocketConnectionState, WebSocketConnectionState} from './webSocketConnectionState';

import {createCleanupStack} from '../cleanupStack/cleanupStack';

export type WebSocketConnectionEventType = ManagedWebSocketConnectionEventType;
export type WebSocketConnectionTransport = ManagedWebSocketConnectionTransport;
export type CreateWebSocketConnection = CreateManagedWebSocketConnectionTransport;

export type WebSocketConnectionStateListener = (state: WebSocketConnectionState) => void;

export type ManagedWebSocketConnection = {
  readonly currentConnectionState: WebSocketConnectionState;
  readonly subscribeToConnectionState: (listener: WebSocketConnectionStateListener) => () => void;
  readonly connect: (connectionUrl: string) => void;
  readonly disconnect: () => void;
  readonly sendMessage: (message: string) => boolean;
  readonly dispose: () => void;
};

type CreateManagedWebSocketConnectionDependencies = {
  readonly createWebSocketConnection: CreateWebSocketConnection;
  readonly isConnectivityAvailable: () => boolean;
  readonly subscribeToConnectivityStatusChanges: SubscribeToConnectivityStatusChanges;
};

type ManagedWebSocketConnectionStateSnapshot = {
  readonly matches: (partialStateValue: unknown) => boolean;
};

function toWebSocketConnectionState(snapshot: ManagedWebSocketConnectionStateSnapshot): WebSocketConnectionState {
  if (snapshot.matches({active: {connected: 'online'}})) {
    return webSocketConnectionState.online;
  }

  return webSocketConnectionState.offline;
}

export function createManagedWebSocketConnection(
  dependencies: CreateManagedWebSocketConnectionDependencies,
): ManagedWebSocketConnection {
  const {createWebSocketConnection, isConnectivityAvailable, subscribeToConnectivityStatusChanges} = dependencies;
  const managedWebSocketConnectionStateMachineActor = createActor(
    createManagedWebSocketConnectionStateMachine({
      createManagedWebSocketConnectionTransport: createWebSocketConnection,
      isConnectivityAvailable,
      subscribeToConnectivityStatusChanges,
    }),
  );
  const connectionStateListenerSet = new Set<WebSocketConnectionStateListener>();
  const managedWebSocketConnectionCleanupStack = createCleanupStack();

  managedWebSocketConnectionStateMachineActor.start();

  const actorSubscription = managedWebSocketConnectionStateMachineActor.subscribe(snapshot => {
    const currentConnectionState = toWebSocketConnectionState(snapshot);

    connectionStateListenerSet.forEach(connectionStateListener => {
      return connectionStateListener(currentConnectionState);
    });
  });

  managedWebSocketConnectionCleanupStack.addCleanup(() => {
    actorSubscription.unsubscribe();
    connectionStateListenerSet.clear();
    managedWebSocketConnectionStateMachineActor.stop();
  });

  return {
    get currentConnectionState() {
      return toWebSocketConnectionState(managedWebSocketConnectionStateMachineActor.getSnapshot());
    },

    subscribeToConnectionState(listener) {
      connectionStateListenerSet.add(listener);
      listener(toWebSocketConnectionState(managedWebSocketConnectionStateMachineActor.getSnapshot()));

      return function unsubscribeFromConnectionState(): void {
        connectionStateListenerSet.delete(listener);
      };
    },

    connect(connectionUrl) {
      managedWebSocketConnectionStateMachineActor.send({
        connectionUrl,
        type: managedWebSocketConnectionStateMachineEventType.connect,
      });
    },

    disconnect() {
      managedWebSocketConnectionStateMachineActor.send({
        type: managedWebSocketConnectionStateMachineEventType.disconnect,
      });
    },

    sendMessage(message) {
      if (
        toWebSocketConnectionState(managedWebSocketConnectionStateMachineActor.getSnapshot()) !==
        webSocketConnectionState.online
      ) {
        return false;
      }

      managedWebSocketConnectionStateMachineActor.send({
        message,
        type: managedWebSocketConnectionStateMachineEventType.sendMessage,
      });

      return true;
    },

    dispose() {
      managedWebSocketConnectionStateMachineActor.send({
        type: managedWebSocketConnectionStateMachineEventType.dispose,
      });
      managedWebSocketConnectionCleanupStack.runAllCleanups();
    },
  };
}
