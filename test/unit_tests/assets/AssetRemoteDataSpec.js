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

describe('z.assets.AssetRemoteData', () => {
  describe('load unencrypted asset', () => {
    let remote_data = null;
    const video_bytes = new Uint8Array([1, 2, 3, 4]);
    const video_type = 'video/mp4';

    beforeEach(() => {
      const conversation_id = z.util.create_random_uuid();
      const asset_id = z.util.create_random_uuid();
      remote_data = z.assets.AssetRemoteData.v1(conversation_id, asset_id);
      spyOn(remote_data, '_loadBuffer').and.returnValue(
        Promise.resolve({buffer: video_bytes.buffer, mimeType: video_type})
      );
    });

    it('should load and decrypt asset', done => {
      remote_data
        .load()
        .then(blob => {
          expect(new Blob([video_bytes], {type: video_type})).toEqual(blob);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('load encrypted asset', () => {
    let remote_data = null;
    const video_bytes = new Uint8Array([1, 2, 3, 4]);
    const video_type = 'video/mp4';

    beforeEach(done => {
      z.assets.AssetCrypto.encryptAesAsset(video_bytes)
        .then(({cipherText, keyBytes, sha256}) => {
          const conversation_id = z.util.create_random_uuid();
          const asset_id = z.util.create_random_uuid();
          remote_data = z.assets.AssetRemoteData.v2(
            conversation_id,
            asset_id,
            new Uint8Array(keyBytes),
            new Uint8Array(sha256)
          );
          spyOn(remote_data, '_loadBuffer').and.returnValue(
            Promise.resolve({buffer: cipherText, mimeType: video_type})
          );
          done();
        })
        .catch(done.fail);
    });

    it('should load and decrypt asset', done => {
      remote_data
        .load()
        .then(blob => {
          expect(new Blob([video_bytes], {type: video_type})).toEqual(blob);
          done();
        })
        .catch(done.fail);
    });
  });
});
