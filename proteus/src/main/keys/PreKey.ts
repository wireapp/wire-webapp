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

import {InputError} from '../errors/InputError';

import {KeyPair} from './KeyPair';

/**
 * Pre-generated (and regularly refreshed) pre-keys.
 * A Pre-Shared Key contains the public long-term identity and ephemeral handshake keys for the initial triple DH.
 */
export class PreKey {
  static MAX_PREKEY_ID = 0xffff;
  key_id: number;
  key_pair: KeyPair;
  version: number;

  constructor() {
    this.key_id = -1;
    this.key_pair = new KeyPair();
    this.version = -1;
  }

  static async new(pre_key_id: number): Promise<PreKey> {
    this.validate_pre_key_id(pre_key_id);

    const pk = ClassUtil.new_instance(PreKey);

    pk.version = 1;
    pk.key_id = pre_key_id;
    pk.key_pair = await KeyPair.new();
    return pk;
  }

  static validate_pre_key_id(pre_key_id: number): void {
    if (pre_key_id === undefined) {
      throw new InputError.TypeError('PreKey ID is undefined.', InputError.CODE.CASE_404);
    } else if (typeof pre_key_id === 'string') {
      throw new InputError.TypeError(`PreKey ID "${pre_key_id}" is a string.`, InputError.CODE.CASE_403);
    } else if (pre_key_id % 1 !== 0) {
      throw new InputError.TypeError(`PreKey ID "${pre_key_id}" is a floating-point number.`, InputError.CODE.CASE_403);
    } else if (pre_key_id < 0 || pre_key_id > PreKey.MAX_PREKEY_ID) {
      const message = `PreKey ID (${pre_key_id}) must be between or equal to 0 and ${PreKey.MAX_PREKEY_ID}.`;
      throw new InputError.RangeError(message, InputError.CODE.CASE_400);
    }
  }

  static last_resort(): Promise<PreKey> {
    return PreKey.new(PreKey.MAX_PREKEY_ID);
  }

  static async generate_prekeys(start: number, size: number): Promise<PreKey[]> {
    this.validate_pre_key_id(start);
    this.validate_pre_key_id(size);

    if (size === 0) {
      return [];
    }

    return Promise.all(
      new Array(size).fill(null).map(async (_, index) => {
        const pk = await PreKey.new((start + index) % PreKey.MAX_PREKEY_ID);
        return pk;
      })
    );
  }

  serialise(): ArrayBuffer {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  static deserialise(buf: ArrayBuffer): PreKey {
    return PreKey.decode(new CBOR.Decoder(buf));
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(3);
    encoder.u8(0);
    encoder.u8(this.version);
    encoder.u8(1);
    encoder.u16(this.key_id);
    encoder.u8(2);
    return this.key_pair.encode(encoder);
  }

  static decode(decoder: CBOR.Decoder): PreKey {
    const self = ClassUtil.new_instance(PreKey);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.version = decoder.u8();
          break;
        case 1:
          self.key_id = decoder.u16();
          break;
        case 2:
          self.key_pair = KeyPair.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }

    return self;
  }
}
