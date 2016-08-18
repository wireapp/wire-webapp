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
z.calling ?= {}

class z.calling.CallError
  constructor: (message) ->
    @name = @constructor.name
    @message = message or z.calling.CallError::TYPE.UNKNOWN
    @stack = (new Error()).stack

  @:: = new Error()
  @::constructor = @
  @::TYPE = {
    CALL_NOT_FOUND: 'No call for conversation ID found'
    CONVERSATION_EMPTY: 'No users in conversation'
    CONVERSATION_TOO_BIG: 'Too many participants in conversation'
    FLOW_NOT_FOUND: 'Flow not found'
    NO_AUDIO_STREAM_FOUND: 'No audio stream found to toggle mute state'
    NO_CAMERA_FOUND: 'No camera found'
    NO_CONVERSATION_ID: 'No conversation ID given'
    NO_DEVICES_FOUND: 'No MediaDevices found'
    NO_MICROPHONE_FOUND: 'No microphone found'
    NO_REPLACEABLE_TRACK: 'No replaceable MediaStreamTrack found'
    NOT_SUPPORTED: 'Not supported'
    RTP_SENDER_NOT_SUPPORTED: 'PeerConnection does not support getSenders()'
    SCREEN_NOT_SUPPORTED: 'Screen sharing is not yet supported by this browser'
    UNKNOWN: 'Unknown CallError'
    VOICE_CHANNEL_FULL: 'Too many participants in call'
  }
