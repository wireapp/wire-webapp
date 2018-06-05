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

'use strict';

window.z = window.z || {};
window.z.media = z.media || {};

z.media.MediaConstraintsHandler = class MediaConstraintsHandler {
  static get CONFIG() {
    return {
      DEFAULT_DEVICE_ID: 'default',
      SCREEN_CONSTRAINTS: {
        MEDIA_SOURCE: 'desktop',
        SOURCE_TYPE: 'screen',
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
   * @param {z.media.MediaRepository} mediaRepository - Media repository with with references to all other handlers
   */
  constructor(mediaRepository) {
    this.mediaRepository = mediaRepository;
    this.logger = new z.util.Logger('z.media.MediaConstraintsHandler', z.config.LOGGER.OPTIONS);
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
   * @returns {Promise} Resolves with MediaStreamConstraints and their type
   */
  getMediaStreamConstraints(requestAudio = false, requestVideo = false, isGroup = false) {
    return Promise.resolve().then(() => {
      const currentDeviceId = this.mediaRepository.devicesHandler.currentDeviceId;
      const mode = isGroup ? z.media.VIDEO_QUALITY_MODE.GROUP : z.media.VIDEO_QUALITY_MODE.MOBILE;

      const streamConstraints = {
        audio: requestAudio ? this._getAudioStreamConstraints(currentDeviceId.audioInput()) : undefined,
        video: requestVideo ? this._getVideoStreamConstraints(currentDeviceId.videoInput(), mode) : undefined,
      };
      const mediaType = requestVideo ? z.media.MediaType.VIDEO : z.media.MediaType.AUDIO;

      return {mediaType, streamConstraints};
    });
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

      const currentDeviceId = this.mediaRepository.devicesHandler.currentDeviceId;
      const preferredResolution = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.HD;

      const streamConstraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: MediaConstraintsHandler.CONFIG.SCREEN_CONSTRAINTS.MEDIA_SOURCE,
            chromeMediaSourceId: currentDeviceId.screenInput(),
            maxHeight: preferredResolution.height,
            maxWidth: preferredResolution.width,
            minHeight: preferredResolution.height,
            minWidth: preferredResolution.width,
          },
        },
      };

      return Promise.resolve({
        mediaType: z.media.MediaType.SCREEN,
        streamConstraints,
      });
    }

    if (z.util.Environment.browser.firefox) {
      this.logger.info('Enabling screen sharing from Firefox');

      const streamConstraints = {
        audio: false,
        video: {
          mediaSource: MediaConstraintsHandler.CONFIG.SCREEN_CONSTRAINTS.SOURCE_TYPE,
        },
      };

      return Promise.resolve({
        mediaType: z.media.MediaType.SCREEN,
        streamConstraints,
      });
    }

    return Promise.reject(new z.media.MediaError(z.media.MediaError.TYPE.SCREEN_NOT_SUPPORTED));
  }

  /**
   * Get the video constraints to be used for MediaStream creation.
   *
   * @private
   * @param {string} mediaDeviceId - Optional ID of MediaDevice to be used
   * @param {z.media.VIDEO_QUALITY_MODE} [mode=z.media.VIDEO_QUALITY_MODE.MOBILE] - Quality of video stream requested
   * @returns {Object} Video stream constraints
   */
  _getVideoStreamConstraints(mediaDeviceId, mode = z.media.VIDEO_QUALITY_MODE.MOBILE) {
    let streamConstraints;
    switch (mode) {
      case z.media.VIDEO_QUALITY_MODE.FULL_HD: {
        streamConstraints = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.FULL_HD;
        break;
      }

      case z.media.VIDEO_QUALITY_MODE.GROUP: {
        streamConstraints = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.GROUP;
        break;
      }

      case z.media.VIDEO_QUALITY_MODE.HD: {
        streamConstraints = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.HD;
        break;
      }

      case z.media.VIDEO_QUALITY_MODE.MOBILE:
      default: {
        streamConstraints = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.MOBILE;
        break;
      }
    }

    if (_.isString(mediaDeviceId)) {
      streamConstraints.deviceId = {
        exact: mediaDeviceId,
      };
    } else {
      streamConstraints.facingMode = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.PREFERRED_FACING_MODE;
    }

    return streamConstraints;
  }
};
