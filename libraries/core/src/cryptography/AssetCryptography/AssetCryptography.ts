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

import {CipherOptions} from '@wireapp/api-client/lib/asset';

import {crypto} from './crypto.node';
import {EncryptedAsset} from './EncryptedAsset';

const isEqual = (a: Uint8Array, b: Uint8Array): boolean => {
  const arrayA = new Uint32Array(a);
  const arrayB = new Uint32Array(b);

  const hasSameLength = arrayA.length === arrayB.length;
  const hasSameValues = arrayA.every((value, index) => value === arrayB[index]);

  return hasSameLength && hasSameValues;
};

interface EncryptOptions extends CipherOptions {
  plainText: Uint8Array;
}

export const decryptAsset = async ({
  cipherText,
  keyBytes,
  sha256: referenceSha256,
}: EncryptedAsset): Promise<Uint8Array> => {
  const computedSha256 = await crypto.digest(cipherText);

  if (!isEqual(computedSha256, referenceSha256)) {
    throw new Error('Encrypted asset does not match its SHA-256 hash');
  }

  return crypto.decrypt(cipherText, keyBytes);
};

export const encryptAsset = async ({plainText, algorithm = 'AES-256-CBC'}: EncryptOptions): Promise<EncryptedAsset> => {
  const initializationVector = crypto.getRandomValues(16);
  const rawKeyBytes = crypto.getRandomValues(32);

  const {key, cipher} = await crypto.encrypt(plainText, rawKeyBytes, initializationVector, algorithm);

  const ivCipherText = new Uint8Array(cipher.byteLength + initializationVector.byteLength);
  ivCipherText.set(initializationVector, 0);
  ivCipherText.set(new Uint8Array(cipher), initializationVector.byteLength);

  const sha256 = await crypto.digest(ivCipherText);

  return {
    cipherText: ivCipherText,
    keyBytes: key,
    sha256,
  };
};
