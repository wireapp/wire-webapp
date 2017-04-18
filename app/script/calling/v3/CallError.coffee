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
z.calling.v3 ?= {}

class z.calling.v3.CallError
  constructor: (type, message) ->
    @name = @constructor.name
    @stack = (new Error()).stack
    @type = type or z.calling.v3.CallError::TYPE.UNKNOWN

    @message = message or switch @type
      when z.calling.v3.CallError::TYPE.NO_CONVERSATION_ID
        'No conversation ID given'
      when z.calling.v3.CallError::TYPE.NO_DATA_CHANNEL
        'No established data channel for e-call'
      when z.calling.v3.CallError::TYPE.NO_REPLACEABLE_TRACK
        'No replaceable MediaStreamTrack found'
      when z.calling.v3.CallError::TYPE.NO_USER_ID
        'User ID to target message not given'
      when z.calling.v3.CallError::TYPE.NOT_FOUND
        'No e-call for conversation ID found'
      when z.calling.v3.CallError::TYPE.RTP_SENDER_NOT_SUPPORTED
        'PeerConnection does not support RtcRtpSender extension'
      when z.calling.v3.CallError::TYPE.UNSUPPORTED_VERSION
        'Unsupported version of the e-call protocol'
      when z.calling.v3.CallError::TYPE.WRONG_CONVERSATION_TYPE
        'Wrong conversation type for e-call message'
      when z.calling.v3.CallError::TYPE.WRONG_PAYLOAD_FORMAT
        'Payload for an e-call message is in wrong format'
      when z.calling.v3.CallError::TYPE.WRONG_SENDER
        'Call change from wrong sender'
      else
        'Unknown ECallError'

  @:: = new Error()
  @::constructor = @
  @::TYPE =
    NO_CONVERSATION_ID: 'z.calling.v3.CallError::TYPE.NO_CONVERSATION_ID'
    NO_DATA_CHANNEL: 'z.calling.v3.CallError::TYPE.NO_DATA_CHANNEL'
    NO_REPLACEABLE_TRACK: 'z.calling.v3.CallError::TYPE.NO_REPLACEABLE_TRACK'
    NO_USER_ID: 'z.calling.v3.CallError::TYPE.NO_USER_ID'
    NOT_FOUND: 'z.calling.v3.CallError::TYPE.NOT_FOUND'
    RTP_SENDER_NOT_SUPPORTED: 'z.calling.v3.CallError::TYPE.RTP_SENDER_NOT_SUPPORTED'
    UNKNOWN: 'z.calling.v3.CallError::TYPE.UNKNOWN'
    UNSUPPORTED_VERSION: 'z.calling.v3.CallError::TYPE.UNSUPPORTED_VERSION'
    WRONG_CONVERSATION_TYPE: 'z.calling.v3.CallError::TYPE.WRONG_CONVERSATION_TYPE'
    WRONG_PAYLOAD_FORMAT: 'z.calling.v3.CallError::TYPE.WRONG_PAYLOAD_FORMAT'
    WRONG_SENDER: 'z.calling.v3.CallError::TYPE.WRONG_SENDER'
