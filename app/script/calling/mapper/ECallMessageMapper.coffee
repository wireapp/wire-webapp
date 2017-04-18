#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
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
z.calling.mapper ?= {}

z.calling.mapper.ECallMessageMapper = do ->

  build_e_call_message = (type, response, session_id, additional_payload) ->
    e_call_message_et = new z.calling.entities.ECallMessage type, response, session_id
    e_call_message_et.add_properties additional_payload
    return e_call_message_et

  build_cancel = (response, session_id, additional_payload) ->
    return build_e_call_message z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL, response, session_id, additional_payload

  build_group_check = (response, session_id, additional_payload) ->
    return build_e_call_message z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_CHECK, response, session_id, additional_payload

  build_group_leave = (response, session_id, additional_payload) ->
    return build_e_call_message z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_LEAVE, response, session_id, additional_payload

  build_group_setup = (response, session_id, additional_payload) ->
    return build_e_call_message z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP, response, session_id, additional_payload

  build_group_start = (response, session_id, additional_payload) ->
    return build_e_call_message z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_START, response, session_id, additional_payload

  build_hangup = (response, session_id, additional_payload) ->
    return build_e_call_message z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP, response, session_id, additional_payload

  build_prop_sync = (response, session_id, additional_payload) ->
    return build_e_call_message z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC, response, session_id, additional_payload

  build_reject = (response, session_id, additional_payload) ->
    return build_e_call_message z.calling.enum.E_CALL_MESSAGE_TYPE.REJECT, response, session_id, additional_payload

  build_setup = (response, session_id, additional_payload) ->
    return build_e_call_message z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP, response, session_id, additional_payload

  build_update = (response, session_id, additional_payload) ->
    return build_e_call_message z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE, response, session_id, additional_payload

  ###
  Map incoming e-call message into entity.
  @private
  @param event [Object] E-call event object
  @return [z.calling.entities.ECallMessage] E-call message entity
  ###
  map_event = (event) ->
    e_call_message = event.content

    additional_properties =
      conversation_id: event.conversation
      time: event.time
      user_id: event.from
      client_id: event.sender

    content = switch e_call_message.type
      when z.calling.enum.E_CALL_MESSAGE_TYPE.GROUP_SETUP
        dest_client_id: e_call_message.dest_clientid
        dest_user_id: e_call_message.dest_userid
        props: e_call_message.props
        sdp: e_call_message.sdp
      when z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
        props: e_call_message.props
      when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP, z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE
        props: e_call_message.props
        sdp: e_call_message.sdp

    $.extend additional_properties, content if content

    e_call_message_et = new z.calling.entities.ECallMessage e_call_message.type, e_call_message.resp, e_call_message.sessid
    e_call_message_et.add_properties additional_properties
    return e_call_message_et

  return {
    build_cancel: build_cancel
    build_group_check: build_group_check
    build_group_leave: build_group_leave
    build_group_setup: build_group_setup
    build_group_start: build_group_start
    build_hangup: build_hangup
    build_prop_sync: build_prop_sync
    build_reject: build_reject
    build_setup: build_setup
    build_update: build_update
    map_event: map_event
  }
