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

import {Logger, getLogger} from 'Util/Logger';
import {loadValue, storeValue} from 'Util/StorageUtil';

import {MediaDeviceType} from './MediaDeviceType';
import {Runtime} from '@wireapp/commons';

declare global {
  interface Window {
    desktopCapturer?: {
      // Electron <= 4
      getSources(options: ElectronGetSourcesOptions, callback: ElectronDesktopCapturerCallback): void;
      // Electron > 4
      getSources(options: ElectronGetSourcesOptions): Promise<ElectronDesktopCapturerSource[]>;
    };
  }
}

export type CurrentAvailableDeviceId = Record<DeviceTypes, ko.PureComputed<string>>;
export type DeviceSupport = Record<DeviceTypes, ko.PureComputed<boolean>>;

enum DeviceTypes {
  AUDIO_INPUT = 'audioInput',
  AUDIO_OUTPUT = 'audioOutput',
  SCREEN_INPUT = 'screenInput',
  VIDEO_INPUT = 'videoInput',
}
export type Devices = Record<DeviceTypes, ko.ObservableArray<ElectronDesktopCapturerSource | MediaDeviceInfo>>;
export type DeviceIds = Record<DeviceTypes, ko.Observable<string>>;
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
}

export class MediaDevicesHandler {
  private readonly logger: Logger;
  public availableDevices: Devices;
  public currentDeviceId: DeviceIds;
  public currentAvailableDeviceId: CurrentAvailableDeviceId;
  public deviceSupport: DeviceSupport;

  static get CONFIG() {
    return {
      DEFAULT_DEVICE: {
        audioInput: 'default',
        audioOutput: 'default',
        screenInput: 'screen',
        videoInput: 'default',
        windowInput: 'window',
      },
    };
  }

  /**
   * Construct a new MediaDevices handler.
   */
  constructor() {
    this.logger = getLogger('MediaDevicesHandler');

    this.availableDevices = {
      audioInput: ko.observableArray([]),
      audioOutput: ko.observableArray([]),
      screenInput: ko.observableArray([]),
      videoInput: ko.observableArray([]),
    };

    this.currentDeviceId = {
      audioInput: ko.observable(loadValue(MediaDeviceType.AUDIO_INPUT)),
      audioOutput: ko.observable(loadValue(MediaDeviceType.AUDIO_OUTPUT)),
      screenInput: ko.observable(loadValue(MediaDeviceType.SCREEN_INPUT)),
      videoInput: ko.observable(loadValue(MediaDeviceType.VIDEO_INPUT)),
    };

    const getCurrentAvailableDeviceId = (deviceType: DeviceTypes): string => {
      const currentDeviceId = this.currentDeviceId[deviceType]();
      if (this.availableDevices[deviceType]().length === 0) {
        return '';
      }
      const isAvailable = this.availableDevices[deviceType]().find(
        device =>
          ((device as MediaDeviceInfo).deviceId || (device as ElectronDesktopCapturerSource).id) === currentDeviceId,
      );
      if (isAvailable) {
        return currentDeviceId;
      }
      return MediaDevicesHandler.CONFIG.DEFAULT_DEVICE[deviceType];
    };

    this.currentAvailableDeviceId = {
      audioInput: ko.pureComputed(() => getCurrentAvailableDeviceId(DeviceTypes.AUDIO_INPUT)),
      audioOutput: ko.pureComputed(() => getCurrentAvailableDeviceId(DeviceTypes.AUDIO_OUTPUT)),
      screenInput: ko.pureComputed(() => getCurrentAvailableDeviceId(DeviceTypes.SCREEN_INPUT)),
      videoInput: ko.pureComputed(() => getCurrentAvailableDeviceId(DeviceTypes.VIDEO_INPUT)),
    };

    this.deviceSupport = {
      audioInput: ko.pureComputed(() => !!this.availableDevices.audioInput().length),
      audioOutput: ko.pureComputed(() => !!this.availableDevices.audioOutput().length),
      screenInput: ko.pureComputed(() => !!this.availableDevices.screenInput().length),
      videoInput: ko.pureComputed(() => !!this.availableDevices.videoInput().length),
    };

    this.initializeMediaDevices();
  }

  /**
   * Initialize the list of MediaDevices and subscriptions.
   */
  private initializeMediaDevices(): void {
    if (Runtime.isSupportingUserMedia()) {
      this.refreshMediaDevices().then(() => {
        this.subscribeToObservables();
        this.subscribeToDevices();
      });
    }
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

  /**
   * Subscribe to Knockout observables.
   */
  private subscribeToObservables(): void {
    this.currentDeviceId.audioInput.subscribe(mediaDeviceId => {
      storeValue(MediaDeviceType.AUDIO_INPUT, mediaDeviceId);
    });

    this.currentDeviceId.audioOutput.subscribe(mediaDeviceId => {
      storeValue(MediaDeviceType.AUDIO_OUTPUT, mediaDeviceId);
    });

    this.currentDeviceId.videoInput.subscribe(mediaDeviceId => {
      storeValue(MediaDeviceType.VIDEO_INPUT, mediaDeviceId);
    });
  }

  private filterMediaDevices(
    mediaDevices: MediaDeviceInfo[],
  ): {
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  } {
    const videoInputDevices: MediaDeviceInfo[] = mediaDevices.filter(
      device => device.kind === MediaDeviceType.VIDEO_INPUT,
    );

    /*
     * On Windows the same device can be listed multiple times with different group ids ("default", "communications", etc.).
     * In such a scenario, the device listed as "communications" device is preferred for conferencing calls, so we filter its duplicates.
     */
    const microphones = mediaDevices.filter(device => device.kind === MediaDeviceType.AUDIO_INPUT);
    const dedupedMicrophones = microphones.reduce<Record<string, MediaDeviceInfo>>((microphoneList, microphone) => {
      if (!microphoneList.hasOwnProperty(microphone.groupId) || microphone.deviceId === 'communications') {
        microphoneList[microphone.groupId] = microphone;
      }
      return microphoneList;
    }, {});

    const speakers = mediaDevices.filter(device => device.kind === MediaDeviceType.AUDIO_OUTPUT);
    const dedupedSpeakers = speakers.reduce<Record<string, MediaDeviceInfo>>((speakerList, speaker) => {
      if (!speakerList.hasOwnProperty(speaker.groupId) || speaker.deviceId === 'communications') {
        speakerList[speaker.groupId] = speaker;
      }
      return speakerList;
    }, {});

    return {
      cameras: videoInputDevices,
      microphones: Object.values(dedupedMicrophones),
      speakers: Object.values(dedupedSpeakers),
    };
  }

  /**
   * Update list of available MediaDevices.
   * @returns Resolves with all MediaDevices when the list has been updated
   */
  refreshMediaDevices(): Promise<MediaDeviceInfo[]> {
    return navigator.mediaDevices
      .enumerateDevices()
      .catch(error => {
        this.logger.error(`Failed to update MediaDevice list: ${error.message}`, error);
        throw error;
      })
      .then(mediaDevices => {
        this.removeAllDevices();

        if (mediaDevices) {
          const filteredDevices = this.filterMediaDevices(mediaDevices);

          this.availableDevices.audioInput.push(...filteredDevices.microphones);
          this.availableDevices.audioOutput.push(...filteredDevices.speakers);
          this.availableDevices.videoInput.push(...filteredDevices.cameras);

          this.logger.info('Updated MediaDevice list', mediaDevices);
          return mediaDevices;
        }

        throw new Error('No media devices found');
      });
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
        MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.screenInput,
        MediaDevicesHandler.CONFIG.DEFAULT_DEVICE.windowInput,
      ],
    };

    const getSourcesWrapper = (options: ElectronGetSourcesOptions): Promise<ElectronDesktopCapturerSource[]> => {
      if (window.desktopCapturer.getSources.constructor.name === 'AsyncFunction') {
        // Electron > 4
        return window.desktopCapturer.getSources(options);
      }
      // Electron <= 4
      return new Promise((resolve, reject) =>
        window.desktopCapturer.getSources(options, (error, screenSources) =>
          error ? reject(error) : resolve(screenSources),
        ),
      );
    };

    const screenSources = await getSourcesWrapper(options);

    this.logger.info(`Detected '${screenSources.length}' sources for screen sharing from Electron`, screenSources);
    this.availableDevices.screenInput(screenSources);
    return screenSources;
  }

  /**
   * Remove all known MediaDevices from the lists.
   */
  private removeAllDevices(): void {
    this.availableDevices.audioInput.removeAll();
    this.availableDevices.audioOutput.removeAll();
    this.availableDevices.videoInput.removeAll();
  }
}
