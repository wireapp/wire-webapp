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

const cryptobox = require('@wireapp/cryptobox');
const fs = require('fs-extra');
const LRUCache = require('@wireapp/lru-cache').default;
const path = require('path');
const Proteus = require('@wireapp/proteus');
const {FileEngine} = require('@wireapp/store-engine/dist/commonjs/engine');

// gulp test_node --file "node/store/CryptoboxCRUDStoreSpec.node.js"
describe('cryptobox.store.CryptoboxCRUDStore', () => {
  let storagePath = '';
  let engine = undefined;
  let fileStore = undefined;

  beforeEach(async done => {
    storagePath = fs.mkdtempSync(path.normalize(`${__dirname}/test`));
    engine = new FileEngine();
    await engine.init(storagePath);
    fileStore = new cryptobox.store.CryptoboxCRUDStore(engine);
    done();
  });

  afterEach(done =>
    fs
      .remove(storagePath)
      .then(done)
      .catch(done.fail)
  );

  describe('"delete_all"', () => {
    it('deletes everything from the storage', async done => {
      try {
        const alicePreKeys = await Proteus.keys.PreKey.generate_prekeys(0, 10);

        const aliceIdentity = await Proteus.keys.IdentityKeyPair.new();
        const bobIdentity = await Proteus.keys.IdentityKeyPair.new();
        const bobLastResortPreKey = await Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
        const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bobIdentity.public_key, bobLastResortPreKey);
        const sessionId = 'my_session_with_bob';

        const sessionWithBob = await Proteus.session.Session.init_from_prekey(aliceIdentity, bobPreKeyBundle);
        await Promise.all([
          fileStore.save_identity(aliceIdentity),
          fileStore.save_prekeys(alicePreKeys),
          fileStore.create_session(sessionId, sessionWithBob),
        ]);
        const hasBeenDeleted = await fileStore.delete_all();
        expect(hasBeenDeleted).toBe(true);

        done();
      } catch (error) {
        done.fail(error);
      }
    });
  });

  describe('"delete_prekey"', () => {
    it('deletes a PreKey', async done => {
      try {
        const preKeyId = 0;
        const preKey = await Proteus.keys.PreKey.new(preKeyId);

        const savedPreKey = await fileStore.save_prekey(preKey);
        expect(savedPreKey.key_id).toBe(preKeyId);
        await fileStore.delete_prekey(preKeyId);

        done();
      } catch (error) {
        done.fail(error);
      }
    });
  });

  describe('"load_prekey"', () => {
    it('saves and loads a single PreKey', async done => {
      try {
        const preKeyId = 0;
        const preKey = await Proteus.keys.PreKey.new(preKeyId);

        const savedPreKey = await fileStore.save_prekey(preKey);
        expect(savedPreKey.key_id).toBe(preKeyId);
        const loadedPreKey = await fileStore.load_prekey(preKeyId);
        expect(loadedPreKey.key_id).toBe(preKeyId);

        done();
      } catch (error) {
        done.fail(error);
      }
    });
  });

  describe('"load_prekeys"', () => {
    it('loads multiple PreKeys', async done => {
      try {
        await Promise.all([
          fileStore.save_prekey(await Proteus.keys.PreKey.new(1)),
          fileStore.save_prekey(await Proteus.keys.PreKey.new(2)),
          fileStore.save_prekey(await Proteus.keys.PreKey.new(3)),
        ]);
        const preKeys = await fileStore.load_prekeys();
        expect(preKeys).toBeDefined();

        done();
      } catch (error) {
        done.fail(error);
      }
    });
  });

  describe('"save_prekeys"', () => {
    it('saves multiple PreKeys', async done => {
      try {
        const preKeys = await Promise.all([
          Proteus.keys.PreKey.new(0),
          Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID),
        ]);

        savedPreKeys = await fileStore.save_prekeys(preKeys);
        expect(savedPreKeys.length).toBe(preKeys.length);

        done();
      } catch (error) {
        done.fail(error);
      }
    });
  });

  describe('"update_session"', () => {
    it('updates an already persisted session', async done => {
      try {
        const aliceIdentity = await Proteus.keys.IdentityKeyPair.new();
        const bobIdentity = await Proteus.keys.IdentityKeyPair.new();
        const bobLastResortPreKey = await Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
        const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bobIdentity.public_key, bobLastResortPreKey);
        const sessionId = 'my_session_with_bob';

        let proteusSession = await Proteus.session.Session.init_from_prekey(aliceIdentity, bobPreKeyBundle);
        proteusSession = await fileStore.create_session(sessionId, proteusSession);
        expect(proteusSession.local_identity.public_key.fingerprint()).toBe(aliceIdentity.public_key.fingerprint());
        expect(proteusSession.remote_identity.public_key.fingerprint()).toBe(bobIdentity.public_key.fingerprint());
        expect(proteusSession.version).toBe(1);
        proteusSession.version = 2;
        proteusSession = await fileStore.update_session(sessionId, proteusSession);
        proteusSession = await fileStore.read_session(aliceIdentity, sessionId);
        expect(proteusSession.local_identity.public_key.fingerprint()).toBe(aliceIdentity.public_key.fingerprint());
        expect(proteusSession.remote_identity.public_key.fingerprint()).toBe(bobIdentity.public_key.fingerprint());
        expect(proteusSession.version).toBe(2);

        done();
      } catch (error) {
        done.fail(error);
      }
    });
  });

  describe('session_from_prekey', () => {
    it('saves and caches a valid session from a serialized PreKey bundle', async done => {
      try {
        const alice = new cryptobox.Cryptobox(fileStore, 1);
        const sessionId = 'session_with_bob';

        const bob = await Proteus.keys.IdentityKeyPair.new();
        const preKey = await Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
        const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bob.public_key, preKey);

        const allPreKeys = await alice.create();
        expect(allPreKeys.length).toBe(1);

        let cryptoboxSession = await alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
        expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());
        cryptoboxSession = alice.load_session_from_cache(sessionId);
        expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());
        cryptoboxSession = await alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
        expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());

        done();
      } catch (error) {
        done.fail(error);
      }
    });

    it('reinforces a session from the store without cache', async done => {
      try {
        const alice = new cryptobox.Cryptobox(fileStore, 1);
        const sessionId = 'session_with_bob';

        const bob = await Proteus.keys.IdentityKeyPair.new();
        const preKey = await Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
        const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bob.public_key, preKey);

        const allPreKeys = await alice.create();
        expect(allPreKeys.length).toBe(1);

        let cryptoboxSession = await alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
        expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());

        alice.cachedSessions = new LRUCache(1);
        cryptoboxSession = await alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
        expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());

        done();
      } catch (error) {
        done.fail(error);
      }
    });
  });
});
