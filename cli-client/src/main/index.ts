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

const fs = require('fs-extra');
const program = require('commander');
const {Account} = require('@wireapp/core');
const {description, version} = require('../../package.json');
const {FileEngine} = require('@wireapp/store-engine');
import APIClient = require('@wireapp/api-client');
import {ClientType, RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/';
import {Config} from '@wireapp/api-client/dist/commonjs/Config';
import {BackendErrorLabel} from '@wireapp/api-client/dist/commonjs/http/';
import {PayloadBundleIncoming} from '@wireapp/core/dist/conversation/root';
import {AxiosError} from 'axios';
import * as os from 'os';
import * as path from 'path';

require('dotenv').config();

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
storeEngine.init('', {fileExtension: '.json'}).then(() => {
  const apiClient: APIClient = new APIClient(new Config(storeEngine, APIClient.BACKEND.PRODUCTION));

  const account = new Account(apiClient);

  account.on(Account.INCOMING.TEXT_MESSAGE, (data: PayloadBundleIncoming) => {
    console.log(
      `Received message from user ID "${data.from}" in conversation ID "${data.conversation}": ${data.content}`
    );
  });

  account
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
      const {clientId, userId} = apiClient!.context!;
      console.log(`Connected to Wire — User ID "${userId}" — Client ID "${clientId}"`);
    })
    .then(() => {
      const stdin = process.openStdin();
      stdin.addListener('data', data => {
        const message = data.toString().trim();
        account.service.conversation.sendText(conversationID, message);
      });
    })
    .catch((error: Error) => {
      console.error(error.message, error);
      process.exit(1);
    });
});
