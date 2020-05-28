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

//@ts-check

import {FileAsset} from 'src/script/entity/message/FileAsset';

describe('FileAsset', () => {
  /** @type {FileAsset} */
  let file;

  beforeEach(() => {
    file = new FileAsset();
  });

  describe('is_video', () => {
    it('should treat mp4 as video file', () => {
      file.file_type = 'video/mp4';

      expect(file.is_video()).toBeTruthy();
    });

    it('should not treat images as video file', () => {
      file.file_type = 'image/jpg';

      expect(file.is_video()).toBeFalsy();
      file.file_type = 'image/png';

      expect(file.is_video()).toBeFalsy();
      file.file_type = 'image/gif';

      expect(file.is_video()).toBeFalsy();
    });
  });
});
