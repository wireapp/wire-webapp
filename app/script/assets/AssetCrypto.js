/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

z.assets.AssetCrypto = {

  /*
  @return {ArrayBuffer} key_bytes - AES key used for encryption
  @return {ArrayBuffer} computed_sha256 - SHA-256 checksum of the ciphertext
  @return {ArrayBuffer} ciphertext - Encrypted plaintext
  */
  encrypt_aes_asset(plaintext) {
    const iv = new Uint8Array(16);
    let key = null;
    let iv_ciphertext = null;
    let computed_sha256 = null;

    window.crypto.getRandomValues(iv);

    return window.crypto.subtle.generateKey({name: 'AES-CBC', length: 256}, true, ['encrypt'])
    .then(function(ckey) {
      key = ckey;

      return window.crypto.subtle.encrypt({name: 'AES-CBC', iv: iv.buffer}, key, plaintext);
    }).then(function(ciphertext) {
      iv_ciphertext = new Uint8Array(ciphertext.byteLength + iv.byteLength);
      iv_ciphertext.set(iv, 0);
      iv_ciphertext.set(new Uint8Array(ciphertext), iv.byteLength);

      return window.crypto.subtle.digest('SHA-256', iv_ciphertext);
    }).then(function(digest) {
      computed_sha256 = digest;

      return window.crypto.subtle.exportKey('raw', key);
    }).then(key_bytes => [key_bytes, computed_sha256, iv_ciphertext.buffer]);
  },

  /*
  @param {ArrayBuffer} key_bytes - AES key used for encryption
  @param {ArrayBuffer} computed_sha256 - SHA-256 checksum of the ciphertext
  @param {ArrayBuffer} ciphertext - Encrypted plaintext
  */
  decrypt_aes_asset(ciphertext, key_bytes, reference_sha256) {
    return window.crypto.subtle.digest('SHA-256', ciphertext)
    .then(function(computed_sha256) {
      const a = new Uint32Array(reference_sha256);
      const b = new Uint32Array(computed_sha256);

      if ((a.length === b.length) && a.every((x, i) => x === b[i])) {
        return window.crypto.subtle.importKey('raw', key_bytes, 'AES-CBC', false, ['decrypt']);
      }

      throw new Error('Encrypted asset does not match its SHA-256 hash');
    }).then(function(key) {
      const iv = ciphertext.slice(0, 16);
      const img_ciphertext = ciphertext.slice(16);
      return window.crypto.subtle.decrypt({name: 'AES-CBC', iv}, key, img_ciphertext);
    });
  },

};
