/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

describe('AssetsCrypto', function() {
  it('should encrypt and decrypt arraybuffer', function(done) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    z.assets.AssetCrypto
      .encrypt_aes_asset(bytes.buffer)
      .then(function({cipher_text, key_bytes, sha256}) {
        return z.assets.AssetCrypto.decrypt_aes_asset(
          cipher_text,
          key_bytes,
          sha256,
        );
      })
      .then(function(buffer) {
        expect(buffer).toEqual(bytes.buffer);
        done();
      })
      .catch(done.fail);
  });

  it('should not decrypt when hash is missing', function(done) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    z.assets.AssetCrypto
      .encrypt_aes_asset(bytes.buffer)
      .then(function({cipher_text, key_bytes}) {
        return z.assets.AssetCrypto.decrypt_aes_asset(
          cipher_text,
          key_bytes,
          null,
        );
      })
      .then(done.fail)
      .catch(done);
  });

  it('should not decrypt when hash is an empty array', function(done) {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    z.assets.AssetCrypto
      .encrypt_aes_asset(bytes.buffer)
      .then(function({cipher_text, key_bytes}) {
        return z.assets.AssetCrypto.decrypt_aes_asset(
          cipher_text,
          key_bytes,
          new Uint8Array([]),
        );
      })
      .then(done.fail)
      .catch(done);
  });
});
