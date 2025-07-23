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

import {FileAsset} from 'Repositories/entity/message/FileAsset';

describe('FileAsset', () => {
  /**
   * TODO: These tests don't make much sense since they are testing the browser implementation
   * instead it should be tested that the FileAsset is behaving correctly on `canPlayType` return values.
   */
  describe('is_video', () => {
    it('should treat mp4 as video file', () => {
      const file = new FileAsset();

      file.file_type = 'video/mp4';
      jest
        .spyOn(document, 'createElement')
        .mockImplementationOnce(() => ({canPlayType: () => 'yes'}) as unknown as HTMLElement);
      expect(file.isVideo()).toBeTruthy();
    });

    it('should not treat images as video file', () => {
      const file = new FileAsset();

      file.file_type = 'image/jpg';
      jest
        .spyOn(document, 'createElement')
        .mockImplementationOnce(() => ({canPlayType: () => ''}) as unknown as HTMLElement);
      expect(file.isVideo()).toBeFalsy();

      file.file_type = 'image/png';
      jest
        .spyOn(document, 'createElement')
        .mockImplementationOnce(() => ({canPlayType: () => ''}) as unknown as HTMLElement);
      expect(file.isVideo()).toBeFalsy();

      file.file_type = 'image/gif';
      jest
        .spyOn(document, 'createElement')
        .mockImplementationOnce(() => ({canPlayType: () => ''}) as unknown as HTMLElement);
      expect(file.isVideo()).toBeFalsy();
    });
  });
});
