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
import * as sodium from 'libsodium-wrappers-sumo';

import {DecodeError} from '../errors/DecodeError';
import * as ClassUtil from '../util/ClassUtil';
import * as RandomUtil from '../util/RandomUtil';

export class SessionTag {
  tag: Uint8Array;

  constructor() {
    this.tag = new Uint8Array([]);
  }

  static new(): SessionTag {
    const length = 16;

    const st = ClassUtil.new_instance(SessionTag);
    st.tag = RandomUtil.random_bytes(length);
    return st;
  }

  toString(): string {
    return sodium.to_hex(this.tag);
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    return encoder.bytes(this.tag);
  }

  static decode(decoder: CBOR.Decoder): SessionTag {
    const length = 16;

    const bytes = new Uint8Array(decoder.bytes());
    if (bytes.byteLength !== length) {
      throw new DecodeError.InvalidArrayLen(
        `Session tag should be 16 bytes, not ${bytes.byteLength} bytes.`,
        DecodeError.CODE.CASE_303,
      );
    }

    const st = ClassUtil.new_instance(SessionTag);
    st.tag = new Uint8Array(bytes);
    return st;
  }
}
