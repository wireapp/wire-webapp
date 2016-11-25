#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.assets ?= {}

z.assets.AssetCrypto =
  ###
  @param plaintext [ArrayBuffer]

  @return key_bytes [ArrayBuffer] AES key used for encryption
  @return computed_sha256 [ArrayBuffer] SHA-256 checksum of the ciphertext
  @return ciphertext [ArrayBuffer] Encrypted plaintext
  ###
  encrypt_aes_asset: (plaintext) ->
    key = null
    iv_ciphertext = null
    computed_sha256 = null
    iv = new Uint8Array 16

    window.crypto.getRandomValues iv

    return window.crypto.subtle.generateKey {name: 'AES-CBC', length: 256}, true, ['encrypt']
    .then (ckey) ->
      key = ckey

      return window.crypto.subtle.encrypt {name: 'AES-CBC', iv: iv.buffer}, key, plaintext
    .then (ciphertext) ->
      iv_ciphertext = new Uint8Array(ciphertext.byteLength + iv.byteLength)
      iv_ciphertext.set iv, 0
      iv_ciphertext.set new Uint8Array(ciphertext), iv.byteLength

      return window.crypto.subtle.digest 'SHA-256', iv_ciphertext
    .then (digest) ->
      computed_sha256 = digest

      return window.crypto.subtle.exportKey 'raw', key
    .then (key_bytes) ->
      return [key_bytes, computed_sha256, iv_ciphertext.buffer]

  ###
  @param key_bytes [ArrayBuffer] AES key used for encryption
  @param computed_sha256 [ArrayBuffer] SHA-256 checksum of the ciphertext
  @param ciphertext [ArrayBuffer] Encrypted plaintext

  @param [ArrayBuffer]
  ###
  decrypt_aes_asset: (ciphertext, key_bytes, reference_sha256) ->
    return window.crypto.subtle.digest 'SHA-256', ciphertext
    .then (computed_sha256) ->
      a = new Uint32Array reference_sha256
      b = new Uint32Array computed_sha256

      if a.length is b.length and a.every((x, i) -> x is b[i])
        return window.crypto.subtle.importKey 'raw', key_bytes, 'AES-CBC', false, ['decrypt']

      throw new Error 'Encrypted asset does not match its SHA-256 hash'
    .then (key) ->
      iv = ciphertext.slice 0, 16
      img_ciphertext = ciphertext.slice 16
      return window.crypto.subtle.decrypt {name: 'AES-CBC', iv: iv}, key, img_ciphertext
