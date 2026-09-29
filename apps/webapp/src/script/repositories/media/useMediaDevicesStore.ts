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

import {isNonEmptyString, isUndefined} from '@sindresorhus/is';
import {useStore} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import {createStore} from 'zustand/vanilla';

import type {ElectronDesktopCapturerSource} from 'Repositories/media/MediaDevicesHandler';

export const defaultAudioInputId = 'default';
export const defaultAudioOutputId = 'default';
export const defaultVideoInputId = 'default';
export const defaultScreenInputId = 'screen';

/**
 * Filter out invalid devices empty deviceId or label
 * return MediaDeviceInfo[]
 */
function filterInvalidDevices(devices: MediaDeviceInfo[]): MediaDeviceInfo[] {
  return devices.filter(device => {
    return isNonEmptyString(device.deviceId) && isNonEmptyString(device.label);
  });
}

type MediaChannelPatch<Device> = Readonly<
  Partial<Pick<MediaChannel<Device>, 'devices' | 'activeId' | 'preferredId' | 'supported'>>
>;
// omit thumbnail (which is a native image) to avoid serialization issues in Zustand immer
type ScreenDevice = Omit<ElectronDesktopCapturerSource, 'thumbnail'> & {readonly thumbnail: unknown};

type MediaChannel<Device> = {
  devices: Device[];
  activeId: string;
  preferredId: string;
  supported: boolean;
};

type ScreenChannel = {
  devices: ScreenDevice[];
  activeId: string;
  supported: boolean;
};

// Partial batch update type
type MediaDevicesBatch = {
  readonly audio?: {
    readonly input?: MediaChannelPatch<MediaDeviceInfo>;
    readonly output?: MediaChannelPatch<MediaDeviceInfo>;
  };
  readonly video?: {
    readonly input?: MediaChannelPatch<MediaDeviceInfo>;
  };
  readonly screen?: {
    readonly input?: Readonly<Partial<Pick<ScreenChannel, 'devices' | 'activeId' | 'supported'>>>;
  };
};

export type MediaDevicesState = {
  audio: {
    input: MediaChannel<MediaDeviceInfo>;
    output: MediaChannel<MediaDeviceInfo>;
  };
  video: {
    input: MediaChannel<MediaDeviceInfo>;
  };
  screen: {
    input: ScreenChannel;
  };

  // device list setters
  setAudioInputDevices(devices: MediaDeviceInfo[]): void;
  setAudioOutputDevices(devices: MediaDeviceInfo[]): void;
  setVideoInputDevices(devices: MediaDeviceInfo[]): void;
  setScreenInputSources(sources: ScreenDevice[]): void;

  // explicit physical-device preference setters
  setAudioInputDeviceId(id: string): void;
  setAudioOutputDeviceId(id: string): void;
  setVideoInputDeviceId(id: string): void;
  setScreenInputDeviceId(id: string): void;

  // supported setters
  setAudioInputSupported(supported: boolean): void;
  setAudioOutputSupported(supported: boolean): void;
  setVideoInputSupported(supported: boolean): void;
  setScreenInputSupported(supported: boolean): void;

  // batch setter to minimize renders when refreshing all devices
  setAll(payload: MediaDevicesBatch): void;

  // resets
  resetDevices(): void;
  resetSelections(): void;
  resetSupport(): void;
};

export const mediaDevicesStore = createStore<MediaDevicesState>()(
  immer<MediaDevicesState>((set, get) => ({
    audio: {
      input: {devices: [], activeId: defaultAudioInputId, preferredId: defaultAudioInputId, supported: false},
      output: {devices: [], activeId: defaultAudioOutputId, preferredId: defaultAudioOutputId, supported: false},
    },
    video: {
      input: {devices: [], activeId: defaultVideoInputId, preferredId: defaultVideoInputId, supported: false},
    },
    screen: {
      input: {devices: [], activeId: defaultScreenInputId, supported: false},
    },

    // devices setters
    setAudioInputDevices: devices =>
      set(state => {
        state.audio.input.devices = filterInvalidDevices(devices);
      }),

    setAudioOutputDevices: devices =>
      set(state => {
        state.audio.output.devices = filterInvalidDevices(devices);
      }),

    setVideoInputDevices: devices =>
      set(state => {
        state.video.input.devices = filterInvalidDevices(devices);
      }),

    setScreenInputSources: sources =>
      set(state => {
        state.screen.input.devices = sources;
      }),

    // explicit physical-device preference setters
    setAudioInputDeviceId: id => {
      return set(state => {
        const exists = state.audio.input.devices.some((device: MediaDeviceInfo) => {
          return device.deviceId === id;
        });
        if (exists) {
          state.audio.input.activeId = id;
          state.audio.input.preferredId = id;

          return;
        }
        state.audio.input.activeId = defaultAudioInputId;
      });
    },

    setAudioOutputDeviceId: id => {
      return set(state => {
        const exists = state.audio.output.devices.some((device: MediaDeviceInfo) => {
          return device.deviceId === id;
        });
        if (exists) {
          state.audio.output.activeId = id;
          state.audio.output.preferredId = id;

          return;
        }
        state.audio.output.activeId = defaultAudioOutputId;
      });
    },

    setVideoInputDeviceId: id => {
      return set(state => {
        const exists = state.video.input.devices.some((device: MediaDeviceInfo) => {
          return device.deviceId === id;
        });
        if (exists) {
          state.video.input.activeId = id;
          state.video.input.preferredId = id;

          return;
        }
        state.video.input.activeId = defaultVideoInputId;
      });
    },

    setScreenInputDeviceId: id => {
      return set(state => {
        const exists = state.screen.input.devices.some((device: ScreenDevice) => {
          return device.id === id;
        });
        state.screen.input.activeId = exists ? id : defaultScreenInputId;
      });
    },

    // isSupported setters
    setAudioInputSupported: value =>
      set(state => {
        state.audio.input.supported = value;
      }),
    setAudioOutputSupported: value =>
      set(state => {
        state.audio.output.supported = value;
      }),
    setVideoInputSupported: value =>
      set(state => {
        state.video.input.supported = value;
      }),
    setScreenInputSupported: value =>
      set(state => {
        state.screen.input.supported = value;
      }),

    // set state in batch
    setAll: payload =>
      set(state => {
        // audio.input
        if (payload.audio?.input?.devices !== undefined) {
          state.audio.input.devices = filterInvalidDevices(payload.audio.input.devices);
        }
        const audioInputActiveId = payload.audio?.input?.activeId;
        if (!isUndefined(audioInputActiveId)) {
          state.audio.input.activeId = audioInputActiveId;
        }
        const audioInputPreferredId = payload.audio?.input?.preferredId;
        if (!isUndefined(audioInputPreferredId)) {
          state.audio.input.preferredId = audioInputPreferredId;
        }
        const audioInputSupported = payload.audio?.input?.supported;
        if (!isUndefined(audioInputSupported)) {
          state.audio.input.supported = audioInputSupported;
        }

        // audio.output
        if (payload.audio?.output?.devices !== undefined) {
          state.audio.output.devices = filterInvalidDevices(payload.audio.output.devices);
        }
        const audioOutputActiveId = payload.audio?.output?.activeId;
        if (!isUndefined(audioOutputActiveId)) {
          state.audio.output.activeId = audioOutputActiveId;
        }
        const audioOutputPreferredId = payload.audio?.output?.preferredId;
        if (!isUndefined(audioOutputPreferredId)) {
          state.audio.output.preferredId = audioOutputPreferredId;
        }
        const audioOutputSupported = payload.audio?.output?.supported;
        if (!isUndefined(audioOutputSupported)) {
          state.audio.output.supported = audioOutputSupported;
        }

        // video.input
        if (payload.video?.input?.devices !== undefined) {
          state.video.input.devices = filterInvalidDevices(payload.video.input.devices);
        }
        const videoInputActiveId = payload.video?.input?.activeId;
        if (!isUndefined(videoInputActiveId)) {
          state.video.input.activeId = videoInputActiveId;
        }
        const videoInputPreferredId = payload.video?.input?.preferredId;
        if (!isUndefined(videoInputPreferredId)) {
          state.video.input.preferredId = videoInputPreferredId;
        }
        const videoInputSupported = payload.video?.input?.supported;
        if (!isUndefined(videoInputSupported)) {
          state.video.input.supported = videoInputSupported;
        }

        // screen.input
        if (payload.screen?.input?.devices !== undefined) {
          state.screen.input.devices = payload.screen.input.devices;
        }
        const screenInputActiveId = payload.screen?.input?.activeId;
        if (!isUndefined(screenInputActiveId)) {
          state.screen.input.activeId = screenInputActiveId;
        }
        const screenInputSupported = payload.screen?.input?.supported;
        if (!isUndefined(screenInputSupported)) {
          state.screen.input.supported = screenInputSupported;
        }
      }),

    // resets
    resetDevices: () =>
      set(state => {
        state.audio.input.devices = [];
        state.audio.output.devices = [];
        state.video.input.devices = [];
        state.screen.input.devices = [];
      }),
    resetSelections: () =>
      set(state => {
        state.audio.input.activeId = defaultAudioInputId;
        state.audio.input.preferredId = defaultAudioInputId;
        state.audio.output.activeId = defaultAudioOutputId;
        state.audio.output.preferredId = defaultAudioOutputId;
        state.video.input.activeId = defaultVideoInputId;
        state.video.input.preferredId = defaultVideoInputId;
        state.screen.input.activeId = defaultScreenInputId;
      }),
    resetSupport: () =>
      set(state => {
        state.audio.input.supported = false;
        state.audio.output.supported = false;
        state.video.input.supported = false;
        state.screen.input.supported = false;
      }),
  })),
);

export function useMediaDevicesStore<T>(selector: (state: MediaDevicesState) => T): T {
  return useStore(mediaDevicesStore, selector);
}
