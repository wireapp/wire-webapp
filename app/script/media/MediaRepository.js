/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/state
const AUDIO_CONTEXT_STATE = {
  CLOSED: 'closed',
  RUNNING: 'running',
  SUSPENDED: 'suspended',
};


z.media.MediaRepository = class MediaRepository {
  /**
   * Extended check for MediaDevices support of browser.
   * @returns {Boolean} True if MediaDevices are supported
  */
  static supports_media_devices() {
    return z.util.Environment.browser.supports.media_devices;
  }

  /**
   * Construct a new Media repository.
   * @returns {MediaRepository} The new Media repository
   */
  constructor() {
    this.logger = new z.util.Logger('z.media.MediaRepository', z.config.LOGGER.OPTIONS);

    this.devices_handler = new z.media.MediaDevicesHandler(this);
    this.element_handler = new z.media.MediaElementHandler(this);
    this.stream_handler = new z.media.MediaStreamHandler(this);

    this.audio_context = undefined;
    return this;
  }

  /**
   * Closing the AudioContext.
   * @returns {undefined} No return value
   */
  close_audio_context() {
    if (this.audio_context && this.audio_context.state === AUDIO_CONTEXT_STATE.RUNNING) {
      this.audio_context.close()
      .then(() => {
        this.logger.info('Closed existing AudioContext', this.audio_context);
        this.audio_context = undefined;
      });
    }
  }

  /**
   * Initialize the AudioContext.
   * @returns {AudioContext} AudioContext
   */
  get_audio_context() {
    if (this.audio_context) {
      this.logger.info('Reusing existing AudioContext', this.audio_context);
      return this.audio_context;
    }

    if (window.AudioContext && window.AudioContext.prototype.createMediaStreamSource) {
      this.audio_context = new window.AudioContext();
      this.logger.info('Initialized a new AudioContext', this.audio_context);
      return this.audio_context;
    }

    this.logger.error('The flow audio cannot use the Web Audio API as it is unavailable.');
    return undefined;
  }
};
