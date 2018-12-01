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

window.z = window.z || {};
window.z.assets = z.assets || {};

z.assets.AssetCrypto = (() => {
  /**
   * @param {ArrayBuffer} cipherText - Encrypted plaintext
   * @param {ArrayBuffer} keyBytes - AES key used for encryption
   * @param {ArrayBuffer} referenceSha256 - SHA-256 checksum of the cipherText
   * @returns {Promise} Resolves with the decrypted asset
   */
  const _decryptAesAsset = (cipherText, keyBytes, referenceSha256) => {
    return window.crypto.subtle
      .digest('SHA-256', cipherText)
      .then(computedSha256 => {
        if (_equalHashes(referenceSha256, computedSha256)) {
          return window.crypto.subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['decrypt']);
        }

        throw new Error('Encrypted asset does not match its SHA-256 hash');
      })
      .then(key => {
        const iv = cipherText.slice(0, 16);
        const assetCipherText = cipherText.slice(16);
        return window.crypto.subtle.decrypt({iv: iv, name: 'AES-CBC'}, key, assetCipherText);
      });
  };

  /**
   * @param {ArrayBuffer} plaintext - Plaintext asset to be encrypted
   * @returns {Promise} Resolves with the encrypted asset
   */
  const _encryptAesAsset = plaintext => {
    const iv = _generateRandomBytes(16);
    const rawKeyBytes = _generateRandomBytes(32);
    let key = null;
    let ivCipherText = null;
    let computedSha256 = null;

    return window.crypto.subtle
      .importKey('raw', rawKeyBytes.buffer, 'AES-CBC', true, ['encrypt'])
      .then(ckey => {
        key = ckey;

        return window.crypto.subtle.encrypt({iv: iv.buffer, name: 'AES-CBC'}, key, plaintext);
      })
      .then(cipherText => {
        ivCipherText = new Uint8Array(cipherText.byteLength + iv.byteLength);
        ivCipherText.set(iv, 0);
        ivCipherText.set(new Uint8Array(cipherText), iv.byteLength);

        return window.crypto.subtle.digest('SHA-256', ivCipherText);
      })
      .then(digest => {
        computedSha256 = digest;

        return window.crypto.subtle.exportKey('raw', key);
      })
      .then(keyBytes => ({cipherText: ivCipherText.buffer, keyBytes: keyBytes, sha256: computedSha256}));
  };

  const _equalHashes = (bufferA, bufferB) => {
    const arrayA = new Uint32Array(bufferA);
    const arrayB = new Uint32Array(bufferB);
    return arrayA.length === arrayB.length && arrayA.every((value, index) => value === arrayB[index]);
  };

  const _generateRandomBytes = length => {
    const getRandomValue = () => {
      const buffer = new Uint32Array(1);
      window.crypto.getRandomValues(buffer);
      return buffer[0] >>> 0;
    };

    const randomValues = new Uint32Array(length / 4).map(getRandomValue);
    const randomBytes = new Uint8Array(randomValues.buffer);
    if (randomBytes.length && !randomBytes.every(byte => byte === 0)) {
      return randomBytes;
    }
    throw Error('Failed to initialize iv with random values');
  };

  return {
    decryptAesAsset: _decryptAesAsset,
    encryptAesAsset: _encryptAesAsset,
  };
})();
