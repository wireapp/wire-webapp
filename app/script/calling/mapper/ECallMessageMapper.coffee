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

  build_cancel = (response, session_id, additional_payload) ->
    e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.CANCEL, response, session_id
    e_call_message_et.add_payload additional_payload
    return e_call_message_et

  build_hangup = (response, session_id, additional_payload) ->
    e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.HANGUP, response, session_id
    e_call_message_et.add_payload additional_payload
    return e_call_message_et

  build_ignore = (response, session_id, additional_payload) ->
    e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.IGNORE, response, session_id
    e_call_message_et.add_payload additional_payload
    return e_call_message_et

  build_prop_sync = (response, session_id, additional_payload) ->
    e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC, response, session_id
    e_call_message_et.add_payload additional_payload
    return e_call_message_et

  build_setup = (response, session_id, additional_payload) ->
    e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP, response, session_id
    e_call_message_et.add_payload additional_payload
    return e_call_message_et

  build_update = (response, session_id, additional_payload) ->
    e_call_message_et = new z.calling.entities.ECallMessage z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE, response, session_id
    e_call_message_et.add_payload additional_payload
    return e_call_message_et

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
      when z.calling.enum.E_CALL_MESSAGE_TYPE.PROP_SYNC
        props: e_call_message.props
      when z.calling.enum.E_CALL_MESSAGE_TYPE.SETUP, z.calling.enum.E_CALL_MESSAGE_TYPE.UPDATE
        props: e_call_message.props
        sdp: e_call_message.sdp

    $.extend additional_properties, content if content

    return new z.calling.entities.ECallMessage e_call_message.type, e_call_message.resp, e_call_message.sessid, additional_properties

  return {
    build_cancel: build_cancel
    build_hangup: build_hangup
    build_ignore: build_ignore
    build_prop_sync: build_prop_sync
    build_setup: build_setup
    build_update: build_update
    map_event: map_event
  }
