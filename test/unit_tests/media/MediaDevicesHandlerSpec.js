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
/* eslint-disable */

describe('z.media.MediaDevicesHandler', () => {
  const test_factory = new TestFactory();
  const screens = [{id: 'screen1', name: 'Screen 1'}, {id: 'screen2', name: 'Screen 2'}];
  const cameras = [{deviceId: 'camera1', label: 'Camera 1'}, {deviceId: 'camera2', label: 'Camera 2'}];
  let devicesHandler;

  beforeAll(() => test_factory.exposeMediaActors());

  beforeEach(() => {
    devicesHandler = TestFactory.media_repository.devicesHandler;
    spyOn(devicesHandler, 'getScreenSources').and.callFake(() => {
      devicesHandler.availableDevices.screenInput(screens);
      return Promise.resolve();
    });
    spyOn(devicesHandler, 'getMediaDevices').and.callFake(() => {
      devicesHandler.availableDevices.videoInput(cameras);
      return Promise.resolve();
    });
  });

  describe('toggleNextScreen', () => {
    it('returns second screen if the first is currently selected', () => {
      devicesHandler.currentDeviceId.screenInput(screens[0].id);
      devicesHandler.currentDeviceIndex.screenInput(0);
      devicesHandler.toggleNextScreen().then(() => {
        expect(devicesHandler.currentDeviceId.screenInput()).toEqual(screens[1].id);
      });
    });
    it('returns first screen if the second is currently selected', () => {
      devicesHandler.currentDeviceId.screenInput(screens[1].id);
      devicesHandler.currentDeviceIndex.screenInput(1);
      devicesHandler.toggleNextScreen().then(() => {
        expect(devicesHandler.currentDeviceId.screenInput()).toEqual(screens[0].id);
      });
    });
  });

  describe('toggleNextCamera', () => {
    it('returns second camera if the first is currently selected', () => {
      devicesHandler.currentDeviceId.videoInput(cameras[0].deviceId);
      devicesHandler.toggleNextCamera().then(() => {
        expect(devicesHandler.currentDeviceId.videoInput()).toEqual(cameras[1].deviceId);
      });
    });
    xit('returns first camera if the second is currently selected', () => {
      devicesHandler.currentDeviceId.videoInput(cameras[1].deviceId);
      devicesHandler.toggleNextCamera().then(() => {
        expect(devicesHandler.currentDeviceId.videoInput()).toEqual(cameras[0].deviceId);
      });
    });
  });
});
