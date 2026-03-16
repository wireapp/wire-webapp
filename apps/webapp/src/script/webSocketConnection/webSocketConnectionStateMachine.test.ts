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
  webSocketConnectionStateMachineEventType,
  webSocketConnectionStateMachineState,
  createWebSocketConnectionStateMachine,
} from './webSocketConnectionStateMachine';

describe('webSocketConnectionStateMachine', function () {
  it('starts in offline state', function () {
    const webSocketConnectionStateMachineActor = createActor(createWebSocketConnectionStateMachine());

    webSocketConnectionStateMachineActor.start();

    expect(webSocketConnectionStateMachineActor.getSnapshot().value).toBe(webSocketConnectionStateMachineState.offline);
  });

  it('transitions from offline to online', function () {
    const webSocketConnectionStateMachineActor = createActor(createWebSocketConnectionStateMachine());

    webSocketConnectionStateMachineActor.start();
    webSocketConnectionStateMachineActor.send({type: webSocketConnectionStateMachineEventType.connectionBecameOnline});

    expect(webSocketConnectionStateMachineActor.getSnapshot().value).toBe(webSocketConnectionStateMachineState.online);
  });

  it('transitions from online to offline', function () {
    const webSocketConnectionStateMachineActor = createActor(createWebSocketConnectionStateMachine());

    webSocketConnectionStateMachineActor.start();
    webSocketConnectionStateMachineActor.send({type: webSocketConnectionStateMachineEventType.connectionBecameOnline});
    webSocketConnectionStateMachineActor.send({type: webSocketConnectionStateMachineEventType.connectionBecameOffline});

    expect(webSocketConnectionStateMachineActor.getSnapshot().value).toBe(webSocketConnectionStateMachineState.offline);
  });
});
