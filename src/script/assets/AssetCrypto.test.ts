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

import {decryptAesAsset, encryptAesAsset} from './AssetCrypto';

describe('AssetCrypto', () => {
  it('should encrypt and decrypt ArrayBuffer', async () => {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    const {cipherText, keyBytes, sha256} = await encryptAesAsset(bytes.buffer);
    const buffer = await decryptAesAsset(cipherText, keyBytes, sha256);
    expect(buffer).toEqual(bytes.buffer);
  });

  it('should not decrypt when hash is missing', async () => {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    const {cipherText, keyBytes} = await encryptAesAsset(bytes.buffer);
    await expect(decryptAesAsset(cipherText, keyBytes, null)).rejects.toThrow();
  });

  it('should not decrypt when hash is an empty array', async () => {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    const {cipherText, keyBytes} = await encryptAesAsset(bytes.buffer);
    await expect(decryptAesAsset(cipherText, keyBytes, new Uint8Array([]))).rejects.toThrow();
  });
});
