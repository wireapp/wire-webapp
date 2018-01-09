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

const sodium = require('libsodium-wrappers-sumo');

const ArrayUtil = require('../util/ArrayUtil');
const MemoryUtil = require('../util/MemoryUtil');
const TypeUtil = require('../util/TypeUtil');

/** @module util */

const KeyDerivationUtil = {
  /**
   * HMAC-based Key Derivation Function
   *
   * @param {!(Uint8Array|string)} salt
   * @param {!(Uint8Array|string)} input - Initial Keying Material (IKM)
   * @param {!(Uint8Array|string)} info - Key Derivation Data (Info)
   * @param {!number} length - Length of the derived key in bytes (L)
   * @returns {Uint8Array} - Output Keying Material (OKM)
   */
  hkdf(salt, input, info, length) {
    const convert_type = value => {
      if (typeof value === 'string') {
        return sodium.from_string(value);
      }
      TypeUtil.assert_is_instance(Uint8Array, value);
      return value;
    };

    salt = convert_type(salt);
    input = convert_type(input);
    info = convert_type(info);

    TypeUtil.assert_is_integer(length);

    const HASH_LEN = 32;

    /**
     * @param {*} received_salt
     * @returns {Uint8Array}
     */
    const salt_to_key = received_salt => {
      const keybytes = sodium.crypto_auth_hmacsha256_KEYBYTES;
      if (received_salt.length > keybytes) {
        return sodium.crypto_hash_sha256(received_salt);
      }

      const key = new Uint8Array(keybytes);
      key.set(received_salt);
      return key;
    };

    /**
     * @param {*} received_salt
     * @param {*} received_input
     * @returns {*}
     */
    const extract = (received_salt, received_input) => {
      return sodium.crypto_auth_hmacsha256(received_input, salt_to_key(received_salt));
    };

    /**
     * @param {*} tag
     * @param {*} received_info
     * @param {!number} received_length
     * @returns {Uint8Array}
     */
    const expand = (tag, received_info, received_length) => {
      const num_blocks = Math.ceil(received_length / HASH_LEN);
      let hmac = new Uint8Array(0);
      let result = new Uint8Array(0);

      for (let index = 0; index <= num_blocks - 1; index++) {
        const buf = ArrayUtil.concatenate_array_buffers([hmac, received_info, new Uint8Array([index + 1])]);
        hmac = sodium.crypto_auth_hmacsha256(buf, tag);
        result = ArrayUtil.concatenate_array_buffers([result, hmac]);
      }

      return new Uint8Array(result.buffer.slice(0, received_length));
    };

    const key = extract(salt, input);

    MemoryUtil.zeroize(input);
    MemoryUtil.zeroize(salt);

    return expand(key, info, length);
  },
};

module.exports = KeyDerivationUtil;
