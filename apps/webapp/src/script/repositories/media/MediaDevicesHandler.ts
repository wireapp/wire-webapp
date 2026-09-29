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

import {isArray, isNullOrUndefined, isNonEmptyString} from '@sindresorhus/is';
import {maybe as Maybe} from 'true-myth';

import {Runtime} from '@wireapp/commons';

import {getLogger, Logger} from 'Util/logger';
import {loadValue, storeValue} from 'Util/storageUtil';

import {MediaDeviceType} from './MediaDeviceType';
import {resolveActiveDeviceId} from './resolveActiveDeviceId';
import {mediaDevicesStore} from './useMediaDevicesStore';
import type {MediaDevicesState} from './useMediaDevicesStore';

export type ElectronDesktopCapturerSource = {
  readonly display_id: string;
  readonly id: string;
  readonly name: string;
  readonly thumbnail: HTMLCanvasElement;
};

type ElectronGetSourcesOptions = {
  readonly fetchWindowIcons?: boolean;
  readonly thumbnailSize?: {readonly height: number; readonly width: number};
  readonly types: string[];
};

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

enum FavoriteDeviceTypes {
  AUDIO_INPUT = `${MediaDeviceType.AUDIO_INPUT}-fave`,
  AUDIO_OUTPUT = `${MediaDeviceType.AUDIO_OUTPUT}-fave`,
  VIDEO_INPUT = `${MediaDeviceType.VIDEO_INPUT}-fave`,
  SCREEN_INPUT = `${MediaDeviceType.SCREEN_INPUT}-fave`,
}

type FilteredMediaDevices = {
  readonly cameras: MediaDeviceInfo[];
  readonly microphones: MediaDeviceInfo[];
  readonly speakers: MediaDeviceInfo[];
};

type PersistDevicePreferenceOptions = {
  readonly deviceType: MediaDeviceType;
  readonly preferredId: string;
  readonly previousPreferredId: string;
};

type PreviousDeviceSupport = Partial<Record<MediaDeviceType, number>>;

type ResolveMediaDeviceIdOptions = {
  readonly deviceType: MediaDeviceType;
  readonly devices: readonly MediaDeviceInfo[];
  readonly previousActiveId: string;
  readonly preferredId: string;
};

type PickDeviceIdOptions = {
  readonly deviceType: MediaDeviceType;
  readonly devices: readonly MediaDeviceInfo[];
  readonly currentId: string;
};

type UpdateFavoriteListOptions = {
  readonly deviceType: MediaDeviceType;
  readonly currentActiveId: string;
  readonly previousActiveId: string;
  readonly state: MediaDevicesState;
};

type OrderFavoriteDevicesOptions = {
  readonly favoriteIds: readonly string[];
  readonly currentActiveId: string;
  readonly deviceDisconnected: boolean;
};

export type MediaDevicesHandlerOptions = {
  readonly isPreferredMediaDevicePersistenceEnabled: boolean;
};

function loadStoredDeviceId(storageKey: string, defaultId: string): string {
  const storedId = loadValue<unknown>(storageKey);

  return isNonEmptyString(storedId) ? storedId : defaultId;
}

function loadStoredDeviceIds(storageKey: string): string[] {
  const storedIds = loadValue<unknown>(storageKey);

  return isArray(storedIds) ? storedIds.filter(isNonEmptyString) : [];
}

function getMediaDeviceIds(devices: readonly MediaDeviceInfo[]): string[] {
  return devices.map(device => {
    return device.deviceId;
  });
}

export class MediaDevicesHandler {
  private readonly logger: Logger;
  private readonly isPreferredMediaDevicePersistenceEnabled: boolean;
  private previousDeviceSupport: PreviousDeviceSupport = {};
  private onMediaDevicesRefresh?: () => void;
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
  constructor(options: MediaDevicesHandlerOptions) {
    const {isPreferredMediaDevicePersistenceEnabled} = options;

    this.logger = getLogger('MediaDevicesHandler');
    this.isPreferredMediaDevicePersistenceEnabled = isPreferredMediaDevicePersistenceEnabled;

    const supportsUserMedia = Runtime.isSupportingUserMedia();
    this.initializeDeviceState(supportsUserMedia);

    this.subscribeToDevicePersistence();

    void this.initializeMediaDevices(false, false);
  }

  private initializeDeviceState(supportsUserMedia: boolean): void {
    const preferredAudioInputId = this.loadInitialDeviceId(
      MediaDeviceType.AUDIO_INPUT,
      MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.audioinput,
    );
    const preferredAudioOutputId = this.loadInitialDeviceId(
      MediaDeviceType.AUDIO_OUTPUT,
      MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.audiooutput,
    );
    const preferredVideoInputId = this.loadInitialDeviceId(
      MediaDeviceType.VIDEO_INPUT,
      MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.videoinput,
    );
    const activeScreenInputId = this.loadLegacyDeviceId(
      MediaDeviceType.SCREEN_INPUT,
      MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.screeninput,
    );

    mediaDevicesStore.getState().setAll({
      audio: {
        input: {
          activeId: preferredAudioInputId,
          preferredId: preferredAudioInputId,
          supported: supportsUserMedia,
        },
        output: {
          activeId: preferredAudioOutputId,
          preferredId: preferredAudioOutputId,
          supported: false,
        },
      },
      video: {
        input: {
          activeId: preferredVideoInputId,
          preferredId: preferredVideoInputId,
          supported: supportsUserMedia,
        },
      },
      screen: {
        input: {
          activeId: activeScreenInputId,
          supported: !isNullOrUndefined(window.desktopCapturer),
        },
      },
    });
  }

  private loadInitialDeviceId(storageKey: string, defaultId: string): string {
    if (this.isPreferredMediaDevicePersistenceEnabled) {
      return loadStoredDeviceId(storageKey, defaultId);
    }

    return this.loadLegacyDeviceId(storageKey, defaultId);
  }

  private loadLegacyDeviceId(storageKey: string, defaultId: string): string {
    const storedId = loadValue<string>(storageKey);

    return isNullOrUndefined(storedId) ? defaultId : storedId;
  }

  private subscribeToDevicePersistence(): void {
    mediaDevicesStore.subscribe((state, previousState) => {
      if (this.isPreferredMediaDevicePersistenceEnabled) {
        this.persistDevicePreference({
          deviceType: MediaDeviceType.AUDIO_INPUT,
          preferredId: state.audio.input.preferredId,
          previousPreferredId: previousState.audio.input.preferredId,
        });
        this.persistDevicePreference({
          deviceType: MediaDeviceType.AUDIO_OUTPUT,
          preferredId: state.audio.output.preferredId,
          previousPreferredId: previousState.audio.output.preferredId,
        });
        this.persistDevicePreference({
          deviceType: MediaDeviceType.VIDEO_INPUT,
          preferredId: state.video.input.preferredId,
          previousPreferredId: previousState.video.input.preferredId,
        });
      } else {
        this.updateFavoriteList({
          deviceType: MediaDeviceType.AUDIO_INPUT,
          currentActiveId: state.audio.input.activeId,
          previousActiveId: previousState.audio.input.activeId,
          state,
        });
        this.updateFavoriteList({
          deviceType: MediaDeviceType.AUDIO_OUTPUT,
          currentActiveId: state.audio.output.activeId,
          previousActiveId: previousState.audio.output.activeId,
          state,
        });
        this.updateFavoriteList({
          deviceType: MediaDeviceType.VIDEO_INPUT,
          currentActiveId: state.video.input.activeId,
          previousActiveId: previousState.video.input.activeId,
          state,
        });
      }

      this.updateFavoriteList({
        deviceType: MediaDeviceType.SCREEN_INPUT,
        currentActiveId: state.screen.input.activeId,
        previousActiveId: previousState.screen.input.activeId,
        state,
      });
    });
  }

  public setOnMediaDevicesRefreshHandler(handler: () => void) {
    this.onMediaDevicesRefresh = handler;
  }

  /**
   * Initialize the list of MediaDevices and subscriptions.
   * @camera: boolean, Only when the camera is queried can the entire device list be accessed.
   * @refreshMediaStreams: boolean, Only when the refreshMediaStreams is true entire media streams are recreated.
   */
  public async initializeMediaDevices(camera = false, refreshMediaStreams = false) {
    if (!Runtime.isSupportingUserMedia() || this.devicesAreInit) {
      return;
    }
    await this.refreshMediaDevices(refreshMediaStreams);
    this.subscribeToDevices();

    if (camera) {
      this.devicesAreInit = true;
    }
  }

  private persistDevicePreference(options: PersistDevicePreferenceOptions): void {
    const {deviceType, preferredId, previousPreferredId} = options;
    if (preferredId === previousPreferredId) {
      return;
    }

    storeValue(deviceType, preferredId);

    const favoriteKey = this.favoriteKeyFor(deviceType);
    const favoriteIds = loadStoredDeviceIds(favoriteKey);
    const updatedFavoriteIds = [
      preferredId,
      ...favoriteIds.filter(favoriteId => {
        return favoriteId !== preferredId;
      }),
    ];
    storeValue(favoriteKey, updatedFavoriteIds);
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

  private filterMediaDevices(mediaDevices: MediaDeviceInfo[]): FilteredMediaDevices {
    const cameras = mediaDevices.filter(mediaDevice => {
      return mediaDevice.kind === MediaDeviceType.VIDEO_INPUT;
    });
    const microphones = mediaDevices.filter(mediaDevice => {
      return mediaDevice.kind === MediaDeviceType.AUDIO_INPUT;
    });
    const speakers = mediaDevices.filter(mediaDevice => {
      return mediaDevice.kind === MediaDeviceType.AUDIO_OUTPUT;
    });

    return {cameras, microphones, speakers};
  }

  /**
   * Update list of available MediaDevices.
   * @param [refreshMediaStreams=false] If `refreshMediaStreams=true`, a video track is also created when the device list is read.
   * This ensures that the video device labels can also be read. This is necessary for initializing the entire device list.
   */
  public async refreshMediaDevices(refreshMediaStreams = true) {
    try {
      this.removeAllDevices();
      const mediaDevices = await window.navigator.mediaDevices.enumerateDevices();

      if (isNullOrUndefined(mediaDevices)) {
        throw new Error('No media devices found');
      }

      const {microphones, speakers, cameras} = this.filterMediaDevices(mediaDevices);

      const previousState = mediaDevicesStore.getState();
      const audioInputActiveId = this.resolveMediaDeviceId({
        deviceType: MediaDeviceType.AUDIO_INPUT,
        devices: microphones,
        previousActiveId: previousState.audio.input.activeId,
        preferredId: previousState.audio.input.preferredId,
      });
      const audioOutputActiveId = this.resolveMediaDeviceId({
        deviceType: MediaDeviceType.AUDIO_OUTPUT,
        devices: speakers,
        previousActiveId: previousState.audio.output.activeId,
        preferredId: previousState.audio.output.preferredId,
      });
      const videoInputActiveId = this.resolveMediaDeviceId({
        deviceType: MediaDeviceType.VIDEO_INPUT,
        devices: cameras,
        previousActiveId: previousState.video.input.activeId,
        preferredId: previousState.video.input.preferredId,
      });

      mediaDevicesStore.getState().setAll({
        audio: {
          input: {
            devices: microphones,
            supported: microphones.length > 0,
            activeId: audioInputActiveId,
          },
          output: {
            devices: speakers,
            supported: speakers.length > 0,
            activeId: audioOutputActiveId,
          },
        },
        video: {
          input: {
            devices: cameras,
            supported: cameras.length > 0,
            activeId: videoInputActiveId,
          },
        },
      });

      if (!this.isPreferredMediaDevicePersistenceEnabled) {
        this.previousDeviceSupport = {
          [MediaDeviceType.AUDIO_INPUT]: microphones.length,
          [MediaDeviceType.AUDIO_OUTPUT]: speakers.length,
          [MediaDeviceType.VIDEO_INPUT]: cameras.length,
        };
      }

      if (refreshMediaStreams) {
        this.onMediaDevicesRefresh?.();
      }

      return mediaDevices;
    } catch (error: unknown) {
      this.logger.error(`Failed to update MediaDevice list: ${error instanceof Error ? error.message : ''}`, error);
      throw error;
    }
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

    mediaDevicesStore.getState().setAll({
      screen: {
        input: {
          devices: screenSources,
          supported: screenSources.length > 0,
        },
      },
    });

    return screenSources;
  }

  private getSourcesWrapper(options: ElectronGetSourcesOptions): Promise<ElectronDesktopCapturerSource[]> {
    /**
     * Electron.desktopCapturer.getSources() is not available from electron 17 anymore
     * for further info please visit:
     * https://www.electronjs.org/docs/latest/breaking-changes#removed-desktopcapturergetsources-in-the-renderer
     */
    if (!isNullOrUndefined(window.desktopCapturer?.getDesktopSources)) {
      return window.desktopCapturer.getDesktopSources(options);
    }
    if (window.desktopCapturer?.getSources.constructor.name === 'AsyncFunction') {
      // Electron > 4
      return window.desktopCapturer.getSources(options);
    }
    // Electron <= 4
    return new Promise((resolve, reject) =>
      window.desktopCapturer?.getSources(options, (error, screenSources) =>
        !isNullOrUndefined(error) ? reject(error) : resolve(screenSources),
      ),
    );
  }

  /**
   * Remove all known MediaDevices from the lists.
   */
  private removeAllDevices() {
    mediaDevicesStore.getState().resetDevices();
  }

  private resolveMediaDeviceId(options: ResolveMediaDeviceIdOptions): string {
    const {deviceType, devices, previousActiveId, preferredId} = options;

    if (!this.isPreferredMediaDevicePersistenceEnabled) {
      return this.pickDeviceId({deviceType, devices, currentId: previousActiveId});
    }

    return resolveActiveDeviceId({
      availableIds: getMediaDeviceIds(devices),
      defaultId: MediaDevicesHandler.CONFIG.DEFAULT_DEVICE[deviceType],
      fallbackIds: [previousActiveId, ...loadStoredDeviceIds(this.favoriteKeyFor(deviceType))],
      preferredId,
    });
  }

  private pickDeviceId(options: PickDeviceIdOptions): string {
    const {deviceType, devices, currentId} = options;
    const defaultId = MediaDevicesHandler.CONFIG.DEFAULT_DEVICE[deviceType];

    const currentDeviceIsAvailable = devices.some(device => {
      return device.deviceId === currentId;
    });
    if (currentDeviceIsAvailable) {
      return currentId;
    }

    const favoriteIds = loadStoredDeviceIds(this.favoriteKeyFor(deviceType));
    const availableFavoriteId = Maybe.find(favoriteId => {
      return devices.some(device => {
        return device.deviceId === favoriteId;
      });
    }, favoriteIds);

    return availableFavoriteId.match({
      Just: favoriteId => {
        return favoriteId;
      },
      Nothing: () => {
        return Maybe.find(isNonEmptyString, getMediaDeviceIds(devices)).unwrapOr(defaultId);
      },
    });
  }

  private updateFavoriteList(options: UpdateFavoriteListOptions): void {
    const {deviceType, currentActiveId, previousActiveId, state} = options;
    if (currentActiveId === previousActiveId) {
      return;
    }

    const availableDeviceCount = this.getAvailableDeviceCount({deviceType, state});
    const previousDeviceCount = this.previousDeviceSupport[deviceType] ?? 0;
    const deviceDisconnected = previousDeviceCount > availableDeviceCount;
    storeValue(deviceType, currentActiveId);

    const favoriteIds = loadStoredDeviceIds(this.favoriteKeyFor(deviceType));
    const updatedFavoriteIds = this.orderFavoriteDevices({
      favoriteIds,
      currentActiveId,
      deviceDisconnected,
    });
    storeValue(this.favoriteKeyFor(deviceType), updatedFavoriteIds);
  }

  private getAvailableDeviceCount(options: {
    readonly deviceType: MediaDeviceType;
    readonly state: MediaDevicesState;
  }): number {
    const {deviceType, state} = options;

    switch (deviceType) {
      case MediaDeviceType.AUDIO_INPUT:
        return state.audio.input.devices.length;
      case MediaDeviceType.AUDIO_OUTPUT:
        return state.audio.output.devices.length;
      case MediaDeviceType.VIDEO_INPUT:
        return state.video.input.devices.length;
      case MediaDeviceType.SCREEN_INPUT:
        return state.screen.input.devices.length;
      default:
        return 0;
    }
  }

  private orderFavoriteDevices(options: OrderFavoriteDevicesOptions): string[] {
    const {favoriteIds, currentActiveId, deviceDisconnected} = options;

    if (deviceDisconnected) {
      return [...favoriteIds];
    }

    return [
      currentActiveId,
      ...favoriteIds.filter(favoriteId => {
        return favoriteId !== currentActiveId;
      }),
    ];
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
