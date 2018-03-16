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
   * @param {z.media.MediaRepository} media_repository - Media repository with with references to all other handlers
   */
  constructor(media_repository) {
    this.media_repository = media_repository;
    this.logger = new z.util.Logger('z.media.MediaConstraintsHandler', z.config.LOGGER.OPTIONS);
  }

  //##############################################################################
  // MediaStream constraints
  //##############################################################################

  /**
   * Get the MediaStreamConstraints to be used for MediaStream creation.
   *
   * @private
   * @param {boolean} [request_audio=false] - Request audio in the constraints
   * @param {boolean} [request_video=false] - Request video in the constraints
   * @returns {Promise} Resolves with MediaStreamConstraints and their type
   */
  get_media_stream_constraints(request_audio = false, request_video = false) {
    return Promise.resolve().then(() => {
      const current_device_id = this.media_repository.devices_handler.current_device_id;
      const streamConstraints = {
        audio: request_audio ? this._get_audio_stream_constraints(current_device_id.audio_input()) : undefined,
        video: request_video ? this._get_video_stream_constraints(current_device_id.video_input()) : undefined,
      };
      const mediaType = request_video ? z.media.MediaType.VIDEO : z.media.MediaType.AUDIO;

      return {mediaType, streamConstraints};
    });
  }

  /**
   * Get the video constraints to be used for MediaStream creation.
   * @private
   * @param {string} [media_device_id=''] - ID of MediaDevice to be used
   * @returns {Object} Video stream constraints
   */
  _get_audio_stream_constraints(media_device_id = '') {
    if (media_device_id && media_device_id !== MediaConstraintsHandler.CONFIG.DEFAULT_DEVICE_ID) {
      return {
        deviceId: {
          exact: media_device_id,
        },
      };
    }
    return true;
  }

  /**
   * Get the MediaStreamConstraints to be used for screen sharing.
   * @returns {Promise} Resolves with MediaStreamConstraints and their type
   */
  get_screen_stream_constraints() {
    if (window.desktopCapturer) {
      this.logger.info('Enabling screen sharing from Electron');

      const current_device_id = this.media_repository.devices_handler.current_device_id;
      const preferred_resolution = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.HD;

      const media_stream_constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: MediaConstraintsHandler.CONFIG.SCREEN_CONSTRAINTS.MEDIA_SOURCE,
            chromeMediaSourceId: current_device_id.screen_input(),
            maxHeight: preferred_resolution.height,
            maxWidth: preferred_resolution.width,
            minHeight: preferred_resolution.height,
            minWidth: preferred_resolution.width,
          },
        },
      };

      return Promise.resolve({
        media_stream_constraints: media_stream_constraints,
        media_type: z.media.MediaType.SCREEN,
      });
    }

    if (z.util.Environment.browser.firefox) {
      this.logger.info('Enabling screen sharing from Firefox');

      const media_stream_constraints = {
        audio: false,
        video: {
          mediaSource: MediaConstraintsHandler.CONFIG.SCREEN_CONSTRAINTS.SOURCE_TYPE,
        },
      };

      return Promise.resolve({
        media_stream_constraints: media_stream_constraints,
        media_type: z.media.MediaType.SCREEN,
      });
    }

    return Promise.reject(new z.media.MediaError(z.media.MediaError.TYPE.SCREEN_NOT_SUPPORTED));
  }

  /**
   * Get the video constraints to be used for MediaStream creation.
   *
   * @private
   * @param {string} media_device_id - Optional ID of MediaDevice to be used
   * @param {z.media.VIDEO_QUALITY_MODE} [mode=z.media.VIDEO_QUALITY_MODE.MOBILE] - Quality of video stream requested
   * @returns {Object} Video stream constraints
   */
  _get_video_stream_constraints(media_device_id, mode = z.media.VIDEO_QUALITY_MODE.MOBILE) {
    let media_stream_constraints;
    switch (mode) {
      case z.media.VIDEO_QUALITY_MODE.FULL_HD:
        media_stream_constraints = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.FULL_HD;
        break;
      case z.media.VIDEO_QUALITY_MODE.HD:
        media_stream_constraints = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.HD;
        break;
      case z.media.VIDEO_QUALITY_MODE.MOBILE:
      default:
        media_stream_constraints = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.MOBILE;
        break;
    }

    if (_.isString(media_device_id)) {
      media_stream_constraints.deviceId = {
        exact: media_device_id,
      };
    } else {
      media_stream_constraints.facingMode = MediaConstraintsHandler.CONFIG.VIDEO_CONSTRAINTS.PREFERRED_FACING_MODE;
    }

    return media_stream_constraints;
  }
};
