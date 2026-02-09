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

/* eslint-disable no-inner-declarations */

process.on('uncaughtException', error =>
  console.error(`Uncaught exception "${error.constructor.name}": ${error.message}`, error),
);
process.on('unhandledRejection', (reason, promise) =>
  console.error('Unhandled Rejection at:', promise, 'reason:', reason),
);

import {program as commander} from 'commander';
import logdown from 'logdown';
import * as path from 'path';
import {TimeUtil} from '@wireapp/commons';
import {Account} from '@wireapp/core';
import {APIClient} from '@wireapp/api-client';
import {ClientType} from '@wireapp/api-client/lib/client/';
import {FileEngine} from '@wireapp/store-engine-fs';

commander.option('-c, --conversationId <conversationId>').parse(process.argv);

require('dotenv').config({path: path.join(__dirname, 'sender.env'), quiet: true});

const logger = logdown('@wireapp/core/src/demo/send-counter.ts', {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

const {
  WIRE_EMAIL,
  WIRE_PASSWORD,
  WIRE_CONVERSATION_ID = commander.opts().conversationId,
  WIRE_BACKEND = 'staging',
} = process.env;

(async () => {
  const useProtobuf = false;

  ['WIRE_EMAIL', 'WIRE_PASSWORD', 'WIRE_CONVERSATION_ID', 'WIRE_BACKEND'].forEach((envVar, _, array) => {
    if (!process.env[envVar]) {
      logger.error(`Error: Environment variable "${envVar}" is not set. Required variables: ${array.join(', ')}.`);
      process.exit(1);
    }
  });

  const login = {
    clientType: ClientType.TEMPORARY,
    email: WIRE_EMAIL,
    password: WIRE_PASSWORD,
  };

  const backend = WIRE_BACKEND === 'staging' ? APIClient.BACKEND.STAGING : APIClient.BACKEND.PRODUCTION;
  const engine = new FileEngine(path.join(__dirname, '.tmp/sender'));
  await engine.init('sender', {fileExtension: '.json'});

  const apiClient = new APIClient({urls: backend});
  const account = new Account(apiClient, {createStore: () => Promise.resolve(engine)});
  await account.login(login);
  await account.listen();

  account.on(Account.TOPIC.ERROR, error => logger.error(error));

  const name = await account.service!.self.getName();

  logger.log('Name', name);
  logger.log('User ID', account['apiClient'].context!.userId);
  logger.log('Client ID', account['apiClient'].context!.clientId);
  logger.log('Domain', account['apiClient'].context!.domain);

  async function sendText(message: string): Promise<void> {
    const payload = account
      .service!.conversation.messageBuilder.createText({conversationId: WIRE_CONVERSATION_ID, text: message})
      .build();
    await account.service!.conversation.send({payloadBundle: payload, sendAsProtobuf: useProtobuf});
  }

  const twoSeconds = TimeUtil.TimeInMillis.SECOND * 2;
  let counter = 1;
  setInterval(async () => {
    await sendText(`${counter++}`);
  }, twoSeconds);
})().catch(error => console.error(error));
