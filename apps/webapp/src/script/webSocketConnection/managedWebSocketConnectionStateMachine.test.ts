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
  CreateManagedWebSocketConnectionTransport,
  managedWebSocketConnectionStateMachineEventType,
  ManagedWebSocketConnectionEventType,
  ManagedWebSocketConnectionTransport,
} from './managedWebSocketConnectionStateMachine';

type ConnectivityStatusChangeHandlers = {
  readonly onConnectivityBecameAvailable: () => void;
  readonly onConnectivityBecameUnavailable: () => void;
};

type SubscribeToConnectivityStatusChangesArguments = {
  readonly onConnectivityBecameAvailable: () => void;
  readonly onConnectivityBecameUnavailable: () => void;
};

type ConnectivityStatusTestContext = {
  readonly notifyConnectivityBecameAvailable: () => void;
  readonly notifyConnectivityBecameUnavailable: () => void;
  readonly subscribeToConnectivityStatusChanges: (handlers: ConnectivityStatusChangeHandlers) => () => void;
};

type FakeManagedWebSocketConnectionTransportContext = {
  readonly createManagedWebSocketConnectionTransport: CreateManagedWebSocketConnectionTransport;
  readonly getCloseCallCount: () => number;
  readonly getCreateCallCount: () => number;
  readonly sentMessageList: readonly string[];
  readonly triggerEvent: (eventType: ManagedWebSocketConnectionEventType) => void;
};

function createFakeManagedWebSocketConnectionTransportContext(): FakeManagedWebSocketConnectionTransportContext {
  const listenerSetByEventType = new Map<ManagedWebSocketConnectionEventType, Set<() => void>>();
  const sentMessageList: string[] = [];
  let closeCallCount = 0;
  let createCallCount = 0;

  function createManagedWebSocketConnectionTransport(): ManagedWebSocketConnectionTransport {
    createCallCount += 1;

    return {
      get readyState() {
        return 1;
      },

      send(message) {
        sentMessageList.push(message);
      },

      close() {
        closeCallCount += 1;
      },

      addEventListener(type, listener) {
        const listenerSet = listenerSetByEventType.get(type) ?? new Set<() => void>();

        listenerSet.add(listener);
        listenerSetByEventType.set(type, listenerSet);
      },

      removeEventListener(type, listener) {
        listenerSetByEventType.get(type)?.delete(listener);
      },
    };
  }

  return {
    createManagedWebSocketConnectionTransport(connectionUrl: string): ManagedWebSocketConnectionTransport {
      return createManagedWebSocketConnectionTransport(connectionUrl);
    },
    getCloseCallCount() {
      return closeCallCount;
    },
    getCreateCallCount() {
      return createCallCount;
    },
    sentMessageList,
    triggerEvent(eventType) {
      const listenerSet = listenerSetByEventType.get(eventType);

      listenerSet?.forEach((listener) => {
        return listener();
      });
    },
  };
}

function createConnectivityStatusTestContext(): ConnectivityStatusTestContext {
  const connectivityAvailableListenerSet = new Set<() => void>();
  const connectivityUnavailableListenerSet = new Set<() => void>();

  return {
    notifyConnectivityBecameAvailable() {
      connectivityAvailableListenerSet.forEach((listener) => {
        return listener();
      });
    },

    notifyConnectivityBecameUnavailable() {
      connectivityUnavailableListenerSet.forEach((listener) => {
        return listener();
      });
    },

    subscribeToConnectivityStatusChanges(
      subscribeToConnectivityStatusChangesArguments: SubscribeToConnectivityStatusChangesArguments,
    ) {
      const {onConnectivityBecameAvailable, onConnectivityBecameUnavailable} =
        subscribeToConnectivityStatusChangesArguments;

      connectivityAvailableListenerSet.add(onConnectivityBecameAvailable);
      connectivityUnavailableListenerSet.add(onConnectivityBecameUnavailable);

      return function unsubscribeFromConnectivityStatusChanges(): void {
        connectivityAvailableListenerSet.delete(onConnectivityBecameAvailable);
        connectivityUnavailableListenerSet.delete(onConnectivityBecameUnavailable);
      };
    },
  };
}

describe('createManagedWebSocketConnectionStateMachine', () => {
  it('starts in offline state', () => {
    const fakeManagedWebSocketConnectionTransportContext = createFakeManagedWebSocketConnectionTransportContext();
    const connectivityStatusTestContext = createConnectivityStatusTestContext();
    const managedWebSocketConnectionStateMachineActor = createActor(
      createManagedWebSocketConnectionStateMachine({
        createManagedWebSocketConnectionTransport:
          fakeManagedWebSocketConnectionTransportContext.createManagedWebSocketConnectionTransport,
        isConnectivityAvailable() {
          return false;
        },
        subscribeToConnectivityStatusChanges: connectivityStatusTestContext.subscribeToConnectivityStatusChanges,
      }),
    );

    managedWebSocketConnectionStateMachineActor.start();

    expect(managedWebSocketConnectionStateMachineActor.getSnapshot().matches({active: 'offline'})).toBe(true);
  });

  it('creates a transport and enters connecting when connect is requested', () => {
    const fakeManagedWebSocketConnectionTransportContext = createFakeManagedWebSocketConnectionTransportContext();
    const connectivityStatusTestContext = createConnectivityStatusTestContext();
    const managedWebSocketConnectionStateMachineActor = createActor(
      createManagedWebSocketConnectionStateMachine({
        createManagedWebSocketConnectionTransport:
          fakeManagedWebSocketConnectionTransportContext.createManagedWebSocketConnectionTransport,
        isConnectivityAvailable() {
          return true;
        },
        subscribeToConnectivityStatusChanges: connectivityStatusTestContext.subscribeToConnectivityStatusChanges,
      }),
    );

    managedWebSocketConnectionStateMachineActor.start();
    managedWebSocketConnectionStateMachineActor.send({
      connectionUrl: 'wss://example.test/socket',
      type: managedWebSocketConnectionStateMachineEventType.connect,
    });

    expect(managedWebSocketConnectionStateMachineActor.getSnapshot().matches({active: {connected: 'connecting'}})).toBe(
      true,
    );
    expect(fakeManagedWebSocketConnectionTransportContext.getCreateCallCount()).toBe(1);
  });

  it('waits offline after connect when connectivity is unavailable', () => {
    const fakeManagedWebSocketConnectionTransportContext = createFakeManagedWebSocketConnectionTransportContext();
    const connectivityStatusTestContext = createConnectivityStatusTestContext();
    const managedWebSocketConnectionStateMachineActor = createActor(
      createManagedWebSocketConnectionStateMachine({
        createManagedWebSocketConnectionTransport:
          fakeManagedWebSocketConnectionTransportContext.createManagedWebSocketConnectionTransport,
        isConnectivityAvailable() {
          return false;
        },
        subscribeToConnectivityStatusChanges: connectivityStatusTestContext.subscribeToConnectivityStatusChanges,
      }),
    );

    managedWebSocketConnectionStateMachineActor.start();
    managedWebSocketConnectionStateMachineActor.send({
      connectionUrl: 'wss://example.test/socket',
      type: managedWebSocketConnectionStateMachineEventType.connect,
    });

    expect(managedWebSocketConnectionStateMachineActor.getSnapshot().matches({active: 'offline'})).toBe(true);
    expect(fakeManagedWebSocketConnectionTransportContext.getCreateCallCount()).toBe(0);
  });

  it('connects when connectivity becomes available after a pending connect request', () => {
    const fakeManagedWebSocketConnectionTransportContext = createFakeManagedWebSocketConnectionTransportContext();
    const connectivityStatusTestContext = createConnectivityStatusTestContext();
    const managedWebSocketConnectionStateMachineActor = createActor(
      createManagedWebSocketConnectionStateMachine({
        createManagedWebSocketConnectionTransport:
          fakeManagedWebSocketConnectionTransportContext.createManagedWebSocketConnectionTransport,
        isConnectivityAvailable() {
          return false;
        },
        subscribeToConnectivityStatusChanges: connectivityStatusTestContext.subscribeToConnectivityStatusChanges,
      }),
    );

    managedWebSocketConnectionStateMachineActor.start();
    managedWebSocketConnectionStateMachineActor.send({
      connectionUrl: 'wss://example.test/socket',
      type: managedWebSocketConnectionStateMachineEventType.connect,
    });
    connectivityStatusTestContext.notifyConnectivityBecameAvailable();

    expect(managedWebSocketConnectionStateMachineActor.getSnapshot().matches({active: {connected: 'connecting'}})).toBe(
      true,
    );
    expect(fakeManagedWebSocketConnectionTransportContext.getCreateCallCount()).toBe(1);
  });

  it('transitions to online when the transport emits open', () => {
    const fakeManagedWebSocketConnectionTransportContext = createFakeManagedWebSocketConnectionTransportContext();
    const connectivityStatusTestContext = createConnectivityStatusTestContext();
    const managedWebSocketConnectionStateMachineActor = createActor(
      createManagedWebSocketConnectionStateMachine({
        createManagedWebSocketConnectionTransport:
          fakeManagedWebSocketConnectionTransportContext.createManagedWebSocketConnectionTransport,
        isConnectivityAvailable() {
          return true;
        },
        subscribeToConnectivityStatusChanges: connectivityStatusTestContext.subscribeToConnectivityStatusChanges,
      }),
    );

    managedWebSocketConnectionStateMachineActor.start();
    managedWebSocketConnectionStateMachineActor.send({
      connectionUrl: 'wss://example.test/socket',
      type: managedWebSocketConnectionStateMachineEventType.connect,
    });
    fakeManagedWebSocketConnectionTransportContext.triggerEvent('open');

    expect(managedWebSocketConnectionStateMachineActor.getSnapshot().matches({active: {connected: 'online'}})).toBe(
      true,
    );
  });

  it('sends messages only after the transport reached online state', () => {
    const fakeManagedWebSocketConnectionTransportContext = createFakeManagedWebSocketConnectionTransportContext();
    const connectivityStatusTestContext = createConnectivityStatusTestContext();
    const managedWebSocketConnectionStateMachineActor = createActor(
      createManagedWebSocketConnectionStateMachine({
        createManagedWebSocketConnectionTransport:
          fakeManagedWebSocketConnectionTransportContext.createManagedWebSocketConnectionTransport,
        isConnectivityAvailable() {
          return true;
        },
        subscribeToConnectivityStatusChanges: connectivityStatusTestContext.subscribeToConnectivityStatusChanges,
      }),
    );

    managedWebSocketConnectionStateMachineActor.start();
    managedWebSocketConnectionStateMachineActor.send({
      connectionUrl: 'wss://example.test/socket',
      type: managedWebSocketConnectionStateMachineEventType.connect,
    });
    managedWebSocketConnectionStateMachineActor.send({
      message: 'before-open',
      type: managedWebSocketConnectionStateMachineEventType.sendMessage,
    });
    fakeManagedWebSocketConnectionTransportContext.triggerEvent('open');
    managedWebSocketConnectionStateMachineActor.send({
      message: 'after-open',
      type: managedWebSocketConnectionStateMachineEventType.sendMessage,
    });

    expect(fakeManagedWebSocketConnectionTransportContext.sentMessageList).toEqual(['after-open']);
  });

  it('returns to offline state and closes the transport on disconnect', () => {
    const fakeManagedWebSocketConnectionTransportContext = createFakeManagedWebSocketConnectionTransportContext();
    const connectivityStatusTestContext = createConnectivityStatusTestContext();
    const managedWebSocketConnectionStateMachineActor = createActor(
      createManagedWebSocketConnectionStateMachine({
        createManagedWebSocketConnectionTransport:
          fakeManagedWebSocketConnectionTransportContext.createManagedWebSocketConnectionTransport,
        isConnectivityAvailable() {
          return true;
        },
        subscribeToConnectivityStatusChanges: connectivityStatusTestContext.subscribeToConnectivityStatusChanges,
      }),
    );

    managedWebSocketConnectionStateMachineActor.start();
    managedWebSocketConnectionStateMachineActor.send({
      connectionUrl: 'wss://example.test/socket',
      type: managedWebSocketConnectionStateMachineEventType.connect,
    });
    fakeManagedWebSocketConnectionTransportContext.triggerEvent('open');
    managedWebSocketConnectionStateMachineActor.send({
      type: managedWebSocketConnectionStateMachineEventType.disconnect,
    });

    expect(managedWebSocketConnectionStateMachineActor.getSnapshot().matches({active: 'offline'})).toBe(true);
    expect(fakeManagedWebSocketConnectionTransportContext.getCloseCallCount()).toBe(1);
  });

  it('returns to offline state and closes the transport when connectivity becomes unavailable', () => {
    const fakeManagedWebSocketConnectionTransportContext = createFakeManagedWebSocketConnectionTransportContext();
    const connectivityStatusTestContext = createConnectivityStatusTestContext();
    const managedWebSocketConnectionStateMachineActor = createActor(
      createManagedWebSocketConnectionStateMachine({
        createManagedWebSocketConnectionTransport:
          fakeManagedWebSocketConnectionTransportContext.createManagedWebSocketConnectionTransport,
        isConnectivityAvailable() {
          return true;
        },
        subscribeToConnectivityStatusChanges: connectivityStatusTestContext.subscribeToConnectivityStatusChanges,
      }),
    );

    managedWebSocketConnectionStateMachineActor.start();
    managedWebSocketConnectionStateMachineActor.send({
      connectionUrl: 'wss://example.test/socket',
      type: managedWebSocketConnectionStateMachineEventType.connect,
    });
    fakeManagedWebSocketConnectionTransportContext.triggerEvent('open');
    connectivityStatusTestContext.notifyConnectivityBecameUnavailable();

    expect(managedWebSocketConnectionStateMachineActor.getSnapshot().matches({active: 'offline'})).toBe(true);
    expect(fakeManagedWebSocketConnectionTransportContext.getCloseCallCount()).toBe(1);
  });

  it('reconnects when connectivity becomes available after becoming unavailable', () => {
    const fakeManagedWebSocketConnectionTransportContext = createFakeManagedWebSocketConnectionTransportContext();
    const connectivityStatusTestContext = createConnectivityStatusTestContext();
    const managedWebSocketConnectionStateMachineActor = createActor(
      createManagedWebSocketConnectionStateMachine({
        createManagedWebSocketConnectionTransport:
          fakeManagedWebSocketConnectionTransportContext.createManagedWebSocketConnectionTransport,
        isConnectivityAvailable() {
          return true;
        },
        subscribeToConnectivityStatusChanges: connectivityStatusTestContext.subscribeToConnectivityStatusChanges,
      }),
    );

    managedWebSocketConnectionStateMachineActor.start();
    managedWebSocketConnectionStateMachineActor.send({
      connectionUrl: 'wss://example.test/socket',
      type: managedWebSocketConnectionStateMachineEventType.connect,
    });
    fakeManagedWebSocketConnectionTransportContext.triggerEvent('open');
    connectivityStatusTestContext.notifyConnectivityBecameUnavailable();
    connectivityStatusTestContext.notifyConnectivityBecameAvailable();

    expect(managedWebSocketConnectionStateMachineActor.getSnapshot().matches({active: {connected: 'connecting'}})).toBe(
      true,
    );
    expect(fakeManagedWebSocketConnectionTransportContext.getCreateCallCount()).toBe(2);
  });

  it('transitions to disposed and closes the transport on dispose', () => {
    const fakeManagedWebSocketConnectionTransportContext = createFakeManagedWebSocketConnectionTransportContext();
    const connectivityStatusTestContext = createConnectivityStatusTestContext();
    const managedWebSocketConnectionStateMachineActor = createActor(
      createManagedWebSocketConnectionStateMachine({
        createManagedWebSocketConnectionTransport:
          fakeManagedWebSocketConnectionTransportContext.createManagedWebSocketConnectionTransport,
        isConnectivityAvailable() {
          return true;
        },
        subscribeToConnectivityStatusChanges: connectivityStatusTestContext.subscribeToConnectivityStatusChanges,
      }),
    );

    managedWebSocketConnectionStateMachineActor.start();
    managedWebSocketConnectionStateMachineActor.send({
      connectionUrl: 'wss://example.test/socket',
      type: managedWebSocketConnectionStateMachineEventType.connect,
    });
    fakeManagedWebSocketConnectionTransportContext.triggerEvent('open');
    managedWebSocketConnectionStateMachineActor.send({
      type: managedWebSocketConnectionStateMachineEventType.dispose,
    });

    expect(managedWebSocketConnectionStateMachineActor.getSnapshot().matches('disposed')).toBe(true);
    expect(fakeManagedWebSocketConnectionTransportContext.getCloseCallCount()).toBe(1);
  });
});
