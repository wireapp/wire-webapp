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

export type DeploymentStage = 'local' | 'dev' | 'edge' | 'beta' | 'production' | 'unknown';
type StartupLoggingPolicy = {
  readonly deploymentStage: DeploymentStage;
  readonly debugEnabled: boolean;
  readonly developerConsoleEnabled: boolean;
};

export function resolveStartupLoggingPolicy(hostname: string, configuredDebug: boolean): StartupLoggingPolicy {
  const deploymentStage = match(hostname.toLowerCase())
    .returnType<DeploymentStage>()
    .with('localhost', '127.0.0.1', '[::1]', 'local.wire.com', 'local.zinfra.io', 'local.imai.wire.link', () => {
      return 'local';
    })
    .with('wire-webapp-dev.zinfra.io', () => {
      return 'dev';
    })
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

  const developmentDeployment = deploymentStage === 'local' || deploymentStage === 'dev' || deploymentStage === 'edge';

  return {
    deploymentStage,
    debugEnabled: deploymentStage === 'unknown' ? configuredDebug : developmentDeployment,
    developerConsoleEnabled: developmentDeployment,
  };
}
