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

import {MemoryEngine} from '@wireapp/store-engine';
import {Cryptobox} from '@wireapp/cryptobox';
import {keys as ProteusKeys, init as proteusInit} from '@wireapp/proteus';
import {GenericMessage, Text} from '@wireapp/protocol-messaging';

import {arrayToBase64, createRandomUuid} from 'Util/util';

import {GENERIC_MESSAGE_TYPE} from 'src/script/cryptography/GenericMessageType';
import {ClientEvent} from 'src/script/event/Client';
import {TestFactory} from '../../helper/TestFactory';
import {CryptographyError} from 'src/script/error/CryptographyError';
import {entities} from '../../api/payloads';

describe('CryptographyRepository', () => {
  const testFactory = new TestFactory();

  beforeAll(async () => {
    await proteusInit();
    await testFactory.exposeCryptographyActors(false);
  });

  describe('encryptGenericMessage', () => {
    let jane_roe = undefined;
    let john_doe = undefined;

    beforeAll(() => {
      john_doe = {
        clients: {
          desktop_id: 'b29034060fed476e',
          phone_id: '4b0a0fbf418d264c',
        },
        id: entities.user.john_doe.id,
      };

      jane_roe = {
        clients: {
          phone_id: '55cdd1dbe3c2ed74',
        },
        id: entities.user.jane_roe.id,
      };
    });

    it('encrypts a generic message', () => {
      spyOn(testFactory.cryptography_repository.cryptographyService, 'getUsersPreKeys').and.callFake(
        recipients =>
          new Promise(resolve => {
            const prekey_map = {};

            for (const user_id in recipients) {
              if (recipients.hasOwnProperty(user_id)) {
                const client_ids = recipients[user_id];

                prekey_map[user_id] = prekey_map[user_id] || {};

                client_ids.forEach(client_id => {
                  prekey_map[user_id][client_id] = {
                    id: 65535,
                    key: 'pQABARn//wKhAFgg3OpuTCUwDZMt1fklZB4M+fjDx/3fyx78gJ6j3H3dM2YDoQChAFggQU1orulueQHLv5YDYqEYl3D4O0zA9d+TaGGXXaBJmK0E9g==',
                  };
                });
              }
            }

            resolve(prekey_map);
          }),
      );

      const generic_message = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: 'Unit test'}),
        messageId: createRandomUuid(),
      });

      const recipients = {
        [john_doe.id]: [john_doe.clients.phone_id, john_doe.clients.desktop_id],
        [jane_roe.id]: [jane_roe.clients.phone_id],
      };

      return testFactory.cryptography_repository.encryptGenericMessage(recipients, generic_message).then(payload => {
        expect(payload.recipients).toBeTruthy();
        expect(Object.keys(payload.recipients).length).toBe(2);
        expect(Object.keys(payload.recipients[john_doe.id]).length).toBe(2);
        expect(Object.keys(payload.recipients[jane_roe.id]).length).toBe(1);
        expect(payload.recipients[jane_roe.id][jane_roe.clients.phone_id]).toEqual(jasmine.any(String));
      });
    });
  });

  describe('getRemoteFingerprint', () => {
    it('generates the remote fingerprint based on a prekey', async () => {
      const userId = '6f656da7-0c52-44d1-959d-ddc9fbdca244';
      const clientId = '689ce2df236eb2be';
      const preKey = {
        id: 3,
        key: 'pQABAQMCoQBYIFycSfcOATSpOIkJz8ntEnFAZ+YWtzVaJ7RLeDAqGU+0A6EAoQBYIMEJnklbfFFvnFC41rmjDMqx6L0oVX5RMab3uGwBgbkaBPY=',
      };
      const fingerprint = await testFactory.cryptography_repository.getRemoteFingerprint(userId, clientId, preKey);

      // eslint-disable-next-line
      expect(fingerprint).toEqual('c1099e495b7c516f9c50b8d6b9a30ccab1e8bd28557e5131a6f7b86c0181b91a');
    });
  });

  describe('handleEncryptedEvent', () => {
    afterEach(() => {
      testFactory.storage_repository.clearStores();
    });

    it('detects duplicated messages', async () => {
      jest
        .spyOn(testFactory.cryptography_repository.cryptographyService, 'putClientPreKeys')
        .mockReturnValue(Promise.resolve());
      const preKeys = await testFactory.cryptography_repository.initCryptobox();
      const alice = testFactory.cryptography_repository.cryptobox.identity;

      expect(alice).toBeDefined();

      const aliceBundle = new ProteusKeys.PreKeyBundle(alice.public_key, preKeys[0]);

      const bobEngine = new MemoryEngine();
      await bobEngine.init('bob');

      const bob = new Cryptobox(bobEngine, 1);
      await bob.create();

      const plainText = 'Hello, Alice!';

      const genericMessage = new GenericMessage({
        [GENERIC_MESSAGE_TYPE.TEXT]: new Text({content: plainText}),
        messageId: createRandomUuid(),
      });

      const cipherText = await bob.encrypt(
        'session-with-alice',
        GenericMessage.encode(genericMessage).finish(),
        aliceBundle.serialise(),
      );
      const encodedCipherText = arrayToBase64(cipherText);

      const mockedEvent = {
        data: {
          text: encodedCipherText,
        },
        from: createRandomUuid(),
        id: createRandomUuid(),
      };

      const decrypted = await testFactory.cryptography_repository.handleEncryptedEvent(mockedEvent);

      expect(decrypted.data.content).toBe(plainText);

      await expect(testFactory.cryptography_repository.handleEncryptedEvent(mockedEvent)).rejects.toMatchObject({
        type: CryptographyError.TYPE.UNHANDLED_TYPE,
      });
    });

    it('detects a session reset request', () => {
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const event = {
        conversation: 'f1d2d451-0fcb-4313-b0ba-313b971ab758',
        time: '2017-03-22T11:06:29.232Z',
        data: {text: '💣', sender: 'e35e4ee5b80a1a9d', recipient: '7481c47f2f7336d8'},
        from: 'e3ff8dab-1407-4890-b9d3-e1aab49233e8',
        type: 'conversation.otr-message-add',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.cryptography_repository.handleEncryptedEvent(event).then(mapped_event => {
        expect(mapped_event.type).toBe(ClientEvent.CONVERSATION.UNABLE_TO_DECRYPT);
      });
    });

    it('only accepts reasonable sized payloads (text key)', () => {
      // Length of this message is 1 320 024 while the maximum is 150% of 12 000 (18 000)
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const text = window.btoa(`https://wir${'\u0000\u0001\u0000\u000D\u0000A'.repeat(165000)}e.com/`);
      const event = {
        conversation: '7bc4558b-18ce-446b-8e62-0c442b86ba56',
        time: '2017-06-15T22:18:55.071Z',
        data: {text: text, sender: 'ccc17722a9348793', recipient: '4d7a36b30ef8bc26'},
        from: '8549aada-07cc-4272-9fd4-c2ae040c539d',
        type: 'conversation.otr-message-add',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.cryptography_repository.handleEncryptedEvent(event).then(mapped_event => {
        expect(mapped_event.type).toBe(ClientEvent.CONVERSATION.INCOMING_MESSAGE_TOO_BIG);
      });
    });

    it('only accepts reasonable sized payloads (data key)', () => {
      // Length of this message is 1 320 024 while the maximum is 150% of 12 000 (18 000)
      /* eslint-disable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */
      const data = window.btoa(`https://wir${'\u0000\u0001\u0000\u000D\u0000A'.repeat(165000)}e.com/`);
      const event = {
        conversation: '7bc4558b-18ce-446b-8e62-0c442b86ba56',
        time: '2017-06-15T22:18:55.071Z',
        data: {text: '💣', data: data, sender: 'ccc17722a9348793', recipient: '4d7a36b30ef8bc26'},
        from: '8549aada-07cc-4272-9fd4-c2ae040c539d',
        type: 'conversation.otr-message-add',
      };
      /* eslint-enable comma-spacing, key-spacing, sort-keys-fix/sort-keys-fix, quotes */

      return testFactory.cryptography_repository.handleEncryptedEvent(event).then(mapped_event => {
        expect(mapped_event.type).toBe(ClientEvent.CONVERSATION.INCOMING_MESSAGE_TOO_BIG);
      });
    });
  });
});
