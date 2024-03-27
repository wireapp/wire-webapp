/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Encoder, Decoder} from 'bazinga64';

import {SystemCrypto, wrapSystemCrypto} from './systemCryptoWrapper';

const systemCryptos = {
  v0: {
    encrypt: async (value: Uint8Array) => {
      return value;
    },
    decrypt: async (value: Uint8Array) => {
      return value;
    },
    version: undefined,
  } as SystemCrypto,

  v01: {
    encrypt: async (value: Uint8Array) => {
      return Encoder.toBase64(value).asBytes;
    },
    decrypt: async (value: Uint8Array) => {
      return Decoder.fromBase64(Array.from(value.values())).asBytes;
    },
    version: undefined,
  } as SystemCrypto,

  v1: {
    encrypt: async (value: string) => {
      const encoder = new TextEncoder();
      return encoder.encode(value);
    },
    decrypt: async (value: Uint8Array) => {
      const decoder = new TextDecoder();
      return decoder.decode(value);
    },
    version: 1,
  } as SystemCrypto,
} as const;

describe('systemCryptoWrapper', () => {
  it.each(Object.entries(systemCryptos))(
    'generates and store a secret key encrypted using system crypto (%s)',
    async (_name, systemCrypto) => {
      const {encrypt, decrypt} = wrapSystemCrypto(systemCrypto);

      const value = new Uint8Array([1, 2, 3, 4]);
      const encrypted = await encrypt(value);
      const decrypted = await decrypt(encrypted);

      expect(value).toEqual(decrypted);
    },
  );

  it.each([['v01 > v1', systemCryptos.v01, systemCryptos.v1]])(
    'handles migration from old system crypto (%s)',
    async (_name, crypto1, crypto2) => {
      const wrap1 = wrapSystemCrypto(crypto1);
      const wrap2 = wrapSystemCrypto(crypto2);

      const value = new Uint8Array([1, 2, 3, 4]);
      const encrypted = await wrap1.encrypt(value);
      const decrypted = await wrap2.decrypt(encrypted);

      expect(value).toEqual(decrypted);
    },
  );
});
