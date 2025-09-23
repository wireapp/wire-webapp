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

import {User} from 'Repositories/entity/User';
import {mediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {UserState} from 'Repositories/user/UserState';
import {createUuid} from 'Util/uuid';

import {MediaConstraintsHandler, ScreensharingMethods} from './MediaConstraintsHandler';

describe('MediaConstraintsHandler', () => {
  const createAvailableDevices = ({
    audio = 'mic',
    video = 'screen1',
    output = 'speaker',
    screen = 'camera',
  }: {
    audio?: string;
    video?: string;
    output?: string;
    screen?: string;
  } = {}) => {
    const state = mediaDevicesStore.getState();
    state.setAudioInputDeviceId(audio);
    state.setVideoInputDeviceId(video);
    state.setAudioOutputDeviceId(output);
    state.setScreenInputDeviceId(screen);
  };

  const resetStore = () => {
    const state = mediaDevicesStore.getState();
    state.resetDevices();
    state.resetSelections();
    state.resetSupport();
    createAvailableDevices();
  };

  const createConstraintsHandler = (selfUserId = createUuid()) => {
    const userState = {
      self: () => new User(selfUserId, ''),
    };
    return new MediaConstraintsHandler(userState as UserState);
  };

  afterEach(() => resetStore());

  describe('getMediaStreamConstraints', () => {
    it('returns devices id constraints if current devices are defined', () => {
      createAvailableDevices();

      setTimeout(() => {
        const constraintsHandler = createConstraintsHandler();
        const constraints = constraintsHandler.getMediaStreamConstraints(true, true, false) as any;

        expect(constraints.audio.deviceId.exact).toBe('mic');
        expect(constraints.video.deviceId.exact).toBe('screen1');
      });
    });

    it('returns default constraints when current devices are not defined', () => {
      const defaultId = MediaConstraintsHandler.CONFIG.DEFAULT_DEVICE_ID;
      createAvailableDevices({audio: defaultId, video: defaultId});

      const constraintsHandler = createConstraintsHandler();
      const constraints = constraintsHandler.getMediaStreamConstraints(true, true, false) as any;

      expect(constraints.audio.deviceId).toBeUndefined();
      expect(constraints.audio).toEqual({autoGainControl: false});
      expect(constraints.video.deviceId).toBeUndefined();
      expect(constraints.video).toEqual(
        expect.objectContaining({
          frameRate: expect.any(Number),
          height: expect.any(Number),
          width: expect.any(Number),
        }),
      );
    });
  });

  describe('getScreenStreamConstraints', () => {
    it('returns constraints to get the screen stream if browser supports getDisplayMedia', () => {
      const constraintsHandler = createConstraintsHandler();

      const constraints: MediaStreamConstraints | undefined = constraintsHandler.getScreenStreamConstraints(
        ScreensharingMethods.DISPLAY_MEDIA,
      );

      expect(constraints?.audio).toBe(false);
      expect((constraints?.video as MediaTrackConstraints).height).toBeUndefined();
      expect((constraints?.video as MediaTrackConstraints).frameRate).toEqual(expect.any(Number));
    });

    it('returns constraints to get the screen stream if browser uses desktopCapturer in one to one call', () => {
      createAvailableDevices({screen: 'camera'});
      const constraintsHandler = createConstraintsHandler();

      const constraints: MediaStreamConstraints | undefined = constraintsHandler.getScreenStreamConstraints(
        ScreensharingMethods.DESKTOP_CAPTURER,
      );

      setTimeout(() => {
        expect(constraints?.audio).toBe(false);
        expect((constraints?.video as MediaTrackConstraintsExt).mandatory).toEqual({
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: 'camera',
          maxFrameRate: 5,
        });
      });
    });

    it('returns constraints to get the screen stream if browser uses getUserMedia in one to one call', () => {
      const constraintsHandler = createConstraintsHandler();

      const constraints: MediaStreamConstraints | undefined = constraintsHandler.getScreenStreamConstraints(
        ScreensharingMethods.USER_MEDIA,
      );

      expect(constraints?.audio).toBe(false);
      expect(constraints?.video as MediaTrackConstraints).toEqual(
        expect.objectContaining({
          frameRate: expect.any(Number),
          mediaSource: 'screen',
        }),
      );
    });
  });

  describe('setAgcPreference', () => {
    it('stores the stringified preference for the userId', () => {
      const setItemSpy = spyOn(Object.getPrototypeOf(localStorage), 'setItem').and.returnValue(undefined);
      const selfUserId = createUuid();
      const constraintsHandler = createConstraintsHandler(selfUserId);
      constraintsHandler.setAgcPreference(true);

      expect(setItemSpy).toHaveBeenCalledWith(expect.stringContaining(selfUserId), 'true');
    });
  });

  describe('getAgcPreference', () => {
    it('loads the preference for the userId', () => {
      const getItemSpy = spyOn(Object.getPrototypeOf(localStorage), 'getItem').and.returnValue('true');
      const selfUserId = createUuid();
      const constraintsHandler = createConstraintsHandler(selfUserId);

      expect(constraintsHandler.getAgcPreference()).toEqual(true);
      expect(getItemSpy).toHaveBeenCalledWith(expect.stringContaining(selfUserId));
    });
  });
});

type MediaTrackConstraintsExt = MediaTrackConstraints & {
  mandatory: {chromeMediaSource: string; chromeMediaSourceId?: string; maxHeight?: number; minHeight?: number};
};
