/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import dotenv from 'dotenv-extended';

import {readFileSync} from 'fs';
import path from 'path';

import {generateClientConfig, generateServerConfig, Env} from '@wireapp/config';

const versionData = readFileSync(path.resolve(__dirname, './version.json'), 'utf8');
const version = versionData ? JSON.parse(versionData) : {version: 'unknown', commit: 'unknown'};

// Determine the correct root path based on the directory structure
// In monorepo (dev/CI): __dirname is apps/server/dist, so go up to workspace root (3 levels)
// In AWS EB deployment: __dirname is /var/app/current (files are at root level)
// Check if .env.defaults exists in current directory (deployment) or 3 levels up (monorepo)
const deploymentRootPath = __dirname;
const monorepoRootPath = path.resolve(__dirname, '../../..');
const isMonorepo =
  require('fs').existsSync(path.join(monorepoRootPath, '.env.defaults')) &&
  !require('fs').existsSync(path.join(deploymentRootPath, '.env.defaults'));
const rootPath = isMonorepo ? monorepoRootPath : deploymentRootPath;

const env = dotenv.load({
  path: path.join(rootPath, '.env'),
  defaults: path.join(rootPath, '.env.defaults'),
  includeProcessEnv: true,
}) as Env;

function generateUrls() {
  const federation = env.FEDERATION;

  if (!federation) {
    if (!env.APP_BASE || !env.BACKEND_REST || !env.BACKEND_WS) {
      throw new Error('missing environment variables');
    }
    return {
      base: env.APP_BASE,
      api: env.BACKEND_REST,
      ws: env.BACKEND_WS,
    };
  }

  return {
    base: `https://local.${federation}.wire.link:8081`,
    api: `https://nginz-https.${federation}.wire.link`,
    ws: `wss://nginz-ssl.${federation}.wire.link`,
  };
}

const commonConfig = {
  commit: version.commit,
  version: version.version,
  env: env.NODE_ENV || 'production',
  urls: generateUrls(),
};

export const clientConfig = generateClientConfig(commonConfig, env);
export const serverConfig = generateServerConfig(commonConfig, env);
