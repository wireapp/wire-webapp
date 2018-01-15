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

class TestStore extends Proteus.session.PreKeyStore {
  constructor(prekeys) {
    super();
    this.prekeys = prekeys;
  }

  get_prekey(prekey_id) {
    return new Promise((resolve, reject) => {
      resolve(this.prekeys[prekey_id]);
    });
  }

  remove(prekey_id) {
    return new Promise((resolve, reject) => {
      delete this.prekeys[prekey_id];
      resolve();
    });
  }
}

const assert_init_from_message = (ident, store, msg, expected) => {
  return new Promise((resolve, reject) => {
    Proteus.session.Session.init_from_message(ident, store, msg)
      .then(messageArray => {
        const [session, message] = messageArray;
        assert.strictEqual(sodium.to_string(message), expected);
        resolve(session);
      })
      .catch(err => {
        reject(err);
      });
  });
};

const assert_decrypt = (expected, decryptedPromise) => {
  return new Promise((resolve, reject) => {
    decryptedPromise
      .then(actual => {
        assert.strictEqual(expected, sodium.to_string(actual));
        resolve();
      })
      .catch(err => {
        reject(err);
      });
  });
};

const assert_serialise_deserialise = (local_identity, session) => {
  const bytes = session.serialise();

  const deser = Proteus.session.Session.deserialise(local_identity, bytes);
  const deser_bytes = deser.serialise();

  assert.deepEqual(sodium.to_hex(new Uint8Array(bytes)), sodium.to_hex(new Uint8Array(deser_bytes)));
};

describe('LongRunning', () => {
  describe('Session', () => {
    it('pathological case', function(done) {
      this.timeout(0);

      const num_alices = 32;
      let alices = null;
      let bob = null;

      const [alice_ident, bob_ident] = [0, 1].map(() => Proteus.keys.IdentityKeyPair.new());
      const bob_store = new TestStore(Proteus.keys.PreKey.generate_prekeys(0, num_alices));

      Promise.all(
        bob_store.prekeys.map(pk => {
          const bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, pk);
          return Proteus.session.Session.init_from_prekey(alice_ident, bundle);
        })
      )
        .then(session => {
          alices = session;
          assert(alices.length === num_alices);
          return alices[0].encrypt('Hello Bob!');
        })
        .then(message => assert_init_from_message(bob_ident, bob_store, message, 'Hello Bob!'))
        .then(session => {
          bob = session;

          return Promise.all(
            alices.map(alice => {
              return new Promise(resolve => {
                Promise.all(Array.from({length: 900}, () => alice.encrypt('hello')))
                  .then(() => alice.encrypt('Hello Bob!'))
                  .then(message => resolve(assert_decrypt('Hello Bob!', bob.decrypt(bob_store, message))));
              });
            })
          );
        })
        .then(() => {
          assert(Object.keys(bob.session_states).length === num_alices);

          return Promise.all(
            alices.map(alice => {
              return alice
                .encrypt('Hello Bob!')
                .then(message => assert_decrypt('Hello Bob!', bob.decrypt(bob_store, message)));
            })
          );
        })
        .then(() => {
          done();
        })
        .catch(err => {
          done(err);
        });
    });

    it('should handle mass communication', done => {
      const [alice_ident, bob_ident] = [0, 1].map(() => Proteus.keys.IdentityKeyPair.new());
      const [alice_store, bob_store] = [0, 1].map(() => new TestStore(Proteus.keys.PreKey.generate_prekeys(0, 10)));

      const bob_prekey = bob_store.prekeys[0];
      const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

      let alice = null;
      let bob = null;
      let hello_bob = null;

      return Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle)
        .then(session => {
          alice = session;
          return alice.encrypt('Hello Bob!');
        })
        .then(message => {
          hello_bob = message;
          return assert_init_from_message(bob_ident, bob_store, hello_bob, 'Hello Bob!');
        })
        .then(session => {
          bob = session;

          // XXX: need to serialize/deserialize to/from CBOR here
          return Promise.all(Array.from({length: 999}, () => bob.encrypt('Hello Alice!')));
        })
        .then(messages => {
          return Promise.all(
            messages.map(message =>
              assert_decrypt(
                'Hello Alice!',
                alice.decrypt(alice_store, Proteus.message.Envelope.deserialise(message.serialise()))
              )
            )
          );
        })
        .then(() => {
          assert_serialise_deserialise(alice_ident, alice);
          return assert_serialise_deserialise(bob_ident, bob);
        })
        .then(() => {
          done();
        })
        .catch(err => {
          done(err);
        });
    });
  });
});
