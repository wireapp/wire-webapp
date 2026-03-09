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

import {WallClock} from '../clock/wallClock';
import {StartupFeatureToggles} from '../featureToggles/startupFeatureToggles';
import {ManagedWebSocketConnection} from '../webSocketConnection/createManagedWebSocketConnection';
import {selectManagedWebSocketConnectionForStartupFeatureToggles} from '../webSocketConnection/selectManagedWebSocketConnection';

export type ApplicationServices = {
  readonly managedWebSocketConnection: ManagedWebSocketConnection;
  readonly wallClock: WallClock;
};

type CreateApplicationServicesDependencies = {
  readonly createWallClock: () => WallClock;
  readonly startupFeatureToggles: StartupFeatureToggles;
  readonly createEnabledManagedWebSocketConnection: () => ManagedWebSocketConnection;
  readonly createDisabledManagedWebSocketConnection: () => ManagedWebSocketConnection;
};

export function createApplicationServices(dependencies: CreateApplicationServicesDependencies): ApplicationServices {
  const {
    createWallClock,
    startupFeatureToggles,
    createEnabledManagedWebSocketConnection,
    createDisabledManagedWebSocketConnection,
  } = dependencies;

  return {
    managedWebSocketConnection: selectManagedWebSocketConnectionForStartupFeatureToggles(startupFeatureToggles, {
      createEnabledManagedWebSocketConnection,
      createDisabledManagedWebSocketConnection,
    }),
    wallClock: createWallClock(),
  };
}
