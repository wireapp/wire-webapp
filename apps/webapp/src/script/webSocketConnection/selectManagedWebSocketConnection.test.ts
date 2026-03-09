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

import {StartupFeatureToggleName, StartupFeatureToggles} from '../featureToggles/startupFeatureToggles';
import {webSocketConnectionStateMachineState} from './webSocketConnectionStateMachine';
import {ManagedWebSocketConnection} from './createManagedWebSocketConnection';
import {selectManagedWebSocketConnectionForStartupFeatureToggles} from './selectManagedWebSocketConnection';

function createManagedWebSocketConnectionStub(): ManagedWebSocketConnection {
  return {
    get currentConnectionState() {
      return webSocketConnectionStateMachineState.offline;
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

function createStartupFeatureTogglesForTest(
  enabledFeatureToggleNameList: readonly StartupFeatureToggleName[],
): StartupFeatureToggles {
  return {
    isFeatureToggleEnabled(featureToggleName): boolean {
      return enabledFeatureToggleNameList.includes(featureToggleName);
    },

    getEnabledFeatureToggleNames(): readonly StartupFeatureToggleName[] {
      return enabledFeatureToggleNameList;
    },
  };
}

describe('selectManagedWebSocketConnectionForStartupFeatureToggles', () => {
  it('returns enabled managed connection when feature toggle is enabled', () => {
    const enabledManagedWebSocketConnection = createManagedWebSocketConnectionStub();
    const disabledManagedWebSocketConnection = createManagedWebSocketConnectionStub();
    const createEnabledManagedWebSocketConnection = jest.fn(() => {
      return enabledManagedWebSocketConnection;
    });
    const createDisabledManagedWebSocketConnection = jest.fn(() => {
      return disabledManagedWebSocketConnection;
    });
    const startupFeatureToggles = createStartupFeatureTogglesForTest(['reliable-websocket-connection']);

    const selectedManagedWebSocketConnection = selectManagedWebSocketConnectionForStartupFeatureToggles(
      startupFeatureToggles,
      {
        createDisabledManagedWebSocketConnection,
        createEnabledManagedWebSocketConnection,
      },
    );

    expect(selectedManagedWebSocketConnection).toBe(enabledManagedWebSocketConnection);
    expect(createEnabledManagedWebSocketConnection).toHaveBeenCalledTimes(1);
    expect(createDisabledManagedWebSocketConnection).not.toHaveBeenCalled();
  });

  it('returns disabled managed connection when feature toggle is disabled', () => {
    const enabledManagedWebSocketConnection = createManagedWebSocketConnectionStub();
    const disabledManagedWebSocketConnection = createManagedWebSocketConnectionStub();
    const createEnabledManagedWebSocketConnection = jest.fn(() => {
      return enabledManagedWebSocketConnection;
    });
    const createDisabledManagedWebSocketConnection = jest.fn(() => {
      return disabledManagedWebSocketConnection;
    });
    const startupFeatureToggles = createStartupFeatureTogglesForTest([]);

    const selectedManagedWebSocketConnection = selectManagedWebSocketConnectionForStartupFeatureToggles(
      startupFeatureToggles,
      {
        createDisabledManagedWebSocketConnection,
        createEnabledManagedWebSocketConnection,
      },
    );

    expect(selectedManagedWebSocketConnection).toBe(disabledManagedWebSocketConnection);
    expect(createDisabledManagedWebSocketConnection).toHaveBeenCalledTimes(1);
    expect(createEnabledManagedWebSocketConnection).not.toHaveBeenCalled();
  });
});
