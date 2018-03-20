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

/* eslint-disable no-magic-numbers */
const APIClient = require('@wireapp/api-client');
const UUID = require('pure-uuid');
const {Account} = require('@wireapp/core');
const {MemoryEngine} = require('@wireapp/store-engine');

const createMessage = (conversationRepository, content) => {
  const customTextMessage = conversationRepository.protocolBuffers.GenericMessage.create({
    messageId: new UUID(4).format(),
    text: conversationRepository.protocolBuffers.Text.create({content}),
  });

  return conversationRepository.protocolBuffers.GenericMessage.encode(customTextMessage).finish();
};

const generatePreKeyBundles = (users, devicesPerUser) => {
  const preKeyBundles = {};

  new Array(users)
    .fill()
    .map(() => new UUID(4).format())
    .forEach(userId => {
      preKeyBundles[userId] = {};
      new Array(devicesPerUser)
        .fill()
        .map(() => new UUID(4).format())
        .forEach(deviceId => (preKeyBundles[userId][deviceId] = {}));
    });

  return preKeyBundles;
};

describe('ConversationService', () => {
  let account;

  beforeAll(async done => {
    const engine = new MemoryEngine();
    await engine.init('');

    const client = new APIClient({store: engine, urls: APIClient.BACKEND.STAGING});
    account = new Account(client);
    await account.init();

    done();
  });

  describe("'shouldSendAsExternal'", () => {
    it('returns true for a big payload', async done => {
      const {conversation} = account.service;
      const preKeyBundles = generatePreKeyBundles(128, 4);

      const longMessage =
        'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Duis autem';
      const plainText = createMessage(conversation, longMessage);

      const shouldSendAsExternal = conversation.shouldSendAsExternal(plainText, preKeyBundles);

      expect(shouldSendAsExternal).toBe(true);

      done();
    });

    it('returns false for a small payload', async done => {
      const {conversation} = account.service;
      const preKeyBundles = generatePreKeyBundles(2, 1);

      const shortMessage = new UUID(4).format();
      const plainText = createMessage(conversation, shortMessage);

      const shouldSendAsExternal = conversation.shouldSendAsExternal(plainText, preKeyBundles);
      expect(shouldSendAsExternal).toBe(false);

      done();
    });
  });
});
