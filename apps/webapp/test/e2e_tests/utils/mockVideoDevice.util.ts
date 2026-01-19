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

    navigator.mediaDevices.enumerateDevices = async () => [
      // Create 3 fake cameras
      ...Array.from<unknown, MediaDeviceInfo>({length: 3}, (_, i) => ({
        deviceId: `video-camera-${i + 1}`,
        kind: 'videoinput',
        label: `Fake Camera ${i + 1}`,
        groupId: `video-group-${i + 1}`,
        toJSON: () => `{ "deviceId": "video-camera-${i + 1}" }`,
      })),

      // Create 3 fake audio inputs
      ...Array.from<unknown, MediaDeviceInfo>({length: 3}, (_, i) => ({
        deviceId: `audio-input-${i + 1}`,
        kind: 'audioinput',
        label: `Fake Audio Input ${i + 1}`,
        groupId: `audio-input-group-${i + 1}`,
        toJSON: () => `{ "deviceId": "audio-input-${i + 1}" }`,
      })),

      // Create 3 fake audio outputs
      ...Array.from<unknown, MediaDeviceInfo>({length: 3}, (_, i) => ({
        deviceId: `audio-output-${i + 1}`,
        kind: 'audiooutput',
        label: `Fake Audio Output ${i + 1}`,
        groupId: `audio-output-group-${i + 1}`,
        toJSON: () => `{ "deviceId": "audio-output-${i + 1}" }`,
      })),
    ];

    navigator.mediaDevices.getUserMedia = async () => {
      return await originalGetUserMedia({audio: {deviceId: 'default'}, video: {deviceId: 'default'}});
    };
  });
}
