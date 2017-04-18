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
  @param type [z.calling.enum.ECallMessageType] Type of e-call message
  @param response [Boolean] Is message a response, defaults to false
  @param session_id [String] Optional session ID
  ###
  constructor: (@type, @response = false, session_id) ->
    @session_id = session_id or @_create_session_id()

  ###
  Create a session ID.
  @private
  @return [String] Random four char session ID
  ###
  _create_session_id: ->
    return (z.util.StringUtil.get_random_character() for [0..3]).join ''

  ###
  Add additional payload to message.
  @param additional_properties [Object] Optional object containing additional message payload
  ###
  add_properties: (additional_properties = {}) =>
    @[key] = value for key, value of additional_properties

  to_JSON: =>
    json_payload =
      version: E_CALL_MESSAGE_CONFIG.VERSION
      resp: @response
      sessid: @session_id
      type: @type

    if @type in [z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP, z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC, z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP, z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE]
      json_payload.props = @props
      json_payload.sdp = @sdp if @type isnt z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC

    if @type is z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP
      json_payload.dest_clientid = @remote_client_id
      json_payload.dest_userid = @remote_user_id

    return json_payload

  to_content_string: =>
    return JSON.stringify @to_JSON()
