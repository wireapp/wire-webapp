/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {BrowserContext} from '@playwright/test';

// Define a type for our fake devices
interface FakeDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

const fakeVideoDevices: FakeDevice[] = [
  {deviceId: 'fake-camera-1', label: 'Fake Camera 1', kind: 'videoinput'},
  {deviceId: 'fake-camera-2', label: 'Fake Camera 2', kind: 'videoinput'},
  {deviceId: 'fake-camera-3', label: 'Fake Camera 3', kind: 'videoinput'},
];

const fakeAudioInputDevices: FakeDevice[] = [
  {deviceId: 'fake-audio-input-1', label: 'Fake Audio Input 1', kind: 'audioinput'},
  {deviceId: 'fake-audio-input-2', label: 'Fake Audio Input 2', kind: 'audioinput'},
  {deviceId: 'fake-audio-input-3', label: 'Fake Audio Input 3', kind: 'audioinput'},
];

const fakeAudioOutputDevices: FakeDevice[] = [
  {deviceId: 'fake-audio-output-1', label: 'Fake Audio Output 1', kind: 'audiooutput'},
  {deviceId: 'fake-audio-output-2', label: 'Fake Audio Output 2', kind: 'audiooutput'},
  {deviceId: 'fake-audio-output-3', label: 'Fake Audio Output 3', kind: 'audiooutput'},
];

const allFakeDevices = [...fakeVideoDevices, ...fakeAudioInputDevices, ...fakeAudioOutputDevices];

export async function addMockCamerasToContext(context: BrowserContext): Promise<void> {
  // Add init script to existing context
  await context.addInitScript((fakeDevices: FakeDevice[]) => {
    // Cast to any to override read-only properties
    const mediaDevices = navigator.mediaDevices as any;
    const originalEnumerateDevices: () => Promise<MediaDeviceInfo[]> = mediaDevices.enumerateDevices.bind(mediaDevices);
    const originalGetUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream> =
      mediaDevices.getUserMedia.bind(mediaDevices);

    // Helper function to add fake devices to the device list
    function addFakeDevicesToList(devices: MediaDeviceInfo[]): MediaDeviceInfo[] {
      // Filter out real devices of the same kinds we're mocking
      const filteredDevices = devices.filter(
        (d: MediaDeviceInfo) => d.kind !== 'videoinput' && d.kind !== 'audioinput' && d.kind !== 'audiooutput',
      );

      return [
        ...filteredDevices,
        ...fakeDevices.map((fake, i) => ({
          deviceId: fake.deviceId,
          groupId: `fake-group-${i}`,
          kind: fake.kind,
          label: fake.label,
          toJSON: () => ({...fake}),
        })),
      ];
    }

    // Helper function to extract the requested device ID from constraints
    function extractRequestedDeviceId(videoConstraints: MediaTrackConstraints): string | undefined {
      const deviceId = videoConstraints.deviceId;

      if (!deviceId) {
        return undefined;
      }

      if (typeof deviceId === 'object' && 'exact' in deviceId) {
        return deviceId.exact as string;
      }

      if (typeof deviceId === 'object' && 'ideal' in deviceId) {
        return deviceId.ideal as string;
      }

      return typeof deviceId === 'string' ? deviceId : undefined;
    }

    // Helper function to create constraints without deviceId
    function createConstraintsWithoutDeviceId(
      constraints: MediaStreamConstraints,
      videoConstraints: MediaTrackConstraints,
    ): MediaStreamConstraints {
      const newConstraints: MediaStreamConstraints = {
        ...constraints,
        video: {...videoConstraints},
      };
      delete (newConstraints.video as MediaTrackConstraints).deviceId;
      return newConstraints;
    }

    // Mock enumerateDevices
    mediaDevices.enumerateDevices = async (): Promise<MediaDeviceInfo[]> => {
      const devices: MediaDeviceInfo[] = await originalEnumerateDevices();
      return addFakeDevicesToList(devices);
    };

    // Mock getUserMedia
    mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
      const videoConstraints = constraints.video;

      if (!videoConstraints || typeof videoConstraints !== 'object') {
        return originalGetUserMedia(constraints);
      }

      const deviceId = extractRequestedDeviceId(videoConstraints);
      const isFakeDevice = deviceId && fakeDevices.some(fake => fake.deviceId === deviceId);

      if (isFakeDevice) {
        const newConstraints = createConstraintsWithoutDeviceId(constraints, videoConstraints);
        return originalGetUserMedia(newConstraints);
      }

      return originalGetUserMedia(constraints);
    };
  }, allFakeDevices);
}
