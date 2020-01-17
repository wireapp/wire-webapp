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

import {MediaDeviceType} from 'src/script/media/MediaDeviceType';
import {MediaDevicesHandler} from 'src/script/media/MediaDevicesHandler';

describe('MediaDevicesHandler', () => {
  const cameras = [
    {deviceId: 'camera1', kind: MediaDeviceType.VIDEO_INPUT, label: 'Camera 1'},
    {deviceId: 'camera2', kind: MediaDeviceType.VIDEO_INPUT, label: 'Camera 2'},
  ];
  const mics = [
    {deviceId: 'mic1', kind: MediaDeviceType.AUDIO_INPUT, label: 'Mic 1'},
    {deviceId: 'mic2', kind: MediaDeviceType.AUDIO_INPUT, label: 'Mic 2'},
  ];
  const speakers = [
    {deviceId: 'speaker1', kind: MediaDeviceType.AUDIO_OUTPUT, label: 'Speaker 1'},
    {deviceId: 'speaker2', kind: MediaDeviceType.AUDIO_OUTPUT, label: 'Speaker 2'},
  ];

  beforeEach(() => {
    spyOn(navigator.mediaDevices, 'enumerateDevices').and.returnValue(
      Promise.resolve(cameras.concat(mics).concat(speakers))
    );
  });

  describe('constructor', () => {
    it('loads available devices and listens to input devices changes', done => {
      const devicesHandler = new MediaDevicesHandler();
      setTimeout(() => {
        expect(navigator.mediaDevices.enumerateDevices).withContext('Initial enumeration').toHaveBeenCalledTimes(1);
        expect(devicesHandler.availableDevices.videoInput()).withContext('Initial cameras').toEqual(cameras);
        expect(devicesHandler.availableDevices.audioInput()).withContext('Initial microphones').toEqual(mics);
        expect(devicesHandler.availableDevices.audioOutput()).withContext('Initial speakers').toEqual(speakers);

        const newCameras = [{deviceId: 'newcamera', kind: MediaDeviceType.VIDEO_INPUT}];
        navigator.mediaDevices.enumerateDevices.and.returnValue(Promise.resolve(newCameras));
        navigator.mediaDevices.ondevicechange();

        setTimeout(() => {
          expect(navigator.mediaDevices.enumerateDevices).withContext('Updated enumeration').toHaveBeenCalledTimes(2);
          expect(devicesHandler.availableDevices.videoInput()).withContext('Updated cameras').toEqual(newCameras);
          expect(devicesHandler.availableDevices.audioInput()).withContext('Updated microphones').toEqual([]);
          expect(devicesHandler.availableDevices.audioOutput()).withContext('Updated speakers').toEqual([]);
          done();
        });
      });
    });
  });

  describe('currentAvailableDeviceId', () => {
    it('only exposes available device', done => {
      const devicesHandler = new MediaDevicesHandler();
      setTimeout(() => {
        devicesHandler.currentDeviceId.videoInput(cameras[0].deviceId);

        expect(devicesHandler.currentAvailableDeviceId.videoInput()).toBe(cameras[0].deviceId);

        devicesHandler.currentDeviceId.videoInput('inexistant-id');
        expect(devicesHandler.currentAvailableDeviceId.videoInput()).toBe(
          MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.videoInput
        );

        devicesHandler.currentDeviceId.audioInput(mics[0].deviceId);

        expect(devicesHandler.currentAvailableDeviceId.audioInput()).toBe(mics[0].deviceId);

        devicesHandler.currentDeviceId.audioInput('inexistant-id');
        expect(devicesHandler.currentAvailableDeviceId.audioInput()).toBe(
          MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.audioInput
        );

        devicesHandler.currentDeviceId.audioOutput(speakers[0].deviceId);

        expect(devicesHandler.currentAvailableDeviceId.audioOutput()).toBe(speakers[0].deviceId);

        devicesHandler.currentDeviceId.audioOutput('inexistant-id');
        expect(devicesHandler.currentAvailableDeviceId.audioOutput()).toBe(
          MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.audioOutput
        );
        done();
      });
    });
  });
});
