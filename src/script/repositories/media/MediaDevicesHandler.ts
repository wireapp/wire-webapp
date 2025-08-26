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

import ko from 'knockout';

import {Runtime} from '@wireapp/commons';

import {Logger, getLogger} from 'Util/Logger';
import {loadValue, storeValue} from 'Util/StorageUtil';

import {MediaDeviceType} from './MediaDeviceType';

import {isMediaDevice} from '../../guards/MediaDevice';

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

export type CurrentAvailableDeviceId = Record<MediaDeviceType, ko.PureComputed<string>>;
export type DeviceSupport = Record<MediaDeviceType, ko.PureComputed<boolean>>;
export type PreviousDeviceSupport = Partial<Record<MediaDeviceType, number>>;

export enum FavoriteDeviceTypes {
  AUDIO_INPUT = 'audioinput-fave',
  AUDIO_OUTPUT = 'audiooutput-fave',
  VIDEO_INPUT = 'videoinput-fave',
  SCREEN_INPUT = 'screeninput-fave',
}

export type Devices = Record<MediaDeviceType, ko.ObservableArray<ElectronDesktopCapturerSource | MediaDeviceInfo>>;
export type DeviceIds = Record<MediaDeviceType, ko.Observable<string>>;
type ElectronDesktopCapturerCallback = (error: Error | null, screenSources: ElectronDesktopCapturerSource[]) => void;

interface ElectronGetSourcesOptions {
  fetchWindowIcons?: boolean;
  thumbnailSize?: {
    height: number;
    width: number;
  };
  types: string[];
}

/** @see http://electronjs.org/docs/api/structures/desktop-capturer-source */
export interface ElectronDesktopCapturerSource {
  display_id: string;
  id: string;
  name: string;
  thumbnail: HTMLCanvasElement;
}

export class MediaDevicesHandler {
  private readonly logger: Logger;
  public availableDevices: Devices;
  public currentDeviceId: DeviceIds;
  public currentAvailableDeviceId: CurrentAvailableDeviceId;
  public deviceSupport: DeviceSupport;
  private previousDeviceSupport: PreviousDeviceSupport;
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
  constructor() {
    this.logger = getLogger('MediaDevicesHandler');

    this.availableDevices = {
      audioinput: ko.observableArray<ElectronDesktopCapturerSource | MediaDeviceInfo>([]),
      audiooutput: ko.observableArray<ElectronDesktopCapturerSource | MediaDeviceInfo>([]),
      screeninput: ko.observableArray<ElectronDesktopCapturerSource | MediaDeviceInfo>([]),
      videoinput: ko.observableArray<ElectronDesktopCapturerSource | MediaDeviceInfo>([]),
    };

    this.currentDeviceId = {
      audioinput: ko.observable(loadValue(MediaDeviceType.AUDIO_INPUT) ?? 'default'),
      audiooutput: ko.observable(loadValue(MediaDeviceType.AUDIO_OUTPUT) ?? 'default'),
      screeninput: ko.observable(loadValue(MediaDeviceType.SCREEN_INPUT) ?? 'screen'),
      videoinput: ko.observable(loadValue(MediaDeviceType.VIDEO_INPUT) ?? 'default'),
    };

    const getCurrentAvailableDeviceId = (deviceType: MediaDeviceType): string => {
      const currentDeviceId = this.currentDeviceId[deviceType]();
      if (this.availableDevices[deviceType]().length === 0) {
        return '';
      }
      const isAvailable = this.availableDevices[deviceType]().find(device => {
        return (
          ((device as MediaDeviceInfo).deviceId || (device as ElectronDesktopCapturerSource).id) === currentDeviceId
        );
      });

      const favoriteDeviceId = loadValue<String[]>(`${deviceType}-fave`)?.find(id => id === currentDeviceId);

      if (favoriteDeviceId && isAvailable) {
        return currentDeviceId;
      }
      return isMediaDevice(isAvailable)
        ? isAvailable.deviceId
        : isAvailable?.id ?? MediaDevicesHandler.CONFIG.DEFAULT_DEVICE[deviceType];
    };

    this.currentAvailableDeviceId = {
      audioinput: ko.pureComputed(() => getCurrentAvailableDeviceId(MediaDeviceType.AUDIO_INPUT)),
      audiooutput: ko.pureComputed(() => getCurrentAvailableDeviceId(MediaDeviceType.AUDIO_OUTPUT)),
      screeninput: ko.pureComputed(() => getCurrentAvailableDeviceId(MediaDeviceType.SCREEN_INPUT)),
      videoinput: ko.pureComputed(() => getCurrentAvailableDeviceId(MediaDeviceType.VIDEO_INPUT)),
    };

    this.deviceSupport = {
      audioinput: ko.pureComputed(() => !!this.availableDevices.audioinput().length),
      audiooutput: ko.pureComputed(() => !!this.availableDevices.audiooutput().length),
      screeninput: ko.pureComputed(() => !!this.availableDevices.screeninput().length),
      videoinput: ko.pureComputed(() => !!this.availableDevices.videoinput().length),
    };

    this.previousDeviceSupport = {
      audioinput: this.availableDevices.audioinput().length,
      audiooutput: this.availableDevices.audiooutput().length,
      videoinput: this.availableDevices.videoinput().length,
    };

    // The device list must be queried once to obtain the device IDs. This way, the frontend knows whether cameras
    // and microphones exist and can request them specifically during a call. Additionally, the app needs to know
    // the device IDs; otherwise, we will receive a Media-Query-Constraint error when querying the devices, as we
    // explicitly query by the device ID.
    // The false parameter ensures that we only load the list temporarily.
    this.initializeMediaDevices(false);
  }

  public setOnMediaDevicesRefreshHandler(handler: () => void): void {
    this.onMediaDevicesRefresh = handler;
  }

  /**
   * Initialize the list of MediaDevices and subscriptions.
   * @camera: boolean, Only when the camera is queried can the entire device list be accessed.
   * @return Promise<void>
   */
  public async initializeMediaDevices(camera = false): Promise<void> {
    if (Runtime.isSupportingUserMedia() && !this.devicesAreInit) {
      return this.refreshMediaDevices(camera).then(() => {
        this.subscribeToObservables();
        this.subscribeToDevices();
        // The web browser cannot access the device labels without a camera stream.
        // The device list is only complete when the camera was initialized.
        if (camera) {
          this.devicesAreInit = true;
        }
      });
    }
    return Promise.resolve();
  }

  /**
   * Subscribe to MediaDevices updates if available.
   */
  private subscribeToDevices(): void {
    navigator.mediaDevices.ondevicechange = () => {
      this.logger.info('List of available MediaDevices has changed');
      this.refreshMediaDevices();
    };
  }

  private subscribeToDevice(deviceType: MediaDeviceType) {
    this.currentDeviceId[deviceType].subscribe(mediaDeviceId => {
      const deviceKey = Object.keys(MediaDeviceType)[
        Object.values(MediaDeviceType).indexOf(deviceType as MediaDeviceType)
      ] as keyof typeof MediaDeviceType;

      const faveDevices = loadValue<string[]>(`${deviceType}-fave`) ?? [];
      const disconnected = (this.previousDeviceSupport[deviceType] ?? 0) > this.availableDevices[deviceType]().length;
      const newFaveDevices = this.orderFavoriteDevices(mediaDeviceId, faveDevices, disconnected);

      storeValue(MediaDeviceType[deviceKey], mediaDeviceId);
      storeValue(FavoriteDeviceTypes[deviceKey], newFaveDevices);
    });
  }

  /**
   * Subscribe to Knockout observables.
   */
  private subscribeToObservables(): void {
    Object.values(MediaDeviceType).forEach(deviceType => {
      this.subscribeToDevice(deviceType);
    });
  }

  private orderFavoriteDevices = (mediaDevice: string, favoriteDevices: string[], disconnected: boolean): string[] => {
    return disconnected ? favoriteDevices : [mediaDevice, ...favoriteDevices.filter(id => id !== mediaDevice)];
  };

  private filterMediaDevices(mediaDevices: MediaDeviceInfo[]): {
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  } {
    const videoInputDevices: MediaDeviceInfo[] = mediaDevices.filter(
      device => device.kind === MediaDeviceType.VIDEO_INPUT,
    );

    const microphones = mediaDevices.filter(device => device.kind === MediaDeviceType.AUDIO_INPUT);
    const speakers = mediaDevices.filter(device => device.kind === MediaDeviceType.AUDIO_OUTPUT);
    return {
      cameras: videoInputDevices,
      microphones: microphones,
      speakers: speakers,
    };
  }

  /**
   * Update list of available MediaDevices.
   * @param [camera=false] If `camera=true`, a video track is also created when the device list is read.
   * This ensures that the video device labels can also be read. This is necessary for initializing the entire device list.
   * @returns Resolves with all MediaDevices when the list has been updated
   */
  public async refreshMediaDevices(camera = false): Promise<MediaDeviceInfo[]> {
    const setDevices = (type: MediaDeviceType, devices: MediaDeviceInfo[]): void => {
      this.availableDevices[type](devices);
      const currentId = this.currentDeviceId[type];
      const firstDeviceId = devices[0]?.deviceId;

      const favorites = loadValue<string[]>(`${type}-fave`) ?? [];
      const favoriteDeviceId = favorites.map(favorite => devices.some(d => d.deviceId === favorite));

      if (favoriteDeviceId.some(favorite => favorite)) {
        const faveIndex = favoriteDeviceId.findIndex(favorite => favorite);
        currentId(
          devices.find(d => d.deviceId === favorites[faveIndex] || d.deviceId === favorites[faveIndex])?.deviceId ??
            firstDeviceId,
        );
      } else if (!devices.some(d => d.deviceId === currentId())) {
        currentId(firstDeviceId);
      }
    };

    try {
      this.removeAllDevices();
      const mediaDevices = await window.navigator.mediaDevices.enumerateDevices();

      if (!mediaDevices) {
        throw new Error('No media devices found');
      }

      const {microphones, speakers, cameras} = this.filterMediaDevices(mediaDevices);

      setDevices(MediaDeviceType.AUDIO_INPUT, microphones);
      setDevices(MediaDeviceType.AUDIO_OUTPUT, speakers);
      setDevices(MediaDeviceType.VIDEO_INPUT, cameras);
      this.previousDeviceSupport = {
        audioinput: microphones.length,
        audiooutput: speakers.length,
        videoinput: cameras.length,
      };

      this.onMediaDevicesRefresh?.();

      return mediaDevices;
    } catch (error) {
      this.logger.error(`Failed to update MediaDevice list: ${error instanceof Error ? error.message : ''}`, error);
      throw error;
    }
  }

  /**
   * Update list of available screens.
   * @returns Resolves with all screen sources when the list has been updated
   */
  async getScreenSources(): Promise<ElectronDesktopCapturerSource[]> {
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

    const getSourcesWrapper = (options: ElectronGetSourcesOptions): Promise<ElectronDesktopCapturerSource[]> => {
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
    };

    const screenSources = await getSourcesWrapper(options);

    this.logger.info(`Detected '${screenSources.length}' sources for screen sharing from Electron`);
    this.availableDevices.screeninput(screenSources);
    return screenSources;
  }

  /**
   * Remove all known MediaDevices from the lists.
   */
  private removeAllDevices(): void {
    this.availableDevices.audioinput.removeAll();
    this.availableDevices.audiooutput.removeAll();
    this.availableDevices.videoinput.removeAll();
  }
}
