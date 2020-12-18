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

import {KeyDerivationUtil, MemoryUtil} from '../util/';
import {CipherKey, MacKey} from './';

export class DerivedSecrets {
  readonly cipher_key: CipherKey;
  readonly mac_key: MacKey;

  constructor(cipherKey: CipherKey, macKey: MacKey) {
    this.cipher_key = cipherKey;
    this.mac_key = macKey;
  }

  static kdf(input: Uint8Array | ArrayBuffer[], salt: Uint8Array, info: string): DerivedSecrets {
    const byteLength = 64;

    const outputKeyMaterial = KeyDerivationUtil.hkdf(salt, input, info, byteLength);

    const cipherKey = new Uint8Array(outputKeyMaterial.buffer.slice(0, 32));
    const macKey = new Uint8Array(outputKeyMaterial.buffer.slice(32, 64));

    MemoryUtil.zeroize(outputKeyMaterial);

    return new DerivedSecrets(new CipherKey(cipherKey), new MacKey(macKey));
  }

  /**
   * @param input Initial key material (usually the Master Key) in byte array format
   * @param info Key Derivation Data
   */
  static kdf_without_salt(input: Uint8Array | ArrayBuffer[], info: string): DerivedSecrets {
    return this.kdf(input, new Uint8Array(0), info);
  }
}
