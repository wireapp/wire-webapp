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

import {crypto as browserCrypto} from './crypto.browser';
import {EncryptedAsset} from './encryptedAsset';
import type {Crypto} from './interfaces';

import {CipherOptions} from '../../../apiClient/asset/assetApi';

const initializationVectorLengthInBytes = 16;
const encryptionKeyLengthInBytes = 32;

function isEqual(firstBytes: Uint8Array, secondBytes: Uint8Array): boolean {
  const firstByteValues = new Uint32Array(firstBytes);
  const secondByteValues = new Uint32Array(secondBytes);

  const hasSameLength = firstByteValues.length === secondByteValues.length;
  const hasSameValues = firstByteValues.every((value, index) => {
    return value === secondByteValues[index];
  });

  return hasSameLength && hasSameValues;
}

interface EncryptOptions extends CipherOptions {
  plainText: Uint8Array;
}

export async function decryptAsset(asset: EncryptedAsset, crypto: Crypto = browserCrypto): Promise<Uint8Array> {
  const {cipherText, keyBytes, sha256: referenceSha256} = asset;
  const computedSha256 = await crypto.digest(cipherText);

  if (!isEqual(computedSha256, referenceSha256)) {
    throw new Error('Encrypted asset does not match its SHA-256 hash');
  }

  return crypto.decrypt(cipherText, keyBytes);
}

export async function encryptAsset(options: EncryptOptions, crypto: Crypto = browserCrypto): Promise<EncryptedAsset> {
  const {plainText, algorithm = 'AES-256-CBC'} = options;
  const initializationVector = crypto.getRandomValues(initializationVectorLengthInBytes);
  const rawKeyBytes = crypto.getRandomValues(encryptionKeyLengthInBytes);

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
}
