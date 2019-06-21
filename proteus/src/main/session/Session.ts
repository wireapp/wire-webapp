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

import * as CBOR from '@wireapp/cbor';

import * as ClassUtil from '../util/ClassUtil';
import * as MemoryUtil from '../util/MemoryUtil';

import {DecodeError} from '../errors/DecodeError';
import {DecryptError} from '../errors/DecryptError';
import {ProteusError} from '../errors/ProteusError';
import {SessionState} from './SessionState';

import {IdentityKey} from '../keys/IdentityKey';
import {IdentityKeyPair} from '../keys/IdentityKeyPair';
import {KeyPair} from '../keys/KeyPair';
import {PreKey} from '../keys/PreKey';
import {PreKeyBundle} from '../keys/PreKeyBundle';
import {PublicKey} from '../keys/PublicKey';

import {CipherMessage} from '../message/CipherMessage';
import {Envelope} from '../message/Envelope';
import {PreKeyMessage} from '../message/PreKeyMessage';
import {SessionTag} from '../message/SessionTag';

import {PreKeyStore} from './PreKeyStore';

export interface IntermediateSessionState {
  [index: string]: {
    idx: number;
    state: SessionState;
    tag: SessionTag;
  };
}

export class Session {
  static MAX_RECV_CHAINS = 5;
  static MAX_SESSION_STATES = 100;

  counter = 0;
  local_identity: IdentityKeyPair;
  pending_prekey: (number | PublicKey)[] | null;
  remote_identity: IdentityKey;
  session_states: IntermediateSessionState;
  session_tag: SessionTag;
  version = 1;

  constructor() {
    this.local_identity = new IdentityKeyPair();
    this.pending_prekey = null;
    this.remote_identity = new IdentityKey();
    this.session_states = {};
    this.session_tag = new SessionTag();
  }

  /**
   * @param local_identity Alice's Identity Key Pair
   * @param remote_pkbundle Bob's Pre-Key Bundle
   */
  static async init_from_prekey(local_identity: IdentityKeyPair, remote_pkbundle: PreKeyBundle): Promise<Session> {
    const alice_base = await KeyPair.new();

    const state = await SessionState.init_as_alice(local_identity, alice_base, remote_pkbundle);

    const session_tag = SessionTag.new();

    const session = ClassUtil.new_instance(this);
    session.session_tag = session_tag;
    session.local_identity = local_identity;
    session.remote_identity = remote_pkbundle.identity_key;
    session.pending_prekey = [remote_pkbundle.prekey_id, alice_base.public_key];
    session.session_states = {};

    session._insert_session_state(session_tag, state);
    return session;
  }

  static init_from_message(
    our_identity: IdentityKeyPair,
    prekey_store: PreKeyStore,
    envelope: Envelope,
  ): Promise<[Session, Uint8Array]> {
    return new Promise((resolve, reject) => {
      const pkmsg = (() => {
        if (envelope.message instanceof CipherMessage) {
          throw new DecryptError.InvalidMessage(
            "Can't initialise a session from a CipherMessage.",
            DecryptError.CODE.CASE_201,
          );
        } else if (envelope.message instanceof PreKeyMessage) {
          return envelope.message;
        } else {
          throw new DecryptError.InvalidMessage(
            'Unknown message format: The message is neither a "CipherMessage" nor a "PreKeyMessage".',
            DecryptError.CODE.CASE_202,
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
        .then(async state => {
          const plain = await state.decrypt(envelope, pkmsg.message);
          session._insert_session_state(pkmsg.message.session_tag, state);

          if (pkmsg.prekey_id < PreKey.MAX_PREKEY_ID) {
            MemoryUtil.zeroize(await prekey_store.load_prekey(pkmsg.prekey_id));
            return prekey_store
              .delete_prekey(pkmsg.prekey_id)
              .then(() => resolve([session, plain]))
              .catch(error => {
                reject(
                  new DecryptError.PrekeyNotFound(
                    `Could not delete PreKey: ${error.message}`,
                    DecryptError.CODE.CASE_203,
                  ),
                );
              });
          }
          return resolve([session, plain]);
        })
        .catch(reject);
    });
  }

  private _new_state(pre_key_store: PreKeyStore, pre_key_message: PreKeyMessage): Promise<SessionState> {
    return pre_key_store.load_prekey(pre_key_message.prekey_id).then(pre_key => {
      if (pre_key) {
        return SessionState.init_as_bob(
          this.local_identity,
          pre_key.key_pair,
          pre_key_message.identity_key,
          pre_key_message.base_key,
        );
      }
      throw new ProteusError(
        `Unable to find PreKey ID "${pre_key_message.prekey_id}" in PreKey store "${pre_key_store.constructor.name}".`,
        ProteusError.CODE.CASE_101,
      );
    });
  }

  private _insert_session_state(tag: SessionTag, state: SessionState): void {
    if (this.session_states.hasOwnProperty(tag.toString())) {
      this.session_states[tag.toString()].state = state;
    } else {
      if (this.counter >= Number.MAX_SAFE_INTEGER) {
        this.session_states = {};
        this.counter = 0;
      }

      this.session_states[tag.toString()] = {
        idx: this.counter,
        state: state,
        tag,
      };
      this.counter++;
    }

    if (this.session_tag.toString() !== tag.toString()) {
      this.session_tag = tag;
    }

    const obj_size = (obj: IntermediateSessionState) => Object.keys(obj).length;

    if (obj_size(this.session_states) < Session.MAX_SESSION_STATES) {
      return;
    }

    // if we get here, it means that we have more than MAX_SESSION_STATES and
    // we need to evict the oldest one.
    return this._evict_oldest_session_state();
  }

  private _evict_oldest_session_state(): void {
    const oldest = Object.keys(this.session_states)
      .filter(obj => obj.toString() !== this.session_tag.toString())
      .reduce((lowest, obj, index) => {
        return this.session_states[obj].idx < this.session_states[lowest].idx ? obj.toString() : lowest;
      });

    MemoryUtil.zeroize(this.session_states[oldest]);
    delete this.session_states[oldest];
  }

  get_local_identity(): IdentityKey {
    return this.local_identity.public_key;
  }

  /**
   * @param plaintext The plaintext which needs to be encrypted
   */
  encrypt(plaintext: string | Uint8Array): Promise<Envelope> {
    return new Promise((resolve, reject) => {
      const session_state = this.session_states[this.session_tag.toString()];

      if (!session_state) {
        return reject(
          new ProteusError(
            `Could not find session for tag '${(this.session_tag || '').toString()}'.`,
            ProteusError.CODE.CASE_102,
          ),
        );
      }

      return resolve(
        session_state.state.encrypt(this.local_identity.public_key, this.pending_prekey, this.session_tag, plaintext),
      );
    });
  }

  decrypt(prekey_store: PreKeyStore, envelope: Envelope): Promise<Uint8Array> {
    return new Promise(resolve => {
      const msg = envelope.message;
      if (msg instanceof CipherMessage) {
        return resolve(this._decrypt_cipher_message(envelope, msg));
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

  private _decrypt_prekey_message(
    envelope: Envelope,
    msg: PreKeyMessage,
    prekey_store: PreKeyStore,
  ): Promise<Uint8Array> {
    return Promise.resolve()
      .then(() => this._decrypt_cipher_message(envelope, msg.message))
      .catch(async error => {
        if (error instanceof DecryptError.InvalidSignature || error instanceof DecryptError.InvalidMessage) {
          return this._new_state(prekey_store, msg).then(async state => {
            const plaintext = await state.decrypt(envelope, msg.message);

            if (msg.prekey_id !== PreKey.MAX_PREKEY_ID) {
              // TODO: Zeroize should be tested (and awaited) here!
              MemoryUtil.zeroize(await prekey_store.load_prekey(msg.prekey_id));
              await prekey_store.delete_prekey(msg.prekey_id);
            }

            this._insert_session_state(msg.message.session_tag, state);
            this.pending_prekey = null;

            return plaintext;
          });
        }
        throw error;
      });
  }

  private async _decrypt_cipher_message(envelope: Envelope, msg: CipherMessage): Promise<Uint8Array> {
    const state = this.session_states[msg.session_tag.toString()];
    if (!state) {
      throw new DecryptError.InvalidMessage(
        `Local session not found for message session tag '${msg.session_tag}'.`,
        DecryptError.CODE.CASE_205,
      );
    }

    // serialise and de-serialise for a deep clone
    // THIS IS IMPORTANT, DO NOT MUTATE THE SESSION STATE IN-PLACE
    // mutating in-place can lead to undefined behavior and undefined state in edge cases
    const session_state = SessionState.deserialise(state.state.serialise());

    const plaintext = await session_state.decrypt(envelope, msg);

    this.pending_prekey = null;

    this._insert_session_state(msg.session_tag, session_state);
    return plaintext;
  }

  serialise(): ArrayBuffer {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  static deserialise(local_identity: IdentityKeyPair, buf: ArrayBuffer): Session {
    const decoder = new CBOR.Decoder(buf);
    return this.decode(local_identity, decoder);
  }

  encode(encoder: CBOR.Encoder): void {
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
      encoder.u16(<number>this.pending_prekey[0]);
      encoder.u8(1);
      (<PublicKey>this.pending_prekey[1]).encode(encoder);
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

  static decode(local_identity: IdentityKeyPair, decoder: CBOR.Decoder): Session {
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
            throw new DecodeError.LocalIdentityChanged(undefined, DecodeError.CODE.CASE_300);
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
              self.pending_prekey = [];
              for (let key = 0; key <= 1; ++key) {
                switch (decoder.u8()) {
                  case 0:
                    self.pending_prekey[0] = decoder.u16();
                    break;
                  case 1:
                    self.pending_prekey[1] = PublicKey.decode(decoder);
                    break;
                }
              }
              break;
            default:
              throw new DecodeError.InvalidType(undefined, DecodeError.CODE.CASE_301);
          }
          break;
        }
        case 5: {
          self.session_states = {};

          const nprops = decoder.object();

          for (let index = 0; index <= nprops - 1; index++) {
            const tag = SessionTag.decode(decoder);
            self.session_states[tag.toString()] = {
              idx: index,
              state: SessionState.decode(decoder),
              tag,
            };
          }
          break;
        }
        default: {
          decoder.skip();
        }
      }
    }

    return self;
  }
}
