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

import {container} from 'tsyringe';

import {mediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {UserState} from 'Repositories/user/UserState';
import {getLogger, Logger} from 'Util/Logger';

import {VIDEO_QUALITY_MODE} from './VideoQualityMode';

interface Config {
  CONSTRAINTS: {
    SCREEN: {
      DESKTOP_CAPTURER: MediaTrackConstraints & {
        mandatory?: {chromeMediaSource: string; chromeMediaSourceId?: string; maxFrameRate?: number};
      };
      DISPLAY_MEDIA: MediaTrackConstraints;
      USER_MEDIA: MediaTrackConstraints & {mediaSource: string};
    };
    VIDEO: Record<VIDEO_QUALITY_MODE, MediaTrackConstraints> & {PREFERRED_FACING_MODE: string};
  };
  DEFAULT_DEVICE_ID: string;
}

export enum ScreensharingMethods {
  DISPLAY_MEDIA = 0,
  USER_MEDIA = 1,
  DESKTOP_CAPTURER = 2,
  NONE = 3,
}

export class MediaConstraintsHandler {
  private readonly logger: Logger;

  static get CONFIG(): Config {
    return {
      CONSTRAINTS: {
        SCREEN: {
          DESKTOP_CAPTURER: {
            mandatory: {
              chromeMediaSource: 'desktop',
              maxFrameRate: 5,
            },
          },
          DISPLAY_MEDIA: {
            frameRate: 5,
          },
          USER_MEDIA: {
            frameRate: 5,
            mediaSource: 'screen',
          },
        },
        VIDEO: {
          [VIDEO_QUALITY_MODE.FULL_HD]: {
            frameRate: 15,
            height: 1080,
            width: 1920,
          },
          [VIDEO_QUALITY_MODE.GROUP]: {
            frameRate: 15,
            height: 720,
            width: 1280,
          },
          [VIDEO_QUALITY_MODE.HD]: {
            frameRate: 15,
            height: 720,
            width: 1280,
          },
          [VIDEO_QUALITY_MODE.MOBILE]: {
            frameRate: 15,
            height: 720,
            width: 1280,
          },
          PREFERRED_FACING_MODE: 'user',
        },
      },
      DEFAULT_DEVICE_ID: 'default',
    };
  }

  constructor(private readonly userState = container.resolve(UserState)) {
    this.logger = getLogger('MediaConstraintsHandler');
  }

  private get agcStorageKey(): string {
    return `agc_enabled_${this.userState.self()?.id}`;
  }

  setAgcPreference(agcEnabled: boolean): void {
    window.localStorage.setItem(this.agcStorageKey, JSON.stringify(agcEnabled));
  }

  getAgcPreference(): boolean {
    const storedValue = window.localStorage.getItem(this.agcStorageKey);
    return JSON.parse(storedValue) ?? false;
  }

  getMediaStreamConstraints(
    requestAudio: boolean = false,
    requestVideo: boolean = false,
    isGroup: boolean = false,
  ): MediaStreamConstraints {
    const {
      audio: {
        input: {selectedId: audioInputDeviceId},
      },
      video: {
        input: {selectedId: videoInputDeviceId},
      },
    } = mediaDevicesStore.getState();
    const mode = isGroup ? VIDEO_QUALITY_MODE.GROUP : VIDEO_QUALITY_MODE.MOBILE;

    return {
      audio: requestAudio ? this.getAudioStreamConstraints(audioInputDeviceId) : undefined,
      video: requestVideo ? this.getVideoStreamConstraints(videoInputDeviceId, mode) : undefined,
    };
  }

  getScreenStreamConstraints(method: ScreensharingMethods): MediaStreamConstraints | undefined {
    switch (method) {
      case ScreensharingMethods.DESKTOP_CAPTURER: {
        this.logger.info(`Enabling screen sharing from desktopCapturer (with FULL resolution)`);

        const desktopCapturer = MediaConstraintsHandler.CONFIG.CONSTRAINTS.SCREEN.DESKTOP_CAPTURER;
        const {
          screen: {
            input: {selectedId: screenInputDeviceId},
          },
        } = mediaDevicesStore.getState();

        const streamConstraints = {
          ...desktopCapturer,
          mandatory: {
            ...desktopCapturer.mandatory,
            chromeMediaSourceId: screenInputDeviceId,
          },
        };

        return {
          audio: false,
          video: streamConstraints,
        };
      }
      case ScreensharingMethods.DISPLAY_MEDIA: {
        this.logger.info(`Enabling screen sharing from getDisplayMedia (with FULL resolution)`);

        const display = MediaConstraintsHandler.CONFIG.CONSTRAINTS.SCREEN.DISPLAY_MEDIA;

        return {
          audio: false,
          video: display,
        };
      }
      case ScreensharingMethods.USER_MEDIA: {
        this.logger.info(`Enabling screen sharing from getUserMedia (with FULL resolution)`);

        const userMedia = MediaConstraintsHandler.CONFIG.CONSTRAINTS.SCREEN.USER_MEDIA;

        return {
          audio: false,
          video: userMedia,
        };
      }
      default:
        return undefined;
    }
  }

  private getAudioStreamConstraints(mediaDeviceId: string = ''): MediaTrackConstraints & {autoGainControl: boolean} {
    const requireExactMediaDevice = mediaDeviceId && mediaDeviceId !== MediaConstraintsHandler.CONFIG.DEFAULT_DEVICE_ID;
    return requireExactMediaDevice
      ? {autoGainControl: this.getAgcPreference(), deviceId: {exact: mediaDeviceId}}
      : {autoGainControl: this.getAgcPreference()};
  }

  private getVideoStreamConstraints(mediaDeviceId?: string, mode: VIDEO_QUALITY_MODE = VIDEO_QUALITY_MODE.MOBILE) {
    const streamConstraints = MediaConstraintsHandler.CONFIG.CONSTRAINTS.VIDEO[mode];

    if (typeof mediaDeviceId === 'string' && mediaDeviceId !== MediaConstraintsHandler.CONFIG.DEFAULT_DEVICE_ID) {
      streamConstraints.deviceId = {exact: mediaDeviceId};
    } else {
      streamConstraints.facingMode = MediaConstraintsHandler.CONFIG.CONSTRAINTS.VIDEO.PREFERRED_FACING_MODE;
    }

    return streamConstraints;
  }
}
