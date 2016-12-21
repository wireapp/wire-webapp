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
z.e_call ?= {}
z.e_call.entities ?= {}

E_CALL_MESSAGE_CONFIG =
  VERSION: '3.0'

# E-call message entity.
class z.e_call.entities.ECallMessage
  ###
  Construct a new e-call message entity.
  @param e_call_et [z.e_call.entities.ECall] E-call the message relates to
  @param type [z.e_call.enum.ECallMessageType] Type of e-call message
  @param response [Boolean] Is message a response, defaults to false
  ###
  constructor: (e_call_et, @type, @response = false) ->
    @session_id = e_call_et.session_id

  to_JSON: =>
    return {
      version: E_CALL_MESSAGE_CONFIG.VERSION
      resp: @response
      sessid: @session_id
      type: @type
    }

  to_content_string: =>
    return JSON.stringify @to_JSON()
