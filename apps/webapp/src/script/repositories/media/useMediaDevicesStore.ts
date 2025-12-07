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

import {ElectronDesktopCapturerSource} from 'Repositories/media/MediaDevicesHandler';
import {useStore} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import {createStore} from 'zustand/vanilla';

export const defaultAudioInputId = 'default';
export const defaultAudioOutputId = 'default';
export const defaultVideoInputId = 'default';
export const defaultScreenInputId = 'screen';

type MediaChannelPatch<T> = Partial<Pick<MediaChannel<T>, 'devices' | 'selectedId' | 'supported'>>;
// omit thumbnail (which is a native image) to avoid serialization issues in Zustand immer
type ScreenDevice = Omit<ElectronDesktopCapturerSource, 'thumbnail'> & {thumbnail: unknown};

type MediaChannel<TDevice> = {
  devices: TDevice[];
  selectedId: string;
  supported: boolean;
};

// Partial batch update type
type MediaDevicesBatch = {
  audio?: {
    input?: MediaChannelPatch<MediaDeviceInfo>;
    output?: MediaChannelPatch<MediaDeviceInfo>;
  };
  video?: {
    input?: MediaChannelPatch<MediaDeviceInfo>;
  };
  screen?: {
    input?: MediaChannelPatch<ScreenDevice>;
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
    input: MediaChannel<ScreenDevice>;
  };

  // device list setters
  setAudioInputDevices(devices: MediaDeviceInfo[]): void;
  setAudioOutputDevices(devices: MediaDeviceInfo[]): void;
  setVideoInputDevices(devices: MediaDeviceInfo[]): void;
  setScreenInputSources(sources: ScreenDevice[]): void;

  // selection setters
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
      input: {devices: [], selectedId: defaultAudioInputId, supported: false},
      output: {devices: [], selectedId: defaultAudioOutputId, supported: false},
    },
    video: {
      input: {devices: [], selectedId: defaultVideoInputId, supported: false},
    },
    screen: {
      input: {devices: [], selectedId: defaultScreenInputId, supported: false},
    },

    // devices setters
    setAudioInputDevices: devices =>
      set(state => {
        state.audio.input.devices = devices;
      }),

    setAudioOutputDevices: devices =>
      set(state => {
        state.audio.output.devices = devices;
      }),

    setVideoInputDevices: devices =>
      set(state => {
        state.video.input.devices = devices;
      }),

    setScreenInputSources: sources =>
      set(state => {
        state.screen.input.devices = sources;
      }),

    // id setters
    setAudioInputDeviceId: id =>
      set(state => {
        const exists = state.audio.input.devices.some((device: MediaDeviceInfo) => device.deviceId === id);
        state.audio.input.selectedId = exists ? id : defaultAudioInputId;
      }),

    setAudioOutputDeviceId: id =>
      set(state => {
        const exists = state.audio.output.devices.some((device: MediaDeviceInfo) => device.deviceId === id);
        state.audio.output.selectedId = exists ? id : defaultAudioOutputId;
      }),

    setVideoInputDeviceId: id =>
      set(state => {
        const exists = state.video.input.devices.some((device: MediaDeviceInfo) => device.deviceId === id);
        state.video.input.selectedId = exists ? id : defaultVideoInputId;
      }),

    setScreenInputDeviceId: id =>
      set(state => {
        const exists = state.screen.input.devices.some((device: ScreenDevice) => device.id === id);
        state.screen.input.selectedId = exists ? id : defaultScreenInputId;
      }),

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
          state.audio.input.devices = payload.audio.input.devices;
        }
        if (payload.audio?.input?.selectedId !== undefined) {
          state.audio.input.selectedId = payload.audio.input.selectedId!;
        }
        if (payload.audio?.input?.supported !== undefined) {
          state.audio.input.supported = payload.audio.input.supported!;
        }

        // audio.output
        if (payload.audio?.output?.devices !== undefined) {
          state.audio.output.devices = payload.audio.output.devices;
        }
        if (payload.audio?.output?.selectedId !== undefined) {
          state.audio.output.selectedId = payload.audio.output.selectedId!;
        }
        if (payload.audio?.output?.supported !== undefined) {
          state.audio.output.supported = payload.audio.output.supported!;
        }

        // video.input
        if (payload.video?.input?.devices !== undefined) {
          state.video.input.devices = payload.video.input.devices;
        }
        if (payload.video?.input?.selectedId !== undefined) {
          state.video.input.selectedId = payload.video.input.selectedId!;
        }
        if (payload.video?.input?.supported !== undefined) {
          state.video.input.supported = payload.video.input.supported!;
        }

        // screen.input
        if (payload.screen?.input?.devices !== undefined) {
          state.screen.input.devices = payload.screen.input.devices;
        }
        if (payload.screen?.input?.selectedId !== undefined) {
          state.screen.input.selectedId = payload.screen.input.selectedId!;
        }
        if (payload.screen?.input?.supported !== undefined) {
          state.screen.input.supported = payload.screen.input.supported!;
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
        state.audio.input.selectedId = defaultAudioInputId;
        state.audio.output.selectedId = defaultAudioOutputId;
        state.video.input.selectedId = defaultVideoInputId;
        state.screen.input.selectedId = defaultScreenInputId;
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

export const useMediaDevicesStore = <T>(selector: (state: MediaDevicesState) => T): T =>
  useStore(mediaDevicesStore, selector);
