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
import {SessionTag} from './SessionTag';
import {Message} from './Message';
import {DecodeError, InputError} from '../errors';

export class CipherMessage extends Message {
  readonly cipher_text: Uint8Array;
  readonly counter: number;
  readonly prev_counter: number;
  readonly ratchet_key: PublicKey;
  readonly session_tag: SessionTag;
  private static readonly propertiesLength = 5;

  constructor(
    sessionTag: SessionTag,
    counter: number,
    prevCounter: number,
    ratchetKey: PublicKey,
    cipherText: Uint8Array,
  ) {
    super();
    this.session_tag = sessionTag;
    this.counter = counter;
    this.prev_counter = prevCounter;
    this.ratchet_key = ratchetKey;
    this.cipher_text = cipherText;
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(CipherMessage.propertiesLength);
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
    const propertiesLength = decoder.object();
    if (propertiesLength === CipherMessage.propertiesLength) {
      decoder.u8();
      const sessionTag = SessionTag.decode(decoder);

      decoder.u8();
      const counter = Number(decoder.u32());

      decoder.u8();
      const prevCounter = Number(decoder.u32());

      decoder.u8();
      const ratchetKey = PublicKey.decode(decoder);

      decoder.u8();
      const cipherText = new Uint8Array(decoder.bytes());

      if (sessionTag && !isNaN(counter) && !isNaN(prevCounter) && ratchetKey && cipherText) {
        return new CipherMessage(sessionTag, counter, prevCounter, ratchetKey, cipherText);
      }

      throw new InputError.TypeError(`Given CipherMessage doesn't match expected signature.`, InputError.CODE.CASE_405);
    }

    throw new DecodeError(`Unexpected number of properties: "${propertiesLength}"`);
  }
}
