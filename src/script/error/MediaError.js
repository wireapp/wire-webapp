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

window.z = window.z || {};
window.z.error = z.error || {};

z.error.MediaError = class MediaError extends z.error.BaseError {
  constructor(type, mediaType, message) {
    super('MediaError', type, message);

    this.mediaType = mediaType;
  }

  static get MESSAGE() {
    return {
      MEDIA_STREAM_DEVICE: 'Device related failure when getting MediaStream',
      MEDIA_STREAM_MISC: 'Other failure when getting MediaStream',
      MEDIA_STREAM_PERMISSION: 'Permission related failure when getting MediaStream',
      NO_MEDIA_DEVICES_FOUND: 'No MediaDevices found',
      SCREEN_NOT_SUPPORTED: 'Screen sharing is not yet supported by this browser',
      STREAM_NOT_FOUND: 'No local MediaStream found',
      UNHANDLED_MEDIA_TYPE: 'Media type unknown',
    };
  }

  static get TYPE() {
    return {
      MEDIA_STREAM_DEVICE: 'MEDIA_STREAM_DEVICE',
      MEDIA_STREAM_MISC: 'MEDIA_STREAM_MISC',
      MEDIA_STREAM_PERMISSION: 'MEDIA_STREAM_PERMISSION',
      NO_MEDIA_DEVICES_FOUND: 'NO_MEDIA_DEVICES_FOUND',
      SCREEN_NOT_SUPPORTED: 'SCREEN_NOT_SUPPORTED',
      STREAM_NOT_FOUND: 'STREAM_NOT_FOUND',
      UNHANDLED_MEDIA_TYPE: 'MediaError.UNHANDLED_MEDIA_TYPE',
    };
  }
};
