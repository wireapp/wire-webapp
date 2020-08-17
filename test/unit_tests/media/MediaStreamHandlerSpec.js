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

import {MediaRepository} from 'src/script/media/MediaRepository';
import {PermissionRepository} from 'src/script/permission/PermissionRepository';

describe('MediaStreamHandler', () => {
  let streamHandler;

  beforeEach(() => {
    streamHandler = new MediaRepository(new PermissionRepository()).streamHandler;
  });

  describe('requestMediaStream', () => {
    it('requests audio streams', () => {
      spyOn(window.navigator.mediaDevices, 'getUserMedia').and.returnValue(Promise.resolve(new MediaStream()));

      return streamHandler.requestMediaStream(true, false, false, true).then(() => {
        expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
          jasmine.objectContaining({audio: {autoGainControl: false}, video: undefined}),
        );
      });
    });

    it('requests video streams', () => {
      spyOn(window.navigator.mediaDevices, 'getUserMedia').and.returnValue(Promise.resolve(new MediaStream()));

      return streamHandler.requestMediaStream(false, true, false, true).then(() => {
        expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
          jasmine.objectContaining({audio: undefined, video: jasmine.any(Object)}),
        );
      });
    });

    it('requests audio and video streams', () => {
      spyOn(window.navigator.mediaDevices, 'getUserMedia').and.returnValue(Promise.resolve(new MediaStream()));

      return streamHandler.requestMediaStream(true, true, false, true).then(() => {
        expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
          jasmine.objectContaining({audio: {autoGainControl: false}, video: jasmine.any(Object)}),
        );
      });
    });
  });
});
