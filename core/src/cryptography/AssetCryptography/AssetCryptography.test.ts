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

import {decryptAsset, encryptAsset} from './AssetCryptography';

describe('AssetCrypto', () => {
  it('should encrypt and decrypt ArrayBuffer', async () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));

    const {cipherText, keyBytes, sha256} = await encryptAsset({plainText: bytes});
    const buffer = await decryptAsset({cipherText, keyBytes, sha256});
    expect(new Uint8Array(buffer)).toEqual(bytes);
  });

  // This test conforms to the following testing standards:
  // @SF.Messages @TSFI.RESTfulAPI @S0.2 @S0.3
  it('should not decrypt when hash is missing', async () => {
    const bytes = new Uint8Array(16);
    global.crypto.getRandomValues(bytes);

    const {cipherText, keyBytes} = await encryptAsset({plainText: bytes});
    await expect(decryptAsset({cipherText, keyBytes, sha256: null} as any)).rejects.toThrow();
  });

  // This test conforms to the following testing standards:
  // @SF.Messages @TSFI.RESTfulAPI @S0.2 @S0.3
  it('should not decrypt when hash is an empty array', async () => {
    const bytes = new Uint8Array(16);
    global.crypto.getRandomValues(bytes);

    const {cipherText, keyBytes} = await encryptAsset({plainText: bytes});
    await expect(decryptAsset({cipherText, keyBytes, sha256: new Uint8Array([])})).rejects.toThrow();
  });
});
