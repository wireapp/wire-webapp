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

/**
 * Init script to mock the available audio and video devices the browser sees.
 *
 * Usage: `context.addInitScript(mockAudioAndVideoDevices);`
 *
 * This will add 3 devices for audio in- and output as well as 3 cameras.
 * No matter which of the devices is selected the default input is returned. (The default input is mocked via launchArgs in the playwright config)
 */
export const mockAudioAndVideoDevices = () => {
  // Keep a copy of the original function so it can be used within its own stub
  const originalGetUserMedia = navigator.mediaDevices?.getUserMedia.bind(navigator.mediaDevices);

  // Mock the devices the browser sees, 3 for each device type
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

  /**
   * Stub the function to always return the default audio / video stream no matter which device was requested.
   * This is necessary as only the default device gets mocked by the chrome launch args,
   * otherwise the dummy devices defined above would show up as inputs but wouldn't work once selected.
   */
  navigator.mediaDevices.getUserMedia = async () => {
    return await originalGetUserMedia({audio: {deviceId: 'default'}, video: {deviceId: 'default'}});
  };
};
