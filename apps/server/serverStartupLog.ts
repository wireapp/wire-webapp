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

import type {ServerConfig} from '@wireapp/config';

type LogServerStartupDependencies = {
  readonly logInformation: (message: string) => void;
};

type LogServerStartupOptions = {
  readonly port: number;
  readonly serverConfiguration: ServerConfig;
};

export function formatServerStartupMessage(serverConfiguration: ServerConfig, port: number): string {
  return [
    `Server is running on port ${port}.`,
    `Deployed client version: ${serverConfiguration.VERSION}.`,
    `Deployed commit: ${serverConfiguration.COMMIT}.`,
  ].join(' ');
}

export function logServerStartup(options: LogServerStartupOptions, dependencies: LogServerStartupDependencies): void {
  const {port, serverConfiguration} = options;
  const startupMessage = formatServerStartupMessage(serverConfiguration, port);

  dependencies.logInformation(startupMessage);
}
