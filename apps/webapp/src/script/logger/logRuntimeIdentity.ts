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
import {match} from 'ts-pattern';

import type {Logger} from './logger';
import {encodeLogOutput, type ConsoleLogOutput} from './logOutput';

import {isUUIDv4} from '../commons/util/ValidationUtil';

type DeploymentStage = 'edge' | 'beta' | 'production' | 'unknown';

type LogRuntimeIdentityOptions = {
  readonly logger: Pick<Logger, 'info'>;
  readonly hostname: string;
  readonly origin: string;
  readonly version: string;
  readonly assetVersion: string;
};

type LogStartupRuntimeIdentityOptions = LogRuntimeIdentityOptions & {
  readonly clock: Pick<Clock, 'currentUnixEpochMilliseconds'>;
  readonly consoleOutput: Pick<ConsoleLogOutput, 'info'>;
  readonly isDesktopApp: boolean;
  readonly locationSearch: string;
};

export function getDeploymentStage(hostname: string): DeploymentStage {
  return match(hostname)
    .returnType<DeploymentStage>()
    .with('wire-webapp-edge.wire.com', () => {
      return 'edge';
    })
    .with('wire-webapp-beta.wire.com', () => {
      return 'beta';
    })
    .with('app.wire.com', () => {
      return 'production';
    })
    .otherwise(() => {
      return 'unknown';
    });
}

export function logRuntimeIdentity(options: LogRuntimeIdentityOptions): void {
  const {logger, hostname, origin, version, assetVersion} = options;
  logger.info('WebApp runtime identity', {
    deploymentStage: getDeploymentStage(hostname),
    version,
    assetVersion,
    origin,
  });
}

export function logStartupRuntimeIdentity(options: LogStartupRuntimeIdentityOptions): void {
  const {clock, consoleOutput, isDesktopApp, locationSearch, hostname, origin, version, assetVersion} = options;

  try {
    if (!isDesktopApp) {
      logRuntimeIdentity(options);

      return;
    }

    // Desktop assigns its wrapper account ID before navigating the WebView. Native console capture
    // reads this URL parameter, not the authenticated user's ID or the browser's OPFS binding.
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

    // Emit only this record directly so Desktop can persist it even when Pino namespaces are disabled.
    // Do not also emit through Pino: enabled debug namespaces would duplicate the identity in native logs.
    consoleOutput.info(
      encodeLogOutput({
        deploymentStage: getDeploymentStage(hostname),
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
