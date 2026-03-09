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

import {fromCallback, setup} from 'xstate';

export type ManagedWebSocketConnectionEventType = 'open' | 'close' | 'error';
type ConnectivityStatusChangeHandlers = {
  readonly onConnectivityBecameAvailable: () => void;
  readonly onConnectivityBecameUnavailable: () => void;
};

export type SubscribeToConnectivityStatusChanges = (handlers: ConnectivityStatusChangeHandlers) => () => void;
export type ManagedWebSocketConnectionTransportListener = () => void;

export type ManagedWebSocketConnectionTransport = {
  readonly readyState: number;
  readonly send: (message: string) => void;
  readonly close: () => void;
  readonly addEventListener: (
    type: ManagedWebSocketConnectionEventType,
    listener: ManagedWebSocketConnectionTransportListener,
  ) => void;
  readonly removeEventListener: (
    type: ManagedWebSocketConnectionEventType,
    listener: ManagedWebSocketConnectionTransportListener,
  ) => void;
};

export type CreateManagedWebSocketConnectionTransport = (connectionUrl: string) => ManagedWebSocketConnectionTransport;
type ConnectivityStatusActorCallbackProperties = {
  readonly input: ConnectivityStatusActorInput;
  readonly sendBack: (event: ManagedWebSocketConnectionStateMachineEvent) => void;
};

type ActiveManagedWebSocketConnectionActorCallbackProperties = {
  readonly input: ActiveManagedWebSocketConnectionActorInput;
  readonly receive: (listener: (event: SendMessageManagedWebSocketConnectionStateMachineEvent) => void) => void;
  readonly sendBack: (event: ManagedWebSocketConnectionStateMachineEvent) => void;
};

type ManagedWebSocketConnectionStateMachineGuardArguments = {
  readonly context: ManagedWebSocketConnectionStateMachineContext;
};

type ManagedWebSocketConnectionStateMachineAssignArguments = {
  readonly event: ManagedWebSocketConnectionStateMachineEvent;
};

type ManagedWebSocketConnectionStateMachineInputArguments = {
  readonly context: ManagedWebSocketConnectionStateMachineContext;
};

type ManagedWebSocketConnectionStateMachineSendArguments = {
  readonly event: ManagedWebSocketConnectionStateMachineEvent;
};

export const managedWebSocketConnectionStateMachineEventType = Object.freeze({
  connect: 'CONNECT',
  connectivityBecameAvailable: 'CONNECTIVITY_BECAME_AVAILABLE',
  connectivityBecameUnavailable: 'CONNECTIVITY_BECAME_UNAVAILABLE',
  disconnect: 'DISCONNECT',
  dispose: 'DISPOSE',
  sendMessage: 'SEND_MESSAGE',
  webSocketConnectionClosed: 'WEB_SOCKET_CONNECTION_CLOSED',
  webSocketConnectionErrored: 'WEB_SOCKET_CONNECTION_ERRORED',
  webSocketConnectionOpened: 'WEB_SOCKET_CONNECTION_OPENED',
} as const);

export type ManagedWebSocketConnectionStateMachineEvent =
  | {type: typeof managedWebSocketConnectionStateMachineEventType.connect; connectionUrl: string}
  | {type: typeof managedWebSocketConnectionStateMachineEventType.connectivityBecameAvailable}
  | {type: typeof managedWebSocketConnectionStateMachineEventType.connectivityBecameUnavailable}
  | {type: typeof managedWebSocketConnectionStateMachineEventType.disconnect}
  | {type: typeof managedWebSocketConnectionStateMachineEventType.dispose}
  | {type: typeof managedWebSocketConnectionStateMachineEventType.sendMessage; message: string}
  | {type: typeof managedWebSocketConnectionStateMachineEventType.webSocketConnectionClosed}
  | {type: typeof managedWebSocketConnectionStateMachineEventType.webSocketConnectionErrored}
  | {type: typeof managedWebSocketConnectionStateMachineEventType.webSocketConnectionOpened};

type SendMessageManagedWebSocketConnectionStateMachineEvent = Extract<
  ManagedWebSocketConnectionStateMachineEvent,
  {type: typeof managedWebSocketConnectionStateMachineEventType.sendMessage}
>;

type ManagedWebSocketConnectionStateMachineContext = {
  readonly connectionUrl: string | undefined;
  readonly isConnectivityAvailable: boolean;
};

type ActiveManagedWebSocketConnectionActorInput = {
  readonly connectionUrl: string;
};

type ConnectivityStatusActorInput = {
  readonly subscribeToConnectivityStatusChanges: SubscribeToConnectivityStatusChanges;
};

type CreateManagedWebSocketConnectionStateMachineDependencies = {
  readonly createManagedWebSocketConnectionTransport: CreateManagedWebSocketConnectionTransport;
  readonly isConnectivityAvailable: () => boolean;
  readonly subscribeToConnectivityStatusChanges: SubscribeToConnectivityStatusChanges;
};

const activeManagedWebSocketConnectionActorId = 'activeManagedWebSocketConnection';
const connectivityStatusActorId = 'connectivityStatus';

export function createManagedWebSocketConnectionStateMachine(
  dependencies: CreateManagedWebSocketConnectionStateMachineDependencies,
) {
  const {createManagedWebSocketConnectionTransport, isConnectivityAvailable, subscribeToConnectivityStatusChanges} =
    dependencies;
  const managedWebSocketConnectionStateMachineSetup = setup({
    types: {} as {
      context: ManagedWebSocketConnectionStateMachineContext;
      events: ManagedWebSocketConnectionStateMachineEvent;
    },
    actors: {
      connectivityStatus: fromCallback<ManagedWebSocketConnectionStateMachineEvent, ConnectivityStatusActorInput>(
        (connectivityStatusActorCallbackProperties: ConnectivityStatusActorCallbackProperties) => {
          const {input, sendBack} = connectivityStatusActorCallbackProperties;

          function handleConnectivityBecameAvailable(): void {
            sendBack({type: managedWebSocketConnectionStateMachineEventType.connectivityBecameAvailable});
          }

          function handleConnectivityBecameUnavailable(): void {
            sendBack({type: managedWebSocketConnectionStateMachineEventType.connectivityBecameUnavailable});
          }

          return input.subscribeToConnectivityStatusChanges({
            onConnectivityBecameAvailable: handleConnectivityBecameAvailable,
            onConnectivityBecameUnavailable: handleConnectivityBecameUnavailable,
          });
        },
      ),
      activeManagedWebSocketConnection: fromCallback<
        SendMessageManagedWebSocketConnectionStateMachineEvent,
        ActiveManagedWebSocketConnectionActorInput
      >(
        (
          activeManagedWebSocketConnectionActorCallbackProperties: ActiveManagedWebSocketConnectionActorCallbackProperties,
        ) => {
          const {input, receive, sendBack} = activeManagedWebSocketConnectionActorCallbackProperties;
          const webSocketConnection = createManagedWebSocketConnectionTransport(input.connectionUrl);

          function onOpen(): void {
            sendBack({type: managedWebSocketConnectionStateMachineEventType.webSocketConnectionOpened});
          }

          function onClose(): void {
            sendBack({type: managedWebSocketConnectionStateMachineEventType.webSocketConnectionClosed});
          }

          function onError(): void {
            sendBack({type: managedWebSocketConnectionStateMachineEventType.webSocketConnectionErrored});
          }

          receive(event => {
            if (event.type === managedWebSocketConnectionStateMachineEventType.sendMessage) {
              webSocketConnection.send(event.message);
            }
          });

          webSocketConnection.addEventListener('open', onOpen);
          webSocketConnection.addEventListener('close', onClose);
          webSocketConnection.addEventListener('error', onError);

          return () => {
            webSocketConnection.removeEventListener('open', onOpen);
            webSocketConnection.removeEventListener('close', onClose);
            webSocketConnection.removeEventListener('error', onError);
            webSocketConnection.close();
          };
        },
      ),
    },
  });

  return managedWebSocketConnectionStateMachineSetup.createMachine({
    context: {
      connectionUrl: undefined,
      isConnectivityAvailable: isConnectivityAvailable(),
    },
    initial: 'active',
    states: {
      active: {
        invoke: {
          id: connectivityStatusActorId,
          input: {
            subscribeToConnectivityStatusChanges,
          },
          src: 'connectivityStatus',
        },
        initial: 'offline',
        on: {
          [managedWebSocketConnectionStateMachineEventType.dispose]: {
            actions: managedWebSocketConnectionStateMachineSetup.assign({
              connectionUrl: () => {
                return undefined;
              },
            }),
            target: 'disposed',
          },
        },
        states: {
          offline: {
            always: {
              guard: (
                managedWebSocketConnectionStateMachineGuardArguments: ManagedWebSocketConnectionStateMachineGuardArguments,
              ) => {
                const {context} = managedWebSocketConnectionStateMachineGuardArguments;

                return context.connectionUrl !== undefined && context.isConnectivityAvailable;
              },
              target: 'connected.connecting',
            },
            on: {
              [managedWebSocketConnectionStateMachineEventType.connectivityBecameUnavailable]: {
                actions: managedWebSocketConnectionStateMachineSetup.assign({
                  isConnectivityAvailable: () => {
                    return false;
                  },
                }),
              },
              [managedWebSocketConnectionStateMachineEventType.connectivityBecameAvailable]: {
                actions: managedWebSocketConnectionStateMachineSetup.assign({
                  isConnectivityAvailable: () => {
                    return true;
                  },
                }),
              },
              [managedWebSocketConnectionStateMachineEventType.connect]: {
                actions: managedWebSocketConnectionStateMachineSetup.assign({
                  connectionUrl: (
                    managedWebSocketConnectionStateMachineAssignArguments: ManagedWebSocketConnectionStateMachineAssignArguments,
                  ) => {
                    const {event} = managedWebSocketConnectionStateMachineAssignArguments;

                    if (event.type !== managedWebSocketConnectionStateMachineEventType.connect) {
                      throw new Error('Managed WebSocket connection state machine expected a connect event');
                    }

                    return event.connectionUrl;
                  },
                }),
              },
              [managedWebSocketConnectionStateMachineEventType.disconnect]: {
                actions: managedWebSocketConnectionStateMachineSetup.assign({
                  connectionUrl: () => {
                    return undefined;
                  },
                }),
              },
            },
          },
          connected: {
            initial: 'connecting',
            invoke: {
              id: activeManagedWebSocketConnectionActorId,
              input: (
                managedWebSocketConnectionStateMachineInputArguments: ManagedWebSocketConnectionStateMachineInputArguments,
              ) => {
                const {context} = managedWebSocketConnectionStateMachineInputArguments;

                if (context.connectionUrl === undefined) {
                  throw new Error('Managed WebSocket connection state machine requires a connection URL');
                }

                return {
                  connectionUrl: context.connectionUrl,
                };
              },
              src: 'activeManagedWebSocketConnection',
            },
            on: {
              [managedWebSocketConnectionStateMachineEventType.connectivityBecameUnavailable]: {
                actions: managedWebSocketConnectionStateMachineSetup.assign({
                  isConnectivityAvailable: () => {
                    return false;
                  },
                }),
                target: 'offline',
              },
              [managedWebSocketConnectionStateMachineEventType.connectivityBecameAvailable]: {
                actions: managedWebSocketConnectionStateMachineSetup.assign({
                  isConnectivityAvailable: () => {
                    return true;
                  },
                }),
              },
              [managedWebSocketConnectionStateMachineEventType.connect]: {
                actions: managedWebSocketConnectionStateMachineSetup.assign({
                  connectionUrl: (
                    managedWebSocketConnectionStateMachineAssignArguments: ManagedWebSocketConnectionStateMachineAssignArguments,
                  ) => {
                    const {event} = managedWebSocketConnectionStateMachineAssignArguments;

                    if (event.type !== managedWebSocketConnectionStateMachineEventType.connect) {
                      throw new Error('Managed WebSocket connection state machine expected a connect event');
                    }

                    return event.connectionUrl;
                  },
                }),
                target: 'offline',
              },
              [managedWebSocketConnectionStateMachineEventType.disconnect]: {
                actions: managedWebSocketConnectionStateMachineSetup.assign({
                  connectionUrl: () => {
                    return undefined;
                  },
                }),
                target: 'offline',
              },
              [managedWebSocketConnectionStateMachineEventType.webSocketConnectionClosed]: {
                target: 'offline',
              },
              [managedWebSocketConnectionStateMachineEventType.webSocketConnectionErrored]: {
                target: 'offline',
              },
            },
            states: {
              connecting: {
                on: {
                  [managedWebSocketConnectionStateMachineEventType.webSocketConnectionOpened]: {
                    target: 'online',
                  },
                },
              },
              online: {
                on: {
                  [managedWebSocketConnectionStateMachineEventType.sendMessage]: {
                    actions: managedWebSocketConnectionStateMachineSetup.sendTo(
                      activeManagedWebSocketConnectionActorId,
                      (
                        managedWebSocketConnectionStateMachineSendArguments: ManagedWebSocketConnectionStateMachineSendArguments,
                      ) => {
                        const {event} = managedWebSocketConnectionStateMachineSendArguments;

                        if (event.type !== managedWebSocketConnectionStateMachineEventType.sendMessage) {
                          throw new Error('Managed WebSocket connection state machine expected a send message event');
                        }

                        return event;
                      },
                    ),
                  },
                },
              },
            },
          },
        },
      },
      disposed: {
        type: 'final',
      },
    },
  });
}
