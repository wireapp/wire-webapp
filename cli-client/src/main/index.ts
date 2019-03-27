#!/usr/bin/env node

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
import {ClientType, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/';
import {BackendErrorLabel} from '@wireapp/api-client/dist/commonjs/http/';
import {Account} from '@wireapp/core';
import {PayloadBundle, PayloadBundleType} from '@wireapp/core/dist/conversation/';
import {FileEngine} from '@wireapp/store-engine';
import {AxiosError} from 'axios';
import * as program from 'commander';
import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

import * as dotenv from 'dotenv';
dotenv.config();

const {description, version}: {description: string; version: string} = require('../../package.json');

program
  .version(version)
  .description(description)
  .option('-e, --email <address>', 'Your email address')
  .option('-p, --password <password>', 'Your password')
  .option('-c, --conversation <conversationId>', 'The conversation to write in')
  .parse(process.argv);

const loginData = {
  clientType: ClientType.PERMANENT,
  email: program.email || process.env.WIRE_LOGIN_EMAIL,
  password: program.password || process.env.WIRE_LOGIN_PASSWORD,
};

const conversationID = program.conversation || process.env.WIRE_CONVERSATION_ID;

const directory = path.join(os.homedir(), '.wire-cli', loginData.email);
const storeEngine = new FileEngine(directory);

storeEngine
  .init('', {fileExtension: '.json'})
  .then(() => {
    const apiClient: APIClient = new APIClient({store: storeEngine, urls: APIClient.BACKEND.PRODUCTION});

    const account = new Account(apiClient);

    account.on(PayloadBundleType.TEXT, (data: PayloadBundle) => {
      console.log(
        `Received message from user ID "${data.from}" in conversation ID "${data.conversation}": ${data.content}`
      );
    });

    account.on('error', error => console.error(error));

    return account
      .login(loginData)
      .then(() => account.listen())
      .catch((error: AxiosError) => {
        const data = error.response && error.response.data;
        const errorLabel = data && data.label;
        // TODO: The following is just a quick hack to continue if too many clients are registered!
        // We should expose this fail-safe method as an emergency function
        if (errorLabel === BackendErrorLabel.TOO_MANY_CLIENTS) {
          return (
            apiClient.client.api
              .getClients()
              .then((clients: RegisteredClient[]) => {
                const client: RegisteredClient = clients[0];
                return apiClient.client.api.deleteClient(client.id, loginData.password);
              })
              .then(() => account.logout())
              // TODO: Completely removing the Wire Cryptobox directoy isn't a good idea! The "logout" method should
              // handle already the cleanup of artifacts. Unfortunately "logout" sometimes has issues (we need to solve
              // these!)
              .then(() => fs.remove(directory))
              .then(() => account.login(loginData))
              .then(() => account.listen())
          );
        } else {
          throw error;
        }
      })
      .then(() => {
        const {clientId, userId} = apiClient.context!;
        console.log(`Connected to Wire — User ID "${userId}" — Client ID "${clientId}"`);
      })
      .then(() => {
        const stdin = process.openStdin();
        stdin.addListener('data', data => {
          const message = data.toString().trim();
          if (account.service) {
            const payload = account.service.conversation.messageBuilder.createText(conversationID, message).build();
            return account.service.conversation.send(payload);
          }
          return;
        });
      });
  })
  .catch((error: Error) => {
    console.error(error.message, error);
    process.exit(1);
  });
