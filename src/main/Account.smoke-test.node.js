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

const {Account} = require('@wireapp/core');
const APIClient = require('@wireapp/api-client');
const {Config} = require('@wireapp/api-client/dist/commonjs/Config');
const {ClientType} = require('@wireapp/api-client/dist/commonjs/client/');
const {MemoryEngine} = require('@wireapp/store-engine');
const {ValidationUtil} = require('@wireapp/commons');
const logdown = require('logdown');

const logger = logdown('@wireapp/core/main/Account(SmokeTest)', {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

// Note: We need to listen to the "WILL_RELEASE" environment variable, otherwise our tests get executed on every commit in a Pull Request (PR) which will cause the "login too frequently" backend error for the smoke tests accounts.
const CAN_RUN =
  process.env.ALICE_EMAIL &&
  process.env.ALICE_PASSWORD &&
  process.env.BOB_EMAIL &&
  process.env.BOB_PASSWORD &&
  process.env.WILL_RELEASE === '0';

async function getAccount(email, password) {
  const login = {
    clientType: ClientType.TEMPORARY,
    email,
    password,
  };
  const backend = APIClient.BACKEND.STAGING;
  const engine = new MemoryEngine();
  await engine.init(email);
  const apiClient = new APIClient(new Config(engine, backend));
  const account = new Account(apiClient);
  await account.login(login);
  await account.listen();
  return account;
}

function createConnection(sender, receiver) {
  return sender.service.connection.createConnection(receiver.apiClient.context.userId);
}

function acceptConnection(receiver, senderId) {
  return receiver.service.connection.acceptConnection(senderId);
}

function sendText(sender, conversationId, message = 'Hello, World!') {
  const payload = sender.service.conversation.createText(message);
  return sender.service.conversation.send(conversationId, payload);
}

describe('Account', () => {
  let alice;
  let bob;

  beforeAll(async done => {
    if (CAN_RUN) {
      logger.info('Running smoke tests for @wireapp/core ...');
      alice = await getAccount(process.env.ALICE_EMAIL, process.env.ALICE_PASSWORD);
      bob = await getAccount(process.env.BOB_EMAIL, process.env.BOB_PASSWORD);
    }
    done();
  });

  describe('Message Sending', () => {
    beforeAll(async done => {
      if (CAN_RUN) {
        expect(ValidationUtil.isUUIDv4(alice.apiClient.context.userId)).toBe(true);
        expect(ValidationUtil.isUUIDv4(bob.apiClient.context.userId)).toBe(true);
      }
      done();
    });

    it('can send and receive messages', async done => {
      if (!CAN_RUN) {
        logger.warn('Skipping smoke tests because environment variables are not set.');
        return done();
      }

      const message = 'Hello, Bob!';

      bob.on(Account.INCOMING.TEXT_MESSAGE, async data => {
        expect(data.content.text).toBe(message);
        done();
      });

      await bob.listen();
      const {conversation: conversationId, from: connectingUserId} = await createConnection(alice, bob);
      await acceptConnection(bob, connectingUserId);
      await sendText(alice, conversationId, message);
    });
  });
});
