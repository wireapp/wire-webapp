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
const {APIClient} = require('@wireapp/api-client');
const UUID = require('pure-uuid');
const {Account} = require('@wireapp/core');
const {GenericMessage, Text} = require('@wireapp/protocol-messaging');
const {MemoryEngine} = require('@wireapp/store-engine');

const createMessage = content => {
  const customTextMessage = GenericMessage.create({
    messageId: new UUID(4).format(),
    text: Text.create({content}),
  });

  return GenericMessage.encode(customTextMessage).finish();
};

const generatePreKeyBundle = (userCount, clientsPerUser) => {
  const prekeyBundle = {};
  for (let userIndex = 0; userIndex < userCount; userIndex++) {
    const userId = new UUID(4).format();
    prekeyBundle[userId] = {};
    for (let clientIndex = 0; clientIndex < clientsPerUser; clientIndex++) {
      const clientId = new UUID(4).format();
      prekeyBundle[userId][clientId] = {};
    }
  }
  return prekeyBundle;
};

describe('ConversationService', () => {
  let account;

  beforeAll(async () => {
    const engine = new MemoryEngine();
    await engine.init('');

    const client = new APIClient({store: engine, urls: APIClient.BACKEND.STAGING});

    account = new Account(client);
    await account.init();
  });

  describe("'shouldSendAsExternal'", () => {
    it('returns true for a big payload', () => {
      const {conversation} = account.service;
      const preKeyBundles = generatePreKeyBundle(128, 4);

      const longMessage =
        'Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Duis autem';
      const plainText = createMessage(longMessage);

      const shouldSendAsExternal = conversation.shouldSendAsExternal(plainText, preKeyBundles);
      expect(shouldSendAsExternal).toBe(true);
    });

    it('returns false for a small payload', async done => {
      const {conversation} = account.service;
      const preKeyBundles = generatePreKeyBundle(2, 1);

      const shortMessage = new UUID(4).format();
      const plainText = createMessage(shortMessage);

      const shouldSendAsExternal = conversation.shouldSendAsExternal(plainText, preKeyBundles);
      expect(shouldSendAsExternal).toBe(false);

      done();
    });

    it('adds missing prekeys', async () => {
      const aliceId = new UUID(4).format();
      const aliceClientId = new UUID(4).format();
      const bobId = new UUID(4).format();
      const bobClientId = new UUID(4).format();

      const initialPreKeyBundles = {
        [aliceId]: {
          [new UUID(4).format()]: {},
        },
      };

      spyOn(account.apiClient.conversation.api, 'postOTRMessage').and.callFake(
        (sendingClientId, conversationId, message) =>
          new Promise((resolve, reject) => {
            if (message.recipients[aliceId] && !message.recipients[aliceId][aliceClientId]) {
              // eslint-disable-next-line prefer-promise-reject-errors
              reject({
                response: {
                  data: {
                    deleted: {},
                    missing: {
                      [aliceId]: [aliceClientId],
                      [bobId]: [bobClientId],
                    },
                    redundant: {},
                    time: new Date().toISOString(),
                  },
                  status: 412,
                },
              });
            } else {
              resolve();
            }
          })
      );
      spyOn(account.apiClient.user.api, 'postMultiPreKeyBundles').and.returnValue(
        Promise.resolve({
          [aliceId]: {
            [aliceClientId]: {},
          },
          [bobId]: {
            [bobClientId]: {},
          },
        })
      );

      const payload = createMessage('Hello, world!');
      const recipients = await account.service.cryptography.encrypt(payload, initialPreKeyBundles);
      expect(recipients[aliceId]).toBeDefined();
      expect(recipients[aliceId][aliceClientId]).toBeUndefined();
      expect(recipients[bobId]).toBeUndefined();

      await account.service.conversation.sendOTRMessage(aliceId, new UUID(4).format(), recipients, payload);
      expect(recipients[aliceId][aliceClientId]).toBeDefined();
      expect(recipients[bobId][bobClientId]).toBeDefined();
    });

    it('removes deleted prekeys', async () => {
      const aliceId = new UUID(4).format();
      const aliceClientId = new UUID(4).format();

      const initialPreKeyBundles = {
        [aliceId]: {
          [new UUID(4).format()]: {},
          [aliceClientId]: {},
        },
      };

      spyOn(account.apiClient.conversation.api, 'postOTRMessage').and.callFake(
        (sendingClientId, conversationId, message) =>
          new Promise((resolve, reject) => {
            if (message.recipients[aliceId] && message.recipients[aliceId][aliceClientId]) {
              // eslint-disable-next-line prefer-promise-reject-errors
              reject({
                response: {
                  data: {
                    deleted: {
                      [aliceId]: [aliceClientId],
                    },
                    missing: {},
                    redundant: {},
                    time: new Date().toISOString(),
                  },
                  status: 412,
                },
              });
            } else {
              resolve();
            }
          })
      );
      spyOn(account.apiClient.user.api, 'postMultiPreKeyBundles').and.returnValue(Promise.resolve());

      const payload = createMessage('Hello, world!');
      const recipients = await account.service.cryptography.encrypt(payload, initialPreKeyBundles);
      expect(recipients[aliceId][aliceClientId]).toBeDefined();

      await account.service.conversation.sendOTRMessage(aliceId, new UUID(4).format(), recipients, payload);
      expect(recipients[aliceId]).toBeDefined();
      expect(recipients[aliceId][aliceClientId]).toBeUndefined();
    });
  });

  describe('"createText"', () => {
    it('adds link previews correctly', async () => {
      account.apiClient.context = {
        userId: new UUID(4).format(),
      };

      const url = 'http://example.com';

      const permanentUrl = url;
      const summary = 'Summary';
      const text = url;
      const title = 'Title';
      const tweet = {
        author: 'Author',
        username: 'Username',
      };
      const urlOffset = 0;

      const linkPreview = await account.service.conversation.createLinkPreview({
        permanentUrl,
        summary,
        title,
        tweet,
        url,
        urlOffset,
      });
      const textMessage = account.service.conversation
        .createText(text)
        .withLinkPreviews([linkPreview])
        .build();

      expect(textMessage.content.text).toEqual(text);
      expect(textMessage.content.linkPreviews).toEqual(jasmine.any(Array));
      expect(textMessage.content.linkPreviews.length).toBe(1);

      expect(textMessage.content.linkPreviews[0]).toEqual(
        jasmine.objectContaining({
          permanentUrl,
          summary,
          title,
          tweet,
          url,
          urlOffset,
        })
      );
    });

    it('does not add link previews', () => {
      account.apiClient.context = {
        userId: new UUID(4).format(),
      };

      const text = 'Hello, world!';
      const textMessage = account.service.conversation.createText(text).build();

      expect(textMessage.content.linkPreviews).toBeUndefined();
    });

    it('uploads link previews', async () => {
      account.apiClient.context = {
        userId: new UUID(4).format(),
      };

      spyOn(account.service.asset, 'uploadImageAsset').and.returnValue(
        Promise.resolve({
          cipherText: Buffer.from([]),
          key: '',
          keyBytes: Buffer.from([]),
          sha256: Buffer.from([]),
          token: '',
        })
      );

      const url = 'http://example.com';
      const image = {
        data: Buffer.from([]),
        height: 123,
        type: 'image/jpeg',
        width: 456,
      };
      const text = url;
      const urlOffset = 0;

      const linkPreview = await account.service.conversation.createLinkPreview({image, url, urlOffset});
      const textMessage = account.service.conversation
        .createText(text)
        .withLinkPreviews([linkPreview])
        .build();

      expect(account.service.asset.uploadImageAsset).toHaveBeenCalledTimes(1);

      expect(textMessage.content.linkPreviews).toEqual(jasmine.any(Array));
      expect(textMessage.content.linkPreviews.length).toBe(1);

      expect(textMessage.content.linkPreviews[0]).toEqual(
        jasmine.objectContaining({
          url,
          urlOffset,
        })
      );
    });

    it('adds mentions correctly', () => {
      account.apiClient.context = {
        userId: new UUID(4).format(),
      };

      const text = 'Hello @user!';

      const mention = {
        end: 11,
        start: 6,
        userId: new UUID(4).format(),
      };

      const textMessage = account.service.conversation
        .createText(text)
        .withMentions([mention])
        .build();

      expect(textMessage.content.text).toEqual(text);
      expect(textMessage.content.mentions).toEqual(jasmine.any(Array));
      expect(textMessage.content.mentions.length).toBe(1);

      expect(textMessage.content.mentions[0]).toEqual(jasmine.objectContaining(mention));
    });

    it('does not add mentions', () => {
      account.apiClient.context = {
        userId: new UUID(4).format(),
      };

      const text = 'Hello, world!';
      const textMessage = account.service.conversation.createText(text).build();

      expect(textMessage.content.mentions).toBeUndefined();
    });
  });
});
