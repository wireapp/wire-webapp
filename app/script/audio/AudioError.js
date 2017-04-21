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
window.z.audio = z.audio || {};

z.audio.AudioError = class AudioError extends Error {
  constructor(type) {
    super();
    this.name = this.constructor.name;
    this.stack = (new Error()).stack;
    this.type = type || z.audio.AudioError.TYPE.UNKNOWN;
    switch (this.type) {
      case z.audio.AudioError.TYPE.ALREADY_PLAYING:
        this.message = 'Sound is already playing';
        break;
      case z.audio.AudioError.TYPE.FAILED_TO_PLAY:
        this.message = 'Failed to play sound';
        break;
      case z.audio.AudioError.TYPE.IGNORED_SOUND:
        this.message = 'Ignored request to play sound';
        break;
      case z.audio.AudioError.TYPE.NOT_FOUND:
        this.message = 'AudioElement or ID not found';
        break;
      default:
        this.message = 'Unknown AudioError';
    }
  }

  static get TYPE() {
    return {
      ALREADY_PLAYING: 'z.audio.AudioError.TYPE.ALREADY_PLAYING',
      FAILED_TO_PLAY: 'z.audio.AudioError.TYPE.FAILED_TO_PLAY',
      IGNORED_SOUND: 'z.audio.AudioError.TYPE.IGNORED_SOUND',
      NOT_FOUND: 'z.audio.AudioError.TYPE.NOT_FOUND',
      UNKNOWN: 'z.audio.AudioError.TYPE.UNKNOWN',
    };
  }
};


