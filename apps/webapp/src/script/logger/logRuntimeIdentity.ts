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

import {match} from 'ts-pattern';

import type {Logger} from './logger';

type DeploymentStage = 'edge' | 'beta' | 'production' | 'unknown';

type LogRuntimeIdentityOptions = {
  readonly logger: Pick<Logger, 'info'>;
  readonly hostname: string;
  readonly origin: string;
  readonly version: string;
  readonly assetVersion: string;
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
