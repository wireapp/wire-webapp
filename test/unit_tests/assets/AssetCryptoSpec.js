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

'use strict';

describe('AssetsCrypto', () => {
  it('should encrypt and decrypt arraybuffer', done => {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    z.assets.AssetCrypto.encryptAesAsset(bytes.buffer)
      .then(({cipherText, keyBytes, sha256}) => {
        return z.assets.AssetCrypto.decryptAesAsset(cipherText, keyBytes, sha256);
      })
      .then(buffer => {
        expect(buffer).toEqual(bytes.buffer);
        done();
      })
      .catch(done.fail);
  });

  it('should not decrypt when hash is missing', done => {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    z.assets.AssetCrypto.encryptAesAsset(bytes.buffer)
      .then(({cipherText, keyBytes}) => {
        return z.assets.AssetCrypto.decryptAesAsset(cipherText, keyBytes, null);
      })
      .then(done.fail)
      .catch(done);
  });

  it('should not decrypt when hash is an empty array', done => {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    z.assets.AssetCrypto.encryptAesAsset(bytes.buffer)
      .then(({cipherText, keyBytes}) => {
        return z.assets.AssetCrypto.decryptAesAsset(cipherText, keyBytes, new Uint8Array([]));
      })
      .then(done.fail)
      .catch(done);
  });
});
