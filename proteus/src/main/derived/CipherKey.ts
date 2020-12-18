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

import {DecodeError} from '../errors';

export class CipherKey {
  readonly key: Uint8Array;
  private static readonly propertiesLength = 1;

  constructor(key: Uint8Array) {
    this.key = key;
  }

  /**
   * @param plaintext The text to encrypt
   * @param nonce Counter as nonce
   * @returns Encrypted payload
   */
  encrypt(plaintext: string | Uint8Array, nonce: Uint8Array): Uint8Array {
    // TODO: Re-validate if the ArrayBuffer check is needed (Prerequisite: Integration tests)
    if (plaintext instanceof ArrayBuffer && plaintext.byteLength !== undefined) {
      plaintext = new Uint8Array(plaintext);
    }

    return sodium.crypto_stream_chacha20_xor(plaintext, nonce, this.key, 'uint8array');
  }

  decrypt(ciphertext: Uint8Array, nonce: Uint8Array): Uint8Array {
    return this.encrypt(ciphertext, nonce);
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(CipherKey.propertiesLength);
    encoder.u8(0);
    return encoder.bytes(this.key);
  }

  static decode(decoder: CBOR.Decoder): CipherKey {
    const propertiesLength = decoder.object();
    if (propertiesLength === CipherKey.propertiesLength) {
      decoder.u8();
      const keyBytes = new Uint8Array(decoder.bytes());
      return new CipherKey(keyBytes);
    }
    throw new DecodeError(`Unexpected number of properties: "${propertiesLength}"`);
  }
}
