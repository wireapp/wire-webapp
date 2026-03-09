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
  createManagedWebSocketConnection,
  WebSocketConnectionEventType,
  WebSocketConnectionTransport,
} from './createManagedWebSocketConnection';
import {createNoopManagedWebSocketConnection} from './createNoopManagedWebSocketConnection';
import {webSocketConnectionStateMachineState} from './webSocketConnectionStateMachine';

type FakeWebSocketConnectionContext = {
  readonly fakeWebSocketConnection: WebSocketConnectionTransport;
  readonly getCloseCallCount: () => number;
  readonly sentMessageList: readonly string[];
  readonly setReadyState: (readyState: number) => void;
  readonly triggerEvent: (eventType: WebSocketConnectionEventType) => void;
};

function createFakeWebSocketConnectionContext(): FakeWebSocketConnectionContext {
  const listenerSetByEventType = new Map<WebSocketConnectionEventType, Set<(event: Event) => void>>();
  const sentMessageList: string[] = [];
  let closeCallCount = 0;
  let readyState = 0;

  function addEventListener(type: WebSocketConnectionEventType, listener: (event: Event) => void): void {
    const listenerSet = listenerSetByEventType.get(type) ?? new Set<(event: Event) => void>();

    listenerSet.add(listener);
    listenerSetByEventType.set(type, listenerSet);
  }

  function removeEventListener(type: WebSocketConnectionEventType, listener: (event: Event) => void): void {
    return listenerSetByEventType.get(type)?.delete(listener);
  }

  function send(message: string): void {
    return sentMessageList.push(message);
  }

  function close(): void {
    closeCallCount += 1;
    readyState = 3;
  }

  function setReadyState(updatedReadyState: number): void {
    readyState = updatedReadyState;
  }

  function triggerEvent(eventType: WebSocketConnectionEventType): void {
    const listenerSet = listenerSetByEventType.get(eventType);

    listenerSet?.forEach((listener) => {
      return listener(new Event(eventType));
    });
  }

  return {
    fakeWebSocketConnection: {
      get readyState() {
        return readyState;
      },

      send(message: string): void {
        return send(message);
      },

      close(): void {
        return close();
      },

      addEventListener(type: WebSocketConnectionEventType, listener: (event: Event) => void): void {
        return addEventListener(type, listener);
      },

      removeEventListener(type: WebSocketConnectionEventType, listener: (event: Event) => void): void {
        return removeEventListener(type, listener);
      },
    },
    getCloseCallCount(): number {
      return closeCallCount;
    },
    sentMessageList,
    setReadyState(updatedReadyState: number): void {
      return setReadyState(updatedReadyState);
    },
    triggerEvent(eventType: WebSocketConnectionEventType): void {
      return triggerEvent(eventType);
    },
  };
}

describe('createManagedWebSocketConnection', () => {
  it('starts in offline state', () => {
    const fakeWebSocketConnectionContext = createFakeWebSocketConnectionContext();
    const managedWebSocketConnection = createManagedWebSocketConnection({
      createWebSocketConnection() {
        return fakeWebSocketConnectionContext.fakeWebSocketConnection;
      },
    });

    expect(managedWebSocketConnection.currentConnectionState).toBe(webSocketConnectionStateMachineState.offline);

    managedWebSocketConnection.dispose();
  });

  it('updates to online state when the connection emits open', () => {
    const fakeWebSocketConnectionContext = createFakeWebSocketConnectionContext();
    const managedWebSocketConnection = createManagedWebSocketConnection({
      createWebSocketConnection() {
        return fakeWebSocketConnectionContext.fakeWebSocketConnection;
      },
    });

    managedWebSocketConnection.connect('wss://example.test/socket');
    fakeWebSocketConnectionContext.triggerEvent('open');

    expect(managedWebSocketConnection.currentConnectionState).toBe(webSocketConnectionStateMachineState.online);

    managedWebSocketConnection.dispose();
  });

  it('returns to offline state and closes the active connection on disconnect', () => {
    const fakeWebSocketConnectionContext = createFakeWebSocketConnectionContext();
    const managedWebSocketConnection = createManagedWebSocketConnection({
      createWebSocketConnection() {
        return fakeWebSocketConnectionContext.fakeWebSocketConnection;
      },
    });

    managedWebSocketConnection.connect('wss://example.test/socket');
    fakeWebSocketConnectionContext.triggerEvent('open');
    managedWebSocketConnection.disconnect();

    expect(managedWebSocketConnection.currentConnectionState).toBe(webSocketConnectionStateMachineState.offline);
    expect(fakeWebSocketConnectionContext.getCloseCallCount()).toBe(1);

    managedWebSocketConnection.dispose();
  });

  it('sends a message only when the connection is open', () => {
    const fakeWebSocketConnectionContext = createFakeWebSocketConnectionContext();
    const managedWebSocketConnection = createManagedWebSocketConnection({
      createWebSocketConnection() {
        return fakeWebSocketConnectionContext.fakeWebSocketConnection;
      },
    });

    managedWebSocketConnection.connect('wss://example.test/socket');

    expect(managedWebSocketConnection.sendMessage('before-open')).toBe(false);

    fakeWebSocketConnectionContext.setReadyState(1);
    fakeWebSocketConnectionContext.triggerEvent('open');

    expect(managedWebSocketConnection.sendMessage('after-open')).toBe(true);
    expect(fakeWebSocketConnectionContext.sentMessageList).toEqual(['after-open']);

    managedWebSocketConnection.dispose();
  });

  it('notifies subscribed listeners when the connection state changes', () => {
    const fakeWebSocketConnectionContext = createFakeWebSocketConnectionContext();
    const managedWebSocketConnection = createManagedWebSocketConnection({
      createWebSocketConnection() {
        return fakeWebSocketConnectionContext.fakeWebSocketConnection;
      },
    });
    const observedConnectionStateList: string[] = [];

    const unsubscribeFromConnectionState = managedWebSocketConnection.subscribeToConnectionState((connectionState) => {
      return observedConnectionStateList.push(connectionState);
    });

    managedWebSocketConnection.connect('wss://example.test/socket');
    fakeWebSocketConnectionContext.triggerEvent('open');
    fakeWebSocketConnectionContext.triggerEvent('close');
    unsubscribeFromConnectionState();
    fakeWebSocketConnectionContext.triggerEvent('open');

    expect(observedConnectionStateList).toEqual([
      webSocketConnectionStateMachineState.offline,
      webSocketConnectionStateMachineState.online,
      webSocketConnectionStateMachineState.offline,
    ]);

    managedWebSocketConnection.dispose();
  });
});

describe('createNoopManagedWebSocketConnection', () => {
  it('stays offline and keeps commands side-effect free', () => {
    const managedWebSocketConnection = createNoopManagedWebSocketConnection();
    const observedConnectionStateList: string[] = [];

    const unsubscribeFromConnectionState = managedWebSocketConnection.subscribeToConnectionState(connectionState => {
      return observedConnectionStateList.push(connectionState);
    });

    managedWebSocketConnection.connect('wss://example.test/socket');
    managedWebSocketConnection.disconnect();

    const didSendMessage = managedWebSocketConnection.sendMessage('hello');

    expect(didSendMessage).toBe(false);
    expect(managedWebSocketConnection.currentConnectionState).toBe(webSocketConnectionStateMachineState.offline);
    expect(observedConnectionStateList).toEqual([webSocketConnectionStateMachineState.offline]);

    unsubscribeFromConnectionState();
    managedWebSocketConnection.dispose();
  });
});
