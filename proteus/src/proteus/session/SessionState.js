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

const CBOR = require('wire-webapp-cbor');

const ArrayUtil = require('../util/ArrayUtil');
const ClassUtil = require('../util/ClassUtil');
const DontCallConstructor = require('../errors/DontCallConstructor');
const MemoryUtil = require('../util/MemoryUtil');
const TypeUtil = require('../util/TypeUtil');

const DecryptError = require('../errors/DecryptError');

const DerivedSecrets = require('../derived/DerivedSecrets');

const IdentityKey = require('../keys/IdentityKey');
const IdentityKeyPair = require('../keys/IdentityKeyPair');
const KeyPair = require('../keys/KeyPair');
const PreKeyBundle = require('../keys/PreKeyBundle');
const PublicKey = require('../keys/PublicKey');

const CipherMessage = require('../message/CipherMessage');
const Envelope = require('../message/Envelope');
const PreKeyMessage = require('../message/PreKeyMessage');
const SessionTag = require('../message/SessionTag');

const ChainKey = require('./ChainKey');
const RecvChain = require('./RecvChain');
const RootKey = require('./RootKey');
const SendChain = require('./SendChain');
const Session = require('./Session');

/** @module session */

/** @class SessionState */
class SessionState {
  constructor() {
    this.recv_chains = null;
    this.send_chain = null;
    this.root_key = null;
    this.prev_counter = null;

    throw new DontCallConstructor(this);
  }

  /**
   * @param {!keys.IdentityKeyPair} alice_identity_pair
   * @param {!keys.PublicKey} alice_base
   * @param {!keys.PreKeyBundle} bob_pkbundle
   * @returns {SessionState}
   */
  static init_as_alice(alice_identity_pair, alice_base, bob_pkbundle) {
    TypeUtil.assert_is_instance(IdentityKeyPair, alice_identity_pair);
    TypeUtil.assert_is_instance(KeyPair, alice_base);
    TypeUtil.assert_is_instance(PreKeyBundle, bob_pkbundle);

    const master_key = ArrayUtil.concatenate_array_buffers([
      alice_identity_pair.secret_key.shared_secret(bob_pkbundle.public_key),
      alice_base.secret_key.shared_secret(bob_pkbundle.identity_key.public_key),
      alice_base.secret_key.shared_secret(bob_pkbundle.public_key),
    ]);

    const derived_secrets = DerivedSecrets.kdf_without_salt(master_key, 'handshake');
    MemoryUtil.zeroize(master_key);

    const rootkey = RootKey.from_cipher_key(derived_secrets.cipher_key);
    const chainkey = ChainKey.from_mac_key(derived_secrets.mac_key, 0);

    const recv_chains = [RecvChain.new(chainkey, bob_pkbundle.public_key)];

    const send_ratchet = KeyPair.new();
    const [rok, chk] = rootkey.dh_ratchet(send_ratchet, bob_pkbundle.public_key);
    const send_chain = SendChain.new(chk, send_ratchet);

    const state = ClassUtil.new_instance(SessionState);
    state.recv_chains = recv_chains;
    state.send_chain = send_chain;
    state.root_key = rok;
    state.prev_counter = 0;
    return state;
  }

  /**
   * @param {!keys.IdentityKeyPair} bob_ident
   * @param {!keys.KeyPair} bob_prekey
   * @param {!keys.IdentityKey} alice_ident
   * @param {!keys.PublicKey} alice_base
   * @returns {SessionState}
   */
  static init_as_bob(bob_ident, bob_prekey, alice_ident, alice_base) {
    TypeUtil.assert_is_instance(IdentityKeyPair, bob_ident);
    TypeUtil.assert_is_instance(KeyPair, bob_prekey);
    TypeUtil.assert_is_instance(IdentityKey, alice_ident);
    TypeUtil.assert_is_instance(PublicKey, alice_base);

    const master_key = ArrayUtil.concatenate_array_buffers([
      bob_prekey.secret_key.shared_secret(alice_ident.public_key),
      bob_ident.secret_key.shared_secret(alice_base),
      bob_prekey.secret_key.shared_secret(alice_base),
    ]);

    const derived_secrets = DerivedSecrets.kdf_without_salt(master_key, 'handshake');
    MemoryUtil.zeroize(master_key);

    const rootkey = RootKey.from_cipher_key(derived_secrets.cipher_key);
    const chainkey = ChainKey.from_mac_key(derived_secrets.mac_key, 0);
    const send_chain = SendChain.new(chainkey, bob_prekey);

    const state = ClassUtil.new_instance(SessionState);
    state.recv_chains = [];
    state.send_chain = send_chain;
    state.root_key = rootkey;
    state.prev_counter = 0;
    return state;
  }

  /**
   * @param {!keys.KeyPair} ratchet_key
   * @returns {void}
   */
  ratchet(ratchet_key) {
    const new_ratchet = KeyPair.new();

    const [recv_root_key, recv_chain_key] = this.root_key.dh_ratchet(this.send_chain.ratchet_key, ratchet_key);

    const [send_root_key, send_chain_key] = recv_root_key.dh_ratchet(new_ratchet, ratchet_key);

    const recv_chain = RecvChain.new(recv_chain_key, ratchet_key);
    const send_chain = SendChain.new(send_chain_key, new_ratchet);

    this.root_key = send_root_key;
    this.prev_counter = this.send_chain.chain_key.idx;
    this.send_chain = send_chain;

    this.recv_chains.unshift(recv_chain);

    if (this.recv_chains.length > Session.MAX_RECV_CHAINS) {
      for (let index = Session.MAX_RECV_CHAINS; index < this.recv_chains.length; index++) {
        MemoryUtil.zeroize(this.recv_chains[index]);
      }

      this.recv_chains = this.recv_chains.slice(0, Session.MAX_RECV_CHAINS);
    }
  }

  /**
   * @param {!keys.IdentityKey} identity_key - Public identity key of the local identity key pair
   * @param {!Array<number>} pending - Pending pre-key
   * @param {!message.SessionTag} tag - Session tag
   * @param {!(string|Uint8Array)} plaintext - The plaintext to encrypt
   * @returns {message.Envelope}
   */
  encrypt(identity_key, pending, tag, plaintext) {
    if (pending) {
      TypeUtil.assert_is_integer(pending[0]);
      TypeUtil.assert_is_instance(PublicKey, pending[1]);
    }
    TypeUtil.assert_is_instance(IdentityKey, identity_key);
    TypeUtil.assert_is_instance(SessionTag, tag);

    const msgkeys = this.send_chain.chain_key.message_keys();

    let message = CipherMessage.new(
      tag,
      this.send_chain.chain_key.idx,
      this.prev_counter,
      this.send_chain.ratchet_key.public_key,
      msgkeys.encrypt(plaintext)
    );

    if (pending) {
      message = PreKeyMessage.new(pending[0], pending[1], identity_key, message);
    }

    const env = Envelope.new(msgkeys.mac_key, message);
    this.send_chain.chain_key = this.send_chain.chain_key.next();
    return env;
  }

  /**
   * @param {!message.Envelope} envelope
   * @param {!message.CipherMessage} msg
   * @returns {Uint8Array}
   */
  decrypt(envelope, msg) {
    TypeUtil.assert_is_instance(Envelope, envelope);
    TypeUtil.assert_is_instance(CipherMessage, msg);

    let idx = this.recv_chains.findIndex(chain => chain.ratchet_key.fingerprint() === msg.ratchet_key.fingerprint());

    if (idx === -1) {
      this.ratchet(msg.ratchet_key);
      idx = 0;
    }

    const rc = this.recv_chains[idx];
    if (msg.counter < rc.chain_key.idx) {
      return rc.try_message_keys(envelope, msg);
    } else if (msg.counter == rc.chain_key.idx) {
      const mks = rc.chain_key.message_keys();

      if (!envelope.verify(mks.mac_key)) {
        throw new DecryptError.InvalidSignature(
          `Envelope verification failed for message with counters in sync at '${msg.counter}'`,
          DecryptError.CODE.CASE_206
        );
      }

      const plain = mks.decrypt(msg.cipher_text);
      rc.chain_key = rc.chain_key.next();
      return plain;
    } else if (msg.counter > rc.chain_key.idx) {
      const [chk, mk, mks] = rc.stage_message_keys(msg);

      if (!envelope.verify(mk.mac_key)) {
        throw new DecryptError.InvalidSignature(
          `Envelope verification failed for message with counter ahead. Message index is '${
            msg.counter
          }' while receive chain index is '${rc.chain_key.idx}'.`,
          DecryptError.CODE.CASE_207
        );
      }

      const plain = mk.decrypt(msg.cipher_text);

      rc.chain_key = chk.next();
      rc.commit_message_keys(mks);

      return plain;
    }
  }

  /** @returns {ArrayBuffer} */
  serialise() {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  static deserialise(buf) {
    TypeUtil.assert_is_instance(ArrayBuffer, buf);
    return SessionState.decode(new CBOR.Decoder(buf));
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(4);
    encoder.u8(0);
    encoder.array(this.recv_chains.length);
    this.recv_chains.map(rch => rch.encode(encoder));
    encoder.u8(1);
    this.send_chain.encode(encoder);
    encoder.u8(2);
    this.root_key.encode(encoder);
    encoder.u8(3);
    return encoder.u32(this.prev_counter);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {SessionState}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(SessionState);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0: {
          self.recv_chains = [];
          let len = decoder.array();
          while (len--) {
            self.recv_chains.push(RecvChain.decode(decoder));
          }
          break;
        }
        case 1: {
          self.send_chain = SendChain.decode(decoder);
          break;
        }
        case 2: {
          self.root_key = RootKey.decode(decoder);
          break;
        }
        case 3: {
          self.prev_counter = decoder.u32();
          break;
        }
        default: {
          decoder.skip();
        }
      }
    }

    TypeUtil.assert_is_instance(Array, self.recv_chains);
    TypeUtil.assert_is_instance(SendChain, self.send_chain);
    TypeUtil.assert_is_instance(RootKey, self.root_key);
    TypeUtil.assert_is_integer(self.prev_counter);

    return self;
  }
}

module.exports = SessionState;
