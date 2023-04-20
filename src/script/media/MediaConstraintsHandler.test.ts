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

import ko from 'knockout';

import {createRandomUuid} from 'Util/util';

import {MediaConstraintsHandler, ScreensharingMethods} from './MediaConstraintsHandler';
import {CurrentAvailableDeviceId} from './MediaDevicesHandler';

import {User} from '../entity/User';
import {UserState} from '../user/UserState';

describe('MediaConstraintsHandler', () => {
  const createAvailableDevices = (deviceId?: string): CurrentAvailableDeviceId => ({
    audioInput: ko.pureComputed(() => deviceId ?? 'mic'),
    audioOutput: ko.pureComputed(() => deviceId ?? 'speaker'),
    screenInput: ko.pureComputed(() => deviceId ?? 'camera'),
    videoInput: ko.pureComputed(() => deviceId ?? 'screen1'),
  });

  const createConstraintsHandler = ({
    selfUserId = createRandomUuid(),
    availableDevices = createAvailableDevices(),
  }: {
    availableDevices?: CurrentAvailableDeviceId;
    selfUserId?: string;
  } = {}) => {
    const userState: Partial<UserState> = {
      self: ko.pureComputed(() => new User(selfUserId, '')),
    };
    return new MediaConstraintsHandler(availableDevices, userState as UserState);
  };

  describe('getMediaStreamConstraints', () => {
    it('returns devices id constraints if current devices are defined', () => {
      const availableDevices = createAvailableDevices();
      const constraintsHandler = createConstraintsHandler({availableDevices});
      const constraints = constraintsHandler.getMediaStreamConstraints(true, true, false) as any;

      expect(constraints.audio.deviceId.exact).toBe(availableDevices.audioInput());
      expect(constraints.video.deviceId.exact).toBe(availableDevices.videoInput());
    });

    it('returns default constraints when current devices are not defined', () => {
      const availableDevices = createAvailableDevices(MediaConstraintsHandler.CONFIG.DEFAULT_DEVICE_ID);
      const constraintsHandler = createConstraintsHandler({availableDevices});
      const constraints = constraintsHandler.getMediaStreamConstraints(true, true, false) as any;

      expect(constraints.audio.deviceId).not.toBeDefined();
      expect(constraints.audio).toEqual({autoGainControl: false});
      expect(constraints.video.deviceId).not.toBeDefined();
      expect(constraints.video).toEqual(
        jasmine.objectContaining({
          frameRate: jasmine.any(Number),
          height: jasmine.any(Number),
          width: jasmine.any(Number),
        }),
      );
    });
  });

  describe('getScreenStreamConstraints', () => {
    it('returns constraints to get the screen stream if browser supports getDisplayMedia', () => {
      const constraintsHandler = createConstraintsHandler();

      const constraints = constraintsHandler.getScreenStreamConstraints(ScreensharingMethods.DISPLAY_MEDIA) as any;

      expect(constraints.audio).toBe(false);
      expect(constraints.video.height).toEqual(
        jasmine.objectContaining({ideal: jasmine.any(Number), max: jasmine.any(Number)}),
      );
    });

    it('returns constraints to get the screen stream if browser uses desktopCapturer', () => {
      const constraintsHandler = createConstraintsHandler();

      const constraints = constraintsHandler.getScreenStreamConstraints(ScreensharingMethods.DESKTOP_CAPTURER) as any;

      expect(constraints.audio).toBe(false);
      expect(constraints.video.mandatory).toEqual(
        jasmine.objectContaining({maxHeight: jasmine.any(Number), minHeight: jasmine.any(Number)}),
      );
    });

    it('returns constraints to get the screen stream if browser uses getUserMedia', () => {
      const constraintsHandler = createConstraintsHandler();

      const constraints = constraintsHandler.getScreenStreamConstraints(ScreensharingMethods.USER_MEDIA) as any;

      expect(constraints.audio).toBe(false);
      expect(constraints.video).toEqual(
        jasmine.objectContaining({
          frameRate: jasmine.any(Number),
          height: {exact: jasmine.any(Number)},
          mediaSource: 'screen',
        }),
      );
    });
  });

  describe('setAgcPreference', () => {
    it('stores the stringified preference for the userId', () => {
      const setItemSpy = spyOn(Object.getPrototypeOf(localStorage), 'setItem').and.returnValue(undefined);
      const selfUserId = createRandomUuid();
      const constraintsHandler = createConstraintsHandler({selfUserId});
      constraintsHandler.setAgcPreference(true);

      expect(setItemSpy).toHaveBeenCalledWith(expect.stringContaining(selfUserId), 'true');
    });
  });

  describe('getAgcPreference', () => {
    it('loads the preference for the userId', () => {
      const getItemSpy = spyOn(Object.getPrototypeOf(localStorage), 'getItem').and.returnValue('true');
      const selfUserId = createRandomUuid();
      const constraintsHandler = createConstraintsHandler({selfUserId});

      expect(constraintsHandler.getAgcPreference()).toEqual(true);
      expect(getItemSpy).toHaveBeenCalledWith(expect.stringContaining(selfUserId));
    });
  });
});
