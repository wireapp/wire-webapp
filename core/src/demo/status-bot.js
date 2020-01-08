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

//@ts-check

require('dotenv').config();

const {APIClient} = require('@wireapp/api-client');
const {ClientType} = require('@wireapp/api-client/dist/client/');
const logdown = require('logdown');
const {Account} = require('@wireapp/core');
const {MemoryEngine} = require('@wireapp/store-engine');

const {name, version} = require('../../package.json');
const logger = logdown('@wireapp/core/demo/StatusBot', {
  logger: console,
  markdown: false,
});

const CONVERSATION_ARGUMENT_INDEX = 2;
const conversations = process.argv[CONVERSATION_ARGUMENT_INDEX];
const conversationIds = conversations ? conversations.trim().split(',') : [];
if (conversationIds.length === 0) {
  logger.error('Conversation ID is not set. Example: status-bot.js "c94a6e69-7718-406b-b834-df4144e5a65b".');
  process.exit(1);
}

const MESSAGE_INDEX = 3;
const message = process.argv[MESSAGE_INDEX];
if (!message) {
  logger.warn('Message is not set. Will post a default message.');
}

['WIRE_STATUS_BOT_EMAIL', 'WIRE_STATUS_BOT_PASSWORD'].forEach((envVar, index, array) => {
  if (!process.env[envVar]) {
    logger.error(`Error: Environment variable "${envVar}" is not set. Required variables: ${array.join(', ')}.`);
    process.exit(1);
  }
});

(async () => {
  const login = {
    clientType: ClientType.TEMPORARY,
    email: process.env.WIRE_STATUS_BOT_EMAIL,
    password: process.env.WIRE_STATUS_BOT_PASSWORD,
  };

  try {
    const engine = new MemoryEngine();
    await engine.init('');

    const apiClient = new APIClient({store: engine, urls: APIClient.BACKEND.PRODUCTION});
    const account = new Account(apiClient);
    await account.login(login);

    const text = message || `I am posting from ${name} v${version} (Build #${process.env.TRAVIS_BUILD_NUMBER}). 🌞`;
    const payload = account.service.conversation.createText(text).build();
    conversationIds.forEach(async conversationId => account.service.conversation.send(conversationId, payload));
  } catch (error) {
    logger.error('Error:', error.stack);
  }
})();
