#!/usr/bin/env node

const fs = require('fs-extra');
const program = require('commander');
const {Account} = require('@wireapp/core');
const {description, version} = require('../../package.json');
const {StoreEngine} = require('@wireapp/store-engine');
import * as os from 'os';
import * as path from 'path';
import APIClient = require('@wireapp/api-client');
import {AxiosError} from 'axios';
import {BackendErrorLabel} from '@wireapp/api-client/dist/commonjs/http/';
import {PayloadBundle} from '@wireapp/core/dist/commonjs/crypto/root';
import {RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/';

require('dotenv').config();

program
  .version(version)
  .description(description)
  .option('-e, --email <address>', 'Your email address')
  .option('-p, --password <password>', 'Your password')
  .option('-c, --conversation <conversationId>', 'The conversation to write in')
  .parse(process.argv);

const loginData = {
  email: program.email || process.env.WIRE_LOGIN_EMAIL,
  password: program.password || process.env.WIRE_LOGIN_PASSWORD,
  persist: true,
};

const conversationID = program.conversation || process.env.WIRE_CONVERSATION_ID;

const directory = path.join(os.homedir(), '.wire-cli', loginData.email);
const storeEngine = new StoreEngine.FileEngine(directory, {fileExtension: '.json'});

const apiClient: APIClient = new APIClient({
  urls: APIClient.BACKEND.PRODUCTION,
  store: storeEngine,
});

const account = new Account(apiClient);

account.on(Account.INCOMING.TEXT_MESSAGE, (data: PayloadBundle) => {
  console.log(
    `Received message from user ID "${data.from}" in conversation ID "${data.conversation}": ${data.content}`
  );
});

account
  .listen(loginData)
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
          // handle already the cleanup of artifacts. Unfortunately "logout" sometimes has issues (we need to solve these!)
          .then(() => fs.remove(directory))
          .then(() => account.listen(loginData))
      );
    } else {
      throw error;
    }
  })
  .then(() => console.log(`Connected to Wire — Client ID "${account.context.clientID}"`))
  .then(() => {
    const stdin = process.openStdin();
    stdin.addListener('data', data => {
      const message = data.toString().trim();
      account.service.conversation.sendTextMessage(conversationID, message);
    });
  })
  .catch((error: Error) => {
    console.error(error.message, error);
    process.exit(1);
  });
