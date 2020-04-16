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

import {IdentityKey} from './IdentityKey';
import {KeyPair} from './KeyPair';
import {SecretKey} from './SecretKey';
import {DecodeError} from '../errors';

export class IdentityKeyPair {
  readonly public_key: IdentityKey;
  readonly secret_key: SecretKey;
  readonly version: number;
  private static readonly propertiesLength = 3;

  constructor(public_key: IdentityKey, secret_key: SecretKey, version: number = -1) {
    this.public_key = public_key;
    this.secret_key = secret_key;
    this.version = version;
  }

  static async new(): Promise<IdentityKeyPair> {
    const keyPair = await KeyPair.new();
    return new IdentityKeyPair(new IdentityKey(keyPair.public_key), keyPair.secret_key, 1);
  }

  serialise(): ArrayBuffer {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  static deserialise(buf: ArrayBuffer): IdentityKeyPair {
    const decoder = new CBOR.Decoder(buf);
    return IdentityKeyPair.decode(decoder);
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(IdentityKeyPair.propertiesLength);
    encoder.u8(0);
    encoder.u8(this.version);
    encoder.u8(1);
    this.secret_key.encode(encoder);
    encoder.u8(2);
    return this.public_key.encode(encoder);
  }

  static decode(decoder: CBOR.Decoder): IdentityKeyPair {
    const propertiesLength = decoder.object();
    if (propertiesLength === IdentityKeyPair.propertiesLength) {
      decoder.u8();
      const version = decoder.u8();

      decoder.u8();
      const secretKey = SecretKey.decode(decoder);

      decoder.u8();
      const publicKey = IdentityKey.decode(decoder);

      return new IdentityKeyPair(publicKey, secretKey, version);
    }

    throw new DecodeError(`Unexpected number of properties: "${propertiesLength}"`);
  }
}
