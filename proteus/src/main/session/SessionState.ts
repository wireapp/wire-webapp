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

import * as ArrayUtil from '../util/ArrayUtil';
import * as ClassUtil from '../util/ClassUtil';
import * as MemoryUtil from '../util/MemoryUtil';

import {DecryptError} from '../errors/DecryptError';

import {DerivedSecrets} from '../derived/DerivedSecrets';

import {IdentityKey} from '../keys/IdentityKey';
import {IdentityKeyPair} from '../keys/IdentityKeyPair';
import {KeyPair} from '../keys/KeyPair';
import {PreKeyBundle} from '../keys/PreKeyBundle';
import {PublicKey} from '../keys/PublicKey';

import {CipherMessage} from '../message/CipherMessage';
import {Envelope} from '../message/Envelope';
import {Message} from '../message/Message';
import {PreKeyMessage} from '../message/PreKeyMessage';
import {SessionTag} from '../message/SessionTag';

import {ChainKey} from './ChainKey';
import {RecvChain} from './RecvChain';
import {RootKey} from './RootKey';
import {SendChain} from './SendChain';
import {Session} from './Session';

class SessionState {
  prev_counter: number;
  recv_chains: RecvChain[];
  root_key: RootKey;
  send_chain: SendChain;

  constructor() {
    this.prev_counter = -1;
    this.recv_chains = [];
    this.root_key = new RootKey();
    this.send_chain = new SendChain();
  }

  static async init_as_alice(
    alice_identity_pair: IdentityKeyPair,
    alice_base: IdentityKeyPair | KeyPair,
    bob_pkbundle: PreKeyBundle
  ): Promise<SessionState> {
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

    const send_ratchet = await KeyPair.new();
    const [rok, chk] = rootkey.dh_ratchet(send_ratchet, bob_pkbundle.public_key);
    const send_chain = SendChain.new(chk, send_ratchet);

    const state = ClassUtil.new_instance(SessionState);
    state.recv_chains = recv_chains;
    state.send_chain = send_chain;
    state.root_key = rok;
    state.prev_counter = 0;
    return state;
  }

  static init_as_bob(
    bob_ident: IdentityKeyPair,
    bob_prekey: KeyPair,
    alice_ident: IdentityKey,
    alice_base: PublicKey
  ): SessionState {
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

  async ratchet(ratchet_key: PublicKey): Promise<void> {
    const new_ratchet = await KeyPair.new();

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
   * @param identity_key Public identity key of the local identity key pair
   * @param pending Pending pre-key
   * @param tag Session tag
   * @param plaintext The plaintext to encrypt
   */
  encrypt(
    identity_key: IdentityKey,
    pending: (number | PublicKey)[] | null,
    tag: SessionTag,
    plaintext: string | Uint8Array
  ): Envelope {
    const msgkeys = this.send_chain.chain_key.message_keys();

    let message: Message = CipherMessage.new(
      tag,
      this.send_chain.chain_key.idx,
      this.prev_counter,
      this.send_chain.ratchet_key.public_key,
      msgkeys.encrypt(plaintext)
    );

    if (pending) {
      message = PreKeyMessage.new(<number>pending[0], <PublicKey>pending[1], identity_key, <CipherMessage>message);
    }

    const env = Envelope.new(msgkeys.mac_key, message);
    this.send_chain.chain_key = this.send_chain.chain_key.next();
    return env;
  }

  async decrypt(envelope: Envelope, msg: CipherMessage): Promise<Uint8Array> {
    let idx = this.recv_chains.findIndex(chain => chain.ratchet_key.fingerprint() === msg.ratchet_key.fingerprint());

    if (idx === -1) {
      await this.ratchet(msg.ratchet_key);
      idx = 0;
    }

    const rc = this.recv_chains[idx];

    if (msg.counter < rc.chain_key.idx) {
      return rc.try_message_keys(envelope, msg);
    } else if (msg.counter == rc.chain_key.idx) {
      const mks = rc.chain_key.message_keys();

      if (!envelope.verify(mks.mac_key)) {
        throw new DecryptError.InvalidSignature(
          `Envelope verification failed for message with counters in sync at '${
            msg.counter
          }'. The received message was possibly encrypted for another client.`,
          DecryptError.CODE.CASE_206
        );
      }

      const plain = mks.decrypt(msg.cipher_text);
      rc.chain_key = rc.chain_key.next();
      return plain;
    } else {
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

  serialise(): ArrayBuffer {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  static deserialise(buf: ArrayBuffer): SessionState {
    return SessionState.decode(new CBOR.Decoder(buf));
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
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

  static decode(decoder: CBOR.Decoder): SessionState {
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

    return self;
  }
}

export {SessionState};
