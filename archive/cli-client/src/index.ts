#!/usr/bin/env node
/* eslint-disable header/header */

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

import {ClientType, RegisteredClient} from '@wireapp/api-client/lib/client/';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';
import {BackendErrorLabel} from '@wireapp/api-client/lib/http/';
import {buildTextMessage} from '@wireapp/core/lib/conversation/message/MessageBuilder';
import axios from 'axios';
import {program as commander} from 'commander';
import dotenv from 'dotenv';
import 'fake-indexeddb/auto';
import * as fs from 'fs-extra';

import path from 'path';

import {APIClient} from '@wireapp/api-client';
import {Account} from '@wireapp/core';
import {FileEngine} from '@wireapp/store-engine-fs';
dotenv.config();

const {
  bin,
  description,
  version,
}: {bin: Record<string, string>; description: string; version: string} = require('../package.json');

commander
  .name(Object.keys(bin)[0])
  .version(version)
  .description(description)
  .requiredOption('-e, --email <address>', 'Your email address')
  .requiredOption('-p, --password <password>', 'Your password')
  .requiredOption('-c, --conversation <conversationId>', 'The conversation to write in')
  .option('--env <staging | production>', 'The backend to use', 'production')
  .parse(process.argv);

const {conversation, email, password, env} = commander.opts();

const loginData = {
  clientType: ClientType.TEMPORARY,
  email: email || process.env.WIRE_LOGIN_EMAIL,
  password: password || process.env.WIRE_LOGIN_PASSWORD,
};

if (!loginData.email || !loginData.password) {
  console.error('Email and password both need to be set');
  commander.help();
}

const conversationId = conversation || process.env.WIRE_CONVERSATION_ID;

const directory = path.join('/tmp', loginData.email);

const storeEngineProvider = async (storeName: string) => {
  const engine = new FileEngine(directory);
  await engine.init(storeName, {fileExtension: '.json'});
  return engine;
};

const apiClient = new APIClient({
  urls: env === 'production' ? APIClient.BACKEND.PRODUCTION : APIClient.BACKEND.STAGING,
});
const account = new Account(apiClient, {createStore: storeEngineProvider});

(async () => {
  let backendFeatures = {domain: ''};
  try {
    backendFeatures = await account.useAPIVersion(2, 3);
    await account.login(loginData);
    const client = await account.initClient();
    if (!client) {
      await account.registerClient(loginData);
    }
    account.listen({
      onEvent: ({event, decryptedData}) => {
        if (decryptedData && event.type === CONVERSATION_EVENT.OTR_MESSAGE_ADD) {
          console.info(`Received message from user ID "${event.from}" in conversation ID "${event.conversation}"`);
          console.info(decryptedData);
        }
      },
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      const errorLabel = data?.label;
      // TODO: The following is just a quick hack to continue if too many clients are registered!
      // We should expose this fail-safe method as an emergency function
      if (errorLabel === BackendErrorLabel.TOO_MANY_CLIENTS) {
        const clients = await apiClient.api.client.getClients();
        const client: RegisteredClient = clients[0];
        await apiClient.api.client.deleteClient(client.id, loginData.password);
        await account.logout();

        // TODO: Completely removing the Wire Cryptobox directoy isn't a good idea! The "logout" method should
        // handle already the cleanup of artifacts. Unfortunately "logout" sometimes has issues (we need to solve
        // these!)
        await fs.remove(directory);
        await account.login(loginData);
        await account.listen();
      }
    }
    await account.logout();
    throw error;
  }

  const {clientId, userId} = apiClient.context!;
  console.info(`Connected to Wire — User ID "${userId}" — Client ID "${clientId}"`);

  const stdin = process.openStdin();
  stdin.addListener('data', async data => {
    const message = data.toString().trim();
    if (account.service) {
      const payload = buildTextMessage({text: message});
      await account.service.conversation.send({
        conversationId: {id: conversationId, domain: backendFeatures.domain},
        protocol: ConversationProtocol.PROTEUS,
        payload,
      });
    }
  });
})().catch((error: Error) => {
  console.error(error.message, error);
  process.exit(1);
});
