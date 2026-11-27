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

import type {Clock} from '@enormora/clock/clock';
import {isUndefined} from '@sindresorhus/is';

import type {Logger} from './logger';
import {encodeLogOutput, type ConsoleLogOutput} from './logOutput';

import {isUUIDv4} from '../commons/util/validationUtil';

type LogRuntimeIdentityOptions = {
  readonly logger: Pick<Logger, 'info'>;
  readonly origin: string;
  readonly version: string;
  readonly assetVersion: string;
};

type LogStartupRuntimeIdentityOptions = LogRuntimeIdentityOptions & {
  readonly clock: Pick<Clock, 'currentUnixEpochMilliseconds'>;
  readonly consoleOutput: Pick<ConsoleLogOutput, 'info'>;
  readonly isDesktopApp: boolean;
  readonly hasDesktopLogPersistence: boolean;
  readonly locationSearch: string;
};

export function logRuntimeIdentity(options: LogRuntimeIdentityOptions): void {
  const {logger, origin, version, assetVersion} = options;
  logger.info('WebApp runtime identity', {
    version,
    assetVersion,
    origin,
  });
}

export function logStartupRuntimeIdentity(options: LogStartupRuntimeIdentityOptions): void {
  const {clock, consoleOutput, locationSearch, origin, version, assetVersion} = options;

  try {
    if (usesPinoForStartupIdentity(options)) {
      logRuntimeIdentity(options);

      return;
    }

    // The legacy startup record is scoped to Desktop's wrapper account URL.
    const accountIdentifiers = new URLSearchParams(locationSearch).getAll('id');
    if (accountIdentifiers.length !== 1) {
      return;
    }
    const accountIdentifier = accountIdentifiers.at(0);
    if (isUndefined(accountIdentifier)) {
      return;
    }
    if (!isUUIDv4(accountIdentifier)) {
      return;
    }

    // Use the legacy console destination even when Pino namespaces are disabled.
    consoleOutput.info(
      encodeLogOutput({
        version,
        assetVersion,
        origin,
        level: 30,
        time: clock.currentUnixEpochMilliseconds,
        component: '@wireapp/webapp/RuntimeIdentity',
        msg: 'WebApp runtime identity',
      }),
    );
  } catch {
    // Runtime identification is optional diagnostics and must never prevent startup.
  }
}

function usesPinoForStartupIdentity(options: LogStartupRuntimeIdentityOptions): boolean {
  return !options.isDesktopApp || options.hasDesktopLogPersistence;
}
