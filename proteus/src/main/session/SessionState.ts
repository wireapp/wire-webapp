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

import {ArrayUtil, MemoryUtil} from '../util/';
import {DerivedSecrets} from '../derived/DerivedSecrets';
import {IdentityKey, IdentityKeyPair, KeyPair, PreKeyBundle, PublicKey} from '../keys/';
import {CipherMessage, Envelope, Message, PreKeyMessage, SessionTag} from '../message/';
import {ChainKey, RecvChain, RootKey, SendChain, Session} from './';
import {DecryptError, DecodeError} from '../errors';

export class SessionState {
  prev_counter: number;
  recv_chains: RecvChain[];
  root_key: RootKey;
  send_chain: SendChain;
  private static readonly propertiesLength = 4;

  constructor(rootKey: RootKey, sendChain: SendChain, receiveChains: RecvChain[] = [], prevCounter: number = -1) {
    this.prev_counter = prevCounter;
    this.recv_chains = receiveChains;
    this.root_key = rootKey;
    this.send_chain = sendChain;
  }

  static async init_as_alice(
    aliceIdentityPair: IdentityKeyPair,
    aliceBase: IdentityKeyPair | KeyPair,
    bobPreKeyBundle: PreKeyBundle,
  ): Promise<SessionState> {
    const masterKey = ArrayUtil.concatenate_array_buffers([
      aliceIdentityPair.secret_key.shared_secret(bobPreKeyBundle.public_key),
      aliceBase.secret_key.shared_secret(bobPreKeyBundle.identity_key.public_key),
      aliceBase.secret_key.shared_secret(bobPreKeyBundle.public_key),
    ]);

    const derivedSecrets = DerivedSecrets.kdf_without_salt(masterKey, 'handshake');
    MemoryUtil.zeroize(masterKey);

    const rootkey = RootKey.from_cipher_key(derivedSecrets.cipher_key);
    const chainkey = ChainKey.from_mac_key(derivedSecrets.mac_key, 0);

    const receiveChains = [new RecvChain(chainkey, bobPreKeyBundle.public_key)];

    const sendRatchet = await KeyPair.new();
    const [rootKey, chk] = rootkey.dh_ratchet(sendRatchet, bobPreKeyBundle.public_key);
    const sendChain = new SendChain(chk, sendRatchet);

    return new SessionState(rootKey, sendChain, receiveChains, 0);
  }

  static init_as_bob(
    bobIdent: IdentityKeyPair,
    bobPrekey: KeyPair,
    aliceIdent: IdentityKey,
    aliceBase: PublicKey,
  ): SessionState {
    const masterKey = ArrayUtil.concatenate_array_buffers([
      bobPrekey.secret_key.shared_secret(aliceIdent.public_key),
      bobIdent.secret_key.shared_secret(aliceBase),
      bobPrekey.secret_key.shared_secret(aliceBase),
    ]);

    const derivedSecrets = DerivedSecrets.kdf_without_salt(masterKey, 'handshake');
    MemoryUtil.zeroize(masterKey);

    const rootkey = RootKey.from_cipher_key(derivedSecrets.cipher_key);
    const chainkey = ChainKey.from_mac_key(derivedSecrets.mac_key, 0);
    const sendChain = new SendChain(chainkey, bobPrekey);

    return new SessionState(rootkey, sendChain, [], 0);
  }

  async ratchet(ratchetKey: PublicKey): Promise<void> {
    const newRatchet = await KeyPair.new();

    const [receiveRootKey, receiveChainKey] = this.root_key.dh_ratchet(this.send_chain.ratchet_key, ratchetKey);

    const [sendRootKey, sendChainKey] = receiveRootKey.dh_ratchet(newRatchet, ratchetKey);

    const receiveChain = new RecvChain(receiveChainKey, ratchetKey);
    const sendChain = new SendChain(sendChainKey, newRatchet);

    this.root_key = sendRootKey;
    this.prev_counter = this.send_chain.chain_key.idx;
    this.send_chain = sendChain;

    this.recv_chains.unshift(receiveChain);

    if (this.recv_chains.length > Session.MAX_RECV_CHAINS) {
      for (let index = Session.MAX_RECV_CHAINS; index < this.recv_chains.length; index++) {
        MemoryUtil.zeroize(this.recv_chains[index]);
      }

      this.recv_chains = this.recv_chains.slice(0, Session.MAX_RECV_CHAINS);
    }
  }

  /**
   * @param identityKey Public identity key of the local identity key pair
   * @param pending Pending pre-key
   * @param tag Session tag
   * @param plaintext The plaintext to encrypt
   */
  encrypt(
    identityKey: IdentityKey,
    pending: (number | PublicKey)[] | null,
    tag: SessionTag,
    plaintext: string | Uint8Array,
  ): Envelope {
    const msgkeys = this.send_chain.chain_key.message_keys();

    let message: Message | CipherMessage = new CipherMessage(
      tag,
      this.send_chain.chain_key.idx,
      this.prev_counter,
      this.send_chain.ratchet_key.public_key,
      msgkeys.encrypt(plaintext),
    );

    if (pending) {
      message = new PreKeyMessage(pending[0] as number, pending[1] as PublicKey, identityKey, message as CipherMessage);
    }

    const envelope = new Envelope(msgkeys.mac_key, message);
    this.send_chain.chain_key = this.send_chain.chain_key.next();
    return envelope;
  }

  async decrypt(envelope: Envelope, msg: CipherMessage): Promise<Uint8Array> {
    let idx = this.recv_chains.findIndex(chain => chain.ratchet_key.fingerprint() === msg.ratchet_key.fingerprint());

    if (idx === -1) {
      await this.ratchet(msg.ratchet_key);
      idx = 0;
    }

    const receiveChain = this.recv_chains[idx];

    if (msg.counter < receiveChain.chain_key.idx) {
      return receiveChain.try_message_keys(envelope, msg);
    } else if (msg.counter == receiveChain.chain_key.idx) {
      const mks = receiveChain.chain_key.message_keys();

      if (!envelope.verify(mks.mac_key)) {
        throw new DecryptError.InvalidSignature(
          `Envelope verification failed for message with counters in sync at '${msg.counter}'. The received message was possibly encrypted for another client.`,
          DecryptError.CODE.CASE_206,
        );
      }

      const plain = mks.decrypt(msg.cipher_text);
      receiveChain.chain_key = receiveChain.chain_key.next();
      return plain;
    }
    const [chainKey, messageKey, messageKeys] = receiveChain.stage_message_keys(msg);

    if (!envelope.verify(messageKey.mac_key)) {
      throw new DecryptError.InvalidSignature(
        `Envelope verification failed for message with counter ahead. Message index is '${msg.counter}' while receive chain index is '${receiveChain.chain_key.idx}'.`,
        DecryptError.CODE.CASE_207,
      );
    }

    const plain = messageKey.decrypt(msg.cipher_text);

    receiveChain.chain_key = chainKey.next();
    receiveChain.commit_message_keys(messageKeys);

    return plain;
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
    encoder.object(SessionState.propertiesLength);
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
    const propertiesLength = decoder.object();
    if (propertiesLength === SessionState.propertiesLength) {
      decoder.u8();

      const receiveChains = [];
      let len = decoder.array();
      while (len--) {
        receiveChains.push(RecvChain.decode(decoder));
      }

      decoder.u8();
      const sendChain = SendChain.decode(decoder);

      decoder.u8();
      const rootKey = RootKey.decode(decoder);

      decoder.u8();
      const prevCounter = decoder.u32();

      return new SessionState(rootKey, sendChain, receiveChains, prevCounter);
    }

    throw new DecodeError(`Unexpected number of properties: "${propertiesLength}"`);
  }
}
