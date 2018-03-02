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

const {store: CryptoboxStore, Cryptobox} = require('@wireapp/cryptobox');
const LRUCache = require('@wireapp/lru-cache').default;
const Proteus = require('@wireapp/proteus');
const UUID = require('pure-uuid');
const {IndexedDBEngine} = require('@wireapp/store-engine');

describe('cryptobox.store.IndexedDB', () => {
  let dexieInstances = [];

  afterEach(async done => {
    await Promise.all(dexieInstances.map(db => deleteDatabase(db)));
    dexieInstances = [];
    done();
  });

  async function deleteDatabase(db) {
    db.close();
    const dbName = db.name;
    return new Promise((resolve, reject) => {
      const DBDeleteRequest = window.indexedDB.deleteDatabase(dbName);
      DBDeleteRequest.onerror = () => reject(new Error('Error deleting database.'));
      DBDeleteRequest.onsuccess = event => resolve(event);
    });
  }

  async function createEngine(storeName) {
    const engine = new IndexedDBEngine();
    await engine.init(storeName);
    engine.db.version(1).stores({
      keys: '',
      prekeys: '',
      sessions: '',
    });
    return engine;
  }

  async function createStore() {
    const dbName = new UUID(4);
    const engine = await createEngine(dbName);
    dexieInstances.push(engine.db);
    return new CryptoboxStore.CryptoboxCRUDStore(engine);
  }

  describe('Basic functionality', () => {
    it('removes PreKeys from the storage (when a session gets established) and creates new PreKeys if needed.', async done => {
      const alice = {
        // PreKeys: ["65535", "0", "1"]
        desktop: new Cryptobox((await createStore()).engine, 3),
      };

      const bob = {
        // PreKeys: ["65535"]
        desktop: new Cryptobox((await createStore()).engine, 1),
        // PreKeys: ["65535"]
        mobile: new Cryptobox((await createStore()).engine, 1),
      };

      spyOn(alice.desktop, 'publish_prekeys').and.callThrough();
      spyOn(alice.desktop.pk_store, 'release_prekeys').and.callThrough();

      const messageFromBob = 'Hello Alice!';

      await Promise.all([alice.desktop.create(), bob.desktop.create(), bob.mobile.create()]);
      expect(alice.desktop.cachedPreKeys.length).toBe(3);
      expect(bob.desktop.cachedPreKeys.length).toBe(1);
      expect(bob.mobile.cachedPreKeys.length).toBe(1);

      let prekey = await alice.desktop.store.load_prekey(0);
      expect(prekey).toBeDefined();

      // Bob sends a message (with PreKey material and ciphertext) to Alice's desktop client
      let publicPreKeyBundle = await Proteus.keys.PreKeyBundle.new(alice.desktop.identity.public_key, prekey);
      let ciphertext = await bob.desktop.encrypt('to_alice_desktop', messageFromBob, publicPreKeyBundle.serialise());
      expect(alice.desktop.pk_store.prekeys.length).toBe(0);
      expect(alice.desktop.publish_prekeys).not.toHaveBeenCalled();

      let plaintext = await alice.desktop.decrypt('to_bob_desktop', ciphertext);
      const expectedNewPreKeyId = 2;
      expect(alice.desktop.pk_store.prekeys.length).toBe(0);
      expect(alice.desktop.cachedSessions.size()).toBe(1);
      expect(alice.desktop.pk_store.release_prekeys.calls.count()).toBe(1);
      expect(alice.desktop.publish_prekeys.calls.count()).toBe(1);
      expect(alice.desktop.cachedPreKeys[alice.desktop.cachedPreKeys.length - 1].key_id).toBe(expectedNewPreKeyId);
      expect(sodium.to_string(plaintext)).toBe(messageFromBob);

      prekey = await alice.desktop.store.load_prekey(expectedNewPreKeyId);
      publicPreKeyBundle = await Proteus.keys.PreKeyBundle.new(alice.desktop.identity.public_key, prekey);
      ciphertext = await bob.mobile.encrypt('to_alice_desktop', messageFromBob, publicPreKeyBundle.serialise());
      expect(alice.desktop.pk_store.prekeys.length).toBe(0);

      plaintext = await alice.desktop.decrypt('to_bob_mobile', ciphertext);
      expect(alice.desktop.pk_store.prekeys.length).toBe(0);
      expect(alice.desktop.cachedSessions.size()).toBe(2);
      expect(alice.desktop.pk_store.release_prekeys.calls.count()).toBe(2);
      expect(alice.desktop.publish_prekeys.calls.count()).toBe(2);
      expect(await sodium.to_string(plaintext)).toBe(messageFromBob);

      done();
    });
  });

  describe('"create_session"', () => {
    it('saves a session with meta data', async done => {
      const store = await createStore();

      const alice = await Proteus.keys.IdentityKeyPair.new();
      const bob = await Proteus.keys.IdentityKeyPair.new();
      const preKey = await Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
      const bobPreKeyBundle = await Proteus.keys.PreKeyBundle.new(bob.public_key, preKey);

      const sessionId = 'session_with_bob';
      const proteusSession = await Proteus.session.Session.init_from_prekey(alice, bobPreKeyBundle);
      await store.create_session(sessionId, proteusSession);

      const tableName = CryptoboxStore.CryptoboxCRUDStore.STORES.SESSIONS;
      const serialisedSession = await store.engine.read(tableName, sessionId);
      expect(serialisedSession.created).toEqual(jasmine.any(Number));
      expect(serialisedSession.version).toEqual(Cryptobox.prototype.VERSION);

      const loadedSession = await store.read_session(alice, sessionId);
      expect(loadedSession.session_tag).toEqual(proteusSession.session_tag);

      done();
    });
  });

  describe('"update_session"', () => {
    it('updates an already persisted session', async done => {
      const store = await createStore();

      const aliceIdentity = await Proteus.keys.IdentityKeyPair.new();
      const bobIdentity = await Proteus.keys.IdentityKeyPair.new();
      const bobLastResortPreKey = await Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
      const bobPreKeyBundle = await Proteus.keys.PreKeyBundle.new(bobIdentity.public_key, bobLastResortPreKey);
      const sessionId = 'my_session_with_bob';

      let proteusSession = await Proteus.session.Session.init_from_prekey(aliceIdentity, bobPreKeyBundle);
      await store.create_session(sessionId, proteusSession);

      expect(proteusSession.local_identity.public_key.fingerprint()).toBe(aliceIdentity.public_key.fingerprint());
      expect(proteusSession.remote_identity.public_key.fingerprint()).toBe(bobIdentity.public_key.fingerprint());
      expect(proteusSession.version).toBe(1);
      proteusSession.version = 2;

      proteusSession = await store.update_session(sessionId, proteusSession);

      expect(proteusSession.local_identity.public_key.fingerprint()).toBe(aliceIdentity.public_key.fingerprint());
      expect(proteusSession.remote_identity.public_key.fingerprint()).toBe(bobIdentity.public_key.fingerprint());
      expect(proteusSession.version).toBe(2);

      done();
    });
  });

  describe('"session_from_prekey"', () => {
    it('saves and caches a valid session from a serialized PreKey bundle', async done => {
      const store = await createStore();

      const alice = new Cryptobox(store.engine, 1);
      const sessionId = 'session_with_bob';

      const bob = await Proteus.keys.IdentityKeyPair.new();
      const preKey = await Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
      const bobPreKeyBundle = await Proteus.keys.PreKeyBundle.new(bob.public_key, preKey);

      const allPreKeys = await alice.create();
      expect(allPreKeys.length).toBe(1);

      let cryptoboxSession = await alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
      expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());

      cryptoboxSession = alice.load_session_from_cache(sessionId);
      expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());

      cryptoboxSession = await alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
      expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());

      done();
    });

    it('reinforces a session from the indexedDB without cache', async done => {
      const store = await createStore();

      const alice = new Cryptobox(store.engine, 1);
      const sessionId = 'session_with_bob';

      const bob = await Proteus.keys.IdentityKeyPair.new();
      const preKey = await Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
      const bobPreKeyBundle = await Proteus.keys.PreKeyBundle.new(bob.public_key, preKey);

      const allPreKeys = await alice.create();
      expect(allPreKeys.length).toBe(1);

      let cryptoboxSession = await alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
      expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());

      alice.cachedSessions = new LRUCache(1);

      cryptoboxSession = await alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
      expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());

      done();
    });
  });
});
