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

import {Runtime} from '@wireapp/commons';

import {getLogger, Logger} from 'Util/Logger';
import {loadValue, storeValue} from 'Util/StorageUtil';

import {MediaDeviceType} from './MediaDeviceType';
import {MediaDevicesState, mediaDevicesStore} from './useMediaDevicesStore';

export interface ElectronDesktopCapturerSource {
  display_id: string;
  id: string;
  name: string;
  thumbnail: HTMLCanvasElement;
}

interface ElectronGetSourcesOptions {
  fetchWindowIcons?: boolean;
  thumbnailSize?: {height: number; width: number};
  types: string[];
}

type ElectronDesktopCapturerCallback = (error: Error | null, screenSources: ElectronDesktopCapturerSource[]) => void;

declare global {
  interface Window {
    desktopCapturer?: {
      // Electron <= 4
      getSources(options: ElectronGetSourcesOptions, callback: ElectronDesktopCapturerCallback): void;
      // Electron > 4
      getSources(options: ElectronGetSourcesOptions): Promise<ElectronDesktopCapturerSource[]>;
      getDesktopSources(options: ElectronGetSourcesOptions): Promise<ElectronDesktopCapturerSource[]>;
    };
  }
}

export type PreviousDeviceSupport = Partial<Record<MediaDeviceType, number>>;

enum FavoriteDeviceTypes {
  AUDIO_INPUT = `${MediaDeviceType.AUDIO_INPUT}-fave`,
  AUDIO_OUTPUT = `${MediaDeviceType.AUDIO_OUTPUT}-fave`,
  VIDEO_INPUT = `${MediaDeviceType.VIDEO_INPUT}-fave`,
  SCREEN_INPUT = `${MediaDeviceType.SCREEN_INPUT}-fave`,
}

export class MediaDevicesHandler {
  private readonly logger: Logger;
  private onMediaDevicesRefresh?: () => void;
  private previousDeviceSupport: PreviousDeviceSupport = {};
  private devicesAreInit = false;

  static get CONFIG() {
    return {
      DEFAULT_DEVICE: {
        audioinput: 'default',
        audiooutput: 'default',
        screeninput: 'screen',
        videoinput: 'default',
        windowinput: 'window',
      },
    };
  }

  /**
   * Construct a new MediaDevices handler.
   */
  constructor() {
    this.logger = getLogger('MediaDevicesHandler');

    const supportsUserMedia = Runtime.isSupportingUserMedia();
    mediaDevicesStore.setState({
      audioInputDeviceId: loadValue(MediaDeviceType.AUDIO_INPUT) ?? 'default',
      audioOutputDeviceId: loadValue(MediaDeviceType.AUDIO_OUTPUT) ?? 'default',
      screenInputDeviceId: loadValue(MediaDeviceType.SCREEN_INPUT) ?? 'screen',
      videoInputDeviceId: loadValue(MediaDeviceType.VIDEO_INPUT) ?? 'default',
      audioInputSupported: supportsUserMedia,
      videoInputSupported: supportsUserMedia,
      audioOutputSupported: false,
      screenInputSupported: !!window.desktopCapturer,
    });

    mediaDevicesStore.subscribe((state, prev) => {
      this.updateFavoriteList(MediaDeviceType.AUDIO_INPUT, state.audioInputDeviceId, prev.audioInputDeviceId, state);
      this.updateFavoriteList(MediaDeviceType.AUDIO_OUTPUT, state.audioOutputDeviceId, prev.audioOutputDeviceId, state);
      this.updateFavoriteList(MediaDeviceType.VIDEO_INPUT, state.videoInputDeviceId, prev.videoInputDeviceId, state);
      this.updateFavoriteList(MediaDeviceType.SCREEN_INPUT, state.screenInputDeviceId, prev.screenInputDeviceId, state);
    });

    void this.initializeMediaDevices(false);
  }

  public setOnMediaDevicesRefreshHandler(handler: () => void) {
    this.onMediaDevicesRefresh = handler;
  }

  /**
   * Initialize the list of MediaDevices and subscriptions.
   * @camera: boolean, Only when the camera is queried can the entire device list be accessed.
   */
  public async initializeMediaDevices(camera = false) {
    if (!Runtime.isSupportingUserMedia() || this.devicesAreInit) {
      return;
    }

    await this.refreshMediaDevices(camera);
    this.subscribeToDevices();

    if (camera) {
      this.devicesAreInit = true;
    }
  }

  private orderFavoriteDevices(selectedId: string, favoriteDevices: string[], disconnected: boolean) {
    return disconnected ? favoriteDevices : [selectedId, ...favoriteDevices.filter(id => id !== selectedId)];
  }

  private updateFavoriteList(type: MediaDeviceType, newId: string, prevId: string, state: MediaDevicesState) {
    if (newId === prevId) {
      return;
    }

    const lengths = {
      [MediaDeviceType.AUDIO_INPUT]: state.audioInputDevices.length,
      [MediaDeviceType.AUDIO_OUTPUT]: state.audioOutputDevices.length,
      [MediaDeviceType.VIDEO_INPUT]: state.videoInputDevices.length,
      [MediaDeviceType.SCREEN_INPUT]: state.screenInputDevices.length,
    };

    storeValue(type, newId);

    const favoriteKey = this.favoriteKeyFor(type);
    const faves = loadValue<string[]>(favoriteKey) ?? [];

    const prevCount = this.previousDeviceSupport[type] ?? 0;
    const nowCount = lengths[type];
    const disconnected = prevCount > nowCount;

    const newFaves = this.orderFavoriteDevices(newId, faves, disconnected);
    storeValue(favoriteKey, newFaves);
  }

  /**
   * Subscribe to MediaDevices updates if available.
   */
  private subscribeToDevices() {
    navigator.mediaDevices.ondevicechange = () => {
      this.logger.info('List of available MediaDevices has changed');
      this.refreshMediaDevices();
    };
  }

  private filterMediaDevices(mediaDevices: MediaDeviceInfo[]) {
    const cameras = mediaDevices.filter(({kind}) => kind === MediaDeviceType.VIDEO_INPUT);
    const microphones = mediaDevices.filter(({kind}) => kind === MediaDeviceType.AUDIO_INPUT);
    const speakers = mediaDevices.filter(({kind}) => kind === MediaDeviceType.AUDIO_OUTPUT);
    return {cameras, microphones, speakers};
  }

  /**
   * Update list of available MediaDevices.
   * @param [camera=false] If `camera=true`, a video track is also created when the device list is read.
   * This ensures that the video device labels can also be read. This is necessary for initializing the entire device list.
   */
  public async refreshMediaDevices(camera = false) {
    try {
      this.removeAllDevices();
      const mediaDevices = await window.navigator.mediaDevices.enumerateDevices();

      if (!mediaDevices) {
        throw new Error('No media devices found');
      }

      const {microphones, speakers, cameras} = this.filterMediaDevices(mediaDevices);

      const prev = mediaDevicesStore.getState();

      const audioInputId = this.pickDeviceId(MediaDeviceType.AUDIO_INPUT, microphones, prev.audioInputDeviceId);
      const audioOutputId = this.pickDeviceId(MediaDeviceType.AUDIO_OUTPUT, speakers, prev.audioOutputDeviceId);
      const videoInputId = this.pickDeviceId(MediaDeviceType.VIDEO_INPUT, cameras, prev.videoInputDeviceId);

      mediaDevicesStore.setState({
        // lists
        audioInputDevices: microphones,
        audioOutputDevices: speakers,
        videoInputDevices: cameras,
        // support
        audioInputSupported: microphones.length > 0,
        audioOutputSupported: speakers.length > 0,
        videoInputSupported: cameras.length > 0,
        // selections (resolved once)
        audioInputDeviceId: audioInputId,
        audioOutputDeviceId: audioOutputId,
        videoInputDeviceId: videoInputId,
      });

      // update for next disconnected detection pass
      this.previousDeviceSupport = {
        [MediaDeviceType.AUDIO_INPUT]: microphones.length,
        [MediaDeviceType.AUDIO_OUTPUT]: speakers.length,
        [MediaDeviceType.VIDEO_INPUT]: cameras.length,
      };

      this.onMediaDevicesRefresh?.();

      return mediaDevices;
    } catch (error) {
      this.logger.error(`Failed to update MediaDevice list: ${error instanceof Error ? error.message : ''}`, error);
      throw error;
    }
  }

  private pickDeviceId(type: MediaDeviceType, devices: MediaDeviceInfo[], currentId: string) {
    const defaults = MediaDevicesHandler.CONFIG.DEFAULT_DEVICE[type];
    const first = devices[0]?.deviceId;

    // favorite first (must exist)
    const favorites = loadValue<string[]>(this.favoriteKeyFor(type)) ?? [];
    const matchedFavorite = favorites.find(fav => devices.some(({deviceId}) => deviceId === fav));
    if (matchedFavorite) {
      return matchedFavorite;
    }

    // keep current if still available
    if (devices.some(({deviceId}) => deviceId === currentId)) {
      return currentId;
    }

    // else first available or default
    return first ?? defaults;
  }

  public async getScreenSources() {
    const options: ElectronGetSourcesOptions = {
      thumbnailSize: {
        height: 176,
        width: 312,
      },
      types: [
        MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.screeninput,
        MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.windowinput,
      ],
    };

    const screenSources = await this.getSourcesWrapper(options);

    this.logger.info(`Detected '${screenSources.length}' sources for screen sharing from Electron`);

    mediaDevicesStore.setState({
      screenInputDevices: screenSources,
      screenInputSupported: screenSources.length > 0,
    });

    return screenSources;
  }

  private getSourcesWrapper(options: ElectronGetSourcesOptions): Promise<ElectronDesktopCapturerSource[]> {
    /**
     * Electron.desktopCapturer.getSources() is not available from electron 17 anymore
     * for further info please visit:
     * https://www.electronjs.org/docs/latest/breaking-changes#removed-desktopcapturergetsources-in-the-renderer
     */
    if (window.desktopCapturer?.getDesktopSources) {
      return window.desktopCapturer.getDesktopSources(options);
    }
    if (window.desktopCapturer?.getSources.constructor.name === 'AsyncFunction') {
      // Electron > 4
      return window.desktopCapturer.getSources(options);
    }
    // Electron <= 4
    return new Promise((resolve, reject) =>
      window.desktopCapturer?.getSources(options, (error, screenSources) =>
        error ? reject(error) : resolve(screenSources),
      ),
    );
  }

  /**
   * Remove all known MediaDevices from the lists.
   */
  private removeAllDevices() {
    mediaDevicesStore.getState().resetDevices();
  }

  private favoriteKeyFor(type: MediaDeviceType) {
    switch (type) {
      case MediaDeviceType.AUDIO_INPUT:
        return FavoriteDeviceTypes.AUDIO_INPUT;
      case MediaDeviceType.AUDIO_OUTPUT:
        return FavoriteDeviceTypes.AUDIO_OUTPUT;
      case MediaDeviceType.VIDEO_INPUT:
        return FavoriteDeviceTypes.VIDEO_INPUT;
      case MediaDeviceType.SCREEN_INPUT:
        return FavoriteDeviceTypes.SCREEN_INPUT;
      default:
        return `${type}-fave`;
    }
  }
}
