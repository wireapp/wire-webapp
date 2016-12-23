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
  @param type [z.e_call.enum.ECallMessageType] Type of e-call message
  @param response [Boolean] Is message a response, defaults to false
  @param e_call_et [z.e_call.entities.ECall] Optional e-call the e-call message relates to
  ###
  constructor: (@type, @response = false, e_call_et) ->
    @sessid = e_call_et?.session_id or @create_session_id()

  ###
  Create a session ID.
  @return [String] Random four char session ID
  ###
  create_session_id: ->
    in_range = (value, lower_bound, upper_bound) ->
      return value >= lower_bound and value <= upper_bound

    get_random_char = ->
      until in_range(char_index, 1, 9) or in_range(char_index, 65, 90) or in_range char_index, 97, 122
        char_index = Math.floor Math.random() * 122
      return if char_index <= 9 then char_index else String.fromCharCode char_index

    return "#{get_random_char()}#{get_random_char()}#{get_random_char()}#{get_random_char()}"

  to_JSON: =>
    return {
      version: E_CALL_MESSAGE_CONFIG.VERSION
      resp: @response
      sessid: @sessid
      type: @type
    }

  to_content_string: =>
    return JSON.stringify @to_JSON()
