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
  constructor: (type) ->
    @name = @constructor.name
    @stack = (new Error()).stack
    @type = type or z.calling.CallError::TYPE.UNKNOWN

    @message = switch @type
      when z.calling.CallError::TYPE.CALL_NOT_FOUND
        'No call for conversation ID found'
      when z.calling.CallError::TYPE.CONVERSATION_EMPTY
        'No users in conversation'
      when z.calling.CallError::TYPE.CONVERSATION_TOO_BIG
        'Too many participants in conversation'
      when z.calling.CallError::TYPE.FLOW_NOT_FOUND
        'Flow not found'
      when z.calling.CallError::TYPE.NO_CONVERSATION_ID
        'No conversation ID given'
      when z.calling.CallError::TYPE.NO_REPLACEABLE_TRACK
        'No replaceable MediaStreamTrack found'
      when z.calling.CallError::TYPE.NOT_SUPPORTED
        'Not supported'
      when z.calling.CallError::TYPE.RTP_SENDER_NOT_SUPPORTED
        'PeerConnection does not support getSenders()'
      when z.calling.CallError::TYPE.VOICE_CHANNEL_FULL
        'Too many participants in call'
      else
        'Unknown CallError'

  @:: = new Error()
  @::constructor = @
  @::TYPE = {
    CALL_NOT_FOUND: 'z.calling.CallError::TYPE.CALL_NOT_FOUND'
    CONVERSATION_EMPTY: 'z.calling.CallError::TYPE.CONVERSATION_EMPTY'
    CONVERSATION_TOO_BIG: 'z.calling.CallError::TYPE.CONVERSATION_TOO_BIG'
    FLOW_NOT_FOUND: 'z.calling.CallError::TYPE.FLOW_NOT_FOUND'
    NO_CONVERSATION_ID: 'z.calling.CallError::TYPE.NO_CONVERSATION_ID'
    NO_REPLACEABLE_TRACK: 'z.calling.CallError::TYPE.NO_REPLACEABLE_TRACK'
    NOT_SUPPORTED: 'z.calling.CallError::TYPE.NOT_SUPPORTED'
    RTP_SENDER_NOT_SUPPORTED: 'z.calling.CallError::TYPE.RTP_SENDER_NOT_SUPPORTED'
    UNKNOWN: 'z.calling.CallError::TYPE.UNKNOWN'
    VOICE_CHANNEL_FULL: 'z.calling.CallError::TYPE.VOICE_CHANNEL_FULL'
  }
