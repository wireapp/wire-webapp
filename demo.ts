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

import {FileEngine} from '@wireapp/store-engine-fs';
import logdown from 'logdown';
import path from 'path';

import {APIClient} from './src/APIClient';
import {AUTH_ACCESS_TOKEN_KEY, AUTH_COOKIE_KEY, AUTH_TABLE_NAME, AccessTokenData, Cookie} from './src/auth';
import {ClientType} from './src/client';
import {WebSocketClient} from './src/tcp';

require('dotenv').config();

const {WIRE_EMAIL, WIRE_PASSWORD, WIRE_CONVERSATION_ID} = process.env;

const logger = logdown('Demo', {
  markdown: false,
});
logger.state.isEnabled = true;

logger.log(`Using "process.env.WIRE_EMAIL": ${WIRE_EMAIL}`);
logger.log(`Using "process.env.WIRE_PASSWORD": ${WIRE_PASSWORD}`);
logger.log(`Using "process.env.WIRE_CONVERSATION_ID": ${WIRE_CONVERSATION_ID}`);

if (WIRE_EMAIL && WIRE_PASSWORD && WIRE_CONVERSATION_ID) {
  const login = {
    clientType: ClientType.PERMANENT,
    email: WIRE_EMAIL,
    password: WIRE_PASSWORD,
  };

  const storagePath = path.join(process.cwd(), '.tmp', login.email);

  /* tslint:disable-next-line:no-floating-promises */
  (async () => {
    const storeOptions = {fileExtension: '.json'};
    const storeEngine = new FileEngine(storagePath, storeOptions);
    await storeEngine.init(storagePath, storeOptions);

    const config = {
      store: storeEngine,
      urls: APIClient.BACKEND.STAGING,
    };

    const apiClient = new APIClient(config);

    apiClient.on(APIClient.TOPIC.ACCESS_TOKEN_REFRESH, async (accessToken: AccessTokenData) => {
      await storeEngine.updateOrCreate(AUTH_TABLE_NAME, AUTH_ACCESS_TOKEN_KEY, accessToken);
      logger.log(`Saved access token`, accessToken);
    });

    apiClient.on(APIClient.TOPIC.COOKIE_REFRESH, async (cookie?: Cookie) => {
      if (cookie) {
        const entity = {expiration: cookie.expiration, zuid: cookie.zuid};
        await storeEngine.updateOrCreate(AUTH_TABLE_NAME, AUTH_COOKIE_KEY, entity);
        logger.log(`Saved cookie`, cookie);
      }
    });

    let context;

    try {
      // Trying to login (works only if there is already a valid cookie stored in the FileEngine)
      const {expiration, zuid} = await storeEngine.read(AUTH_TABLE_NAME, AUTH_COOKIE_KEY);
      const cookie = new Cookie(zuid, expiration);
      context = await apiClient.init(ClientType.NONE, cookie);
      logger.log(`Logged in with EXISTING cookie.`);
    } catch (error) {
      logger.log('Failed to find existing cookie.', error);
      context = await apiClient.login(login);
      logger.log(`Logged in with NEW cookie.`);
    }

    logger.log(`Got self user with ID "${context.userId}".`);

    try {
      const conversation = await apiClient.conversation.api.getConversation(WIRE_CONVERSATION_ID);
      const otherParticipant = conversation.members.others[0];
      const userData = await apiClient.user.api.getUser(otherParticipant.id);
      logger.log(`Found user with name "${userData.name}" by handle "${userData.handle}".`);

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
