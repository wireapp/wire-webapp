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

z.media.MediaRepository = class MediaRepository {
  // https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/state
  static get AUDIO_CONTEXT_STATE() {
    return {
      CLOSED: 'closed',
      RUNNING: 'running',
      SUSPENDED: 'suspended',
    };
  }

  /**
   * Extended check for MediaDevices support of browser.
   * @returns {boolean} True if MediaDevices are supported
   */
  static supports_media_devices() {
    return z.util.Environment.browser.supports.media_devices;
  }

  /**
   * Construct a new Media repository.
   */
  constructor() {
    this.logger = new z.util.Logger('z.media.MediaRepository', z.config.LOGGER.OPTIONS);

    this.constraints_handler = new z.media.MediaConstraintsHandler(this);
    this.devices_handler = new z.media.MediaDevicesHandler(this);
    this.element_handler = new z.media.MediaElementHandler(this);
    this.stream_handler = new z.media.MediaStreamHandler(this);

    this.audioContext = undefined;
  }

  /**
   * Closing the AudioContext.
   * @returns {undefined} No return value
   */
  close_audio_context() {
    if (this.audioContext && this.audioContext.state === MediaRepository.AUDIO_CONTEXT_STATE.RUNNING) {
      this.audioContext.close().then(() => {
        this.logger.info('Closed existing AudioContext', this.audioContext);
        this.audioContext = undefined;
      });
    }
  }

  /**
   * Initialize the AudioContext.
   * @returns {AudioContext} AudioContext
   */
  get_audio_context() {
    if (this.audioContext && this.audioContext.state === MediaRepository.AUDIO_CONTEXT_STATE.RUNNING) {
      this.logger.info('Reusing existing AudioContext', this.audioContext);
      return this.audioContext;
    }

    if (window.AudioContext && window.AudioContext.prototype.createMediaStreamSource) {
      this.audioContext = new window.AudioContext();
      this.logger.info('Initialized a new AudioContext', this.audioContext);
      return this.audioContext;
    }

    this.logger.error('The flow audio cannot use the Web Audio API as it is unavailable.');
    return undefined;
  }
};
