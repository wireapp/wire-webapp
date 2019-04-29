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

import {getLogger} from 'Util/Logger';
import {Environment} from 'Util/Environment';

import {VIDEO_QUALITY_MODE} from './VideoQualityMode';

export class MediaConstraintsHandler {
  static get CONFIG() {
    return {
      DEFAULT_DEVICE_ID: 'default',
      SCREEN_CONSTRAINTS: {
        DESKTOP_CAPTURER: {
          mandatory: {
            chromeMediaSource: 'desktop',
            maxHeight: 1080,
            minHeight: 1080,
          },
        },
        DISPLAY_MEDIA: {
          video: {
            height: {
              ideal: 1080,
              max: 1080,
            },
          },
        },
        USER_MEDIA: {
          frameRate: 30,
          height: {exact: 720},
          mediaSource: 'screen',
        },
      },
      VIDEO_CONSTRAINTS: {
        FULL_HD: {
          frameRate: 30,
          height: 1080,
          width: 1920,
        },
        GROUP: {
          frameRate: 30,
          height: 240,
          width: 320,
        },
        HD: {
          frameRate: 30,
          height: 720,
          width: 1280,
        },
        MOBILE: {
          frameRate: 30,
          height: 480,
          width: 640,
        },
        PREFERRED_FACING_MODE: 'user',
      },
    };
  }

  /**
   * Construct a new MediaConstraints handler.
   * @param {MediaRepository} devicesHandler - Media repository with with references to all other handlers
   */
  constructor(devicesHandler) {
    this.devicesHandler = devicesHandler;
    this.logger = getLogger('MediaConstraintsHandler');
  }

  //##############################################################################
  // MediaStream constraints
  //##############################################################################

  /**
   * Get the MediaStreamConstraints to be used for MediaStream creation.
   *
   * @private
   * @param {boolean} [requestAudio=false] - Request audio in the constraints
   * @param {boolean} [requestVideo=false] - Request video in the constraints
   * @param {boolean} [isGroup=false] - Get constraints for group
   * @returns {MediaStreamConstraints} - The generated constraints
   */
  getMediaStreamConstraints(requestAudio = false, requestVideo = false, isGroup = false) {
    const currentDeviceId = this.devicesHandler.currentDeviceId;
    const mode = isGroup ? VIDEO_QUALITY_MODE.GROUP : VIDEO_QUALITY_MODE.MOBILE;

    return {
      audio: requestAudio ? this._getAudioStreamConstraints(currentDeviceId.audioInput()) : undefined,
      video: requestVideo ? this._getVideoStreamConstraints(currentDeviceId.videoInput(), mode) : undefined,
    };
  }

  /**
   * Get the video constraints to be used for MediaStream creation.
   * @private
   * @param {string} [mediaDeviceId=''] - ID of MediaDevice to be used
   * @returns {Object} Video stream constraints
   */
  _getAudioStreamConstraints(mediaDeviceId = '') {
    const requireExactMediaDevice = mediaDeviceId && mediaDeviceId !== MediaConstraintsHandler.CONFIG.DEFAULT_DEVICE_ID;
    return requireExactMediaDevice ? {deviceId: {exact: mediaDeviceId}} : true;
  }

  /**
   * Get the MediaStreamConstraints to be used for screen sharing.
   * @returns {Promise} Resolves with MediaStreamConstraints and their type
   */
  getScreenStreamConstraints() {
    if (window.desktopCapturer) {
      this.logger.info('Enabling screen sharing from Electron');

      const streamConstraints = {
        audio: false,
        video: MediaConstraintsHandler.CONFIG.SCREEN_CONSTRAINTS.DESKTOP_CAPTURER,
      };

      const chromeMediaSourceId = this.devicesHandler.currentDeviceId.screenInput();
      streamConstraints.video.mandatory = Object.assign(streamConstraints.video.mandatory, {chromeMediaSourceId});

      return Promise.resolve(streamConstraints);
    }

    if (navigator.mediaDevices.getDisplayMedia) {
      this.logger.info('Enabling screen sharing from Chrome');

      const streamConstraints = {
        audio: false,
        video: MediaConstraintsHandler.CONFIG.SCREEN_CONSTRAINTS.DISPLAY_MEDIA,
      };

      return Promise.resolve(streamConstraints);
    }

    if (Environment.browser.firefox) {
      this.logger.info('Enabling screen sharing from Firefox');

      const streamConstraints = {
        audio: false,
        video: MediaConstraintsHandler.CONFIG.SCREEN_CONSTRAINTS.USER_MEDIA,
      };

      return Promise.resolve(streamConstraints);
    }

    return Promise.reject(new z.error.MediaError(z.error.MediaError.TYPE.SCREEN_NOT_SUPPORTED));
  }

  /**
   * Get the video constraints to be used for MediaStream creation.
   *
   * @private
   * @param {string} mediaDeviceId - Optional ID of MediaDevice to be used
   * @param {VIDEO_QUALITY_MODE} [mode=VIDEO_QUALITY_MODE.MOBILE] - Quality of video stream requested
   * @returns {Object} Video stream constraints
   */
  _getVideoStreamConstraints(mediaDeviceId, mode = VIDEO_QUALITY_MODE.MOBILE) {
    let streamConstraints;
    switch (mode) {
      case VIDEO_QUALITY_MODE.FULL_HD: {
        streamConstraints = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.FULL_HD;
        break;
      }

      case VIDEO_QUALITY_MODE.GROUP: {
        streamConstraints = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.GROUP;
        break;
      }

      case VIDEO_QUALITY_MODE.HD: {
        streamConstraints = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.HD;
        break;
      }

      case VIDEO_QUALITY_MODE.MOBILE:
      default: {
        streamConstraints = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.MOBILE;
        break;
      }
    }

    if (_.isString(mediaDeviceId)) {
      streamConstraints.deviceId = {exact: mediaDeviceId};
    } else {
      streamConstraints.facingMode = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.PREFERRED_FACING_MODE;
    }

    return streamConstraints;
  }
}
