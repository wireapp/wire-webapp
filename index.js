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

const logdown = require('logdown');
const {APIClient} = require('@wireapp/api-client');
const path = require('path');
const {FileEngine} = require('@wireapp/store-engine-fs');
const {Cookie} = require('@wireapp/api-client/dist/commonjs/auth/');
const {WebSocketClient} = require('@wireapp/api-client/dist/commonjs/tcp/');
const {ClientType} = require('@wireapp/api-client/dist/commonjs/client/');

// Try with: node demo.js -c "conversation-id" -e "mail@wire.com" -p "secret"
const argv = require('optimist')
  .alias('c', 'conversation')
  .alias('e', 'email')
  .alias('h', 'handle')
  .alias('p', 'password').argv;

const logger = logdown('Demo');
logger.state.isEnabled = true;

const login = {
  clientType: ClientType.PERMANENT,
  email: argv.email,
  handle: argv.handle,
  password: argv.password,
};

const storagePath = path.join(process.cwd(), '.tmp', login.email);

(async () => {
  const storeOptions = {fileExtension: '.json'};
  const storeEngine = new FileEngine(storagePath, storeOptions);
  await storeEngine.init(storagePath, storeOptions);

  const config = {
    store: storeEngine,
    urls: APIClient.BACKEND.STAGING,
  };

  const AUTH_TABLE_NAME = 'authentication';
  const AUTH_COOKIE_KEY = 'cookie';

  const apiClient = new APIClient(config);
  apiClient.on(APIClient.TOPIC.COOKIE_REFRESH, async cookie => {
    const entity = {expiration: cookie.expiration, zuid: cookie.zuid};
    await storeEngine.delete(AUTH_TABLE_NAME, AUTH_COOKIE_KEY);
    await storeEngine.create(AUTH_TABLE_NAME, AUTH_COOKIE_KEY, entity);
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

  try {
    logger.log(`Got self user with ID "${context.userId}".`);

    const conversation = await apiClient.conversation.api.getConversation(argv.conversation);
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
