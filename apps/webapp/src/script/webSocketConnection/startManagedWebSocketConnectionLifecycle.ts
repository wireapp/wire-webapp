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

type StartManagedWebSocketConnectionLifecycleDependencies = {
  readonly managedWebSocketConnection: ManagedWebSocketConnection;
  readonly buildWebSocketConnectionUrl: () => string;
};

export function startManagedWebSocketConnectionLifecycle(
  dependencies: StartManagedWebSocketConnectionLifecycleDependencies,
): () => void {
  const {managedWebSocketConnection, buildWebSocketConnectionUrl} = dependencies;
  const webSocketConnectionUrl = buildWebSocketConnectionUrl();

  managedWebSocketConnection.connect(webSocketConnectionUrl);

  return function stopManagedWebSocketConnectionLifecycle(): void {
    managedWebSocketConnection.disconnect();
  };
}
