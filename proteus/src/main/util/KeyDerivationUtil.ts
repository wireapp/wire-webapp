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

import * as sodium from 'libsodium-wrappers-sumo';

import {ArrayUtil, MemoryUtil} from '../util/';

/**
 * HMAC-based Key Derivation Function
 *
 * @param input Initial Keying Material (IKM)
 * @param info Key Derivation Data (Info)
 * @param length Length of the derived key in bytes (L)
 */
export function hkdf(
  salt: Uint8Array | string,
  input: Uint8Array | string | number[] | ArrayBuffer[],
  info: Uint8Array | string,
  length: number,
): Uint8Array {
  const convertType = (value: Uint8Array | string) => {
    if (typeof value === 'string') {
      return sodium.from_string(value);
    }
    return value;
  };

  salt = convertType(salt);
  input = convertType(input as Uint8Array | string);
  info = convertType(info);

  const HASH_LEN = 32;

  const saltToKey = (receivedSalt: Uint8Array): Uint8Array => {
    const keybytes = sodium.crypto_auth_hmacsha256_KEYBYTES;
    if (receivedSalt.length > keybytes) {
      return sodium.crypto_hash_sha256(receivedSalt);
    }

    const key = new Uint8Array(keybytes);
    key.set(receivedSalt);
    return key;
  };

  const extract = (receivedSalt: Uint8Array, receivedInput: Uint8Array): Uint8Array => {
    return sodium.crypto_auth_hmacsha256(receivedInput, saltToKey(receivedSalt));
  };

  const expand = (tag: Uint8Array, receivedInfo: Uint8Array, receivedLength: number): Uint8Array => {
    const numBlocks = Math.ceil(receivedLength / HASH_LEN);
    let hmac = new Uint8Array(0);
    let result = new Uint8Array(0);

    for (let index = 0; index <= numBlocks - 1; index++) {
      const buf = ArrayUtil.concatenate_array_buffers([hmac, receivedInfo, new Uint8Array([index + 1])]);
      hmac = sodium.crypto_auth_hmacsha256(buf, tag);
      result = ArrayUtil.concatenate_array_buffers([result, hmac]);
    }

    return new Uint8Array(result.buffer.slice(0, receivedLength));
  };

  const key = extract(salt, input);

  MemoryUtil.zeroize(input);
  MemoryUtil.zeroize(salt);

  return expand(key, info, length);
}
