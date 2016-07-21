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
  constructor: (message, type) ->
    @name = @constructor.name
    @message = message
    @type = type
    @stack = (new Error()).stack

  @:: = new Error()
  @::constructor = @
  @::TYPE = {
    CALL_NOT_FOUND: 'z.calling.CallError::TYPE.CALL_NOT_FOUND'
    CONVERSATION_EMPTY: 'z.calling.CallError::TYPE.CONVERSATION_EMPTY'
    CONVERSATION_TOO_BIG: 'z.calling.CallError::TYPE.CONVERSATION_TOO_BIG'
    FLOW_NOT_FOUND: 'z.calling.CallError::TYPE.FLOW_NOT_FOUND'
    NO_CAMERA_FOUND: 'z.calling.CallError::TYPE.NO_CAMERA_FOUND'
    NO_CONVERSATION_ID: 'z.calling.CallError::TYPE.NO_CONVERSATION_ID'
    NO_DEVICES_FOUND: 'z.calling.CallError::TYPE.NO_DEVICES_FOUND'
    NO_MICROPHONE_FOUND: 'z.calling.CallError::TYPE.NO_MICROPHONE_FOUND'
    NOT_SUPPORTED: 'z.calling.CallError::TYPE.NOT_SUPPORTED'
    VOICE_CHANNEL_FULL: 'z.calling.CallError::TYPE.VOICE_CHANNEL_FULL'
  }
