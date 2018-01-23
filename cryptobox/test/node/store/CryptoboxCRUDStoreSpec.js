/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

const cryptobox = require('../../../dist/commonjs/index');
const fs = require('fs-extra');
const LRUCache = require('wire-webapp-lru-cache');
const path = require('path');
const Proteus = require('@wireapp/proteus');
const {FileEngine} = require('@wireapp/store-engine/dist/commonjs/engine');

// gulp test_node --file "node/store/CryptoboxCRUDStoreSpec.js"
describe('cryptobox.store.CryptoboxCRUDStore', () => {
  let storagePath = undefined;
  let fileStore = undefined;

  beforeEach(() => {
    storagePath = fs.mkdtempSync(path.normalize(`${__dirname}/test`));
    const engine = new FileEngine(storagePath);
    fileStore = new cryptobox.store.CryptoboxCRUDStore(engine);
  });

  afterEach(done =>
    fs
      .remove(storagePath)
      .then(done)
      .catch(done.fail)
  );

  describe('"delete_all"', () => {
    fit('deletes everything from the storage', done => {
      let sessionWithBob;
      const alicePreKeys = Proteus.keys.PreKey.generate_prekeys(0, 10);

      const aliceIdentity = Proteus.keys.IdentityKeyPair.new();
      const bobIdentity = Proteus.keys.IdentityKeyPair.new();
      const bobLastResortPreKey = Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
      const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bobIdentity.public_key, bobLastResortPreKey);
      const sessionId = 'my_session_with_bob';

      Proteus.session.Session.init_from_prekey(aliceIdentity, bobPreKeyBundle)
        .then(session => {
          sessionWithBob = session;
          return Promise.all([
            fileStore.save_identity(aliceIdentity),
            fileStore.save_prekeys(alicePreKeys),
            fileStore.create_session(sessionId, sessionWithBob),
          ]);
        })
        .then(() => fileStore.delete_all())
        .then(hasBeenDeleted => {
          expect(hasBeenDeleted).toBe(true);
          done();
        });
    });
  });

  describe('"delete_prekey"', () => {
    it('deletes a PreKey', done => {
      const preKeyId = 0;
      const preKey = Proteus.keys.PreKey.new(preKeyId);
      fileStore
        .save_prekey(preKey)
        .then(savedPreKey => {
          expect(savedPreKey.key_id).toBe(preKeyId);
          return fileStore.delete_prekey(preKeyId);
        })
        .then(done)
        .catch(done.fail);
    });
  });

  describe('"load_prekey"', () => {
    it('saves and loads a single PreKey', done => {
      const preKeyId = 0;
      const preKey = Proteus.keys.PreKey.new(preKeyId);
      fileStore
        .save_prekey(preKey)
        .then(savedPreKey => {
          expect(savedPreKey.key_id).toBe(preKeyId);
          return fileStore.load_prekey(preKeyId);
        })
        .then(loadedPreKey => {
          expect(loadedPreKey.key_id).toBe(preKeyId);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('"load_prekeys"', () => {
    it('loads multiple PreKeys', done => {
      Promise.all([
        fileStore.save_prekey(Proteus.keys.PreKey.new(1)),
        fileStore.save_prekey(Proteus.keys.PreKey.new(2)),
        fileStore.save_prekey(Proteus.keys.PreKey.new(3)),
      ])
        .then(() => fileStore.load_prekeys())
        .then(preKeys => {
          expect(preKeys.length).toBe(3);
          done();
        });
    });
  });

  describe('"save_prekeys"', () => {
    it('saves multiple PreKeys', done => {
      const preKeys = [Proteus.keys.PreKey.new(0), Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID)];

      fileStore
        .save_prekeys(preKeys)
        .then(savedPreKeys => {
          expect(savedPreKeys.length).toBe(preKeys.length);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('"update_session"', () => {
    it('updates an already persisted session', done => {
      const aliceIdentity = Proteus.keys.IdentityKeyPair.new();
      const bobIdentity = Proteus.keys.IdentityKeyPair.new();
      const bobLastResortPreKey = Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
      const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bobIdentity.public_key, bobLastResortPreKey);
      const sessionId = 'my_session_with_bob';

      Proteus.session.Session.init_from_prekey(aliceIdentity, bobPreKeyBundle)
        .then(proteusSession => fileStore.create_session(sessionId, proteusSession))
        .then(proteusSession => {
          expect(proteusSession.local_identity.public_key.fingerprint()).toBe(aliceIdentity.public_key.fingerprint());
          expect(proteusSession.remote_identity.public_key.fingerprint()).toBe(bobIdentity.public_key.fingerprint());
          expect(proteusSession.version).toBe(1);
          proteusSession.version = 2;
          return fileStore.update_session(sessionId, proteusSession);
        })
        .then(proteusSession => fileStore.read_session(aliceIdentity, sessionId))
        .then(proteusSession => {
          expect(proteusSession.local_identity.public_key.fingerprint()).toBe(aliceIdentity.public_key.fingerprint());
          expect(proteusSession.remote_identity.public_key.fingerprint()).toBe(bobIdentity.public_key.fingerprint());
          expect(proteusSession.version).toBe(2);
          done();
        })
        .catch(error => done.fail(error));
    });
  });

  describe('session_from_prekey', () => {
    it('saves and caches a valid session from a serialized PreKey bundle', done => {
      const alice = new cryptobox.Cryptobox.default(fileStore, 1);
      const sessionId = 'session_with_bob';

      const bob = Proteus.keys.IdentityKeyPair.new();
      const preKey = Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
      const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bob.public_key, preKey);

      alice
        .create()
        .then(allPreKeys => {
          expect(allPreKeys.length).toBe(1);
          return alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
        })
        .then(cryptoboxSession => {
          expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());
          return alice.load_session_from_cache(sessionId);
        })
        .then(cryptoboxSession => {
          expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());
          return alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
        })
        .then(cryptoboxSession => {
          expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());
          done();
        })
        .catch(done.fail);
    });

    it('reinforces a session from the store without cache', done => {
      const alice = new cryptobox.Cryptobox.default(fileStore, 1);
      const sessionId = 'session_with_bob';

      const bob = Proteus.keys.IdentityKeyPair.new();
      const preKey = Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
      const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bob.public_key, preKey);

      alice
        .create()
        .then(allPreKeys => {
          expect(allPreKeys.length).toBe(1);
          return alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
        })
        .then(cryptoboxSession => {
          expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());
          alice.cachedSessions = new LRUCache(1);
          return alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
        })
        .then(cryptoboxSession => {
          expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());
          done();
        })
        .catch(done.fail);
    });
  });
});
