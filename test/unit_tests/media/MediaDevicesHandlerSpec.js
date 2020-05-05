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

/* yarn test:app --specs media/MediaDevicesHandler --nolegacy */
describe('MediaDevicesHandler', () => {
  /**
   * Test data from a real-world scenario:
   * - Laptop webcam (Lenovo EasyCamera)
   * - Laptop microphone (Realtek High Definition Audio)
   * - USB webcam (Logitech HD Webcam C270)
   * - Bluetooth Headset (Bose QuietComfort)
   * - Two external monitors (DELL U2713HM)
   *
   * In total:
   * - 2 cameras
   * - 3 microphones
   * - 4 speakers
   */
  const realWorldTestSetup = {
    microphones: [
      {
        'deviceId': 'default',
        'groupId': '9d8426d64dd15ca6966cb3182371e259283b1dcef969e2b624d26a4552c0b4d3',
        'kind': MediaDeviceType.AUDIO_INPUT,
        'label': 'Default - Microphone (HD Webcam C270) (046d:0825)',
      },
      {
        'deviceId': 'communications',
        'groupId': 'af428bcaa9e9900c935395d334818e98062dd4e49f3eec6443ba1f0a09461132',
        'kind': MediaDeviceType.AUDIO_INPUT,
        'label': 'Communications - Headset (Bose QuietComfort Hands-Free) (Bluetooth)',
      },
      {
        'deviceId': '38b330ab6fd0091eaca57eb00f4231418393d8e71ff8e55fb228dc218773f2bc',
        'groupId': 'af428bcaa9e9900c935395d334818e98062dd4e49f3eec6443ba1f0a09461132',
        'kind': MediaDeviceType.AUDIO_INPUT,
        'label': 'Headset (Bose QuietComfort Hands-Free) (Bluetooth)',
      },
      {
        'deviceId': '2a6eb6f699bffde4cb8eb3c0249b398fe6314669ab19b81e6993d232fcfd9b81',
        'groupId': 'ea09ec3f5571b2b2268e8c6f9b98120a8a43bf29f3c38b344a96a23e8382b3f3',
        'kind': MediaDeviceType.AUDIO_INPUT,
        'label': 'Microphonearray (Realtek High Definition Audio)',
      },
      {
        'deviceId': 'bf3908cde3bb950469ff594c76d0896beed01a2d670549549327e3f8f33d4f47',
        'groupId': '9d8426d64dd15ca6966cb3182371e259283b1dcef969e2b624d26a4552c0b4d3',
        'kind': MediaDeviceType.AUDIO_INPUT,
        'label': 'Microphone (HD Webcam C270) (046d:0825)',
      },
    ],
    cameras: [
      {
        'deviceId': '22aed33748e8832f9010ae0ae97b56dfda51ef42784dd354d11e068a14452d91',
        'groupId': 'f07604beddf27565f236bf93eb2ab713db2ec2df03278d8c1eb14f4f1ce841d8',
        'kind': MediaDeviceType.VIDEO_INPUT,
        'label': 'Lenovo EasyCamera (5986:068c)',
      },
      {
        'deviceId': 'd52247ce9f08ada2109f11906f00992f27f964ce850793460d34ed7981348c47',
        'groupId': '9d8426d64dd15ca6966cb3182371e259283b1dcef969e2b624d26a4552c0b4d3',
        'kind': MediaDeviceType.VIDEO_INPUT,
        'label': 'Logitech HD Webcam C270 (046d:0825)',
      },

    ],
    speakers: [
      {
        'deviceId': 'default',
        'groupId': 'bf1ec0df3fe711fab2128c22b19d3b86e0963d302deee84b171f84c9e2417858',
        'kind': MediaDeviceType.AUDIO_OUTPUT,
        'label': 'Default - Headset (Bose QuietComfort Stereo) (Bluetooth)',
      },
      {
        'deviceId': 'communications',
        'groupId': 'bf1ec0df3fe711fab2128c22b19d3b86e0963d302deee84b171f84c9e2417858',
        'kind': MediaDeviceType.AUDIO_OUTPUT,
        'label': 'Communications - Headset (Bose QuietComfort Stereo) (Bluetooth)',
      },
      {
        'deviceId': 'bb00aceb5a214799cca4d11f10827d60a3462069cd227f8c7874ef60c1401ef0',
        'groupId': 'd16c859ff680089ca8e155e5ecae18aa2582f0ee4a53d02ca3ab1708fe5fb4d0',
        'kind': MediaDeviceType.AUDIO_OUTPUT,
        'label': 'DELL U2713HM (Intel(R) Display-Audio)',
      },
      {
        'deviceId': 'e6bc5cff184fcf11c10a1800c5079c24da038461facd73122e9bc9158afded26',
        'groupId': 'bf1ec0df3fe711fab2128c22b19d3b86e0963d302deee84b171f84c9e2417858',
        'kind': MediaDeviceType.AUDIO_OUTPUT,
        'label': 'Headset (Bose QuietComfort Stereo) (Bluetooth)',
      },
      {
        'deviceId': 'af7da4f952304dfeec3aa5a77141decb309f3e8a1f8e94834e9ec746205bf049',
        'groupId': 'ea09ec3f5571b2b2268e8c6f9b98120a8a43bf29f3c38b344a96a23e8382b3f3',
        'kind': MediaDeviceType.AUDIO_OUTPUT,
        'label': 'Speaker (Realtek High Definition Audio)',
      },
      {
        'deviceId': '2bc694541adf32e336123e5027d991200d939209a13080818132409279b95afb',
        'groupId': '3a7a22368d6425475421fc42cd9052bf3297b53d65e6b7b329f180a9cc90ae99',
        'kind': MediaDeviceType.AUDIO_OUTPUT,
        'label': 'DELL U2713HM (Intel(R) Display-Audio)',
      },
      {
        'deviceId': '1c8c3b8d8e33dc9cc2ea9dc3bc5144f717e2bc45d7d52a22a4148830ca44b7f9',
        'groupId': 'bf1ec0df3fe711fab2128c22b19d3b86e0963d302deee84b171f84c9e2417858',
        'kind': MediaDeviceType.AUDIO_OUTPUT,
        'label': 'Headset (Bose QuietComfort Stereo) (Bluetooth)',
      },
    ],
  };

  const fakeWorldTestSetup = {
    cameras: [
      {deviceId: 'camera1', kind: MediaDeviceType.VIDEO_INPUT, label: 'Camera 1', groupId: '1'},
      {deviceId: 'camera2', kind: MediaDeviceType.VIDEO_INPUT, label: 'Camera 2', groupId: '2'},
    ],
    speakers: [
      {deviceId: 'speaker1', kind: MediaDeviceType.AUDIO_OUTPUT, label: 'Speaker 1', groupId: '1'},
      {deviceId: 'speaker2', kind: MediaDeviceType.AUDIO_OUTPUT, label: 'Speaker 2', groupId: '2'},
    ],
    microphones: [
      {deviceId: 'mic1', kind: MediaDeviceType.AUDIO_INPUT, label: 'Mic 1', groupId: '1'},
      {deviceId: 'mic2', kind: MediaDeviceType.AUDIO_INPUT, label: 'Mic 2', groupId: '2'},
    ],
  };

  describe('refreshMediaDevices', () => {
    it('filters duplicate microphones and keeps the ones marked with "communications"', () => {
      spyOn(navigator.mediaDevices, 'enumerateDevices').and.returnValue(
        Promise.resolve([
          {
            'deviceId': 'default',
            'groupId': 'a7392890d1200b83c3c786d6a08f89b28908493694a2cf014d0cf74e62b4f404',
            'kind': MediaDeviceType.AUDIO_INPUT,
            'label': 'Default - Desktop Microphone (Microsoft® LifeCam Studio(TM)) (045e:0772)',
          },
          {
            'deviceId': 'communications',
            'groupId': 'a7392890d1200b83c3c786d6a08f89b28908493694a2cf014d0cf74e62b4f404',
            'kind': MediaDeviceType.AUDIO_INPUT,
            'label': 'Communications - Desktop Microphone (Microsoft® LifeCam Studio(TM)) (045e:0772)',
          },
          {
            'deviceId': 'c2f7f56ce1d142a4fe13d5bb42e355b7a0ed7de88d1aa93e196ab0b011a183cd',
            'groupId': 'a7392890d1200b83c3c786d6a08f89b28908493694a2cf014d0cf74e62b4f404',
            'kind': MediaDeviceType.AUDIO_INPUT,
            'label': 'Desktop Microphone (Microsoft® LifeCam Studio(TM)) (045e:0772)',
          },
        ]),
      );

      const devicesHandler = new MediaDevicesHandler();

      window.setTimeout(() => {
        expect(devicesHandler.availableDevices.audioInput().length).withContext('Available microphones').toEqual(1);
      });
    });

    it('filters duplicate speakers', () => {
      spyOn(navigator.mediaDevices, 'enumerateDevices').and.returnValue(
        Promise.resolve([...realWorldTestSetup.cameras, ...realWorldTestSetup.microphones, ...realWorldTestSetup.speakers]),
      );

      const devicesHandler = new MediaDevicesHandler();

      expect(realWorldTestSetup.cameras.length).withContext('Unfiltered cameras').toEqual(2);
      expect(realWorldTestSetup.microphones.length).withContext('Unfiltered microphones').toEqual(5);
      expect(realWorldTestSetup.speakers.length).withContext('Unfiltered speakers').toEqual(7);

      window.setTimeout(() => {
        expect(devicesHandler.availableDevices.videoInput().length).withContext('Filtered cameras').toEqual(2);
        expect(devicesHandler.availableDevices.audioInput().length).withContext('Filtered microphones').toEqual(3);
        expect(devicesHandler.availableDevices.audioOutput().length).withContext('Filtered speakers').toEqual(4);
      });
    });
  });

  describe('constructor', () => {
    it('loads available devices and listens to input devices changes', done => {
      spyOn(navigator.mediaDevices, 'enumerateDevices').and.returnValue(
        Promise.resolve([...fakeWorldTestSetup.cameras, ...fakeWorldTestSetup.microphones, ...fakeWorldTestSetup.speakers]),
      );

      const devicesHandler = new MediaDevicesHandler();
      window.setTimeout(() => {
        expect(navigator.mediaDevices.enumerateDevices).withContext('Initial enumeration').toHaveBeenCalledTimes(1);
        expect(devicesHandler.availableDevices.videoInput()).withContext('Initial cameras').toEqual(fakeWorldTestSetup.cameras);
        expect(devicesHandler.availableDevices.audioOutput()).withContext('Initial speakers').toEqual(fakeWorldTestSetup.speakers);

        const newCameras = [{deviceId: 'newcamera', kind: MediaDeviceType.VIDEO_INPUT}];
        navigator.mediaDevices.enumerateDevices.and.returnValue(Promise.resolve(newCameras));
        navigator.mediaDevices.ondevicechange();

        window.setTimeout(() => {
          expect(navigator.mediaDevices.enumerateDevices).withContext('Updated enumeration').toHaveBeenCalledTimes(2);
          expect(devicesHandler.availableDevices.videoInput()).withContext('Updated cameras').toEqual(newCameras);
          expect(devicesHandler.availableDevices.audioOutput()).withContext('Updated speakers').toEqual([]);
          done();
        });
      });
    });
  });

  describe('currentAvailableDeviceId', () => {
    it('only exposes available device', done => {
      spyOn(navigator.mediaDevices, 'enumerateDevices').and.returnValue(
        Promise.resolve([...fakeWorldTestSetup.cameras, ...fakeWorldTestSetup.microphones, ...fakeWorldTestSetup.speakers]),
      );

      const devicesHandler = new MediaDevicesHandler();
      window.setTimeout(() => {
        devicesHandler.currentDeviceId.videoInput(fakeWorldTestSetup.cameras[0].deviceId);

        expect(devicesHandler.currentAvailableDeviceId.videoInput()).toBe(fakeWorldTestSetup.cameras[0].deviceId);

        devicesHandler.currentDeviceId.videoInput('not-existing-id');
        expect(devicesHandler.currentAvailableDeviceId.videoInput()).toBe(
          MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.videoInput,
        );

        devicesHandler.currentDeviceId.audioInput(fakeWorldTestSetup.microphones[0].deviceId);

        expect(devicesHandler.currentAvailableDeviceId.audioInput()).toBe(fakeWorldTestSetup.microphones[0].deviceId);

        devicesHandler.currentDeviceId.audioInput('not-existing-id');
        expect(devicesHandler.currentAvailableDeviceId.audioInput()).toBe(
          MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.audioInput,
        );

        devicesHandler.currentDeviceId.audioOutput(fakeWorldTestSetup.speakers[0].deviceId);

        expect(devicesHandler.currentAvailableDeviceId.audioOutput()).toBe(fakeWorldTestSetup.speakers[0].deviceId);

        devicesHandler.currentDeviceId.audioOutput('inexistant-id');
        expect(devicesHandler.currentAvailableDeviceId.audioOutput()).toBe(
          MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.audioOutput,
        );
        done();
      });
    });
  });
});
