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

describe('z.assets.AssetRemoteData', function() {
  describe('load unencrypted asset', function() {
    let remote_data = null;
    const video_bytes = new Uint8Array([1, 2, 3, 4]);
    const video_type = 'video/mp4';

    beforeEach(function() {
      const conversation_id = z.util.create_random_uuid();
      const asset_id = z.util.create_random_uuid();
      remote_data = z.assets.AssetRemoteData.v1(conversation_id, asset_id);
      spyOn(remote_data, '_load_buffer').and.returnValue(Promise.resolve([video_bytes.buffer, video_type]));
    });

    it('should load and decrypt asset', function(done) {
      remote_data
        .load()
        .then(function(blob) {
          expect(new Blob([video_bytes], {type: video_type})).toEqual(blob);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('load encrypted asset', function() {
    let remote_data = null;
    const video_bytes = new Uint8Array([1, 2, 3, 4]);
    const video_type = 'video/mp4';

    beforeEach(function(done) {
      z.assets.AssetCrypto
        .encrypt_aes_asset(video_bytes)
        .then(function({cipher_text, key_bytes, sha256}) {
          const conversation_id = z.util.create_random_uuid();
          const asset_id = z.util.create_random_uuid();
          remote_data = z.assets.AssetRemoteData.v2(
            conversation_id,
            asset_id,
            new Uint8Array(key_bytes),
            new Uint8Array(sha256)
          );
          spyOn(remote_data, '_load_buffer').and.returnValue(Promise.resolve([cipher_text, video_type]));
          done();
        })
        .catch(done.fail);
    });

    it('should load and decrypt asset', function(done) {
      remote_data
        .load()
        .then(function(blob) {
          expect(new Blob([video_bytes], {type: video_type})).toEqual(blob);
          done();
        })
        .catch(done.fail);
    });
  });
});
