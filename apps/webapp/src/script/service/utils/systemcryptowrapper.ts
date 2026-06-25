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

type SystemCryptoV0 = {
  encrypt: (value: Uint8Array) => Promise<Uint8Array>;
  decrypt: (payload: Uint8Array) => Promise<Uint8Array>;
  version: undefined;
};
type SystemCryptoV1 = {
  encrypt: (value: string) => Promise<Uint8Array>;
  decrypt: (payload: Uint8Array) => Promise<string>;
  version: 1;
};

export type SystemCrypto = SystemCryptoV0 | SystemCryptoV1;

export function wrapSystemCrypto(baseCrypto: SystemCrypto) {
  const isBase64 = /^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)?$/;
  return {
    encrypt: (value: Uint8Array) => {
      if (baseCrypto.version === 1) {
        const strValue = Encoder.toBase64(value).asString;
        return (baseCrypto as SystemCryptoV1).encrypt(strValue);
      }
      // In previous versions of the systemCrypto (prior to February 2023), encrypt took a uint8Array
      return (baseCrypto as SystemCryptoV0).encrypt(value);
    },

    decrypt: async (value: Uint8Array) => {
      if (typeof baseCrypto.version === 'undefined') {
        // In previous versions of the systemCrypto (prior to February 2023), the decrypt function returned a Uint8Array
        return (baseCrypto as SystemCryptoV0).decrypt(value);
      }
      const decrypted = await (baseCrypto as SystemCryptoV1).decrypt(value);
      if (isBase64.test(decrypted)) {
        return Decoder.fromBase64(decrypted).asBytes;
      }
      // Between June 2022 and October 2022, the systemCrypto returned a string encoded in UTF-8
      const encoder = new TextEncoder();

      return encoder.encode(decrypted);
    },
  };
}
