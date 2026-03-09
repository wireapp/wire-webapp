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

import {ManagedWebSocketConnection} from './createManagedWebSocketConnection';
import {startManagedWebSocketConnectionLifecycle} from './startManagedWebSocketConnectionLifecycle';
import {webSocketConnectionState} from './webSocketConnectionState';

function createManagedWebSocketConnectionStub(): ManagedWebSocketConnection {
  return {
    get currentConnectionState() {
      return webSocketConnectionState.offline;
    },

    subscribeToConnectionState() {
      return function unsubscribeFromConnectionState(): void {
        return undefined;
      };
    },

    connect() {
      return undefined;
    },

    disconnect() {
      return undefined;
    },

    sendMessage() {
      return false;
    },

    dispose() {
      return undefined;
    },
  };
}

describe('startManagedWebSocketConnectionLifecycle', () => {
  it('connects immediately with the built WebSocket URL', () => {
    const managedWebSocketConnection = createManagedWebSocketConnectionStub();
    const connect = jest.fn(managedWebSocketConnection.connect);
    const buildWebSocketConnectionUrl = jest.fn(() => {
      return 'wss://example.test/socket';
    });

    startManagedWebSocketConnectionLifecycle({
      managedWebSocketConnection: {
        ...managedWebSocketConnection,
        connect,
      },
      buildWebSocketConnectionUrl,
    });

    expect(buildWebSocketConnectionUrl).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith('wss://example.test/socket');
  });

  it('disconnects when the returned cleanup function is executed', () => {
    const managedWebSocketConnection = createManagedWebSocketConnectionStub();
    const disconnect = jest.fn(managedWebSocketConnection.disconnect);

    const stopManagedWebSocketConnectionLifecycle = startManagedWebSocketConnectionLifecycle({
      managedWebSocketConnection: {
        ...managedWebSocketConnection,
        disconnect,
      },
      buildWebSocketConnectionUrl() {
        return 'wss://example.test/socket';
      },
    });

    stopManagedWebSocketConnectionLifecycle();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
