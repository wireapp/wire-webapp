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

/* eslint no-magic-numbers: "off" */

const cryptobox = require('@wireapp/cryptobox');
const Proteus = require('@wireapp/proteus');
const {MemoryEngine} = require('@wireapp/store-engine');
const sodium = require('libsodium-wrappers-sumo');

describe('cryptobox.Cryptobox', () => {
  let engine = undefined;

  async function createCryptobox(storeName, amountOfPreKeys = 1) {
    const memoryEngine = new MemoryEngine();
    await memoryEngine.init(storeName);
    return new cryptobox.Cryptobox(memoryEngine, amountOfPreKeys);
  }

  beforeEach(async done => {
    engine = new MemoryEngine();
    await engine.init('cache');
    done();
  });

  describe('"decrypt"', () => {
    it("doesn't decrypt empty ArrayBuffers", done => {
      const box = new cryptobox.Cryptobox(engine);
      const sessionId = 'sessionWithBob';
      box
        .decrypt(sessionId, new ArrayBuffer(0))
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(cryptobox.DecryptionError));
          done();
        });
    });

    it('throws a Proteus decryption error if you try to decrypt the same message twice', async () => {
      const alice = await createCryptobox('alice');
      await alice.create();

      const bob = await createCryptobox('bob');
      const bobsPreKeys = await bob.create();

      const bobBundle = Proteus.keys.PreKeyBundle.new(bob.identity.public_key, bobsPreKeys[0]);

      const plaintext = 'Hello, Bob!';
      const ciphertext = await alice.encrypt('session-with-bob', plaintext, bobBundle.serialise());

      const decrypted = await bob.decrypt('session-with-alice', ciphertext);
      const decryptedText = sodium.to_string(decrypted);

      expect(decryptedText).toBe(plaintext);

      try {
        await bob.decrypt('session-with-alice', ciphertext);
      } catch (error) {
        expect(error).toEqual(jasmine.any(Proteus.errors.DecryptError.DuplicateMessage));
        expect(error.code).toBe(Proteus.errors.DecryptError.CODE.CASE_209);
      }
    });
  });

  describe('"create"', () => {
    it('initializes a Cryptobox with a new identity and the last resort PreKey and saves these', done => {
      const box = new cryptobox.Cryptobox(engine);

      box
        .create()
        .then(() => {
          expect(box.identity).toBeDefined();
          return box.store.load_identity();
        })
        .then(identity => {
          expect(identity).toBeDefined();
          expect(identity.public_key.fingerprint()).toBeDefined();
          return box.store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID);
        })
        .then(preKey => {
          expect(preKey.key_id).toBe(Proteus.keys.PreKey.MAX_PREKEY_ID);
          done();
        })
        .catch(done.fail);
    });

    it('initializes a Cryptobox with a defined amount of PreKeys (including the last resort PreKey)', async done => {
      const box = new cryptobox.Cryptobox(engine, 10);
      await box.create();
      const preKeys = await box.store.load_prekeys();
      const lastResortPreKey = preKeys.filter(preKey => preKey.key_id === Proteus.keys.PreKey.MAX_PREKEY_ID);
      expect(preKeys.length).toBe(10);
      expect(box.lastResortPreKey).toBeDefined();
      expect(box.lastResortPreKey).toEqual(lastResortPreKey[0]);
      done();
    });

    it('returns the current version', () => {
      expect(cryptobox.Cryptobox.VERSION).toBeDefined();
    });
  });

  describe('"load"', () => {
    it('initializes a Cryptobox with an existing identity and the last resort PreKey', done => {
      let box = new cryptobox.Cryptobox(engine, 4);
      let initialFingerPrint = undefined;

      box
        .create()
        .then(initialPreKeys => {
          const lastResortPreKey = initialPreKeys[initialPreKeys.length - 1];
          expect(lastResortPreKey.key_id).toBe(Proteus.keys.PreKey.MAX_PREKEY_ID);

          const identity = box.identity;
          expect(identity).toBeDefined();
          expect(identity.public_key.fingerprint()).toBeDefined();

          initialFingerPrint = identity.public_key.fingerprint();

          box = new cryptobox.Cryptobox(engine);
          expect(box.identity).not.toBeDefined();
          return box.load();
        })
        .then(() => {
          expect(box.identity.public_key.fingerprint()).toBe(initialFingerPrint);
          done();
        })
        .catch(done.fail);
    });

    it('fails to initialize a Cryptobox of which the identity is missing', done => {
      let box = new cryptobox.Cryptobox(engine);

      box
        .create()
        .then(() => {
          expect(box.identity).toBeDefined();
          return box.store.delete_all();
        })
        .then(() => {
          return box.store.load_identity();
        })
        .then(identity => {
          expect(identity).not.toBeDefined();

          box = new cryptobox.Cryptobox(engine);
          expect(box.identity).not.toBeDefined();
          return box.load();
        })
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(cryptobox.error.CryptoboxError));
          done();
        });
    });

    it('fails to initialize a Cryptobox of which the last resort PreKey is missing', done => {
      let box = new cryptobox.Cryptobox(engine);

      box
        .create()
        .then(() => {
          expect(box.identity).toBeDefined();
          return box.store.delete_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID);
        })
        .then(() => {
          return box.store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID);
        })
        .then(prekey => {
          expect(prekey).not.toBeDefined();

          box = new cryptobox.Cryptobox(engine);
          expect(box.identity).not.toBeDefined();
          return box.load();
        })
        .then(done.fail)
        .catch(error => {
          expect(error).toEqual(jasmine.any(cryptobox.error.CryptoboxError));
          done();
        });
    });
  });

  describe('PreKeys', () => {
    describe('"serialize_prekey"', () => {
      it('generates a JSON format', async done => {
        const box = new cryptobox.Cryptobox(engine, 10);
        box.identity = await Proteus.keys.IdentityKeyPair.new();
        const preKeyId = 72;
        const preKey = await Proteus.keys.PreKey.new(preKeyId);
        const json = box.serialize_prekey(preKey);
        expect(json.id).toBe(preKeyId);
        const decodedPreKeyBundleBuffer = sodium.from_base64(json.key, sodium.base64_variants.ORIGINAL).buffer;
        expect(decodedPreKeyBundleBuffer).toBeDefined();
        done();
      });
    });
  });

  describe('Sessions', () => {
    let box = undefined;
    const sessionIdUnique = 'unique_identifier';

    beforeEach(done => {
      box = new cryptobox.Cryptobox(engine);
      box
        .create()
        .then(async () => {
          const bob = {
            identity: await Proteus.keys.IdentityKeyPair.new(),
            prekey: await Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID),
          };

          bob.bundle = Proteus.keys.PreKeyBundle.new(bob.identity.public_key, bob.prekey);

          return Proteus.session.Session.init_from_prekey(box.identity, bob.bundle);
        })
        .then(session => {
          const cryptoBoxSession = new cryptobox.CryptoboxSession(sessionIdUnique, session);
          return box.session_save(cryptoBoxSession);
        })
        .then(() => {
          done();
        })
        .catch(done.fail);
    });

    describe('"session_from_prekey"', () => {
      it('creates a session from a valid PreKey format', done => {
        const remotePreKey = {
          id: 65535,
          key:
            'pQABARn//wKhAFggY/Yre8URI2xF93otjO7pUJ3ZjP4aM+sNJb6pL6J+iYgDoQChAFggZ049puHgS2zw8wjJorpl+EG9/op9qEOANG7ecEU2hfwE9g==',
        };
        const sessionId = 'session_id';
        const decodedPreKeyBundleBuffer = sodium.from_base64(remotePreKey.key, sodium.base64_variants.ORIGINAL).buffer;

        box
          .session_from_prekey(sessionId, decodedPreKeyBundleBuffer)
          .then(session => {
            expect(session.id).toBe(sessionId);
            done();
          })
          .catch(done.fail);
      });

      it('fails for outdated PreKey formats', done => {
        const remotePreKey = {
          id: 65535,
          key: 'hAEZ//9YIOxZw78oQCH6xKyAI7WqagtbvRZ/LaujG+T790hOTbf7WCDqAE5Dc75VfmYji6wEz976hJ2hYuODYE6pA59DNFn/KQ==',
        };
        const sessionId = 'session_id';
        const decodedPreKeyBundleBuffer = sodium.from_base64(remotePreKey.key, sodium.base64_variants.ORIGINAL).buffer;

        box
          .session_from_prekey(sessionId, decodedPreKeyBundleBuffer)
          .then(done.fail)
          .catch(error => {
            if (error instanceof cryptobox.InvalidPreKeyFormatError) {
              done();
            } else {
              done.fail();
            }
          });
      });
    });

    describe('"session_load"', () => {
      it('loads a session from the cache', done => {
        spyOn(box, 'load_session_from_cache').and.callThrough();
        spyOn(box.store, 'read_session').and.callThrough();
        box
          .session_load(sessionIdUnique)
          .then(session => {
            expect(session.id).toBe(sessionIdUnique);
            expect(box.load_session_from_cache.calls.count()).toBe(1);
            done();
          })
          .catch(done.fail);
      });
    });

    describe('"encrypt"', () => {
      it('saves the session after successful encryption', done => {
        spyOn(box.store, 'update_session').and.callThrough();
        box
          .encrypt(sessionIdUnique, 'Hello World.')
          .then(encryptedBuffer => {
            expect(encryptedBuffer).toBeDefined();
            expect(box.store.update_session.calls.count()).toBe(1);
            done();
          })
          .catch(done.fail);
      });
    });
  });
});
