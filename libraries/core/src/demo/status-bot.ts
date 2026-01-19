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

import {APIClient} from '@wireapp/api-client';
import {ClientType} from '@wireapp/api-client/lib/client/';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {Account, MessageBuilder} from '@wireapp/core';
import {MemoryEngine} from '@wireapp/store-engine';
import * as logdown from 'logdown';
import {buildTextMessage} from '../main/conversation/message/MessageBuilder';

const {name, version} = require('../../package.json');
const logger = logdown('@wireapp/core/demo/StatusBot', {
  logger: console,
  markdown: false,
});

require('dotenv').config();

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

['WIRE_STATUS_BOT_EMAIL', 'WIRE_STATUS_BOT_PASSWORD'].forEach((envVar, _, array) => {
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

  const engine = new MemoryEngine();
  await engine.init('');

  const apiClient = new APIClient({urls: APIClient.BACKEND.PRODUCTION});
  const account = new Account(apiClient, {createStore: () => Promise.resolve(engine)});
  await account.login(login);

  const text = message || `I am posting from ${name} v${version}. 🌞`;
  for (const conversationId of conversationIds) {
    const payload = buildTextMessage({text});
    await account.service!.conversation.send({
      conversationId: {id: conversationId, domain: ''},
      protocol: ConversationProtocol.PROTEUS,
      payload,
    });
  }
})().catch(error => logger.error(error));
