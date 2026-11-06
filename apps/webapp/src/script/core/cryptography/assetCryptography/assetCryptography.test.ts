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

import {isBuffer} from '@sindresorhus/is';

import {decryptAsset, encryptAsset} from './assetCryptography';
import {crypto as browserCrypto} from './crypto.browser';
import {crypto as nodeCrypto} from './crypto.node';

describe.each([
  ['browser', browserCrypto],
  ['node', nodeCrypto],
] as const)('AssetCrypto (%s)', (_environment, cryptoImplementation) => {
  it('should encrypt and decrypt ArrayBuffer', async () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));

    const {cipherText, keyBytes, sha256} = await encryptAsset({plainText: bytes}, cryptoImplementation);
    const buffer = await decryptAsset({cipherText, keyBytes, sha256}, cryptoImplementation);
    expect(new Uint8Array(buffer)).toEqual(bytes);
  });

  // This test conforms to the following testing standards:
  // @SF.Messages @TSFI.RESTfulAPI @S0.2 @S0.3
  it('should not decrypt when hash is missing', async () => {
    const bytes = new Uint8Array(16);
    global.crypto.getRandomValues(bytes);

    const {cipherText, keyBytes} = await encryptAsset({plainText: bytes}, cryptoImplementation);
    await expect(decryptAsset({cipherText, keyBytes, sha256: null} as any, cryptoImplementation)).rejects.toThrow();
  });

  // This test conforms to the following testing standards:
  // @SF.Messages @TSFI.RESTfulAPI @S0.2 @S0.3
  it('should not decrypt when hash is an empty array', async () => {
    const bytes = new Uint8Array(16);
    global.crypto.getRandomValues(bytes);

    const {cipherText, keyBytes} = await encryptAsset({plainText: bytes}, cryptoImplementation);
    await expect(
      decryptAsset({cipherText, keyBytes, sha256: new Uint8Array([])}, cryptoImplementation),
    ).rejects.toThrow('Encrypted asset does not match its SHA-256 hash');
  });

  it('rejects corrupted ciphertext before decryption', async () => {
    const encryptedAsset = await encryptAsset({plainText: new Uint8Array([1, 2, 3])}, cryptoImplementation);
    const corruptedAsset = {...encryptedAsset, cipherText: new Uint8Array(encryptedAsset.cipherText.length)};

    await expect(decryptAsset(corruptedAsset, cryptoImplementation)).rejects.toThrow(
      'Encrypted asset does not match its SHA-256 hash',
    );
  });

  it('decrypts assets produced by the other environment', async () => {
    const plainText = new Uint8Array([1, 2, 3]);
    const otherCrypto = cryptoImplementation === nodeCrypto ? browserCrypto : nodeCrypto;
    const encryptedAsset = await encryptAsset({plainText}, otherCrypto);
    const decryptedAsset = await decryptAsset(encryptedAsset, cryptoImplementation);

    expect(new Uint8Array(decryptedAsset)).toEqual(plainText);
  });

  it('propagates decryption errors when the key is invalid', async () => {
    const encryptedAsset = await encryptAsset({plainText: new Uint8Array([1, 2, 3])}, cryptoImplementation);
    const invalidKeyAsset = {...encryptedAsset, keyBytes: new Uint8Array(1)};

    await expect(decryptAsset(invalidKeyAsset, cryptoImplementation)).rejects.toThrow();
  });

  it('should use the browser crypto implementation through globalThis', async () => {
    const digest = await browserCrypto.digest(new Uint8Array([1, 2, 3]));

    expect(digest).toBeInstanceOf(Uint8Array);
    expect(digest.byteLength).toBe(32);
  });
});

describe('default asset cryptography', () => {
  it('uses browser crypto when no environment dependency is provided', async () => {
    const plainText = new Uint8Array([1, 2, 3]);
    const encryptedAsset = await encryptAsset({plainText});
    const decryptedAsset = await decryptAsset(encryptedAsset);

    expect(isBuffer(encryptedAsset.keyBytes)).toBe(false);
    expect(isBuffer(encryptedAsset.sha256)).toBe(false);
    expect(new Uint8Array(decryptedAsset)).toEqual(plainText);
  });
});
