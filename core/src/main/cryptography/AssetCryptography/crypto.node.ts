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

import {Crypto} from './interfaces';
import * as cryptoLib from 'crypto';

export const crypto: Crypto = {
  async digest(cipherText: Buffer | Uint8Array): Promise<Buffer> {
    return cryptoLib.createHash('SHA256').update(cipherText).digest();
  },

  async decrypt(cipherText: Buffer | Uint8Array, keyBytes: Buffer): Promise<Buffer> {
    const initializationVector = cipherText.slice(0, 16);
    const assetCipherText = cipherText.slice(16);

    const decipher = cryptoLib.createDecipheriv('AES-256-CBC', keyBytes, initializationVector);
    const decipherUpdated = decipher.update(assetCipherText);
    const decipherFinal = decipher.final();

    return Buffer.concat([decipherUpdated, decipherFinal]);
  },

  getRandomValues(size: number): Buffer {
    return cryptoLib.randomBytes(size);
  },

  async encrypt(
    plainText: Buffer | Uint8Array,
    keyBytes: Buffer,
    initializationVector: Buffer,
    algorithm: string,
  ): Promise<{key: Buffer; cipher: Buffer}> {
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
