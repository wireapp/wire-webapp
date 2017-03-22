#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.calling ?= {}
z.calling.rtc ?= {}

# https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia#Errors
z.calling.rtc.MediaStreamErrorTypes =
  DEVICE: [
    z.calling.rtc.MediaStreamError.ABORT_ERROR
    z.calling.rtc.MediaStreamError.DEVICES_NOT_FOUND_ERROR
    z.calling.rtc.MediaStreamError.NOT_FOUND_ERROR
    z.calling.rtc.MediaStreamError.NOT_READABLE_ERROR
  ]
  MISC: [
    z.calling.rtc.MediaStreamError.INTERNAL_ERROR
    z.calling.rtc.MediaStreamError.INVALID_STATE_ERROR
    z.calling.rtc.MediaStreamError.SOURCE_UNAVAILABLE_ERROR
    z.calling.rtc.MediaStreamError.OVER_CONSTRAINED_ERROR
    z.calling.rtc.MediaStreamError.TYPE_ERROR
  ]
  PERMISSION: [
    z.calling.rtc.MediaStreamError.NOT_ALLOWED_ERROR
    z.calling.rtc.MediaStreamError.PERMISSION_DENIED_ERROR
    z.calling.rtc.MediaStreamError.PERMISSION_DISMISSED_ERROR
    z.calling.rtc.MediaStreamError.SECURITY_ERROR
  ]
