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

import {Crypto} from './interfaces';

import {toBufferSource} from '../../util/bufferUtils';

function getBrowserCrypto(): globalThis.Crypto {
  const browserCrypto = globalThis.crypto;

  if (!browserCrypto?.subtle) {
    throw new Error('Web Crypto API is unavailable');
  }

  return browserCrypto;
}

export const crypto: Crypto = {
  async digest(cipherText: Uint8Array): Promise<Uint8Array> {
    const browserCrypto = getBrowserCrypto();
    const checksum = await browserCrypto.subtle.digest('SHA-256', toBufferSource(cipherText));

    return new Uint8Array(checksum);
  },

  async decrypt(cipherText: Uint8Array, keyBytes: Uint8Array): Promise<Uint8Array> {
    const browserCrypto = getBrowserCrypto();
    const key = await browserCrypto.subtle.importKey('raw', toBufferSource(keyBytes), 'AES-CBC', false, ['decrypt']);

    const initializationVector = cipherText.slice(0, 16);
    const assetCipherText = cipherText.slice(16);
    const decipher = await browserCrypto.subtle.decrypt(
      {iv: toBufferSource(initializationVector), name: 'AES-CBC'},
      key,
      toBufferSource(assetCipherText),
    );

    return new Uint8Array(decipher);
  },

  getRandomValues(size: number): Uint8Array {
    const browserCrypto = getBrowserCrypto();

    return browserCrypto.getRandomValues(new Uint8Array(size));
  },

  async encrypt(
    plainText: Uint8Array,
    keyBytes: Uint8Array,
    initializationVector: Uint8Array,
  ): Promise<{key: Uint8Array; cipher: Uint8Array | ArrayBuffer}> {
    const browserCrypto = getBrowserCrypto();
    const key = await browserCrypto.subtle.importKey('raw', toBufferSource(keyBytes), 'AES-CBC', true, ['encrypt']);

    return {
      key: new Uint8Array(await browserCrypto.subtle.exportKey('raw', key)),
      cipher: await browserCrypto.subtle.encrypt(
        {iv: toBufferSource(initializationVector), name: 'AES-CBC'},
        key,
        toBufferSource(plainText),
      ),
    };
  },
};
