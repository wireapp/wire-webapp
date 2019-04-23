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
import * as ClassUtil from '../util/ClassUtil';

import {DecryptError} from '../errors/DecryptError';
import {ProteusError} from '../errors/ProteusError';

import {CipherMessage} from '../message/CipherMessage';
import {Envelope} from '../message/Envelope';

import {ChainKey} from './ChainKey';
import {MessageKeys} from './MessageKeys';

class RecvChain {
  chain_key: ChainKey;
  message_keys: MessageKeys[];
  ratchet_key: PublicKey;
  static MAX_COUNTER_GAP = 1000;

  constructor() {
    this.chain_key = new ChainKey();
    this.message_keys = [];
    this.ratchet_key = new PublicKey();
  }

  static new(chain_key: ChainKey, public_key: PublicKey): RecvChain {
    const rc = ClassUtil.new_instance(RecvChain);
    rc.chain_key = chain_key;
    rc.ratchet_key = public_key;
    rc.message_keys = [];
    return rc;
  }

  try_message_keys(envelope: Envelope, msg: CipherMessage): Uint8Array {
    if (this.message_keys[0] && this.message_keys[0].counter > msg.counter) {
      const message = `Message too old. Counter for oldest staged chain key is '${
        this.message_keys[0].counter
      }' while message counter is '${msg.counter}'.`;
      throw new DecryptError.OutdatedMessage(message, DecryptError.CODE.CASE_208);
    }

    const idx = this.message_keys.findIndex(mk => {
      return mk.counter === msg.counter;
    });

    if (idx === -1) {
      throw new DecryptError.DuplicateMessage(undefined, DecryptError.CODE.CASE_209);
    }
    const mk = this.message_keys.splice(idx, 1)[0];
    if (!envelope.verify(mk.mac_key)) {
      const message = `Envelope verification failed for message with counter behind. Message index is '${
        msg.counter
      }' while receive chain index is '${this.chain_key.idx}'.`;
      throw new DecryptError.InvalidSignature(message, DecryptError.CODE.CASE_210);
    }

    return mk.decrypt(msg.cipher_text);
  }

  stage_message_keys(msg: CipherMessage): [ChainKey, MessageKeys, MessageKeys[]] {
    const num = msg.counter - this.chain_key.idx;
    if (num > RecvChain.MAX_COUNTER_GAP) {
      if (this.chain_key.idx === 0) {
        throw new DecryptError.TooDistantFuture(
          'Skipped too many messages at the beginning of a receive chain.',
          DecryptError.CODE.CASE_211
        );
      }
      throw new DecryptError.TooDistantFuture(
        `Skipped too many messages within a used receive chain. Receive chain counter is '${this.chain_key.idx}'`,
        DecryptError.CODE.CASE_212
      );
    }

    const keys: MessageKeys[] = [];
    let chk = this.chain_key;

    for (let index = 0; index <= num - 1; index++) {
      keys.push(chk.message_keys());
      chk = chk.next();
    }

    const mk = chk.message_keys();
    return [chk, mk, keys];
  }

  commit_message_keys(keys: MessageKeys[]): void {
    if (keys.length > RecvChain.MAX_COUNTER_GAP) {
      throw new ProteusError(
        `Number of message keys (${keys.length}) exceed message chain counter gap (${RecvChain.MAX_COUNTER_GAP}).`,
        ProteusError.CODE.CASE_103
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
        ProteusError.CODE.CASE_104
      );
    }
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder[] {
    encoder.object(3);
    encoder.u8(0);
    this.chain_key.encode(encoder);
    encoder.u8(1);
    this.ratchet_key.encode(encoder);

    encoder.u8(2);
    encoder.array(this.message_keys.length);
    return this.message_keys.map(key => key.encode(encoder));
  }

  static decode(decoder: CBOR.Decoder): RecvChain {
    const self = ClassUtil.new_instance(RecvChain);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0: {
          self.chain_key = ChainKey.decode(decoder);
          break;
        }
        case 1: {
          self.ratchet_key = PublicKey.decode(decoder);
          break;
        }
        case 2: {
          self.message_keys = [];

          let len = decoder.array();
          while (len--) {
            self.message_keys.push(MessageKeys.decode(decoder));
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

export {RecvChain};
