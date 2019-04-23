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

import {InputError} from '../errors/InputError';
import {PublicKey} from '../keys/PublicKey';
import * as ClassUtil from '../util/ClassUtil';
import {Message} from './Message';
import {SessionTag} from './SessionTag';

class CipherMessage extends Message {
  cipher_text: Uint8Array;
  counter: number;
  prev_counter: number;
  ratchet_key: PublicKey;
  session_tag: SessionTag;

  constructor() {
    super();
    this.cipher_text = new Uint8Array([]);
    this.counter = -1;
    this.prev_counter = -1;
    this.ratchet_key = new PublicKey();
    this.session_tag = new SessionTag();
  }

  static new(
    session_tag: SessionTag,
    counter: number,
    prev_counter: number,
    ratchet_key: PublicKey,
    cipher_text: Uint8Array
  ): CipherMessage {
    const cm = ClassUtil.new_instance(CipherMessage);

    cm.session_tag = session_tag;
    cm.counter = counter;
    cm.prev_counter = prev_counter;
    cm.ratchet_key = ratchet_key;
    cm.cipher_text = cipher_text;

    Object.freeze(cm);
    return cm;
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(5);
    encoder.u8(0);
    this.session_tag.encode(encoder);
    encoder.u8(1);
    encoder.u32(this.counter);
    encoder.u8(2);
    encoder.u32(this.prev_counter);
    encoder.u8(3);
    this.ratchet_key.encode(encoder);
    encoder.u8(4);
    return encoder.bytes(this.cipher_text);
  }

  static decode(decoder: CBOR.Decoder): CipherMessage {
    let session_tag = null;
    let counter = null;
    let prev_counter = null;
    let ratchet_key = null;
    let cipher_text = null;

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          session_tag = SessionTag.decode(decoder);
          break;
        case 1:
          counter = decoder.u32();
          break;
        case 2:
          prev_counter = decoder.u32();
          break;
        case 3:
          ratchet_key = PublicKey.decode(decoder);
          break;
        case 4:
          cipher_text = new Uint8Array(decoder.bytes());
          break;
        default:
          decoder.skip();
      }
    }

    counter = Number(counter);
    prev_counter = Number(prev_counter);

    if (session_tag && !isNaN(counter) && !isNaN(prev_counter) && ratchet_key && cipher_text) {
      return CipherMessage.new(session_tag, counter, prev_counter, ratchet_key, cipher_text);
    } else {
      throw new InputError.TypeError(`Given CipherMessage doesn't match expected signature.`, InputError.CODE.CASE_405);
    }
  }
}

export {CipherMessage};
