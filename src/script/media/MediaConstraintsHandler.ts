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

import {Logger, getLogger} from 'Util/Logger';
import type {CurrentAvailableDeviceId} from './MediaDevicesHandler';

import {VIDEO_QUALITY_MODE} from './VideoQualityMode';

interface Config {
  CONSTRAINTS: {
    SCREEN: {
      DESKTOP_CAPTURER: MediaTrackConstraints & {
        mandatory: {chromeMediaSource: string; chromeMediaSourceId?: string; maxHeight: number; minHeight: number};
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
  private readonly currentDeviceId: CurrentAvailableDeviceId;

  static get CONFIG(): Config {
    return {
      CONSTRAINTS: {
        SCREEN: {
          DESKTOP_CAPTURER: {
            mandatory: {
              chromeMediaSource: 'desktop',
              maxHeight: 1080,
              minHeight: 1080,
            },
          },
          DISPLAY_MEDIA: {
            height: {
              ideal: 1080,
              max: 1080,
            },
          },
          USER_MEDIA: {
            frameRate: 30,
            height: {exact: 720},
            mediaSource: 'screen',
          },
        },
        VIDEO: {
          [VIDEO_QUALITY_MODE.FULL_HD]: {
            frameRate: 30,
            height: 1080,
            width: 1920,
          },
          [VIDEO_QUALITY_MODE.GROUP]: {
            frameRate: 30,
            height: 240,
            width: 320,
          },
          [VIDEO_QUALITY_MODE.HD]: {
            frameRate: 30,
            height: 720,
            width: 1280,
          },
          [VIDEO_QUALITY_MODE.MOBILE]: {
            frameRate: 30,
            height: 480,
            width: 640,
          },
          PREFERRED_FACING_MODE: 'user',
        },
      },
      DEFAULT_DEVICE_ID: 'default',
    };
  }

  constructor(currentDeviceId: CurrentAvailableDeviceId) {
    this.logger = getLogger('MediaConstraintsHandler');
    this.currentDeviceId = currentDeviceId;
  }

  getMediaStreamConstraints(
    requestAudio: boolean = false,
    requestVideo: boolean = false,
    isGroup: boolean = false,
  ): MediaStreamConstraints {
    const currentDeviceId = this.currentDeviceId;
    const mode = isGroup ? VIDEO_QUALITY_MODE.GROUP : VIDEO_QUALITY_MODE.MOBILE;

    return {
      audio: requestAudio ? this.getAudioStreamConstraints(currentDeviceId.audioInput()) : undefined,
      video: requestVideo ? this.getVideoStreamConstraints(currentDeviceId.videoInput(), mode) : undefined,
    };
  }

  getScreenStreamConstraints(method: ScreensharingMethods): MediaStreamConstraints {
    switch (method) {
      case ScreensharingMethods.DESKTOP_CAPTURER:
        this.logger.info('Enabling screen sharing from desktopCapturer');

        const streamConstraints = {
          audio: false,
          video: MediaConstraintsHandler.CONFIG.CONSTRAINTS.SCREEN.DESKTOP_CAPTURER,
        };

        const chromeMediaSourceId = this.currentDeviceId.screenInput();
        streamConstraints.video.mandatory = {...streamConstraints.video.mandatory, chromeMediaSourceId};

        return streamConstraints as MediaStreamConstraints;
      case ScreensharingMethods.DISPLAY_MEDIA:
        this.logger.info('Enabling screen sharing from getDisplayMedia');
        return {
          audio: false,
          video: MediaConstraintsHandler.CONFIG.CONSTRAINTS.SCREEN.DISPLAY_MEDIA,
        };
      case ScreensharingMethods.USER_MEDIA:
        this.logger.info('Enabling screen sharing from getUserMedia');
        return {
          audio: false,
          video: MediaConstraintsHandler.CONFIG.CONSTRAINTS.SCREEN.USER_MEDIA,
        };
      default:
        return undefined;
    }
  }

  private getAudioStreamConstraints(mediaDeviceId: string = ''): MediaTrackConstraints {
    const requireExactMediaDevice = mediaDeviceId && mediaDeviceId !== MediaConstraintsHandler.CONFIG.DEFAULT_DEVICE_ID;
    return requireExactMediaDevice
      ? {autoGainControl: false, deviceId: {exact: mediaDeviceId}}
      : {autoGainControl: false};
  }

  private getVideoStreamConstraints(
    mediaDeviceId: string,
    mode: VIDEO_QUALITY_MODE = VIDEO_QUALITY_MODE.MOBILE,
  ): MediaTrackConstraints {
    const streamConstraints = MediaConstraintsHandler.CONFIG.CONSTRAINTS.VIDEO[mode];

    if (typeof mediaDeviceId === 'string' && mediaDeviceId !== MediaConstraintsHandler.CONFIG.DEFAULT_DEVICE_ID) {
      streamConstraints.deviceId = {exact: mediaDeviceId};
    } else {
      streamConstraints.facingMode = MediaConstraintsHandler.CONFIG.CONSTRAINTS.VIDEO.PREFERRED_FACING_MODE;
    }

    streamConstraints.autoGainControl = false;

    return streamConstraints;
  }
}
