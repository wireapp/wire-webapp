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

import {EncryptedAsset} from '../cryptography/';
const {crypto} = window;

const isEqual = (a: Buffer, b: Buffer): boolean => {
  const arrayA = new Uint32Array(a);
  const arrayB = new Uint32Array(b);

  const hasSameLength = arrayA.length === arrayB.length;
  const hasSameValues = arrayA.every((value, index) => value === arrayB[index]);

  return hasSameLength && hasSameValues;
};

export const decryptAsset = async ({
  cipherText,
  keyBytes,
  sha256: referenceSha256,
}: EncryptedAsset): Promise<Buffer> => {
  const computedSha256 = await crypto.subtle.digest('SHA-256', cipherText);

  if (!isEqual(Buffer.from(computedSha256), referenceSha256)) {
    throw new Error('Encrypted asset does not match its SHA-256 hash');
  }

  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['decrypt']);

  const initializationVector = cipherText.slice(0, 16);
  const assetCipherText = cipherText.slice(16);
  const decipher = await crypto.subtle.decrypt({iv: initializationVector, name: 'AES-CBC'}, key, assetCipherText);

  return Buffer.from(decipher);
};

export const encryptAsset = async (plaintext: ArrayBuffer): Promise<EncryptedAsset> => {
  const initializationVector = crypto.getRandomValues(new Uint8Array(16));
  const rawKeyBytes = crypto.getRandomValues(new Uint8Array(32));

  const key = await crypto.subtle.importKey('raw', rawKeyBytes.buffer, 'AES-CBC', true, ['encrypt']);
  const cipherText = await crypto.subtle.encrypt({iv: initializationVector.buffer, name: 'AES-CBC'}, key, plaintext);

  const ivCipherText = new Uint8Array(cipherText.byteLength + initializationVector.byteLength);
  ivCipherText.set(initializationVector, 0);
  ivCipherText.set(new Uint8Array(cipherText), initializationVector.byteLength);

  const computedSha256 = await crypto.subtle.digest('SHA-256', ivCipherText);
  const keyBytes = await crypto.subtle.exportKey('raw', key);

  return {
    cipherText: Buffer.from(ivCipherText.buffer),
    keyBytes: Buffer.from(keyBytes),
    sha256: Buffer.from(computedSha256),
  };
};
