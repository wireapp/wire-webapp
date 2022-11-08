/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import logdown from 'logdown';

import path from 'path';

import {CRUDEngine} from '@wireapp/store-engine';
import {FileEngine} from '@wireapp/store-engine-fs';

import {APIClient} from './src/APIClient';
import {
  AccessTokenData,
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_COOKIE_KEY,
  AUTH_TABLE_NAME,
  Context,
  Cookie,
  LoginData,
} from './src/auth';
import {ClientType} from './src/client';
import {Config} from './src/Config';
import {WebSocketClient} from './src/tcp';

require('dotenv').config();

const {WIRE_BACKEND_REST, WIRE_BACKEND_WS, WIRE_EMAIL, WIRE_PASSWORD} = process.env;

declare global {
  namespace NodeJS {
    interface Global {
      apiClient: APIClient;
    }
  }
}

const logger = logdown('Demo', {
  markdown: false,
});
logger.state.isEnabled = true;

logger.log(`Using account "process.env.WIRE_EMAIL": ${WIRE_EMAIL}`);

async function createContext(storeEngine: CRUDEngine, apiClient: APIClient, loginData: LoginData): Promise<Context> {
  try {
    const {expiration, zuid} = await storeEngine.read<Cookie>(AUTH_TABLE_NAME, AUTH_COOKIE_KEY);
    const cookie = new Cookie(zuid, expiration);
    logger.log(`Found cookie "${zuid}".`);
    logger.log('Logging in with EXISTING cookie...');
    const context = await apiClient.init(loginData.clientType, cookie);
    return context;
  } catch (error) {
    logger.log(`Failed to use existing cookie.`, error);
    logger.log(`Logging in with NEW cookie...`);
    return apiClient.login(loginData);
  }
}

if (WIRE_EMAIL && WIRE_PASSWORD) {
  const login = {
    clientType: ClientType.PERMANENT,
    email: WIRE_EMAIL,
    password: WIRE_PASSWORD,
  };

  const storagePath = path.join(process.cwd(), '.tmp', login.email);

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  (async () => {
    const storeOptions = {fileExtension: '.json'};
    const storeEngine = new FileEngine(storagePath, storeOptions);
    await storeEngine.init(storagePath, storeOptions);

    const apiConfig: Config = {
      urls: {
        name: 'Custom',
        rest: WIRE_BACKEND_REST!,
        ws: WIRE_BACKEND_WS!,
      },
    };

    const apiClient = new APIClient(apiConfig);
    global.apiClient = apiClient;

    apiClient.on(APIClient.TOPIC.ACCESS_TOKEN_REFRESH, async (accessToken: AccessTokenData) => {
      await storeEngine.updateOrCreate(AUTH_TABLE_NAME, AUTH_ACCESS_TOKEN_KEY, accessToken);
      logger.log(`Saved access token`);
    });

    apiClient.on(APIClient.TOPIC.COOKIE_REFRESH, async (cookie?: Cookie) => {
      if (cookie) {
        const entity = {expiration: cookie.expiration, zuid: cookie.zuid};
        await storeEngine.updateOrCreate(AUTH_TABLE_NAME, AUTH_COOKIE_KEY, entity);
        logger.log(`Saved cookie`, cookie);
      }
    });

    const context = await createContext(storeEngine, apiClient, login);
    logger.log(`Got self user with ID "${context.userId}".`);

    try {
      const webSocketClient = await apiClient.connect();

      webSocketClient.on(WebSocketClient.TOPIC.ON_MESSAGE, notification => {
        logger.log('Received notification via WebSocket', notification);
      });
    } catch (error) {
      logger.error(error.message, error);
    }
  })();
} else {
  logger.error(`A mandatory environment variable is undefined.`);
  process.exit(1);
}
