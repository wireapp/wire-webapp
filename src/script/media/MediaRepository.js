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

import {Environment} from 'Util/Environment';

import {MediaDevicesHandler} from './MediaDevicesHandler';
import {MediaConstraintsHandler} from './MediaConstraintsHandler';
import {MediaElementHandler} from './MediaElementHandler';
import {MediaStreamHandler} from './MediaStreamHandler';

export class MediaRepository {
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
  static supportsMediaDevices() {
    return Environment.browser.supports.mediaDevices;
  }

  /**
   * Construct a new Media repository.
   * @param {PermissionRepository} permissionRepository - Repository for all permission interactions
   * @param {Logger} logger - Logger configured for that class
   */
  constructor(permissionRepository, logger) {
    this.logger = logger;

    this.devicesHandler = new MediaDevicesHandler(this);
    this.constraintsHandler = new MediaConstraintsHandler(this.devicesHandler);
    this.elementHandler = new MediaElementHandler(this);
    this.streamHandler = new MediaStreamHandler(this, permissionRepository);

    this.audioContext = undefined;
  }

  /**
   * Closing the AudioContext.
   * @returns {undefined} No return value
   */
  closeAudioContext() {
    const contextRunning = this.audioContext && this.audioContext.state === MediaRepository.AUDIO_CONTEXT_STATE.RUNNING;
    if (contextRunning) {
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
  getAudioContext() {
    const contextRunning = this.audioContext && this.audioContext.state === MediaRepository.AUDIO_CONTEXT_STATE.RUNNING;
    if (contextRunning) {
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
}
