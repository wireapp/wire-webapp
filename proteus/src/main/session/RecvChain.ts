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

import {PublicKey} from '../keys/PublicKey';
import {ChainKey, MessageKeys} from './';
import {DecodeError, DecryptError, ProteusError} from '../errors';
import type {CipherMessage, Envelope} from '../message/';

export class RecvChain {
  chain_key: ChainKey;
  readonly message_keys: MessageKeys[];
  readonly ratchet_key: PublicKey;
  static readonly MAX_COUNTER_GAP = 1000;
  private static readonly propertiesLength = 3;

  constructor(chainKey: ChainKey, publicKey: PublicKey, messageKeys: MessageKeys[] = []) {
    this.chain_key = chainKey;
    this.ratchet_key = publicKey;
    this.message_keys = messageKeys;
  }

  try_message_keys(envelope: Envelope, msg: CipherMessage): Uint8Array {
    if (this.message_keys[0]?.counter > msg.counter) {
      const message = `Message too old. Counter for oldest staged chain key is '${this.message_keys[0].counter}' while message counter is '${msg.counter}'.`;
      throw new DecryptError.OutdatedMessage(message, DecryptError.CODE.CASE_208);
    }

    const idx = this.message_keys.findIndex(mk => {
      return mk.counter === msg.counter;
    });

    if (idx === -1) {
      throw new DecryptError.DuplicateMessage(undefined, DecryptError.CODE.CASE_209);
    }
    const messageKey = this.message_keys.splice(idx, 1)[0];
    if (!envelope.verify(messageKey.mac_key)) {
      const message = `Envelope verification failed for message with counter behind. Message index is '${msg.counter}' while receive chain index is '${this.chain_key.idx}'.`;
      throw new DecryptError.InvalidSignature(message, DecryptError.CODE.CASE_210);
    }

    return messageKey.decrypt(msg.cipher_text);
  }

  stage_message_keys(msg: CipherMessage): [ChainKey, MessageKeys, MessageKeys[]] {
    const num = msg.counter - this.chain_key.idx;
    if (num > RecvChain.MAX_COUNTER_GAP) {
      if (this.chain_key.idx === 0) {
        throw new DecryptError.TooDistantFuture(
          'Skipped too many messages at the beginning of a receive chain.',
          DecryptError.CODE.CASE_211,
        );
      }
      throw new DecryptError.TooDistantFuture(
        `Skipped too many messages within a used receive chain. Receive chain counter is '${this.chain_key.idx}'`,
        DecryptError.CODE.CASE_212,
      );
    }

    const messageKeys: MessageKeys[] = [];
    let chainKey = this.chain_key;

    for (let index = 0; index <= num - 1; index++) {
      messageKeys.push(chainKey.message_keys());
      chainKey = chainKey.next();
    }

    const messageKey = chainKey.message_keys();
    return [chainKey, messageKey, messageKeys];
  }

  commit_message_keys(keys: MessageKeys[]): void {
    if (keys.length > RecvChain.MAX_COUNTER_GAP) {
      throw new ProteusError(
        `Number of message keys (${keys.length}) exceed message chain counter gap (${RecvChain.MAX_COUNTER_GAP}).`,
        ProteusError.CODE.CASE_103,
      );
    }

    const excess = this.message_keys.length + keys.length - RecvChain.MAX_COUNTER_GAP;

    for (let index = 0; index <= excess - 1; index++) {
      this.message_keys.shift();
    }

    keys.map(key => this.message_keys.push(key));

    if (keys.length > RecvChain.MAX_COUNTER_GAP) {
      throw new ProteusError(
        `Skipped message keys which exceed the message chain counter gap (${RecvChain.MAX_COUNTER_GAP}).`,
        ProteusError.CODE.CASE_104,
      );
    }
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder[] {
    encoder.object(RecvChain.propertiesLength);
    encoder.u8(0);
    this.chain_key.encode(encoder);
    encoder.u8(1);
    this.ratchet_key.encode(encoder);

    encoder.u8(2);
    encoder.array(this.message_keys.length);
    return this.message_keys.map(key => key.encode(encoder));
  }

  static decode(decoder: CBOR.Decoder): RecvChain {
    const propertiesLength = decoder.object();
    if (propertiesLength === RecvChain.propertiesLength) {
      decoder.u8();
      const chainKey = ChainKey.decode(decoder);

      decoder.u8();
      const ratchetKey = PublicKey.decode(decoder);

      decoder.u8();
      const messageKeys = [];

      let len = decoder.array();

      while (len--) {
        messageKeys.push(MessageKeys.decode(decoder));
      }

      return new RecvChain(chainKey, ratchetKey, messageKeys);
    }

    throw new DecodeError(`Unexpected number of properties: "${propertiesLength}"`);
  }
}
