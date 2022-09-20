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
const bazinga64 = require('bazinga64');
const Proteus = require('@wireapp/proteus');
const {Cryptobox} = require('@wireapp/cryptobox');
const {CryptographyService} = require('@wireapp/core/src/main/cryptography/');
const {MemoryEngine} = require('@wireapp/store-engine');
const {decryptAsset, encryptAsset} = require('@wireapp/core/src/main/cryptography/AssetCryptography');

async function createEngine(storeName) {
  const engine = new MemoryEngine();
  await engine.init(storeName);
  return engine;
}

describe('CryptographyService', () => {
  let cryptography;
  let aliceLastResortPreKey;
  let bob;

  beforeAll(async () => {
    await Proteus.init();
  });

  beforeEach(async () => {
    cryptography = new CryptographyService(undefined, await createEngine('wire'), {
      useQualifiedIds: false,
      nbPrekeys: 1,
    });
    const preKeys = await cryptography.cryptobox.create();
    aliceLastResortPreKey = preKeys.filter(preKey => preKey.key_id === Proteus.keys.PreKey.MAX_PREKEY_ID)[0];
    bob = new Cryptobox(await createEngine('wire'));
    return bob.create();
  });

  describe('"constructor"', () => {
    it('creates an instance.', () => {
      expect(cryptography.cryptobox.identity.public_key.fingerprint()).toBeDefined();
      expect(cryptography).toBeDefined();
    });
  });

  describe('"constructSessionId"', () => {
    it('constructs a Session ID by a given User ID and Client ID.', async () => {
      const clientId = '1ceb9063fced26d3';
      const userId = 'afbb5d60-1187-4385-9c29-7361dea79647';
      cryptography = new CryptographyService(undefined, await createEngine('wire'), {
        useQualifiedIds: false,
        nbPrekeys: 1,
      });
      const actual = cryptography.constructSessionId(userId, clientId);
      expect(actual).toContainEqual(clientId);
      expect(actual).toContainEqual(userId);
    });
  });

  describe('"decrypt"', () => {
    it('decrypts a Base64-encoded cipher message.', async () => {
      const alicePublicKey = cryptography.cryptobox.identity.public_key;
      const publicPreKeyBundle = new Proteus.keys.PreKeyBundle(alicePublicKey, aliceLastResortPreKey);
      const text = 'Hello Alice!';
      const encryptedPreKeyMessage = await bob.encrypt(
        'alice-user-id@alice-client-id',
        text,
        publicPreKeyBundle.serialise(),
      );
      const encodedPreKeyMessage = bazinga64.Encoder.toBase64(encryptedPreKeyMessage).asString;
      const decryptedMessage = await cryptography.decrypt('bob-user-id@bob-client-id', encodedPreKeyMessage);
      const plaintext = Buffer.from(decryptedMessage).toString('utf8');
      expect(plaintext).toBe(text);
    });
  });

  describe('"encrypt"', () => {
    it('generates a set of encrypted data based on PreKeys from multiple clients.', async () => {
      const firstUserID = 'bc0c99f1-49a5-4ad2-889a-62885af37088';
      const secondUserID = '2bde49aa-bdb5-458f-98cf-7d3552b10916';

      const firstClientId = '2b83ee08d7ac550d';

      const preKeyBundleMap = {
        [firstUserID]: {
          '5e80ea7886680975': {
            id: 1337,
            key: 'pQABARn//wKhAFggJ1Fbpg5l6wnzKOJE+vXpRnkqUYhIvVnR5lNXEbO2o/0DoQChAFggHxZvgvtDktY/vqBcpjjo6rQnXvcNQhfwmy8AJQJKlD0E9g==',
          },
          be67218b77d02d30: {
            id: 72,
            key: 'pQABARn//wKhAFggTWwHUoppQ8aXWhbH95YWnNp6uOYMxo2y4wbarWbF+EEDoQChAFggUiFoPtsiR0WFowIvl0myD+bVnFQJBYarqieI0Gly46QE9g==',
          },
          [firstClientId]: {
            id: 42,
            key: 'pQABARn//wKhAFggWcbwny0jdqlcnnn0j4QSENIVVq/KgyQ3mmdpunfvGZQDoQChAFggrsQBkQkrVZ8sWhr8wTeaC+dmctuJ3oRqfdHsymTtKmgE9g==',
          },
        },
        [secondUserID]: {
          '5bad8cdeddc5a90f': {
            id: 1,
            key: 'pQABARn//wKhAFggEYATUNJBQ7E2tfHT7HMLxa4O3Ckd7PciUdyKiGNNWbYDoQChAFggP/s0BHmHQDNwrO4pC1dqdNHsW7bnpmF9mBadrbep4PoE9g==',
          },
          bc78eded90386d20: {
            id: 65535,
            key: 'pQABARn//wKhAFgg1xOfzMpWmpN2aBGW+0RG23L0I301pncd/HXqUm+pVyoDoQChAFggnl+dmwGW45AArcPutjUkAjYmhIbXBPrqkVrNyg0ZI08E9g==',
          },
        },
      };

      const text = new Uint8Array([72, 101, 108, 108, 111, 33]); // "Hello!"
      const {encrypted} = await cryptography.encrypt(text, preKeyBundleMap);
      expect(Object.keys(encrypted).length).toBe(2);
      expect(Object.keys(encrypted[firstUserID]).length).toBe(3);
      expect(Object.keys(encrypted[secondUserID]).length).toBe(2);
      expect(encrypted[firstUserID][firstClientId]).toEqual(jasmine.any(Object));
    });
  });

  describe('"encryptAsset"', () => {
    it('encrypts and decrypts ArrayBuffer', async () => {
      const bytes = window.crypto.getRandomValues(new Uint8Array(16));

      const encryptedAsset = await encryptAsset({plainText: bytes});
      const decryptedBuffer = await decryptAsset(encryptedAsset);

      expect(decryptedBuffer).toEqual(bytes);
    });

    it('does not decrypt when the hash is missing', async () => {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      const byteBuffer = Buffer.from(bytes.buffer);

      const {cipherText, keyBytes} = await encryptAsset({plainText: byteBuffer});

      try {
        await decryptAsset(cipherText, keyBytes, null);
        fail();
      } catch (error) {}
    });

    it('does not decrypt when hash is an empty array', async () => {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      const byteBuffer = Buffer.from(bytes.buffer);

      const {cipherText, keyBytes} = await encryptAsset({plainText: byteBuffer});

      try {
        await decryptAsset(cipherText, keyBytes, new Uint8Array([]));
        fail();
      } catch (error) {}
    });
  });

  describe('"encryptPayloadForSession"', () => {
    it('encodes plaintext.', async () => {
      const sessionWithBobId = 'bob-user-id@bob-client-id';
      const text = new Uint8Array([72, 101, 108, 108, 111, 32, 66, 111, 98, 33]); // "Hello Bob!"
      const encodedPreKey =
        'pQABAQACoQBYIHOFFWPnWlr4sulxUWYoP0A6rsJiBO/Ec3Y914t67CIAA6EAoQBYIPFH5CK/a0YwKEx4n/+U/IPRN+mJXVv++MCs5Z4dLmz4BPY=';
      const {sessionId, encryptedPayload} = await cryptography.encryptPayloadForSession(
        sessionWithBobId,
        text,
        encodedPreKey,
      );
      expect(new TextDecoder().decode(encryptedPayload)).not.toBe('💣');
      expect(sessionId).toBe(sessionWithBobId);
    });

    it('encodes invalid text as Bomb Emoji.', async () => {
      const sessionWithBobId = 'bob-user-id@bob-client-id';
      const encodedPreKey =
        'pQABAQACoQBYIHOFFWPnWlr4sulxUWYoP0A6rsJiBO/Ec3Y914t67CIAA6EAoQBYIPFH5CK/a0YwKEx4n/+U/IPRN+mJXVv++MCs5Z4dLmz4BPY=';
      const {sessionId, encryptedPayload} = await cryptography.encryptPayloadForSession(
        sessionWithBobId,
        undefined,
        encodedPreKey,
      );
      expect(new TextDecoder().decode(encryptedPayload)).toBe('💣');
      expect(sessionId).toBe(sessionWithBobId);
    });
  });
});
