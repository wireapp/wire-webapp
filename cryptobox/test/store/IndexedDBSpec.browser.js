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

describe('cryptobox.store.IndexedDB', () => {
  let cryptobox = undefined;
  let Dexie = undefined;

  beforeAll(done => {
    if (typeof window === 'object') {
      cryptobox = window.cryptobox;
      Dexie = window.Dexie;
      sodium = window.sodium;
      done();
    }
  });

  describe('Basic functionality', () => {
    it('removes PreKeys from the storage (when a session gets established) and creates new PreKeys if needed.', done => {
      const alice = {
        // PreKeys: ["65535", "0", "1"]
        desktop: new cryptobox.Cryptobox(new cryptobox.store.IndexedDB('alice_desktop'), 3),
      };

      const bob = {
        // PreKeys: ["65535"]
        desktop: new cryptobox.Cryptobox(new cryptobox.store.IndexedDB('bob_desktop'), 1),
        // PreKeys: ["65535"]
        mobile: new cryptobox.Cryptobox(new cryptobox.store.IndexedDB('bob_mobile'), 1),
      };

      spyOn(alice.desktop, 'publish_prekeys').and.callThrough();
      spyOn(alice.desktop.pk_store, 'release_prekeys').and.callThrough();

      const messageFromBob = 'Hello Alice!';

      // Initialize Cryptoboxes
      Promise.all([alice.desktop.create(), bob.desktop.create(), bob.mobile.create()])
        .then(() => {
          expect(alice.desktop.cachedPreKeys.length).toBe(3);
          expect(bob.desktop.cachedPreKeys.length).toBe(1);
          expect(bob.mobile.cachedPreKeys.length).toBe(1);
          return alice.desktop.store.load_prekey(0);
        })
        .then(prekey => {
          expect(prekey).toBeDefined();
          // Bob sends a message (with PreKey material and ciphertext) to Alice's desktop client
          const publicPreKeyBundle = Proteus.keys.PreKeyBundle.new(alice.desktop.identity.public_key, prekey);
          return bob.desktop.encrypt('to_alice_desktop', messageFromBob, publicPreKeyBundle.serialise());
        })
        .then(ciphertext => {
          // Alice creates a session with Bob's PreKey message and decrypts the ciphertext
          expect(alice.desktop.pk_store.prekeys.length).toBe(0);
          expect(alice.desktop.publish_prekeys).not.toHaveBeenCalled();
          return alice.desktop.decrypt('to_bob_desktop', ciphertext);
        })
        .then(plaintext => {
          const expectedNewPreKeyId = 2;
          expect(alice.desktop.pk_store.prekeys.length).toBe(0);
          expect(alice.desktop.cachedSessions.size()).toBe(1);
          expect(alice.desktop.pk_store.release_prekeys.calls.count()).toBe(1);
          expect(alice.desktop.publish_prekeys.calls.count()).toBe(1);
          expect(alice.desktop.cachedPreKeys[alice.desktop.cachedPreKeys.length - 1].key_id).toBe(expectedNewPreKeyId);
          expect(sodium.to_string(plaintext)).toBe(messageFromBob);
          // Bob now establishes a connection with his mobile client to Alice's desktop client...
          return alice.desktop.store.load_prekey(expectedNewPreKeyId);
        })
        .then(prekey => {
          const publicPreKeyBundle = Proteus.keys.PreKeyBundle.new(alice.desktop.identity.public_key, prekey);
          return bob.mobile.encrypt('to_alice_desktop', messageFromBob, publicPreKeyBundle.serialise());
        })
        .then(ciphertext => {
          // Alice creates a session with Bob's PreKey message and decrypts the ciphertext
          expect(alice.desktop.pk_store.prekeys.length).toBe(0);
          return alice.desktop.decrypt('to_bob_mobile', ciphertext);
        })
        .then(plaintext => {
          expect(alice.desktop.pk_store.prekeys.length).toBe(0);
          expect(alice.desktop.cachedSessions.size()).toBe(2);
          expect(alice.desktop.pk_store.release_prekeys.calls.count()).toBe(2);
          expect(alice.desktop.publish_prekeys.calls.count()).toBe(2); // Published PreKey ID "3"
          expect(sodium.to_string(plaintext)).toBe(messageFromBob);
        })
        .then(() => {
          done();
        })
        .catch(done.fail);
    });
  });

  describe('constructor', () => {
    let store = undefined;

    afterEach(done => {
      if (store) {
        store
          .delete_all()
          .then(done)
          .catch(done.fail);
      }
    });

    it('works with a given Dexie instance', () => {
      const schema = {
        amplify: '',
        clients: ', meta.primary_key',
        conversation_events: ', conversation, time, type',
        conversations: ', id, last_event_timestamp',
        keys: '',
        prekeys: '',
        sessions: '',
      };

      const name = 'wire@production@532af01e-1e24-4366-aacf-33b67d4ee376@temporary';
      const db = new Dexie(name);
      db.version(7).stores(schema);

      store = new cryptobox.store.IndexedDB(db);
      expect(store.db.name).toBe(name);
    });
  });

  describe('create', () => {
    let store = undefined;

    afterEach(done => {
      if (store) {
        store
          .delete_all()
          .then(done)
          .catch(done.fail);
      }
    });

    it("doesn't save null values", done => {
      const schema = {
        amplify: '',
        clients: ', meta.primary_key',
        conversation_events: ', conversation, time, type',
        conversations: ', id, last_event_timestamp',
        keys: '',
        prekeys: '',
        sessions: '',
      };

      const name = 'wire@production@532af01e-1e24-4366-aacf-33b67d4ee377@temporary';
      const db = new Dexie(name);
      db.version(1).stores(schema);

      store = new cryptobox.store.IndexedDB(db);
      store.create(name, 'sessions', null).catch(error => {
        expect(error.name).toBe('RecordTypeError');
        done();
      });
    });
  });

  describe('create_session', () => {
    let store = undefined;

    beforeEach(() => {
      store = new cryptobox.store.IndexedDB('bobs_store');
    });

    afterEach(done => {
      if (store) {
        store
          .delete_all()
          .then(done)
          .catch(done.fail);
      }
    });

    it('saves a session with meta data', done => {
      const alice = Proteus.keys.IdentityKeyPair.new();

      const bob = Proteus.keys.IdentityKeyPair.new();
      const preKey = Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
      const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bob.public_key, preKey);

      const sessionId = 'session_with_bob';
      let proteusSession;

      Proteus.session.Session.init_from_prekey(alice, bobPreKeyBundle)
        .then(session => {
          proteusSession = session;
          return store.create_session(sessionId, session);
        })
        .then(() => {
          return store.read(store.TABLE.SESSIONS, sessionId);
        })
        .then(serialisedSession => {
          expect(serialisedSession.created).toEqual(jasmine.any(Number));
          expect(serialisedSession.version).toEqual(cryptobox.Cryptobox.prototype.VERSION);
          return store.read_session(alice, sessionId);
        })
        .then(loadedSession => {
          expect(loadedSession.session_tag).toEqual(proteusSession.session_tag);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('session_from_prekey', () => {
    it('saves and caches a valid session from a serialized PreKey bundle', done => {
      const alice = new cryptobox.Cryptobox(new cryptobox.store.IndexedDB('alice_db'), 1);
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

    it('reinforces a session from the indexedDB without cache', done => {
      const alice = new cryptobox.Cryptobox(new cryptobox.store.IndexedDB('alice_db'), 1);
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
          alice.cachedSessions = new window.LRUCache(1);
          return alice.session_from_prekey(sessionId, bobPreKeyBundle.serialise());
        })
        .then(cryptoboxSession => {
          expect(cryptoboxSession.fingerprint_remote()).toBe(bob.public_key.fingerprint());
          done();
        })
        .catch(done.fail);
    });
  });

  describe('"update_session"', () => {
    let store = undefined;

    beforeEach(() => (store = new cryptobox.store.IndexedDB('alices_store')));

    afterEach(done => {
      if (store) {
        store
          .delete_all()
          .then(done)
          .catch(done.fail);
      }
    });

    it('updates an already persisted session', done => {
      const aliceIdentity = Proteus.keys.IdentityKeyPair.new();
      const bobIdentity = Proteus.keys.IdentityKeyPair.new();
      const bobLastResortPreKey = Proteus.keys.PreKey.new(Proteus.keys.PreKey.MAX_PREKEY_ID);
      const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bobIdentity.public_key, bobLastResortPreKey);
      const sessionId = 'my_session_with_bob';

      Proteus.session.Session.init_from_prekey(aliceIdentity, bobPreKeyBundle)
        .then(proteusSession => store.create_session(sessionId, proteusSession))
        .then(proteusSession => {
          expect(proteusSession.local_identity.public_key.fingerprint()).toBe(aliceIdentity.public_key.fingerprint());
          expect(proteusSession.remote_identity.public_key.fingerprint()).toBe(bobIdentity.public_key.fingerprint());
          expect(proteusSession.version).toBe(1);
          proteusSession.version = 2;
          return store.update_session(sessionId, proteusSession);
        })
        .then(proteusSession => store.read_session(aliceIdentity, sessionId))
        .then(proteusSession => {
          expect(proteusSession.local_identity.public_key.fingerprint()).toBe(aliceIdentity.public_key.fingerprint());
          expect(proteusSession.remote_identity.public_key.fingerprint()).toBe(bobIdentity.public_key.fingerprint());
          expect(proteusSession.version).toBe(2);
          done();
        })
        .catch(error => done.fail(error));
    });
  });
});
