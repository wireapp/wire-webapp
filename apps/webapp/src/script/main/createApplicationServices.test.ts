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

import {createDeterministicWallClock} from '../clock/deterministicWallClock';
import {StartupFeatureToggles} from '../featureToggles/startupFeatureToggles';
import {ManagedWebSocketConnection} from '../webSocketConnection/createManagedWebSocketConnection';
import {createApplicationServices} from './createApplicationServices';

function createStubManagedWebSocketConnection(): ManagedWebSocketConnection {
  return {} as ManagedWebSocketConnection;
}

function createStartupFeatureTogglesForTest(isReliableWebSocketConnectionEnabled: boolean): StartupFeatureToggles {
  return {
    isFeatureToggleEnabled(featureToggleName) {
      return featureToggleName === 'reliable-websocket-connection' && isReliableWebSocketConnectionEnabled;
    },

    getEnabledFeatureToggleNames() {
      return isReliableWebSocketConnectionEnabled ? ['reliable-websocket-connection'] : [];
    },
  };
}

describe('createApplicationServices', () => {
  it('creates wall clock through injected dependency', () => {
    const deterministicWallClock = createDeterministicWallClock();
    const enabledManagedWebSocketConnection = createStubManagedWebSocketConnection();
    const disabledManagedWebSocketConnection = createStubManagedWebSocketConnection();
    const createWallClock = jest.fn(() => {
      return deterministicWallClock;
    });
    const createEnabledManagedWebSocketConnection = jest.fn(() => {
      return enabledManagedWebSocketConnection;
    });
    const createDisabledManagedWebSocketConnection = jest.fn(() => {
      return disabledManagedWebSocketConnection;
    });

    const applicationServices = createApplicationServices({
      createWallClock,
      startupFeatureToggles: createStartupFeatureTogglesForTest(true),
      createEnabledManagedWebSocketConnection,
      createDisabledManagedWebSocketConnection,
    });

    expect(applicationServices.wallClock).toBe(deterministicWallClock);
    expect(applicationServices.managedWebSocketConnection).toBe(enabledManagedWebSocketConnection);
    expect(createWallClock).toHaveBeenCalledTimes(1);
    expect(createEnabledManagedWebSocketConnection).toHaveBeenCalledTimes(1);
    expect(createDisabledManagedWebSocketConnection).not.toHaveBeenCalled();
  });

  it('creates noop managed WebSocket connection when reliable WebSocket feature is disabled', () => {
    const deterministicWallClock = createDeterministicWallClock();
    const enabledManagedWebSocketConnection = createStubManagedWebSocketConnection();
    const disabledManagedWebSocketConnection = createStubManagedWebSocketConnection();
    const createWallClock = jest.fn(() => {
      return deterministicWallClock;
    });
    const createEnabledManagedWebSocketConnection = jest.fn(() => {
      return enabledManagedWebSocketConnection;
    });
    const createDisabledManagedWebSocketConnection = jest.fn(() => {
      return disabledManagedWebSocketConnection;
    });

    const applicationServices = createApplicationServices({
      createWallClock,
      startupFeatureToggles: createStartupFeatureTogglesForTest(false),
      createEnabledManagedWebSocketConnection,
      createDisabledManagedWebSocketConnection,
    });

    expect(applicationServices.managedWebSocketConnection).toBe(disabledManagedWebSocketConnection);
    expect(createEnabledManagedWebSocketConnection).not.toHaveBeenCalled();
    expect(createDisabledManagedWebSocketConnection).toHaveBeenCalledTimes(1);
  });
});
