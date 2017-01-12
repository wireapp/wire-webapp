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
z.calling.e_call ?= {}

class z.calling.e_call.ECallError
  constructor: (type) ->
    @name = @constructor.name
    @stack = (new Error()).stack
    @type = type or z.calling.e_call.ECallError::TYPE.UNKNOWN

    @message = switch @type
      when z.calling.e_call.ECallError::TYPE.DATA_CHANNEL_NOT_OPENED
        'E-call has not yet established data channel'
      when z.calling.e_call.ECallError::TYPE.E_CALL_NOT_FOUND
        'No e-call for conversation ID found'
      when z.calling.e_call.ECallError::TYPE.NO_CONVERSATION_ID
        'No conversation ID given'
      when z.calling.e_call.ECallError::TYPE.NOT_SUPPORTED
        'Tried to use calling v3 API in group conversation'
      when z.calling.e_call.ECallError::TYPE.PARTICIPANT_NOT_FOUND
        'No participant for given ID'
      when z.calling.e_call.ECallError::TYPE.UNKNOWN_EVENT_TYPE
        'E-call event of unknown type was ignored'
      when z.calling.e_call.ECallError::TYPE.UNSUPPORTED_VERSION
        'Unsupported version of the e-call protocol'
      when z.calling.e_call.ECallError::TYPE.WRONG_PAYLOAD_FORMAT
        'Payload for an e-call message is in wrong format'
      else
        'Unknown ECallError'

  @:: = new Error()
  @::constructor = @
  @::TYPE = {
    DATA_CHANNEL_NOT_OPENED: 'z.calling.e_call.ECallError::TYPE.DATA_CHANNEL_NOT_OPENED'
    E_CALL_NOT_FOUND: 'z.calling.e_call.ECallError::TYPE.E_CALL_NOT_FOUND'
    NO_CONVERSATION_ID: 'z.calling.e_call.ECallError::TYPE.NO_CONVERSATION_ID'
    PARTICIPANT_NOT_FOUND: 'z.calling.e_call.ECallError::TYPE.PARTICIPANT_NOT_FOUND'
    UNKNOWN: 'z.calling.e_call.ECallError::TYPE.UNKNOWN'
    UNKNOWN_EVENT_TYPE: 'z.calling.e_call.ECallError::TYPE.UNKNOWN_EVENT_TYPE'
    UNSUPPORTED_VERSION: 'z.calling.e_call.ECallError::TYPE.UNSUPPORTED_VERSION'
    WRONG_PAYLOAD_FORMAT: 'z.calling.e_call.ECallError::TYPE.WRONG_PAYLOAD_FORMAT'
  }
