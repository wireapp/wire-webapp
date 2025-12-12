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

import {generateConfig as generateClientConfig} from './client.config';
import {Env} from './env';
import {generateConfig as generateServerConfig} from './server.config';

const versionData = readFileSync(path.resolve(__dirname, './version.json'), 'utf8');
const version = versionData ? JSON.parse(versionData) : {version: 'unknown', commit: 'unknown'};

// Find workspace root (go up from apps/server/dist/config to workspace root)
const workspaceRoot = path.resolve(__dirname, '../../../..');

const env = dotenv.load({
  path: path.join(workspaceRoot, '.env'),
  defaults: path.join(workspaceRoot, '.env.defaults'),
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
export type ClientConfig = ReturnType<typeof generateClientConfig>;

export const serverConfig = generateServerConfig(commonConfig, env);
export type ServerConfig = ReturnType<typeof generateServerConfig>;
