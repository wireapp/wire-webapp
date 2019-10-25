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

// Try with: node demo.js -c "conversation-id" -e "mail@wire.com" -p "secret"
const argv = require('optimist')
  .alias('c', 'conversation')
  .alias('e', 'email')
  .alias('h', 'handle')
  .alias('p', 'password').argv;

const logger = logdown('@wireapp/api-client/index.js');
logger.state.isEnabled = true;

const {APIClient} = require('@wireapp/api-client');
const path = require('path');
const {FileEngine} = require('@wireapp/store-engine-fs');
const {WebSocketClient} = require('@wireapp/api-client/dist/commonjs/tcp/');
const {ClientType} = require('@wireapp/api-client/dist/commonjs/client/');

const login = {
  clientType: ClientType.PERMANENT,
  email: argv.email,
  handle: argv.handle,
  password: argv.password,
};

const storagePath = path.join(process.cwd(), '.tmp', login.email);

const config = {
  store: new FileEngine(storagePath),
};

const apiClient = new APIClient(config);

(async () => {
  let context;

  try {
    // Trying to login (works only if there is already a valid cookie stored in the FileEngine)
    context = await apiClient.init();
  } catch (error) {
    logger.log(`Authentication via existing authenticator (Session Cookie or Access Token) failed: ${error.message}`);
    context = await apiClient.login(login);
  }

  try {
    logger.log(`Got self user with ID "${context.userId}".`);
    const userData = await apiClient.user.api.getUsers({handles: ['webappbot']});

    logger.log(`Found user with name "${userData[0].name}" by handle "${userData[0].handle}".`);
    const webSocketClient = await apiClient.connect();

    webSocketClient.on(WebSocketClient.TOPIC.ON_MESSAGE, notification => {
      logger.log('Received notification via WebSocket', notification);
    });
  } catch (error) {
    logger.error(error.message, error);
  }
})();
