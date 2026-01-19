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

export async function addMockCamerasToContext(context: BrowserContext): Promise<void> {
  // Add init script to existing context
  await context.addInitScript(() => {
    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia.bind(navigator.mediaDevices);

    navigator.mediaDevices.enumerateDevices = async () => {
      return [
        {
          deviceId: 'default',
          kind: 'videoinput',
          label: 'Fake Camera 1',
          groupId: 'video-group-1',
          toJSON: () => '{}',
          __proto__: MediaDeviceInfo.prototype,
        },
        {
          deviceId: 'video-2',
          kind: 'videoinput',
          label: 'Fake Camera 2',
          groupId: 'video-group-2',
          toJSON: () => '{}',
          __proto__: MediaDeviceInfo.prototype,
        },
        {
          deviceId: 'video-3',
          kind: 'videoinput',
          label: 'Fake Camera 3',
          groupId: 'video-group-3',
          toJSON: () => '{}',
          __proto__: MediaDeviceInfo.prototype,
        },

        {
          deviceId: 'default',
          kind: 'audioinput',
          label: 'Fake Audio Input 1',
          groupId: 'audio-input-group-1',
          toJSON: () => '{}',
          __proto__: MediaDeviceInfo.prototype,
        },
        {
          deviceId: 'audio-input-2',
          kind: 'audioinput',
          label: 'Fake Audio Input 2',
          groupId: 'audio-input-group-2',
          toJSON: () => '{}',
          __proto__: MediaDeviceInfo.prototype,
        },
        {
          deviceId: 'audio-input-3',
          kind: 'audioinput',
          label: 'Fake Audio Input 3',
          groupId: 'audio-input-group-3',
          toJSON: () => '{}',
          __proto__: MediaDeviceInfo.prototype,
        },

        {
          deviceId: 'default',
          kind: 'audiooutput',
          label: 'Fake Audio Output 1',
          groupId: 'audio-output-group-1',
          toJSON: () => '{}',
          __proto__: MediaDeviceInfo.prototype,
        },
        {
          deviceId: 'audio-output-2',
          kind: 'audiooutput',
          label: 'Fake Audio Output 2',
          groupId: 'audio-output-group-2',
          toJSON: () => '{}',
          __proto__: MediaDeviceInfo.prototype,
        },
        {
          deviceId: 'audio-output-3',
          kind: 'audiooutput',
          label: 'Fake Audio Output 3',
          groupId: 'audio-output-group-3',
          toJSON: () => '{}',
          __proto__: MediaDeviceInfo.prototype,
        },
      ];
    };

    navigator.mediaDevices.getUserMedia = async () => {
      const stream = await originalGetUserMedia({audio: {deviceId: 'default'}, video: {deviceId: 'default'}});
      return stream;
    };
  });
}
