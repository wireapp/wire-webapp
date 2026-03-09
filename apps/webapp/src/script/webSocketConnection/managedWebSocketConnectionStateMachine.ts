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

export type ManagedWebSocketConnectionTransport = {
  readonly readyState: number;
  readonly send: (message: string) => void;
  readonly close: () => void;
  readonly addEventListener: (type: ManagedWebSocketConnectionEventType, listener: (event: Event) => void) => void;
  readonly removeEventListener: (type: ManagedWebSocketConnectionEventType, listener: (event: Event) => void) => void;
};

export type CreateManagedWebSocketConnectionTransport = (connectionUrl: string) => ManagedWebSocketConnectionTransport;

export const managedWebSocketConnectionStateMachineEventType = Object.freeze({
  connect: 'CONNECT',
  disconnect: 'DISCONNECT',
  dispose: 'DISPOSE',
  sendMessage: 'SEND_MESSAGE',
  webSocketConnectionClosed: 'WEB_SOCKET_CONNECTION_CLOSED',
  webSocketConnectionErrored: 'WEB_SOCKET_CONNECTION_ERRORED',
  webSocketConnectionOpened: 'WEB_SOCKET_CONNECTION_OPENED',
} as const);

export type ManagedWebSocketConnectionStateMachineEvent =
  | {type: typeof managedWebSocketConnectionStateMachineEventType.connect; connectionUrl: string}
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
};

type ActiveManagedWebSocketConnectionActorInput = {
  readonly connectionUrl: string;
};

const activeManagedWebSocketConnectionActorId = 'activeManagedWebSocketConnection';

export function createManagedWebSocketConnectionStateMachine(dependencies: {
  readonly createManagedWebSocketConnectionTransport: CreateManagedWebSocketConnectionTransport;
}) {
  const {createManagedWebSocketConnectionTransport} = dependencies;
  const managedWebSocketConnectionStateMachineSetup = setup({
    types: {} as {
      context: ManagedWebSocketConnectionStateMachineContext;
      events: ManagedWebSocketConnectionStateMachineEvent;
    },
    actors: {
      activeManagedWebSocketConnection: fromCallback<
        SendMessageManagedWebSocketConnectionStateMachineEvent,
        ActiveManagedWebSocketConnectionActorInput
      >(({input, receive, sendBack}) => {
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
      }),
    },
  });

  return managedWebSocketConnectionStateMachineSetup.createMachine({
    context: {
      connectionUrl: undefined,
    },
    initial: 'offline',
    states: {
      offline: {
        on: {
          [managedWebSocketConnectionStateMachineEventType.connect]: {
            actions: managedWebSocketConnectionStateMachineSetup.assign({
              connectionUrl: ({event}) => {
                if (event.type !== managedWebSocketConnectionStateMachineEventType.connect) {
                  throw new Error('Managed WebSocket connection state machine expected a connect event');
                }

                return event.connectionUrl;
              },
            }),
            target: 'connected.connecting',
          },
          [managedWebSocketConnectionStateMachineEventType.dispose]: {
            target: 'disposed',
          },
        },
      },
      connected: {
        initial: 'connecting',
        invoke: {
          id: activeManagedWebSocketConnectionActorId,
          input: ({context}) => {
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
          [managedWebSocketConnectionStateMachineEventType.disconnect]: {
            actions: managedWebSocketConnectionStateMachineSetup.assign({
              connectionUrl: () => {
                return undefined;
              },
            }),
            target: 'offline',
          },
          [managedWebSocketConnectionStateMachineEventType.dispose]: {
            actions: managedWebSocketConnectionStateMachineSetup.assign({
              connectionUrl: () => {
                return undefined;
              },
            }),
            target: 'disposed',
          },
          [managedWebSocketConnectionStateMachineEventType.webSocketConnectionClosed]: {
            actions: managedWebSocketConnectionStateMachineSetup.assign({
              connectionUrl: () => {
                return undefined;
              },
            }),
            target: 'offline',
          },
          [managedWebSocketConnectionStateMachineEventType.webSocketConnectionErrored]: {
            actions: managedWebSocketConnectionStateMachineSetup.assign({
              connectionUrl: () => {
                return undefined;
              },
            }),
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
                  ({event}) => {
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
      disposed: {
        type: 'final',
      },
    },
  });
}
