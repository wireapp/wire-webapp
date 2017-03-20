/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

(function() {
  function AudioError(type) {
    this.name = this.constructor.name;
    this.stack = (new Error()).stack;
    this.type = type || z.audio.AudioError.prototype.TYPE.UNKNOWN;
    switch (this.type) {
      case z.audio.AudioError.prototype.TYPE.ALREADY_PLAYING:
        this.message = 'Sound is already playing';
        break;
      case z.audio.AudioError.prototype.TYPE.FAILED_TO_PLAY:
        this.message = 'Failed to play sound';
        break;
      case z.audio.AudioError.prototype.TYPE.IGNORED_SOUND:
        this.message = 'Ignored request to play sound';
        break;
      case z.audio.AudioError.prototype.TYPE.NOT_FOUND:
        this.message = 'AudioElement or ID not found';
        break;
      default:
        this.message = 'Unknown AudioError';
    }
  }

  AudioError.prototype = new Error();

  AudioError.prototype.constructor = AudioError;

  AudioError.prototype.TYPE = {
    ALREADY_PLAYING: 'z.audio.AudioError::TYPE.ALREADY_PLAYING',
    FAILED_TO_PLAY: 'z.audio.AudioError::TYPE.FAILED_TO_PLAY',
    IGNORED_SOUND: 'z.audio.AudioError::TYPE.IGNORED_SOUND',
    NOT_FOUND: 'z.audio.AudioError::TYPE.NOT_FOUND',
    UNKNOWN: 'z.audio.AudioError::TYPE.UNKNOWN',
  };

  window.z = window.z || {};
  window.z.audio = z.audio || {};
  window.z.audio.AudioError = AudioError;
})();

