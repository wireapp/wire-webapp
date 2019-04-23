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

import * as ClassUtil from '../util/ClassUtil';

class CipherKey {
  key: Uint8Array;

  constructor() {
    this.key = new Uint8Array([]);
  }

  static new(key: Uint8Array): CipherKey {
    const ck = ClassUtil.new_instance(CipherKey);
    ck.key = key;
    return ck;
  }

  /**
   * @param plaintext The text to encrypt
   * @param nonce Counter as nonce
   * @returns Encrypted payload
   */
  encrypt(plaintext: string | Uint8Array, nonce: Uint8Array): Uint8Array {
    // @todo Re-validate if the ArrayBuffer check is needed (Prerequisite: Integration tests)
    if (plaintext instanceof ArrayBuffer && plaintext.byteLength !== undefined) {
      plaintext = new Uint8Array(plaintext);
    }

    return sodium.crypto_stream_chacha20_xor(plaintext, nonce, this.key, 'uint8array');
  }

  decrypt(ciphertext: Uint8Array, nonce: Uint8Array): Uint8Array {
    return this.encrypt(ciphertext, nonce);
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(1);
    encoder.u8(0);
    return encoder.bytes(this.key);
  }

  static decode(decoder: CBOR.Decoder): CipherKey {
    let key_bytes = new Uint8Array([]);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          key_bytes = new Uint8Array(decoder.bytes());
          break;
        default:
          decoder.skip();
      }
    }
    return CipherKey.new(key_bytes);
  }
}

export {CipherKey};
