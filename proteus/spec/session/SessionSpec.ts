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

// tslint:disable:no-magic-numbers

import * as Proteus from '@wireapp/proteus';
import * as sodium from 'libsodium-wrappers-sumo';

const assert_serialise_deserialise = (
  local_identity: Proteus.keys.IdentityKeyPair,
  session: Proteus.session.Session,
) => {
  const bytes = session.serialise();

  const deser = Proteus.session.Session.deserialise(local_identity, bytes);
  const deser_bytes = deser.serialise();

  expect(sodium.to_hex(new Uint8Array(bytes))).toEqual(sodium.to_hex(new Uint8Array(deser_bytes)));
};

const assert_init_from_message = async (
  identity: Proteus.keys.IdentityKeyPair,
  store: Proteus.session.PreKeyStore,
  envelope: Proteus.message.Envelope,
  expected: string,
) => {
  const [session, message] = await Proteus.session.Session.init_from_message(identity, store, envelope);
  expect(sodium.to_string(message)).toBe(expected);
  return session;
};

class TestStore extends Proteus.session.PreKeyStore {
  private readonly prekeys: Proteus.keys.PreKey[];

  constructor(prekeys: Proteus.keys.PreKey[]) {
    super();
    this.prekeys = prekeys;
  }

  async load_prekey(prekey_id: number): Promise<Proteus.keys.PreKey> {
    return this.prekeys.find(prekey => prekey.key_id === prekey_id)!;
  }

  async load_prekeys(): Promise<Proteus.keys.PreKey[]> {
    return this.prekeys;
  }

  async delete_prekey(prekey_id: number): Promise<number> {
    const matches = this.prekeys.filter(prekey => prekey.key_id === prekey_id);
    delete matches[0];
    return prekey_id;
  }
}

beforeAll(async () => {
  await sodium.ready;
});

describe('Session', () => {
  describe('Setup', () => {
    it('generates a session from a prekey message', async () => {
      const preKeys = await Proteus.keys.PreKey.generate_prekeys(0, 10);
      const bobStore = new TestStore(preKeys);

      const alice = await Proteus.keys.IdentityKeyPair.new();
      const bob = await Proteus.keys.IdentityKeyPair.new();
      const preKey = await bobStore.load_prekey(0);
      const bobPreKeyBundle = Proteus.keys.PreKeyBundle.new(bob.public_key, preKey);
      const aliceToBob = await Proteus.session.Session.init_from_prekey(alice, bobPreKeyBundle);

      const plaintext = 'Hello Bob!';

      const preKeyMessage = await aliceToBob.encrypt(plaintext);

      const envelope = Proteus.message.Envelope.deserialise(preKeyMessage.serialise());

      const [bobToAlice, decrypted] = await Proteus.session.Session.init_from_message(bob, bobStore, envelope);

      expect(sodium.to_string(decrypted)).toBe(plaintext);
      expect(bobToAlice).toBeDefined();
    });
  });

  describe('Serialisation', () => {
    it('can be serialised and deserialised to/from CBOR', async () => {
      const [alice_ident, bob_ident] = await Promise.all([
        Proteus.keys.IdentityKeyPair.new(),
        Proteus.keys.IdentityKeyPair.new(),
      ]);
      const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_prekey = await bob_store.load_prekey(0);
      const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

      const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);
      expect(alice.session_states[alice.session_tag.toString()].state.recv_chains.length).toEqual(1);
      expect(alice.pending_prekey!.length).toBe(2);

      assert_serialise_deserialise(alice_ident, alice);
    });

    it('encrypts and decrypts messages', async () => {
      const alice_ident = await Proteus.keys.IdentityKeyPair.new();
      const alice_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_ident = await Proteus.keys.IdentityKeyPair.new();
      const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_prekey = await bob_store.load_prekey(0);
      const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

      const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);
      expect(alice.session_states[alice.session_tag.toString()].state.recv_chains.length).toBe(1);

      const hello_bob = await alice.encrypt('Hello Bob!');
      const hello_bob_delayed = await alice.encrypt('Hello delay!');

      expect(Object.keys(alice.session_states).length).toBe(1);
      expect(alice.session_states[alice.session_tag.toString()].state.recv_chains.length).toBe(1);

      const bob = await assert_init_from_message(bob_ident, bob_store, hello_bob, 'Hello Bob!');

      expect(Object.keys(bob.session_states).length).toBe(1);
      expect(bob.session_states[bob.session_tag.toString()].state.recv_chains.length).toBe(1);

      const hello_alice = await bob.encrypt('Hello Alice!');

      expect(alice.pending_prekey!.length).toBe(2);

      expect(sodium.to_string(await alice.decrypt(alice_store, hello_alice))).toBe('Hello Alice!');

      expect(alice.pending_prekey).toBe(null);
      expect(alice.session_states[alice.session_tag.toString()].state.recv_chains.length).toBe(2);
      expect(alice.remote_identity.fingerprint()).toBe(bob.local_identity.public_key.fingerprint());

      const ping_bob_1 = await alice.encrypt('Ping1!');
      const ping_bob_2 = await alice.encrypt('Ping2!');

      expect(alice.session_states[alice.session_tag.toString()].state.prev_counter).toBe(2);

      expect(ping_bob_1.message).toEqual(jasmine.any(Proteus.message.CipherMessage));
      expect(ping_bob_2.message).toEqual(jasmine.any(Proteus.message.CipherMessage));

      expect(sodium.to_string(await bob.decrypt(bob_store, ping_bob_1))).toBe('Ping1!');

      expect(bob.session_states[bob.session_tag.toString()].state.recv_chains.length).toBe(2);

      expect(sodium.to_string(await bob.decrypt(bob_store, ping_bob_2))).toBe('Ping2!');

      expect(bob.session_states[bob.session_tag.toString()].state.recv_chains.length).toBe(2);

      const pong_alice = await bob.encrypt('Pong!');
      expect(sodium.to_string(await alice.decrypt(alice_store, pong_alice))).toBe('Pong!');

      expect(alice.session_states[alice.session_tag.toString()].state.recv_chains.length).toBe(3);
      expect(alice.session_states[alice.session_tag.toString()].state.prev_counter).toBe(2);

      const delay_decrypted = await bob.decrypt(bob_store, hello_bob_delayed);
      expect(sodium.to_string(delay_decrypted)).toBe('Hello delay!');

      expect(bob.session_states[bob.session_tag.toString()].state.recv_chains.length).toBe(2);
      expect(bob.session_states[bob.session_tag.toString()].state.prev_counter).toBe(1);

      assert_serialise_deserialise(alice_ident, alice);
      assert_serialise_deserialise(bob_ident, bob);
    });

    it('limits the number of receive chains', async () => {
      const alice_ident = await Proteus.keys.IdentityKeyPair.new();
      const alice_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_ident = await Proteus.keys.IdentityKeyPair.new();
      const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_prekey = await bob_store.load_prekey(0);
      const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

      const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);
      const hello_bob = await alice.encrypt('Hello Bob!');

      const bob = await assert_init_from_message(bob_ident, bob_store, hello_bob, 'Hello Bob!');

      expect(alice.session_states[alice.session_tag.toString()].state.recv_chains.length).toBe(1);
      expect(bob.session_states[bob.session_tag.toString()].state.recv_chains.length).toBe(1);

      await Promise.all(
        Array.from({length: Proteus.session.Session.MAX_RECV_CHAINS * 2}, async () => {
          const bob_to_alice = await bob.encrypt('ping');
          expect(sodium.to_string(await alice.decrypt(alice_store, bob_to_alice))).toBe('ping');

          const alice_to_bob = await alice.encrypt('pong');
          expect(sodium.to_string(await bob.decrypt(bob_store, alice_to_bob))).toBe('pong');

          expect(alice.session_states[alice.session_tag.toString()].state.recv_chains.length).not.toBeGreaterThan(
            Proteus.session.Session.MAX_RECV_CHAINS,
          );

          expect(bob.session_states[bob.session_tag.toString()].state.recv_chains.length).not.toBeGreaterThan(
            Proteus.session.Session.MAX_RECV_CHAINS,
          );
        }),
      );
    });

    it('handles a counter mismatch', async () => {
      const alice_ident = await Proteus.keys.IdentityKeyPair.new();
      const alice_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_ident = await Proteus.keys.IdentityKeyPair.new();
      const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_prekey = await bob_store.load_prekey(0);
      const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

      const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);
      const message = await alice.encrypt('Hello Bob!');

      const bob = await assert_init_from_message(bob_ident, bob_store, message, 'Hello Bob!');
      const ciphertexts = await Promise.all(
        ['Hello1', 'Hello2', 'Hello3', 'Hello4', 'Hello5'].map(text => bob.encrypt(text)),
      );

      expect(sodium.to_string(await alice.decrypt(alice_store, ciphertexts[1]))).toBe('Hello2');
      expect(alice.session_states[alice.session_tag.toString()].state.recv_chains[0].message_keys.length).toBe(1);

      assert_serialise_deserialise(alice_ident, alice);

      expect(sodium.to_string(await alice.decrypt(alice_store, ciphertexts[0]))).toBe('Hello1');
      expect(alice.session_states[alice.session_tag.toString()].state.recv_chains[0].message_keys.length).toBe(0);

      expect(sodium.to_string(await alice.decrypt(alice_store, ciphertexts[2]))).toBe('Hello3');
      expect(alice.session_states[alice.session_tag.toString()].state.recv_chains[0].message_keys.length).toBe(0);

      expect(sodium.to_string(await alice.decrypt(alice_store, ciphertexts[4]))).toBe('Hello5');
      expect(alice.session_states[alice.session_tag.toString()].state.recv_chains[0].message_keys.length).toBe(1);

      expect(sodium.to_string(await alice.decrypt(alice_store, ciphertexts[3]))).toBe('Hello4');
      expect(alice.session_states[alice.session_tag.toString()].state.recv_chains[0].message_keys.length).toBe(0);

      await Promise.all(
        ciphertexts.map(async text => {
          try {
            await alice.decrypt(alice_store, text);
            fail();
          } catch (error) {
            expect(error instanceof Proteus.errors.DecryptError.DuplicateMessage).toBe(true);
            expect(error.code).toBe(Proteus.errors.DecryptError.CODE.CASE_209);
          }
        }),
      );

      assert_serialise_deserialise(alice_ident, alice);
      assert_serialise_deserialise(bob_ident, bob);
    });

    it('handles multiple prekey messages', async () => {
      const alice_ident = await Proteus.keys.IdentityKeyPair.new();
      const alice_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_ident = await Proteus.keys.IdentityKeyPair.new();
      const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_prekey = await bob_store.load_prekey(0);
      const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

      const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);
      const hello_bob1 = await alice.encrypt('Hello Bob1!');
      const hello_bob2 = await alice.encrypt('Hello Bob2!');
      const hello_bob3 = await alice.encrypt('Hello Bob3!');

      const [bob, decrypted] = await Proteus.session.Session.init_from_message(bob_ident, bob_store, hello_bob1);

      expect(decrypted).toBeDefined();

      expect(Object.keys(bob.session_states).length).toBe(1);
      expect(sodium.to_string(await bob.decrypt(alice_store, hello_bob2))).toBe('Hello Bob2!');
      expect(Object.keys(bob.session_states).length).toBe(1);
      expect(sodium.to_string(await bob.decrypt(alice_store, hello_bob3))).toBe('Hello Bob3!');
      expect(Object.keys(bob.session_states).length).toBe(1);

      assert_serialise_deserialise(alice_ident, alice);
      assert_serialise_deserialise(bob_ident, bob);
    });

    it('handles simultaneous prekey messages', async () => {
      const alice_ident = await Proteus.keys.IdentityKeyPair.new();
      const alice_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_ident = await Proteus.keys.IdentityKeyPair.new();
      const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_prekey = await bob_store.load_prekey(0);
      const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

      const alice_prekey = await alice_store.load_prekey(0);
      const alice_bundle = Proteus.keys.PreKeyBundle.new(alice_ident.public_key, alice_prekey);

      const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);
      const hello_bob_encrypted = await alice.encrypt('Hello Bob!');

      const bob = await Proteus.session.Session.init_from_prekey(bob_ident, alice_bundle);
      const hello_alice = await bob.encrypt('Hello Alice!');

      expect(alice.session_tag.toString()).not.toEqual(bob.session_tag.toString());
      expect(hello_alice).toBeDefined();

      const hello_bob_decrypted = await bob.decrypt(bob_store, hello_bob_encrypted);
      expect(sodium.to_string(hello_bob_decrypted)).toBe('Hello Bob!');
      expect(Object.keys(bob.session_states).length).toBe(2);

      expect(sodium.to_string(await alice.decrypt(alice_store, hello_alice))).toBe('Hello Alice!');
      expect(Object.keys(alice.session_states).length).toBe(2);

      const message_alice = await alice.encrypt('That was fast!');
      expect(sodium.to_string(await bob.decrypt(bob_store, message_alice))).toBe('That was fast!');

      const message_bob = await bob.encrypt(':-)');

      expect(sodium.to_string(await alice.decrypt(alice_store, message_bob))).toBe(':-)');
      expect(alice.session_tag.toString()).toEqual(bob.session_tag.toString());

      assert_serialise_deserialise(alice_ident, alice);
      assert_serialise_deserialise(bob_ident, bob);
    });

    it('handles simultaneous repeated messages', async () => {
      const alice_ident = await Proteus.keys.IdentityKeyPair.new();
      const alice_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_ident = await Proteus.keys.IdentityKeyPair.new();
      const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_prekey = await bob_store.load_prekey(0);
      const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

      const alice_prekey = await alice_store.load_prekey(0);
      const alice_bundle = Proteus.keys.PreKeyBundle.new(alice_ident.public_key, alice_prekey);

      const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);
      const hello_bob_plaintext = 'Hello Bob!';
      const hello_bob_encrypted = await alice.encrypt(hello_bob_plaintext);

      const bob = await Proteus.session.Session.init_from_prekey(bob_ident, alice_bundle);
      const hello_alice_plaintext = 'Hello Alice!';
      const hello_alice_encrypted = await bob.encrypt(hello_alice_plaintext);

      expect(alice.session_tag.toString()).not.toEqual(bob.session_tag.toString());

      const hello_bob_decrypted = await bob.decrypt(bob_store, hello_bob_encrypted);
      expect(sodium.to_string(hello_bob_decrypted)).toBe(hello_bob_plaintext);

      const hello_alice_decrypted = await alice.decrypt(alice_store, hello_alice_encrypted);
      expect(sodium.to_string(hello_alice_decrypted)).toBe(hello_alice_plaintext);

      const echo_bob1_plaintext = 'Echo Bob1!';
      const echo_bob1_encrypted = await alice.encrypt(echo_bob1_plaintext);

      const echo_alice1_plaintext = 'Echo Alice1!';
      const echo_alice1_encrypted = await bob.encrypt(echo_alice1_plaintext);

      const echo_bob1_decrypted = await bob.decrypt(bob_store, echo_bob1_encrypted);
      expect(sodium.to_string(echo_bob1_decrypted)).toBe(echo_bob1_plaintext);
      expect(Object.keys(bob.session_states).length).toBe(2);

      const echo_alice1_decrypted = await alice.decrypt(alice_store, echo_alice1_encrypted);
      expect(sodium.to_string(echo_alice1_decrypted)).toBe(echo_alice1_plaintext);
      expect(Object.keys(alice.session_states).length).toBe(2);

      const echo_bob2_plaintext = 'Echo Bob2!';
      const echo_bob2_encrypted = await alice.encrypt(echo_bob2_plaintext);

      const echo_alice2_plaintext = 'Echo Alice2!';
      const echo_alice2_encrypted = await bob.encrypt(echo_alice2_plaintext);

      const echo_bob2_decrypted = await bob.decrypt(bob_store, echo_bob2_encrypted);
      expect(sodium.to_string(echo_bob2_decrypted)).toBe(echo_bob2_plaintext);
      expect(Object.keys(bob.session_states).length).toBe(2);

      const echo_alice2_decrypted = await alice.decrypt(alice_store, echo_alice2_encrypted);
      expect(sodium.to_string(echo_alice2_decrypted)).toBe(echo_alice2_plaintext);
      expect(Object.keys(alice.session_states).length).toBe(2);

      expect(alice.session_tag.toString()).not.toEqual(bob.session_tag.toString());

      const stop_it_plaintext = 'Stop it!';
      const stop_it_encrypted = await alice.encrypt(stop_it_plaintext);

      const stop_it_decrypted = await bob.decrypt(bob_store, stop_it_encrypted);
      expect(sodium.to_string(stop_it_decrypted)).toBe(stop_it_plaintext);
      expect(Object.keys(bob.session_states).length).toBe(2);

      const ok_plaintext = 'OK';
      const ok_encrypted = await bob.encrypt(ok_plaintext);

      const ok_decrypted = await alice.decrypt(alice_store, ok_encrypted);
      expect(sodium.to_string(ok_decrypted)).toBe(ok_plaintext);
      expect(Object.keys(alice.session_states).length).toBe(2);

      expect(alice.session_tag.toString()).toEqual(bob.session_tag.toString());

      assert_serialise_deserialise(alice_ident, alice);
      assert_serialise_deserialise(bob_ident, bob);
    });

    it('fails retry init from message', async () => {
      try {
        const alice_ident = await Proteus.keys.IdentityKeyPair.new();

        const bob_ident = await Proteus.keys.IdentityKeyPair.new();
        const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

        const bob_prekey = await bob_store.load_prekey(0);
        const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

        const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);

        const hello_bob_plaintext = 'Hello Bob!';
        const hello_bob_encrypted = await alice.encrypt(hello_bob_plaintext);

        await assert_init_from_message(bob_ident, bob_store, hello_bob_encrypted, hello_bob_plaintext);

        await Proteus.session.Session.init_from_message(bob_ident, bob_store, hello_bob_encrypted);

        fail();
      } catch (error) {
        expect(error instanceof Proteus.errors.DecryptError).toBe(true);
        expect(error.code).toBe(Proteus.errors.DecryptError.CODE.CASE_206);
      }
    });

    it('skips message keys', async () => {
      const alice_ident = await Proteus.keys.IdentityKeyPair.new();
      const alice_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_ident = await Proteus.keys.IdentityKeyPair.new();
      const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_prekey = await bob_store.load_prekey(0);
      const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

      const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);

      const hello_bob_plaintext = 'Hello Bob!';
      const hello_bob_encrypted = await alice.encrypt(hello_bob_plaintext);

      let state = alice.session_states[alice.session_tag.toString()].state;
      expect(state.recv_chains.length).toBe(1);
      expect(state.recv_chains[0].chain_key.idx).toBe(0);
      expect(state.send_chain.chain_key.idx).toBe(1);
      expect(state.recv_chains[0].message_keys.length).toBe(0);

      const bob = await assert_init_from_message(bob_ident, bob_store, hello_bob_encrypted, hello_bob_plaintext);

      state = bob.session_states[bob.session_tag.toString()].state;
      expect(state.recv_chains.length).toBe(1);
      expect(state.recv_chains[0].chain_key.idx).toBe(1);
      expect(state.send_chain.chain_key.idx).toBe(0);
      expect(state.recv_chains[0].message_keys.length).toBe(0);

      const hello_alice0_plaintext = 'Hello0';
      const hello_alice0_encrypted = await bob.encrypt(hello_alice0_plaintext);

      await bob.encrypt('Hello1'); // unused result

      const hello_alice2_plaintext = 'Hello2';
      const hello_alice2_encrypted = await bob.encrypt(hello_alice2_plaintext);

      const hello_alice2_decrypted = await alice.decrypt(alice_store, hello_alice2_encrypted);
      expect(sodium.to_string(hello_alice2_decrypted)).toBe(hello_alice2_plaintext);

      // Alice has two skipped message keys in her new receive chain:
      state = alice.session_states[alice.session_tag.toString()].state;
      expect(state.recv_chains.length).toBe(2);
      expect(state.recv_chains[0].chain_key.idx).toBe(3);
      expect(state.send_chain.chain_key.idx).toBe(0);
      expect(state.recv_chains[0].message_keys.length).toBe(2);
      expect(state.recv_chains[0].message_keys[0].counter).toBe(0);
      expect(state.recv_chains[0].message_keys[1].counter).toBe(1);

      const hello_bob0_plaintext = 'Hello0';
      const hello_bob0_encrypted = await alice.encrypt(hello_bob0_plaintext);

      const hello_bob0_decrypted = await bob.decrypt(bob_store, hello_bob0_encrypted);
      expect(sodium.to_string(hello_bob0_decrypted)).toBe(hello_bob0_plaintext);

      // For Bob everything is normal still. A new message from Alice means a
      // new receive chain has been created and again no skipped message keys.

      state = bob.session_states[bob.session_tag.toString()].state;
      expect(state.recv_chains.length).toBe(2);
      expect(state.recv_chains[0].chain_key.idx).toBe(1);
      expect(state.send_chain.chain_key.idx).toBe(0);
      expect(state.recv_chains[0].message_keys.length).toBe(0);

      const hello_alice0_decrypted = await alice.decrypt(alice_store, hello_alice0_encrypted);
      expect(sodium.to_string(hello_alice0_decrypted)).toBe(hello_alice0_plaintext);

      // Alice received the first of the two missing messages. Therefore
      // only one message key is still skipped (counter value = 1).

      state = alice.session_states[alice.session_tag.toString()].state;
      expect(state.recv_chains.length).toBe(2);
      expect(state.recv_chains[0].message_keys.length).toBe(1);
      expect(state.recv_chains[0].message_keys[0].counter).toBe(1);

      const hello_again0_plaintext = 'Again0';
      const hello_again0_encrypted = await bob.encrypt(hello_again0_plaintext);

      const hello_again1_plaintext = 'Again1';
      const hello_again1_encrypted = await bob.encrypt(hello_again1_plaintext);

      const hello_again1_decrypted = await alice.decrypt(alice_store, hello_again1_encrypted);
      expect(sodium.to_string(hello_again1_decrypted)).toBe(hello_again1_plaintext);

      // Alice received the first of the two missing messages. Therefore
      // only one message key is still skipped (counter value = 1).

      state = alice.session_states[alice.session_tag.toString()].state;
      expect(state.recv_chains.length).toBe(3);
      expect(state.recv_chains[0].message_keys.length).toBe(1);
      expect(state.recv_chains[1].message_keys.length).toBe(1);
      expect(state.recv_chains[0].message_keys[0].counter).toBe(0);
      expect(state.recv_chains[1].message_keys[0].counter).toBe(1);

      const hello_again0_decrypted = await alice.decrypt(alice_store, hello_again0_encrypted);
      expect(sodium.to_string(hello_again0_decrypted)).toBe(hello_again0_plaintext);
    });

    it('replaces prekeys', async () => {
      const alice_ident = await Proteus.keys.IdentityKeyPair.new();

      const bob_ident = await Proteus.keys.IdentityKeyPair.new();
      const bob_store1 = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));
      const bob_store2 = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, 10));

      const bob_prekey = await bob_store1.load_prekey(0);
      expect(bob_prekey.key_id).toBe(0);
      const bob_bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, bob_prekey);

      const alice = await Proteus.session.Session.init_from_prekey(alice_ident, bob_bundle);

      const hello_bob1_plaintext = 'Hello Bob!';
      const hello_bob1_encrypted = await alice.encrypt(hello_bob1_plaintext);

      const bob = await assert_init_from_message(bob_ident, bob_store1, hello_bob1_encrypted, hello_bob1_plaintext);

      expect(Object.keys(bob.session_states).length).toBe(1);

      const hello_bob2_plaintext = 'Hello Bob2!';
      const hello_bob2_encrypted = await alice.encrypt(hello_bob2_plaintext);

      const hello_bob2_decrypted = await bob.decrypt(bob_store1, hello_bob2_encrypted);
      expect(sodium.to_string(hello_bob2_decrypted)).toBe(hello_bob2_plaintext);

      expect(Object.keys(bob.session_states).length).toBe(1);

      const hello_bob3_plaintext = 'Hello Bob3!';
      const hello_bob3_encrypted = await alice.encrypt(hello_bob3_plaintext);

      const hello_bob3_decrypted = await bob.decrypt(bob_store2, hello_bob3_encrypted);
      expect(sodium.to_string(hello_bob3_decrypted)).toBe(hello_bob3_plaintext);

      expect(Object.keys(bob.session_states).length).toBe(1);
    });
  });
  describe('Process', () => {
    it('works until the max counter gap', async () => {
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
        Array.from({length: 1001}, async () => {
          const hello_bob2_plaintext = 'Hello Bob2!';
          const hello_bob2_encrypted = await alice.encrypt(hello_bob2_plaintext);
          const hello_bob2_decrypted = await bob.decrypt(bob_store, hello_bob2_encrypted);
          expect(sodium.to_string(hello_bob2_decrypted)).toBe(hello_bob2_plaintext);
          expect(Object.keys(bob.session_states).length).toBe(1);
        }),
      );
    });

    it('pathological case', async () => {
      const num_alices = 32;
      const alice_ident = await Proteus.keys.IdentityKeyPair.new();

      const bob_ident = await Proteus.keys.IdentityKeyPair.new();

      const bob_store = new TestStore(await Proteus.keys.PreKey.generate_prekeys(0, num_alices));
      const bob_prekeys = await bob_store.load_prekeys();

      const alices = await Promise.all(
        bob_prekeys.map(pk => {
          const bundle = Proteus.keys.PreKeyBundle.new(bob_ident.public_key, pk);
          return Proteus.session.Session.init_from_prekey(alice_ident, bundle);
        }),
      );

      expect(alices.length).toBe(num_alices);

      const message = await alices[0].encrypt('Hello Bob!');
      const bob = await assert_init_from_message(bob_ident, bob_store, message, 'Hello Bob!');

      await Promise.all(
        alices.map(async alice => {
          await Promise.all(Array.from({length: 900}, () => alice.encrypt('hello')));
          const encrypted_message = await alice.encrypt('Hello Bob!');
          expect(sodium.to_string(await bob.decrypt(bob_store, encrypted_message))).toBe('Hello Bob!');
        }),
      );

      expect(Object.keys(bob.session_states).length).toBe(num_alices);

      await Promise.all(
        alices.map(async alice => {
          const encrypted_message = await alice.encrypt('Hello Bob!');
          expect(sodium.to_string(await bob.decrypt(bob_store, encrypted_message))).toBe('Hello Bob!');
        }),
      );
    }, 10000);

    it('should handle mass communication', async () => {
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
        }),
      );

      assert_serialise_deserialise(alice_ident, alice);
      assert_serialise_deserialise(bob_ident, bob);
    }, 10000);
  });
});
