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

import {createMachine} from 'xstate';

export const webSocketConnectionStateMachineEventType = Object.freeze({
  connectionBecameOffline: 'CONNECTION_BECAME_OFFLINE',
  connectionBecameOnline: 'CONNECTION_BECAME_ONLINE',
} as const);

export type WebSocketConnectionStateMachineEvent =
  | {type: typeof webSocketConnectionStateMachineEventType.connectionBecameOffline}
  | {type: typeof webSocketConnectionStateMachineEventType.connectionBecameOnline};

export const webSocketConnectionStateMachineState = Object.freeze({
  offline: 'offline',
  online: 'online',
} as const);

export type WebSocketConnectionStateMachineState =
  (typeof webSocketConnectionStateMachineState)[keyof typeof webSocketConnectionStateMachineState];

export function createWebSocketConnectionStateMachine() {
  return createMachine({
    id: 'webSocketConnectionStateMachine',
    types: {} as {
      events: WebSocketConnectionStateMachineEvent;
    },
    initial: webSocketConnectionStateMachineState.offline,
    states: {
      [webSocketConnectionStateMachineState.offline]: {
        on: {
          [webSocketConnectionStateMachineEventType.connectionBecameOnline]: {
            target: webSocketConnectionStateMachineState.online,
          },
        },
      },
      [webSocketConnectionStateMachineState.online]: {
        on: {
          [webSocketConnectionStateMachineEventType.connectionBecameOffline]: {
            target: webSocketConnectionStateMachineState.offline,
          },
        },
      },
    },
  });
}
