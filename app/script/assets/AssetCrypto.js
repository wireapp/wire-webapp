/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.assets = z.assets || {};

z.assets.AssetCrypto = (() => {
  /**
   * @param {ArrayBuffer} ciphertext - Encrypted plaintext
   * @param {ArrayBuffer} key_bytes - AES key used for encryption
   * @param {ArrayBuffer} reference_sha256 - SHA-256 checksum of the ciphertext
   * @returns {Promise} Resolves with the decrypted asset
   */
  function decrypt_aes_asset(ciphertext, key_bytes, reference_sha256) {
    return window.crypto.subtle
      .digest('SHA-256', ciphertext)
      .then(function(computed_sha256) {
        if (_equal_hashes(reference_sha256, computed_sha256)) {
          return window.crypto.subtle.importKey('raw', key_bytes, 'AES-CBC', false, ['decrypt']);
        }

        throw new Error('Encrypted asset does not match its SHA-256 hash');
      })
      .then(function(key) {
        const iv = ciphertext.slice(0, 16);
        const img_ciphertext = ciphertext.slice(16);
        return window.crypto.subtle.decrypt({iv: iv, name: 'AES-CBC'}, key, img_ciphertext);
      });
  }

  /**
   * @param {ArrayBuffer} plaintext - Plaintext asset to be encrypted
   * @returns {Promise} Resolves with the encrypted asset
   */
  function encrypt_aes_asset(plaintext) {
    const iv = _generate_random_bytes(16);
    const key_bytes_raw = _generate_random_bytes(32);
    let key = null;
    let iv_ciphertext = null;
    let computed_sha256 = null;

    return window.crypto.subtle
      .importKey('raw', key_bytes_raw.buffer, 'AES-CBC', true, ['encrypt'])
      .then(function(ckey) {
        key = ckey;

        return window.crypto.subtle.encrypt({iv: iv.buffer, name: 'AES-CBC'}, key, plaintext);
      })
      .then(function(ciphertext) {
        iv_ciphertext = new Uint8Array(ciphertext.byteLength + iv.byteLength);
        iv_ciphertext.set(iv, 0);
        iv_ciphertext.set(new Uint8Array(ciphertext), iv.byteLength);

        return window.crypto.subtle.digest('SHA-256', iv_ciphertext);
      })
      .then(function(digest) {
        computed_sha256 = digest;

        return window.crypto.subtle.exportKey('raw', key);
      })
      .then(key_bytes => ({
        cipher_text: iv_ciphertext.buffer,
        key_bytes: key_bytes,
        sha256: computed_sha256,
      }));
  }

  function _equal_hashes(buffer_a, buffer_b) {
    const arr_a = new Uint32Array(buffer_a);
    const arr_b = new Uint32Array(buffer_b);
    return arr_a.length === arr_b.length && arr_a.every((value, index) => value === arr_b[index]);
  }

  function _generate_random_bytes(length) {
    const randomValues = new Uint32Array(length / 4).map(() => libsodium.getRandomValue());
    const ramdonBytes = new Uint8Array(randomValues.buffer);
    if (ramdonBytes.length > 0 && !ramdonBytes.every(byte => byte === 0)) {
      return ramdonBytes;
    }
    throw Error('Failed to initialize iv with random values');
  }

  return {
    decrypt_aes_asset,
    encrypt_aes_asset,
  };
})();
