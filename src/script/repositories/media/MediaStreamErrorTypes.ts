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

import {MEDIA_STREAM_ERROR} from './MediaStreamError';

/** @see https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Errors */
export const MEDIA_STREAM_ERROR_TYPES = {
  DEVICE: [MEDIA_STREAM_ERROR.ABORT_ERROR, MEDIA_STREAM_ERROR.NOT_FOUND_ERROR, MEDIA_STREAM_ERROR.NOT_READABLE_ERROR],
  MISC: [
    MEDIA_STREAM_ERROR.NOT_SUPPORTED_ERROR,
    MEDIA_STREAM_ERROR.OVERCONSTRAINED_ERROR,
    MEDIA_STREAM_ERROR.TYPE_ERROR,
  ],
  PERMISSION: [MEDIA_STREAM_ERROR.NOT_ALLOWED_ERROR, MEDIA_STREAM_ERROR.SECURITY_ERROR],
};

export function isMediaStreamDeviceError(errorStr: string): boolean {
  return MEDIA_STREAM_ERROR_TYPES.DEVICE.includes(errorStr as MEDIA_STREAM_ERROR);
}

export function isMediaStreamReadDeviceError(errorStr: string): boolean {
  return [
    MEDIA_STREAM_ERROR.NOT_READABLE_ERROR,
    MEDIA_STREAM_ERROR.NOT_ALLOWED_ERROR,
    MEDIA_STREAM_ERROR.NOT_FOUND_ERROR,
  ].includes(errorStr as MEDIA_STREAM_ERROR);
}
