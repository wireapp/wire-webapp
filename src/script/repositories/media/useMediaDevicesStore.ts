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

import {useStore} from 'zustand';
import {createStore} from 'zustand/vanilla';

import {ElectronDesktopCapturerSource} from 'Repositories/media/MediaDevicesHandler';

export const defaultAudioInputId = 'default';
export const defaultAudioOutputId = 'default';
export const defaultVideoInputId = 'default';
export const defaultScreenInputId = 'screen';

export type MediaDevicesState = {
  // device lists
  audioInputDevices: MediaDeviceInfo[];
  audioOutputDevices: MediaDeviceInfo[];
  videoInputDevices: MediaDeviceInfo[];
  screenInputDevices: ElectronDesktopCapturerSource[];

  // selected ids
  audioInputDeviceId: string;
  audioOutputDeviceId: string;
  videoInputDeviceId: string;
  screenInputDeviceId: string;

  // support flags
  audioInputSupported: boolean;
  audioOutputSupported: boolean;
  videoInputSupported: boolean;
  screenInputSupported: boolean;

  // setters (accountStore style)
  setAudioInputDevices: (devices: MediaDeviceInfo[]) => void;
  setAudioOutputDevices: (devices: MediaDeviceInfo[]) => void;
  setVideoInputDevices: (devices: MediaDeviceInfo[]) => void;
  setScreenInputSources: (sources: ElectronDesktopCapturerSource[]) => void;

  setAudioInputDeviceId: (id: string) => void;
  setAudioOutputDeviceId: (id: string) => void;
  setVideoInputDeviceId: (id: string) => void;
  setScreenInputDeviceId: (id: string) => void;

  setAudioInputSupported: (v: boolean) => void;
  setAudioOutputSupported: (v: boolean) => void;
  setVideoInputSupported: (v: boolean) => void;
  setScreenInputSupported: (v: boolean) => void;

  // resets
  resetDevices: () => void;
  resetSelections: () => void;
  resetSupport: () => void;
};

export const mediaDevicesStore = createStore<MediaDevicesState>(set => ({
  // lists
  audioInputDevices: [],
  audioOutputDevices: [],
  videoInputDevices: [],
  screenInputDevices: [],

  // selections
  audioInputDeviceId: defaultAudioInputId,
  audioOutputDeviceId: defaultAudioOutputId,
  videoInputDeviceId: defaultVideoInputId,
  screenInputDeviceId: defaultScreenInputId,

  // support
  audioInputSupported: false,
  audioOutputSupported: false,
  videoInputSupported: false,
  screenInputSupported: false,

  // list setters
  setAudioInputDevices: devices => set({audioInputDevices: devices}),
  setAudioOutputDevices: devices => set({audioOutputDevices: devices}),
  setVideoInputDevices: devices => set({videoInputDevices: devices}),
  setScreenInputSources: sources => set({screenInputDevices: sources}),

  // id setters
  setAudioOutputDeviceId: (id: string) =>
    set(state => {
      const exists = state.audioOutputDevices.some(({deviceId}) => deviceId === id);
      return {audioOutputDeviceId: exists ? id : 'default'};
    }),

  setAudioInputDeviceId: (id: string) =>
    set(state => {
      const exists = state.audioInputDevices.some(({deviceId}) => deviceId === id);
      return {audioInputDeviceId: exists ? id : 'default'};
    }),

  setVideoInputDeviceId: (id: string) =>
    set(state => {
      const exists = state.videoInputDevices.some(({deviceId}) => deviceId === id);
      return {videoInputDeviceId: exists ? id : 'default'};
    }),

  setScreenInputDeviceId: (id: string) =>
    set(state => {
      const exists = state.screenInputDevices.some((device: ElectronDesktopCapturerSource) => device.id === id);
      return {screenInputDeviceId: exists ? id : 'screen'};
    }),

  // support setters
  setAudioInputSupported: value => set({audioInputSupported: value}),
  setAudioOutputSupported: value => set({audioOutputSupported: value}),
  setVideoInputSupported: value => set({videoInputSupported: value}),
  setScreenInputSupported: value => set({screenInputSupported: value}),

  // resets
  resetDevices: () =>
    set({
      audioInputDevices: [],
      audioOutputDevices: [],
      videoInputDevices: [],
      screenInputDevices: [],
    }),
  resetSelections: () =>
    set({
      audioInputDeviceId: defaultAudioInputId,
      audioOutputDeviceId: defaultAudioOutputId,
      videoInputDeviceId: defaultVideoInputId,
      screenInputDeviceId: defaultScreenInputId,
    }),
  resetSupport: () =>
    set({
      audioInputSupported: false,
      audioOutputSupported: false,
      videoInputSupported: false,
      screenInputSupported: false,
    }),
}));

export const useMediaDevicesStore = (): MediaDevicesState => useStore(mediaDevicesStore);
