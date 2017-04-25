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
z.conversation ?= {}

z.conversation.EventBuilder = do ->

  build_all_verified = (conversation_et) ->
    conversation: conversation_et.id
    id: z.util.create_random_uuid()
    type: z.event.Client.CONVERSATION.VERIFICATION
    from: conversation_et.self.id
    time: new Date().toISOString()
    data:
      type: z.message.VerificationMessageType.VERIFIED

  build_calling = (conversation_et, e_call_message, user_id, client_id) ->
    conversation: conversation_et.id
    from: user_id
    content: e_call_message
    sender: client_id
    type: z.event.Client.CALL.E_CALL

  build_degraded = (conversation_et, user_ids, type) ->
    conversation: conversation_et.id
    id: z.util.create_random_uuid()
    type: z.event.Client.CONVERSATION.VERIFICATION
    from: conversation_et.self.id
    time: new Date().toISOString()
    data:
      type: type
      user_ids: user_ids

  build_unable_to_decrypt = (event, decrypt_error, error_code) ->
    conversation: event.conversation
    id: z.util.create_random_uuid()
    type: z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT
    from: event.from
    time: event.time
    error: "#{decrypt_error.message} (#{event.data.sender})"
    error_code: "#{error_code} (#{event.data.sender})"

  build_voice_channel_activate = (e_call_message_et) ->
    conversation: e_call_message_et.conversation_id
    id: z.util.create_random_uuid()
    type: z.event.Backend.CONVERSATION.VOICE_CHANNEL_ACTIVATE
    from: e_call_message_et.user_id
    time: e_call_message_et.time
    protocol_version: z.calling.enum.PROTOCOL.VERSION_3

  build_voice_channel_deactivate = (e_call_message_et, creating_user_et) ->
    conversation: e_call_message_et.conversation_id
    id: z.util.create_random_uuid()
    type: z.event.Backend.CONVERSATION.VOICE_CHANNEL_DEACTIVATE
    from: creating_user_et?.id or e_call_message_et.user_id
    time: e_call_message_et.time
    data:
      reason: z.calling.enum.TERMINATION_REASON.MISSED
    protocol_version: z.calling.enum.PROTOCOL.VERSION_3

  build_delete = (conversation_id, message_id, time, message_to_delete_et) ->
    conversation: conversation_id
    id: message_id
    type: z.event.Client.CONVERSATION.DELETE_EVERYWHERE
    from: message_to_delete_et.from
    time: new Date(message_to_delete_et.timestamp()).toISOString()
    data:
      deleted_time: time

  build_missed = (conversation_et, self_user_et) ->
    conversation: conversation_et.id
    id: z.util.create_random_uuid()
    type: z.event.Client.CONVERSATION.MISSED_MESSAGES
    from: self_user_et.id
    time: new Date().toISOString()

  return {
    build_all_verified: build_all_verified
    build_calling: build_calling
    build_degraded: build_degraded
    build_delete: build_delete
    build_missed: build_missed
    build_unable_to_decrypt: build_unable_to_decrypt
    build_voice_channel_activate: build_voice_channel_activate
    build_voice_channel_deactivate: build_voice_channel_deactivate
  }
