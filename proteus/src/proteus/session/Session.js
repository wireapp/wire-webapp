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

const CBOR = require('@wireapp/cbor');

const ClassUtil = require('../util/ClassUtil');
const DontCallConstructor = require('../errors/DontCallConstructor');
const MemoryUtil = require('../util/MemoryUtil');
const TypeUtil = require('../util/TypeUtil');

const DecodeError = require('../errors/DecodeError');
const DecryptError = require('../errors/DecryptError');
const ProteusError = require('../errors/ProteusError');

const IdentityKey = require('../keys/IdentityKey');
const IdentityKeyPair = require('../keys/IdentityKeyPair');
const KeyPair = require('../keys/KeyPair');
const PreKey = require('../keys/PreKey');
const PreKeyBundle = require('../keys/PreKeyBundle');
const PublicKey = require('../keys/PublicKey');

const CipherMessage = require('../message/CipherMessage');
const Envelope = require('../message/Envelope');
const PreKeyMessage = require('../message/PreKeyMessage');
const SessionTag = require('../message/SessionTag');

const PreKeyStore = require('./PreKeyStore');

/** @module session */

/**
 * @class Session
 * @throws {DontCallConstructor}
 */
class Session {
  constructor() {
    /** @type {number} */
    this.counter = 0;
    /** @type {keys.IdentityKeyPair | null} */
    this.local_identity = null;
    /** @type {Array<number|keys.PublicKey> | null} */
    this.pending_prekey = null;
    /** @type {keys.IdentityKey | null} */
    this.remote_identity = null;
    /** @type {Object} */
    this.session_states = null;
    /** @type {message.SessionTag | null} */
    this.session_tag = null;
    /** @type {number} */
    this.version = 1;

    throw new DontCallConstructor(this);
  }

  /** @type {number} */
  static get MAX_RECV_CHAINS() {
    return 5;
  }

  /** @type {number} */
  static get MAX_SESSION_STATES() {
    return 100;
  }

  /**
   * @param {!keys.IdentityKeyPair} local_identity - Alice's Identity Key Pair
   * @param {!keys.PreKeyBundle} remote_pkbundle - Bob's Pre-Key Bundle
   * @returns {Promise<Session>}
   */
  static init_from_prekey(local_identity, remote_pkbundle) {
    return new Promise(resolve => {
      TypeUtil.assert_is_instance(IdentityKeyPair, local_identity);
      TypeUtil.assert_is_instance(PreKeyBundle, remote_pkbundle);

      const alice_base = KeyPair.new();

      const state = SessionState.init_as_alice(local_identity, alice_base, remote_pkbundle);

      const session_tag = SessionTag.new();

      const session = ClassUtil.new_instance(this);
      session.session_tag = session_tag;
      session.local_identity = local_identity;
      session.remote_identity = remote_pkbundle.identity_key;
      session.pending_prekey = [remote_pkbundle.prekey_id, alice_base.public_key];
      session.session_states = {};

      session._insert_session_state(session_tag, state);
      return resolve(session);
    });
  }

  /**
   * @param {!keys.IdentityKeyPair} our_identity
   * @param {!session.PreKeyStore} prekey_store
   * @param {!message.Envelope} envelope
   * @returns {Promise<Array<Session|Uint8Array>>}
   * @throws {errors.DecryptError.InvalidMessage}
   * @throws {errors.DecryptError.PrekeyNotFound}
   */
  static init_from_message(our_identity, prekey_store, envelope) {
    return new Promise((resolve, reject) => {
      TypeUtil.assert_is_instance(IdentityKeyPair, our_identity);
      TypeUtil.assert_is_instance(PreKeyStore, prekey_store);
      TypeUtil.assert_is_instance(Envelope, envelope);

      const pkmsg = (() => {
        if (envelope.message instanceof CipherMessage) {
          throw new DecryptError.InvalidMessage(
            "Can't initialise a session from a CipherMessage.",
            DecryptError.CODE.CASE_201
          );
        } else if (envelope.message instanceof PreKeyMessage) {
          return envelope.message;
        } else {
          throw new DecryptError.InvalidMessage(
            'Unknown message format: The message is neither a "CipherMessage" nor a "PreKeyMessage".',
            DecryptError.CODE.CASE_202
          );
        }
      })();

      const session = ClassUtil.new_instance(Session);
      session.session_tag = pkmsg.message.session_tag;
      session.local_identity = our_identity;
      session.remote_identity = pkmsg.identity_key;
      session.pending_prekey = null;
      session.session_states = {};

      return session
        ._new_state(prekey_store, pkmsg)
        .then(state => {
          const plain = state.decrypt(envelope, pkmsg.message);
          session._insert_session_state(pkmsg.message.session_tag, state);

          if (pkmsg.prekey_id < PreKey.MAX_PREKEY_ID) {
            MemoryUtil.zeroize(prekey_store.prekeys[pkmsg.prekey_id]);
            return prekey_store
              .remove(pkmsg.prekey_id)
              .then(() => resolve([session, plain]))
              .catch(error => {
                reject(
                  new DecryptError.PrekeyNotFound(
                    `Could not delete PreKey: ${error.message}`,
                    DecryptError.CODE.CASE_203
                  )
                );
              });
          }
          return resolve([session, plain]);
        })
        .catch(reject);
    });
  }

  /**
   * @param {!session.PreKeyStore} pre_key_store
   * @param {!message.PreKeyMessage} pre_key_message
   * @returns {Promise<session.SessionState>}
   * @private
   * @throws {errors.ProteusError}
   */
  _new_state(pre_key_store, pre_key_message) {
    return pre_key_store.get_prekey(pre_key_message.prekey_id).then(pre_key => {
      if (pre_key) {
        return SessionState.init_as_bob(
          this.local_identity,
          pre_key.key_pair,
          pre_key_message.identity_key,
          pre_key_message.base_key
        );
      }
      throw new ProteusError('Unable to get PreKey from PreKey store.', ProteusError.prototype.CODE.CASE_101);
    });
  }

  /**
   * @param {!message.SessionTag} tag
   * @param {!session.SessionState} state
   * @returns {boolean}
   * @private
   */
  _insert_session_state(tag, state) {
    if (this.session_states.hasOwnProperty(tag)) {
      this.session_states[tag].state = state;
    } else {
      if (this.counter >= Number.MAX_SAFE_INTEGER) {
        this.session_states = {};
        this.counter = 0;
      }

      this.session_states[tag] = {
        idx: this.counter,
        state: state,
        tag: tag,
      };
      this.counter++;
    }

    if (this.session_tag.toString() !== tag.toString()) {
      this.session_tag = tag;
    }

    const obj_size = obj => Object.keys(obj).length;

    if (obj_size(this.session_states) < Session.MAX_SESSION_STATES) {
      return;
    }

    // if we get here, it means that we have more than MAX_SESSION_STATES and
    // we need to evict the oldest one.
    return this._evict_oldest_session_state();
  }

  /**
   * @returns {void}
   * @private
   */
  _evict_oldest_session_state() {
    const oldest = Object.keys(this.session_states)
      .filter(obj => obj.toString() !== this.session_tag)
      .reduce((lowest, obj, index) => {
        return this.session_states[obj].idx < this.session_states[lowest].idx ? obj.toString() : lowest;
      });

    MemoryUtil.zeroize(this.session_states[oldest]);
    delete this.session_states[oldest];
  }

  /** @returns {keys.PublicKey} */
  get_local_identity() {
    return this.local_identity.public_key;
  }

  /**
   * @param {!(String|Uint8Array)} plaintext - The plaintext which needs to be encrypted
   * @return {Promise<message.Envelope>} Encrypted message
   */
  encrypt(plaintext) {
    return new Promise((resolve, reject) => {
      const state = this.session_states[this.session_tag];

      if (!state) {
        return reject(
          new ProteusError(
            `Could not find session for tag '${(this.session_tag || '').toString()}'.`,
            ProteusError.prototype.CODE.CASE_102
          )
        );
      }

      return resolve(
        state.state.encrypt(this.local_identity.public_key, this.pending_prekey, this.session_tag, plaintext)
      );
    });
  }

  /**
   * @param {!session.PreKeyStore} prekey_store
   * @param {!message.Envelope} envelope
   * @returns {Promise<Uint8Array>}
   * @throws {errors.DecryptError}
   */
  decrypt(prekey_store, envelope) {
    return new Promise(resolve => {
      TypeUtil.assert_is_instance(PreKeyStore, prekey_store);
      TypeUtil.assert_is_instance(Envelope, envelope);

      const msg = envelope.message;
      if (msg instanceof CipherMessage) {
        return resolve(this._decrypt_cipher_message(envelope, envelope.message));
      } else if (msg instanceof PreKeyMessage) {
        const actual_fingerprint = msg.identity_key.fingerprint();
        const expected_fingerprint = this.remote_identity.fingerprint();
        if (actual_fingerprint !== expected_fingerprint) {
          const message = `Fingerprints do not match: We expected '${expected_fingerprint}', but received '${actual_fingerprint}'.`;
          throw new DecryptError.RemoteIdentityChanged(message, DecryptError.CODE.CASE_204);
        }
        return resolve(this._decrypt_prekey_message(envelope, msg, prekey_store));
      }
      throw new DecryptError('Unknown message type.', DecryptError.CODE.CASE_200);
    });
  }

  /**
   * @param {!message.Envelope} envelope
   * @param {!message.Message} msg
   * @param {!session.PreKeyStore} prekey_store
   * @private
   * @returns {Promise<string>}
   * @throws {errors.DecryptError}
   */
  _decrypt_prekey_message(envelope, msg, prekey_store) {
    return Promise.resolve()
      .then(() => this._decrypt_cipher_message(envelope, msg.message))
      .catch(error => {
        if (error instanceof DecryptError.InvalidSignature || error instanceof DecryptError.InvalidMessage) {
          return this._new_state(prekey_store, msg).then(state => {
            const plaintext = state.decrypt(envelope, msg.message);

            if (msg.prekey_id !== PreKey.MAX_PREKEY_ID) {
              MemoryUtil.zeroize(prekey_store.prekeys[msg.prekey_id]);
              prekey_store.remove(msg.prekey_id);
            }

            this._insert_session_state(msg.message.session_tag, state);
            this.pending_prekey = null;

            return plaintext;
          });
        }
        throw error;
      });
  }

  /**
   * @param {!message.Envelope} envelope
   * @param {!message.Message} msg
   * @private
   * @returns {string}
   */
  _decrypt_cipher_message(envelope, msg) {
    let state = this.session_states[msg.session_tag];
    if (!state) {
      throw new DecryptError.InvalidMessage(
        `Local session not found for message session tag '${msg.session_tag}'.`,
        DecryptError.CODE.CASE_205
      );
    }

    // serialise and de-serialise for a deep clone
    // THIS IS IMPORTANT, DO NOT MUTATE THE SESSION STATE IN-PLACE
    // mutating in-place can lead to undefined behavior and undefined state in edge cases
    state = SessionState.deserialise(state.state.serialise());

    const plaintext = state.decrypt(envelope, msg);

    this.pending_prekey = null;

    this._insert_session_state(msg.session_tag, state);
    return plaintext;
  }

  /**
   * @returns {ArrayBuffer}
   */
  serialise() {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  /**
   * @param {!keys.IdentityKeyPair} local_identity
   * @param {!ArrayBuffer} buf
   * @returns {Session}
   */
  static deserialise(local_identity, buf) {
    TypeUtil.assert_is_instance(IdentityKeyPair, local_identity);
    TypeUtil.assert_is_instance(ArrayBuffer, buf);

    const decoder = new CBOR.Decoder(buf);
    return this.decode(local_identity, decoder);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {void}
   */
  encode(encoder) {
    encoder.object(6);
    encoder.u8(0);
    encoder.u8(this.version);
    encoder.u8(1);
    this.session_tag.encode(encoder);
    encoder.u8(2);
    this.local_identity.public_key.encode(encoder);
    encoder.u8(3);
    this.remote_identity.encode(encoder);

    encoder.u8(4);
    if (this.pending_prekey) {
      encoder.object(2);
      encoder.u8(0);
      encoder.u16(this.pending_prekey[0]);
      encoder.u8(1);
      this.pending_prekey[1].encode(encoder);
    } else {
      encoder.null();
    }

    encoder.u8(5);
    encoder.object(Object.keys(this.session_states).length);

    for (const index in this.session_states) {
      const state = this.session_states[index];
      state.tag.encode(encoder);
      state.state.encode(encoder);
    }
  }

  /**
   * @param {!keys.IdentityKeyPair} local_identity
   * @param {!CBOR.Decoder} decoder
   * @returns {Session}
   */
  static decode(local_identity, decoder) {
    TypeUtil.assert_is_instance(IdentityKeyPair, local_identity);
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    const self = ClassUtil.new_instance(this);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0: {
          self.version = decoder.u8();
          break;
        }
        case 1: {
          self.session_tag = SessionTag.decode(decoder);
          break;
        }
        case 2: {
          const identity_key = IdentityKey.decode(decoder);
          if (local_identity.public_key.fingerprint() !== identity_key.fingerprint()) {
            throw new DecodeError.LocalIdentityChanged(null, DecodeError.CODE.CASE_300);
          }
          self.local_identity = local_identity;
          break;
        }
        case 3: {
          self.remote_identity = IdentityKey.decode(decoder);
          break;
        }
        case 4: {
          switch (decoder.optional(() => decoder.object())) {
            case null:
              self.pending_prekey = null;
              break;
            case 2:
              self.pending_prekey = [null, null];
              for (let key = 0; key <= 1; ++key) {
                switch (decoder.u8()) {
                  case 0:
                    self.pending_prekey[0] = decoder.u16();
                    break;
                  case 1:
                    self.pending_prekey[1] = PublicKey.decode(decoder);
                }
              }
              break;
            default:
              throw new DecodeError.InvalidType(null, DecodeError.CODE.CASE_301);
          }
          break;
        }
        case 5: {
          self.session_states = {};
          // needs simplification
          for (
            let idx = 0, ref = decoder.object() - 1, subindex = 0;
            0 <= ref ? subindex <= ref : subindex >= ref;
            idx = 0 <= ref ? ++subindex : --subindex
          ) {
            const tag = SessionTag.decode(decoder);
            self.session_states[tag] = {
              idx,
              state: SessionState.decode(decoder),
              tag: tag,
            };
          }
          break;
        }
        default: {
          decoder.skip();
        }
      }
    }

    TypeUtil.assert_is_integer(self.version);
    TypeUtil.assert_is_instance(SessionTag, self.session_tag);
    TypeUtil.assert_is_instance(IdentityKeyPair, self.local_identity);
    TypeUtil.assert_is_instance(IdentityKey, self.remote_identity);
    TypeUtil.assert_is_instance(Object, self.session_states);

    return self;
  }
}

module.exports = Session;

const SessionState = require('./SessionState');
