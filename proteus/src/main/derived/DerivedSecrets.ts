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

import * as ClassUtil from '../util/ClassUtil';

import * as KeyDerivationUtil from '../util/KeyDerivationUtil';
import * as MemoryUtil from '../util/MemoryUtil';
import {CipherKey} from './CipherKey';
import {MacKey} from './MacKey';

export class DerivedSecrets {
  cipher_key: CipherKey;
  mac_key: MacKey;

  constructor() {
    this.cipher_key = new CipherKey();
    this.mac_key = new MacKey(new Uint8Array([]));
  }

  static kdf(input: Uint8Array | ArrayBuffer[], salt: Uint8Array, info: string): DerivedSecrets {
    const byte_length = 64;

    const output_key_material = KeyDerivationUtil.hkdf(salt, input, info, byte_length);

    const cipher_key = new Uint8Array(output_key_material.buffer.slice(0, 32));
    const mac_key = new Uint8Array(output_key_material.buffer.slice(32, 64));

    MemoryUtil.zeroize(output_key_material.buffer);

    const ds = ClassUtil.new_instance(DerivedSecrets);
    ds.cipher_key = CipherKey.new(cipher_key);
    ds.mac_key = new MacKey(mac_key);
    return ds;
  }

  /**
   * @param input Initial key material (usually the Master Key) in byte array format
   * @param info Key Derivation Data
   */
  static kdf_without_salt(input: Uint8Array | ArrayBuffer[], info: string): DerivedSecrets {
    return this.kdf(input, new Uint8Array(0), info);
  }
}
