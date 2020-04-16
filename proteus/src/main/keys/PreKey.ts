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

import {KeyPair} from './KeyPair';
import {DecodeError} from '../errors';

/**
 * Pre-generated (and regularly refreshed) pre-keys.
 * A Pre-Shared Key contains the public long-term identity and ephemeral handshake keys for the initial triple DH.
 */
export class PreKey {
  static readonly MAX_PREKEY_ID = 0xffff;
  readonly key_id: number;
  readonly key_pair: KeyPair;
  readonly version: number;
  private static readonly propertiesLength = 3;

  constructor(keyPair: KeyPair, keyId: number = -1, version: number = -1) {
    this.key_id = keyId;
    this.key_pair = keyPair;
    this.version = version;
  }

  static async new(preKeyId: number): Promise<PreKey> {
    this.validate_pre_key_id(preKeyId);

    const keyPair = await KeyPair.new();
    return new PreKey(keyPair, preKeyId, 1);
  }

  static validate_pre_key_id(preKeyId: number): void {
    if (preKeyId === undefined) {
      throw new InputError.TypeError('PreKey ID is undefined.', InputError.CODE.CASE_404);
    }

    if (typeof preKeyId === 'string') {
      throw new InputError.TypeError(`PreKey ID "${preKeyId}" is a string.`, InputError.CODE.CASE_403);
    }

    if (preKeyId % 1 !== 0) {
      throw new InputError.TypeError(`PreKey ID "${preKeyId}" is a floating-point number.`, InputError.CODE.CASE_403);
    }

    if (preKeyId < 0 || preKeyId > PreKey.MAX_PREKEY_ID) {
      const message = `PreKey ID (${preKeyId}) must be between or equal to 0 and ${PreKey.MAX_PREKEY_ID}.`;
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
      Array.from({length: size}).map((_, index) => PreKey.new((start + index) % PreKey.MAX_PREKEY_ID)),
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
    encoder.object(PreKey.propertiesLength);
    encoder.u8(0);
    encoder.u8(this.version);
    encoder.u8(1);
    encoder.u16(this.key_id);
    encoder.u8(2);
    return this.key_pair.encode(encoder);
  }

  static decode(decoder: CBOR.Decoder): PreKey {
    const propertiesLength = decoder.object();
    if (propertiesLength === PreKey.propertiesLength) {
      decoder.u8();
      const version = decoder.u8();

      decoder.u8();
      const keyId = decoder.u16();

      decoder.u8();
      const keyPair = KeyPair.decode(decoder);

      return new PreKey(keyPair, keyId, version);
    }

    throw new DecodeError(`Unexpected number of properties: "${propertiesLength}"`);
  }
}
