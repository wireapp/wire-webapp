/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import * as cryptoLib from 'crypto';

import {Crypto} from './interfaces';

export const crypto: Crypto = {
  async digest(cipherText: Uint8Array): Promise<Uint8Array> {
    return cryptoLib.createHash('SHA256').update(cipherText).digest();
  },

  async decrypt(cipherText: Uint8Array, keyBytes: Uint8Array): Promise<Uint8Array> {
    const initializationVector = cipherText.slice(0, 16);
    const assetCipherText = cipherText.slice(16);

    const decipher = cryptoLib.createDecipheriv('AES-256-CBC', keyBytes, initializationVector);
    const decipherUpdated = decipher.update(assetCipherText);
    const decipherFinal = decipher.final();

    return Buffer.concat([decipherUpdated, decipherFinal]);
  },

  getRandomValues(size: number): Uint8Array {
    return cryptoLib.randomBytes(size);
  },

  async encrypt(
    plainText: Uint8Array,
    keyBytes: Uint8Array,
    initializationVector: Uint8Array,
    algorithm: string,
  ): Promise<{key: Uint8Array; cipher: Uint8Array}> {
    const cipher = cryptoLib.createCipheriv(algorithm, keyBytes, initializationVector);
    const cipherUpdated = cipher.update(plainText);
    const cipherFinal = cipher.final();

    const cipherText = Buffer.concat([cipherUpdated, cipherFinal]);
    return {
      key: keyBytes,
      cipher: cipherText,
    };
  },
};
