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

z.media.MediaError = class MediaError extends Error {
  constructor(type, media_type) {
    super();

    this.name = this.constructor.name;
    this.media_type = media_type;
    this.stack = (new Error()).stack;
    this.type = type || z.media.MediaError.prototype.TYPE.UNKNOWN;

    switch (this.type) {
      case z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE:
        this.message = 'Device related failure when getting MediaStream';
        break;
      case z.media.MediaError.TYPE.MEDIA_STREAM_MISC:
        this.message = 'Other failure when getting MediaStream';
        break;
      case z.media.MediaError.TYPE.MEDIA_STREAM_PERMISSION:
        this.message = 'Permission related failure when getting MediaStream';
        break;
      case z.media.MediaError.TYPE.NO_AUDIO_STREAM_FOUND:
        this.message = 'No audio stream found to toggle mute state';
        break;
      case z.media.MediaError.TYPE.NO_VIDEO_INPUT_DEVICE_FOUND:
        this.message = 'No video input device found';
        break;
      case z.media.MediaError.TYPE.NO_MEDIA_DEVICES_FOUND:
        this.message = 'No MediaDevices found';
        break;
      case z.media.MediaError.TYPE.SCREEN_NOT_SUPPORTED:
        this.message = 'Screen sharing is not yet supported by this browser';
        break;
      default:
        this.message = 'Unknown MediaError';
    }
  }

  static get TYPE() {
    return {
      MEDIA_STREAM_DEVICE: 'z.media.MediaError.TYPE.MEDIA_STREAM_DEVICE',
      MEDIA_STREAM_MISC: 'z.media.MediaError.TYPE.MEDIA_STREAM_MISC',
      MEDIA_STREAM_PERMISSION: 'z.media.MediaError.TYPE.MEDIA_STREAM_PERMISSION',
      NO_AUDIO_STREAM_FOUND: 'z.media.MediaError.TYPE.NO_AUDIO_STREAM_FOUND',
      NO_MEDIA_DEVICES_FOUND: 'z.media.MediaError.TYPE.NO_MEDIA_DEVICES_FOUND',
      NO_VIDEO_INPUT_DEVICE_FOUND: 'z.media.MediaError.TYPE.NO_VIDEO_INPUT_DEVICE_FOUND',
      SCREEN_NOT_SUPPORTED: 'z.media.MediaError.TYPE.SCREEN_NOT_SUPPORTED',
      UNKNOWN: 'z.media.MediaError.TYPE.UNKNOWN',
    };
  }
};
