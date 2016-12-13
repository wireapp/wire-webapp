#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
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
z.media ?= {}

class z.media.MediaError
  constructor: (type) ->
    @name = @constructor.name
    @stack = (new Error()).stack
    @type = type or z.media.MediaError::TYPE.UNKNOWN

    @message = switch @type
      when z.media.MediaError::TYPE.MEDIA_STREAM_DEVICE
        'Device related failure when getting MediaStream'
      when z.media.MediaError::TYPE.MEDIA_STREAM_MISC
        'Other failure when getting MediaStream'
      when z.media.MediaError::TYPE.MEDIA_STREAM_PERMISSION
        'Permission related failure when getting MediaStream'
      when z.media.MediaError::TYPE.NO_AUDIO_STREAM_FOUND
        'No audio stream found to toggle mute state'
      when z.media.MediaError::TYPE.NO_VIDEO_INPUT_DEVICE_FOUND
        'No video input device found'
      when z.media.MediaError::TYPE.NO_MEDIA_DEVICES_FOUND
        'No MediaDevices found'
      when z.media.MediaError::TYPE.SCREEN_NOT_SUPPORTED
        'Screen sharing is not yet supported by this browser'
      else
        'Unknown MediaError'

  @:: = new Error()
  @::constructor = @
  @::TYPE = {
    MEDIA_STREAM_DEVICE: 'z.media.MediaError::TYPE.MEDIA_STREAM_DEVICE'
    MEDIA_STREAM_MISC: 'z.media.MediaError::TYPE.MEDIA_STREAM_MISC'
    MEDIA_STREAM_PERMISSION: 'z.media.MediaError::TYPE.MEDIA_STREAM_PERMISSION'
    NO_AUDIO_STREAM_FOUND: 'z.media.MediaError::TYPE.NO_AUDIO_STREAM_FOUND'
    NO_MEDIA_DEVICES_FOUND: 'z.media.MediaError::TYPE.NO_MEDIA_DEVICES_FOUND'
    NO_VIDEO_INPUT_DEVICE_FOUND: 'z.media.MediaError::TYPE.NO_VIDEO_INPUT_DEVICE_FOUND'
    SCREEN_NOT_SUPPORTED: 'z.media.MediaError::TYPE.SCREEN_NOT_SUPPORTED'
    UNKNOWN: 'z.media.MediaError::TYPE.UNKNOWN'
  }
