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
z.calling.rtc.MEDIA_STREAM_ERROR = {
  ABORT_ERROR: 'AbortError',
  DEVICES_NOT_FOUND_ERROR: 'DevicesNotFoundError',
  INTERNAL_ERROR: 'InternalError',
  INVALID_STATE_ERROR: 'InvalidStateError',
  NOT_ALLOWED_ERROR: 'NotAllowedError',
  NOT_FOUND_ERROR: 'NotFoundError',
  NOT_READABLE_ERROR: 'NotReadableError',
  OVER_CONSTRAINED_ERROR: 'OverConstrainedError',
  PERMISSION_DENIED_ERROR: 'PermissionDeniedError',
  PERMISSION_DISMISSED_ERROR: 'PermissionDismissedError',
  SECURITY_ERROR: 'SecurityError',
  SOURCE_UNAVAILABLE_ERROR: 'SourceUnavailableError',
  TRACK_START_ERROR: 'TrackStartError',
  TYPE_ERROR: 'TypeError',
};
