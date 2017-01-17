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
z.calling.entities ?= {}

E_CALL_MESSAGE_CONFIG =
  VERSION: '3.0'

# E-call message entity.
class z.calling.entities.ECallMessage
  ###
  Construct a new e-call message entity.
  @param e_call_et [z.calling.entities.ECall] Optional e-call the e-call message relates to
  @param type [z.calling.enum.ECallMessageType] Type of e-call message
  @param response [Boolean] Is message a response, defaults to false
  @param content [Object] Optional object containing additional message payload
  ###
  constructor: (e_call_et, @type, @response = false, content) ->
    @sessid = e_call_et?.session_id or @create_session_id()

    if content
      @[key] = value for key, value of content

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
    _create_message_payload = =>
      switch @type
        when z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
          return {
            props: @props
          }
        when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP
          return {
            props: @props
            sdp: @sdp
          }

    json_payload =
      version: E_CALL_MESSAGE_CONFIG.VERSION
      resp: @response
      sessid: @sessid
      type: @type

    if @type in [z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC, z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP]
      $.extend json_payload, _create_message_payload()

    return json_payload

  to_content_string: =>
    return JSON.stringify @to_JSON()
