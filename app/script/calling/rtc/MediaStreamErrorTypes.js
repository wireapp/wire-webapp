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
window.z.calling = z.calling || {};
window.z.calling.rtc = z.calling.rtc || {};

// https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Errors
z.calling.rtc.MEDIA_STREAM_ERROR_TYPES = {
  DEVICE: [
    z.calling.rtc.MEDIA_STREAM_ERROR.ABORT_ERROR,
    z.calling.rtc.MEDIA_STREAM_ERROR.DEVICES_NOT_FOUND_ERROR,
    z.calling.rtc.MEDIA_STREAM_ERROR.NOT_FOUND_ERROR,
    z.calling.rtc.MEDIA_STREAM_ERROR.NOT_READABLE_ERROR,
  ],
  MISC: [
    z.calling.rtc.MEDIA_STREAM_ERROR.INTERNAL_ERROR,
    z.calling.rtc.MEDIA_STREAM_ERROR.INVALID_STATE_ERROR,
    z.calling.rtc.MEDIA_STREAM_ERROR.SOURCE_UNAVAILABLE_ERROR,
    z.calling.rtc.MEDIA_STREAM_ERROR.OVER_CONSTRAINED_ERROR,
    z.calling.rtc.MEDIA_STREAM_ERROR.TRACK_START_ERROR,
    z.calling.rtc.MEDIA_STREAM_ERROR.TYPE_ERROR,
  ],
  PERMISSION: [
    z.calling.rtc.MEDIA_STREAM_ERROR.NOT_ALLOWED_ERROR,
    z.calling.rtc.MEDIA_STREAM_ERROR.PERMISSION_DENIED_ERROR,
    z.calling.rtc.MEDIA_STREAM_ERROR.PERMISSION_DISMISSED_ERROR,
    z.calling.rtc.MEDIA_STREAM_ERROR.SECURITY_ERROR,
  ],
};
