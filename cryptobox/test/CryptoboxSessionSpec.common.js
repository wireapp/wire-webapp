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

describe('cryptobox.CryptoboxSession', () => {
  let cryptobox = undefined;
  let Proteus = undefined;
  let sodium = undefined;

  beforeAll(done => {
    if (typeof window === 'object') {
      cryptobox = window.cryptobox;
      Proteus = window.Proteus;
      sodium = window.sodium;
      done();
    } else {
      cryptobox = require('@wireapp/cryptobox');
      Proteus = require('@wireapp/proteus');
      sodium = require('libsodium');
      done();
    }
  });

  describe('PreKey messages', () => {
    let alice = undefined;
    let bob = undefined;

    function generatePreKeys(cryptobox_store) {
      // Generate one PreKey and the Last Resort PreKey
      const pre_keys = Proteus.keys.PreKey.generate_prekeys(0, 1);
      pre_keys.push(Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID));

      const promises = pre_keys.map(pre_key => cryptobox_store.save_prekey(pre_key));

      return Promise.all(promises)
        .then(() => {
          return pre_keys;
        })
        .catch(error => {
          console.log('Error in Test PreKey generation.');
          throw error;
        });
    }

    function setupAliceToBob(preKeyId) {
      // 1. Bob creates and "uploads" a PreKey, which can be "consumed" by Alice
      return generatePreKeys(bob.cryptobox_store)
        .then(() => {
          return bob.cryptobox_store.load_prekey(preKeyId);
        })
        .then(prekey => {
          // 2. Alice takes Bob's PreKey bundle to initiate a session
          bob.bundle = Proteus.keys.PreKeyBundle.new(bob.identity.public_key, prekey);
          return Proteus.session.Session.init_from_prekey(alice.identity, bob.bundle);
        })
        .then(session => {
          // 3. Alice upgrades the basic Proteus session into a high-level Cryptobox session
          return new cryptobox.CryptoboxSession('bobs_client_id', alice.pre_key_store, session);
        })
        .catch(error => {
          console.log('Error in Test Alice setup!');
          throw error;
        });
    }

    beforeEach(() => {
      alice = {
        cryptobox_store: new cryptobox.store.Cache(),
        identity: Proteus.keys.IdentityKeyPair.new(),
      };

      alice.pre_key_store = new cryptobox.store.ReadOnlyStore(alice.cryptobox_store);

      bob = {
        cryptobox_store: new cryptobox.store.Cache(),
        identity: Proteus.keys.IdentityKeyPair.new(),
      };

      bob.pre_key_store = new cryptobox.store.ReadOnlyStore(bob.cryptobox_store);
    });

    describe('fingerprints', () => {
      it('returns the local & remote fingerpint', done => {
        setupAliceToBob(0)
          .then(sessionWithBob => {
            expect(sessionWithBob.fingerprint_local()).toBe(alice.identity.public_key.fingerprint());
            expect(sessionWithBob.fingerprint_remote()).toBe(bob.identity.public_key.fingerprint());
            done();
          })
          .catch(done.fail);
      });
    });

    describe('encryption & decryption', () => {
      const plaintext = 'Hello Bob, I am Alice.';

      it('encrypts a message from Alice which can be decrypted by Bob', done => {
        Promise.resolve()
          .then(() => {
            return setupAliceToBob(0);
          })
          .then(sessionWithBob => {
            return sessionWithBob.encrypt(plaintext);
          })
          .then(serialisedCipherText => {
            const envelope = Proteus.message.Envelope.deserialise(serialisedCipherText);
            expect(bob.pre_key_store.prekeys.length).toBe(0);
            return Proteus.session.Session.init_from_message(bob.identity, bob.pre_key_store, envelope);
          })
          .then(proteusSession => {
            // When Bob decrypts a PreKey message, he knows that one of his PreKeys has been "consumed"
            expect(bob.pre_key_store.prekeys.length).toBe(1);
            const decryptedBuffer = proteusSession[1];
            const decrypted = sodium.to_string(decryptedBuffer);
            expect(decrypted).toBe(plaintext);
            done();
          })
          .catch(done.fail);
      });

      it("doesn't remove the last resort PreKey if consumed", done => {
        Promise.resolve()
          .then(() => {
            return setupAliceToBob(Proteus.keys.PreKey.MAX_PREKEY_ID);
          })
          .then(sessionWithBob => {
            return sessionWithBob.encrypt(plaintext);
          })
          .then(serialisedCipherText => {
            const envelope = Proteus.message.Envelope.deserialise(serialisedCipherText);
            expect(bob.pre_key_store.prekeys.length).toBe(0);
            return Proteus.session.Session.init_from_message(bob.identity, bob.pre_key_store, envelope);
          })
          .then(proteusSession => {
            expect(bob.pre_key_store.prekeys.length).toBe(0);
            const decryptedBuffer = proteusSession[1];
            const decrypted = sodium.to_string(decryptedBuffer);
            expect(decrypted).toBe(plaintext);
            done();
          })
          .catch(done.fail);
      });
    });
  });
});
