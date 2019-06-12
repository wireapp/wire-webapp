/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

const {error: StoreEngineError, MemoryEngine} = require('@wireapp/store-engine');
const cryptobox = require('@wireapp/cryptobox');
const Proteus = require('@wireapp/proteus');
const sodium = require('libsodium-wrappers-sumo');

describe('cryptobox.CryptoboxSession', () => {
  let alice = undefined;
  let bob = undefined;

  async function setupAliceToBob(amountOfBobsPreKeys, bobPreKeyId) {
    const aliceEngine = new MemoryEngine();
    await aliceEngine.init('alice');

    const bobEngine = new MemoryEngine();
    await bobEngine.init('bob');

    alice = new cryptobox.Cryptobox(aliceEngine, 1);
    await alice.create();

    bob = new cryptobox.Cryptobox(bobEngine, amountOfBobsPreKeys);
    await bob.create();

    // 1. Bob creates and "uploads" a PreKey, which can be "consumed" by Alice
    const preKey = await bob.get_prekey(bobPreKeyId);
    const bobBundle = Proteus.keys.PreKeyBundle.new(bob.identity.public_key, preKey);
    // 2. Alice takes Bob's PreKey bundle to initiate a session
    const sessionWithBob = await alice.session_from_prekey('alice-to-bob', bobBundle.serialise());
    return sessionWithBob;
  }

  describe('"fingerprints"', () => {
    it('returns the local & remote fingerpint', async () => {
      const sessionWithBob = await setupAliceToBob(1, Proteus.keys.PreKey.MAX_PREKEY_ID);
      expect(sessionWithBob.fingerprint_local()).toBe(alice.identity.public_key.fingerprint());
      expect(sessionWithBob.fingerprint_remote()).toBe(bob.identity.public_key.fingerprint());
    });
  });

  describe('"encryption & decryption"', () => {
    const plaintext = 'Hello Bob, I am Alice.';

    it('encrypts a message from Alice which can be decrypted by Bob', async () => {
      const sessionWithBob = await setupAliceToBob(2, 0);
      const serialisedCipherText = await sessionWithBob.encrypt(plaintext);
      const proteusSession = await bob.session_from_message('session-with-alice', serialisedCipherText);
      const decryptedBuffer = proteusSession[1];
      const decrypted = sodium.to_string(decryptedBuffer);
      expect(decrypted).toBe(plaintext);
    });

    it("doesn't remove the last resort PreKey if consumed", async () => {
      const sessionWithBob = await setupAliceToBob(1, Proteus.keys.PreKey.MAX_PREKEY_ID);
      const serialisedCipherText = await sessionWithBob.encrypt(plaintext);
      const proteusSession = await bob.session_from_message('session-with-alice', serialisedCipherText);
      const decryptedBuffer = proteusSession[1];
      const decrypted = sodium.to_string(decryptedBuffer);
      expect(decrypted).toBe(plaintext);
    });

    it('always accepts a PreKey message even if there is already an existing session', async () => {
      // Alice creates a session with Bob and Bob creates a session with Alice by decrypting Alice's message
      const sessionWithBob = await setupAliceToBob(5, 0);
      const sessionIdFromBob = 'bob-to-alice';
      let serialisedCipherText = await sessionWithBob.encrypt(plaintext);
      let decryptedBuffer = await bob.decrypt(sessionIdFromBob, serialisedCipherText);
      let decryptedString = sodium.to_string(decryptedBuffer);
      expect(decryptedString).toBe(plaintext);

      // Alice deletes the session with Bob and creates a new one with another PreKey from Bob
      const sessionIdFromAlice = sessionWithBob.id;
      const message = 'Hello Bob. Nice to see you!';
      await alice.session_delete(sessionIdFromAlice);

      const bobBundle = await bob.get_prekey_bundle(1);
      serialisedCipherText = await alice.encrypt(sessionIdFromAlice, message, bobBundle.serialise());
      decryptedBuffer = await bob.decrypt(sessionIdFromBob, serialisedCipherText);
      decryptedString = sodium.to_string(decryptedBuffer);
      expect(decryptedString).toBe(message);
    });
  });

  describe('"Session reset"', () => {
    it('throws an error when a session is broken', async () => {
      const aliceEngine = new MemoryEngine();
      await aliceEngine.init('store-alice');

      const bobEngine = new MemoryEngine();
      await bobEngine.init('store-bob');

      alice = new cryptobox.Cryptobox(aliceEngine, 5);
      await alice.create();

      bob = new cryptobox.Cryptobox(bobEngine, 5);
      await bob.create();

      const preKeyBundle = await bob.get_serialized_standard_prekeys();

      const deserialisedBundle = sodium.from_base64(preKeyBundle[1].key, sodium.base64_variants.ORIGINAL);

      const message = 'Hello Bob!';
      const ciphertext = await alice.encrypt('alice-to-bob', message, deserialisedBundle.buffer);
      const decrypted = await bob.decrypt('bob-to-alice', ciphertext);
      expect(sodium.to_string(decrypted)).toBe(message);

      const deletedSessionId = await alice.session_delete('alice-to-bob');
      expect(deletedSessionId).toBe('alice-to-bob');

      try {
        await alice.encrypt('alice-to-bob', `I'm back!`);
        fail();
      } catch (error) {
        expect(error).toEqual(jasmine.any(StoreEngineError.RecordNotFoundError));
        expect(error.code).toBe(2);
      }
    });
  });
});
