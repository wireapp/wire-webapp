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

// Define your fake camera devices
const fakeVideoDevices = [
  {deviceId: 'fake-camera-1', label: 'Fake Camera 1'},
  {deviceId: 'fake-camera-2', label: 'Fake Camera 2'},
  {deviceId: 'fake-camera-3', label: 'Fake Camera 3'},
];

export async function addMockCamerasToContext(context: BrowserContext): Promise<void> {
  // Add init script to existing context
  await context.addInitScript(fakeDevices => {
    // Cast to any to override read-only properties
    const mediaDevices = navigator.mediaDevices as any;
    const originalEnumerateDevices = mediaDevices.enumerateDevices.bind(mediaDevices);
    const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);

    // Mock enumerateDevices
    mediaDevices.enumerateDevices = async (): Promise<MediaDeviceInfo[]> => {
      const devices = await originalEnumerateDevices();
      return [
        ...devices.filter((d: MediaDeviceInfo) => d.kind !== 'videoinput'),
        ...fakeDevices.map((fake, i) => ({
          deviceId: fake.deviceId,
          groupId: `fake-group-${i}`,
          kind: 'videoinput' as const,
          label: fake.label,
          toJSON: () => ({...fake, kind: 'videoinput'}),
        })),
      ];
    };

    // Mock getUserMedia
    mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints): Promise<MediaStream> => {
      const videoConstraints = constraints.video;

      if (videoConstraints && typeof videoConstraints === 'object') {
        const deviceId = (videoConstraints as {deviceId?: ConstrainDOMString}).deviceId;

        if (deviceId) {
          const requestedId =
            typeof deviceId === 'object' && 'exact' in deviceId
              ? deviceId.exact
              : typeof deviceId === 'object' && 'ideal' in deviceId
                ? deviceId.ideal
                : typeof deviceId === 'string'
                  ? deviceId
                  : undefined;

          // Check if fake device is requested
          if (requestedId && fakeDevices.some(fake => fake.deviceId === requestedId)) {
            const newConstraints = {
              ...constraints,
              video: {...videoConstraints},
            };
            delete (newConstraints.video as {deviceId?: unknown}).deviceId;
            return originalGetUserMedia(newConstraints);
          }
        }
      }

      return originalGetUserMedia(constraints);
    };
  }, fakeVideoDevices);
}
