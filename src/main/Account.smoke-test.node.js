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

const AccountHelper = require('./test/AccountHelper');
const {PayloadBundleType} = require('@wireapp/core/dist/conversation/');
const {ValidationUtil} = require('@wireapp/commons');
const {UnconnectedUserError} = require('@wireapp/api-client/dist/commonjs/user/');
const logdown = require('logdown');

const logger = logdown('@wireapp/core/main/Account(SmokeTest)', {
  logger: console,
  markdown: false,
});
logger.state.isEnabled = true;

function getId(user) {
  return user.apiClient.context.userId;
}

function isMissingEnvironmentVariable() {
  let isMissing = false;
  const requiredVariables = [
    'ALICE_EMAIL',
    'ALICE_PASSWORD',
    'BOB_EMAIL',
    'BOB_PASSWORD',
    'EVE_EMAIL',
    'EVE_PASSWORD',
    'WILL_RELEASE',
  ];

  requiredVariables.forEach(variable => {
    if (!process.env[variable]) {
      isMissing = process.env.variable;
      logger.warn(`Missing environment variable "${variable}".`);
    }
  });

  return isMissing;
}

// Note: We need to listen to the "WILL_RELEASE" environment variable, otherwise our tests get executed on every commit in a Pull Request (PR) which will cause the "login too frequently" backend error for the smoke tests accounts.
const CAN_RUN = !isMissingEnvironmentVariable() && process.env.WILL_RELEASE === '0';

function createConnection(sender, receiver) {
  return sender.service.connection.createConnection(receiver.apiClient.context.userId);
}

function acceptConnection(receiver, senderId) {
  return receiver.service.connection.acceptConnection(senderId);
}

function sendText(sender, conversationId, message = 'Hello, World!') {
  const payload = sender.service.conversation.createText(message).build();
  return sender.service.conversation.send(conversationId, payload);
}

async function connect(sender, receiver) {
  const {conversation: conversationId, from: connectingUserId} = await createConnection(sender, receiver);
  await acceptConnection(receiver, connectingUserId);
  return conversationId;
}

beforeAll(() => (jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000));

xdescribe('Account', () => {
  let alice;
  let bob;
  let eve;

  beforeAll(async () => {
    if (CAN_RUN) {
      logger.log('Running smoke tests for @wireapp/core ...');

      try {
        alice = await AccountHelper.getAccount(process.env.ALICE_EMAIL, process.env.ALICE_PASSWORD);
      } catch (error) {
        logger.error(
          `Cannot login with email "${process.env.ALICE_EMAIL}". Aborting test.`,
          error && error.response && error.response.data ? error.response.data : ''
        );
        return fail(error);
      }

      try {
        bob = await AccountHelper.getAccount(process.env.BOB_EMAIL, process.env.BOB_PASSWORD);
      } catch (error) {
        logger.error(
          `Cannot login with email "${process.env.BOB_EMAIL}". Aborting test.`,
          error && error.response && error.response.data ? error.response.data : ''
        );
        return fail(error);
      }

      try {
        eve = await AccountHelper.getAccount(process.env.EVE_EMAIL, process.env.EVE_PASSWORD);
      } catch (error) {
        logger.error(
          `Cannot login with email "${process.env.EVE_EMAIL}". Aborting test.`,
          error && error.response && error.response.data ? error.response.data : ''
        );
        return fail(error);
      }
    } else {
      logger.warn('Skipping smoke tests because environment variables are not set.');
    }
  });

  describe('"Message Sending"', () => {
    beforeAll(() => {
      if (CAN_RUN) {
        expect(ValidationUtil.isUUIDv4(alice.apiClient.context.userId)).toBe(true);
        expect(ValidationUtil.isUUIDv4(bob.apiClient.context.userId)).toBe(true);
      }
    });

    beforeEach(async () => {
      if (CAN_RUN) {
        await alice.service.conversation.leaveConversations();
        await bob.service.conversation.leaveConversations();
        await eve.service.conversation.leaveConversations();
      }
    });

    it('sends and receives messages.', async () => {
      if (!CAN_RUN) {
        return;
      }

      const message = 'Hello, Bob!';

      bob.on(PayloadBundleType.TEXT, async payload => {
        expect(payload.content.text).toBe(message);
      });

      await bob.listen();
      const conversationId = await connect(
        alice,
        bob
      );
      await sendText(alice, conversationId, message);
    });

    it('creates conversations and adds participants.', async () => {
      if (!CAN_RUN) {
        return;
      }

      // Alice connects to Bob
      await connect(
        alice,
        bob
      );

      // Alice connects to Eve (Bob doesn't know Eve)
      await connect(
        alice,
        eve
      );

      // Bob creates a conversation with Alice
      const {id: conversationId} = await bob.service.conversation.createConversation('Test Group', getId(alice));

      // Bob tries to add Eve but it will fail because there are not connected
      try {
        await bob.service.conversation.addUser(conversationId, getId(eve));
      } catch (error) {
        expect(error.name).toBe(UnconnectedUserError.name);
      }

      // Alice adds Eve to the conversation
      await alice.service.conversation.addUser(conversationId, getId(eve));
    });
  });
});
