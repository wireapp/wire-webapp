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

import {PermissionRepository} from 'Repositories/permission/PermissionRepository';
import {UserState} from 'Repositories/user/UserState';

import {MediaConstraintsHandler} from './MediaConstraintsHandler';
import {MediaStreamHandler} from './MediaStreamHandler';

describe('MediaStreamHandler', () => {
  let streamHandler: MediaStreamHandler;

  const userState = {
    self: () => ({id: ''}),
  } as UserState;

  const mediaConstraintsHandler = new MediaConstraintsHandler(userState);

  beforeEach(() => {
    streamHandler = new MediaStreamHandler(mediaConstraintsHandler, new PermissionRepository());
  });

  describe('requestMediaStream', () => {
    it('requests audio streams', async () => {
      spyOn(window.navigator.mediaDevices, 'getUserMedia').and.returnValue(Promise.resolve(new MediaStream()));

      await streamHandler.requestMediaStream(true, false, false, true);

      expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        jasmine.objectContaining({audio: {autoGainControl: false}, video: undefined}),
      );
    });

    it('requests video streams', async () => {
      spyOn(window.navigator.mediaDevices, 'getUserMedia').and.returnValue(Promise.resolve(new MediaStream()));

      await streamHandler.requestMediaStream(false, true, false, true);

      expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        jasmine.objectContaining({audio: undefined, video: jasmine.any(Object)}),
      );
    });

    it('requests audio and video streams', async () => {
      spyOn(window.navigator.mediaDevices, 'getUserMedia').and.returnValue(Promise.resolve(new MediaStream()));

      await streamHandler.requestMediaStream(true, true, false, true);

      expect(window.navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        jasmine.objectContaining({audio: {autoGainControl: false}, video: jasmine.any(Object)}),
      );
    });
  });
});
