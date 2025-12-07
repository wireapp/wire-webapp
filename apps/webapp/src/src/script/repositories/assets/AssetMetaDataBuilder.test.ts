/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import * as AssetMetaDataBuilder from './AssetMetaDataBuilder';

describe('AssetMetaDataBuilder', () => {
  describe('isVideo', () => {
    const video = new Blob([], {type: 'video'});
    const audio = new Blob([], {type: 'audio'});
    const image = new Blob([], {type: 'image'});
    it('detects video files', () => {
      expect(AssetMetaDataBuilder.isVideo(video)).toBeTruthy();
      expect(AssetMetaDataBuilder.isVideo(audio)).toBeFalsy();
      expect(AssetMetaDataBuilder.isVideo(image)).toBeFalsy();
    });

    it('detects audio files', () => {
      expect(AssetMetaDataBuilder.isAudio(audio)).toBeTruthy();
      expect(AssetMetaDataBuilder.isAudio(video)).toBeFalsy();
      expect(AssetMetaDataBuilder.isAudio(image)).toBeFalsy();
    });

    it('detects image files', () => {
      expect(AssetMetaDataBuilder.isImage(image)).toBeTruthy();
      expect(AssetMetaDataBuilder.isImage(audio)).toBeFalsy();
      expect(AssetMetaDataBuilder.isImage(video)).toBeFalsy();
    });
  });
});
