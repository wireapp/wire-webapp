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

/* eslint no-magic-numbers: "off" */

const Proteus = require('@wireapp/proteus');
const _sodium = require('libsodium-wrappers-sumo');
let sodium = _sodium;

class TestStore extends Proteus.session.PreKeyStore {
  constructor(prekeys) {
    super();
    this.prekeys = prekeys;
  }

  load_prekey(prekey_id) {
    const matches = this.prekeys.filter(prekey => prekey.key_id === prekey_id);
    return Promise.resolve(matches[0]);
  }

  delete_prekey(prekey_id) {
    const matches = this.prekeys.filter(prekey => prekey.key_id === prekey_id);
    return Promise.resolve()
      .then(() => delete matches[0])
      .then(() => prekey_id);
  }
}

const assert_serialise_deserialise = (local_identity, session) => {
  const bytes = session.serialise();

  const deser = Proteus.session.Session.deserialise(local_identity, bytes);
  const deser_bytes = deser.serialise();

  expect(sodium.to_hex(new Uint8Array(bytes))).toEqual(sodium.to_hex(new Uint8Array(deser_bytes)));
};

const assert_init_from_message = async (ident, store, msg, expected) => {
  const [session, message] = await Proteus.session.Session.init_from_message(ident, store, msg);
  expect(sodium.to_string(message)).toBe(expected);
  return session;
};

beforeAll(async () => {
  await _sodium.ready;
  sodium = _sodium;
});

describe('LongRunning', () => {
  describe('Session', () => {
    it('works until the max counter gap', async done => {
      try {
        const alice_ident = await Proteus.keys.IdentityKeyPair.new();

        const bob_ident = await Proteus.keys.IdentityKeyPair.new();

        const pre_keys = [await Proteus.keys.PreKey.last_resort()];
        const bob_store = new TestStore(pre_keys);

        const bob_prekey = await bob_store.load_prekey(Proteus.keys.PreKey.MAX_PREKEY_ID);
        expect(bob_prekey.key_id).toBe(Proteus.keys.PreKey.MAX_PREKEY_ID);

        const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

        const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);

        const hello_bob1_plaintext = 'Hello Bob1!';
        const hello_bob1_encrypted = await alice.encrypt(hello_bob1_plaintext);

        const bob = await assert_init_from_message(bob_ident, bob_store, hello_bob1_encrypted, hello_bob1_plaintext);
        expect(Object.keys(bob.session_states).length).toBe(1);

        await Promise.all(
          Array.from({length: 1001}, () => {
            return Promise.resolve().then(async () => {
              const hello_bob2_plaintext = 'Hello Bob2!';
              const hello_bob2_encrypted = await alice.encrypt(hello_bob2_plaintext);
              const hello_bob2_decrypted = await bob.decrypt(bob_store, hello_bob2_encrypted);
              expect(sodium.to_string(hello_bob2_decrypted)).toBe(hello_bob2_plaintext);
              expect(Object.keys(bob.session_states).length).toBe(1);
            });
          })
        );

        done();
      } catch (err) {
        done.fail(err);
      }
    });

    it(
      'pathological case',
      async done => {
        try {
          const num_alices = 32;
          const alice_ident = await Proteus.keys.IdentityKeyPair.new();

          const bob_ident = await Proteus.keys.IdentityKeyPair.new();

          const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, num_alices));

          const alices = await Promise.all(
            bob_store.prekeys.map(pk => {
              const bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, pk);
              return Proteus.session.Session.init_from_prekey(alice_ident, bundle);
            })
          );

          expect(alices.length).toBe(num_alices);

          const message = await alices[0].encrypt('Hello Bob!');
          const bob = await assert_init_from_message(bob_ident, bob_store, message, 'Hello Bob!');

          await Promise.all(
            alices.map(async alice => {
              await Promise.all(Array.from({length: 900}, () => alice.encrypt('hello')));
              const encrypted_message = await alice.encrypt('Hello Bob!');
              expect(sodium.to_string(await bob.decrypt(bob_store, encrypted_message))).toBe('Hello Bob!');
            })
          );

          expect(Object.keys(bob.session_states).length).toBe(num_alices);

          await Promise.all(
            alices.map(async alice => {
              const encrypted_message = await alice.encrypt('Hello Bob!');
              expect(sodium.to_string(await bob.decrypt(bob_store, encrypted_message))).toBe('Hello Bob!');
            })
          );

          done();
        } catch (err) {
          done.fail(err);
        }
      },
      10000
    );

    it(
      'should handle mass communication',
      async done => {
        try {
          const alice_ident = await Proteus.keys.IdentityKeyPair.new();
          const alice_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

          const bob_ident = await Proteus.keys.IdentityKeyPair.new();
          const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

          const bob_prekey = await bob_store.load_prekey(0);
          const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

          const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);
          const hello_bob = await alice.encrypt('Hello Bob!');

          const bob = await assert_init_from_message(bob_ident, bob_store, hello_bob, 'Hello Bob!');

          // TODO: need to serialize/deserialize to/from CBOR here
          const messages = await Promise.all(Array.from({length: 999}, () => bob.encrypt('Hello Alice!')));

          await Promise.all(
            messages.map(async message => {
              const serialised_message = message.serialise();
              const deserialised_message = Proteus.message.Envelope.deserialise(serialised_message);
              const decrypted_message = await alice.decrypt(alice_store, deserialised_message);
              expect(sodium.to_string(decrypted_message)).toBe('Hello Alice!');
            })
          );

          assert_serialise_deserialise(alice_ident, alice);
          assert_serialise_deserialise(bob_ident, bob);

          done();
        } catch (err) {
          done.fail(err);
        }
      },
      10000
    );
  });
});
