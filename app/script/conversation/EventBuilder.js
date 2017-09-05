/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

'use strict';

window.z = window.z || {};
window.z.conversation = z.conversation || {};

z.conversation.EventBuilder = (function() {

  const _build_all_verified = (conversation_et) => {
    const {self, id} = conversation_et;

    return {
      conversation: id,
      data: {
        type: z.message.VerificationMessageType.VERIFIED,
      },
      from: self.id,
      id: z.util.create_random_uuid(),
      time: new Date().toISOString(),
      type: z.event.Client.CONVERSATION.VERIFICATION,
    };
  };

  const _build_calling = (conversation_et, e_call_message, user_id, client_id) => {
    return {
      content: e_call_message,
      conversation: conversation_et.id,
      from: user_id,
      sender: client_id,
      type: z.event.Client.CALL.E_CALL,
    };
  };

  const _build_degraded = (conversation_et, user_ids, type) => {
    const {self, id} = conversation_et;

    return {
      conversation: id,
      data: {
        type: type,
        user_ids: user_ids,
      },
      from: self.id,
      id: z.util.create_random_uuid(),
      time: new Date().toISOString(),
      type: z.event.Client.CONVERSATION.VERIFICATION,
    };
  };

  const _build_delete = (conversation_id, message_id, time, message_to_delete_et) => {
    return {
      conversation: conversation_id,
      data: {
        deleted_time: time,
      },
      from: message_to_delete_et.from,
      id: message_id,
      time: new Date(message_to_delete_et.timestamp()).toISOString(),
      type: z.event.Client.CONVERSATION.DELETE_EVERYWHERE,
    };
  };

  const _build_missed = (conversation_et, self_user_et) => {
    return {
      conversation: conversation_et.id,
      from: self_user_et.id,
      id: z.util.create_random_uuid(),
      time: new Date().toISOString(),
      type: z.event.Client.CONVERSATION.MISSED_MESSAGES,
    };
  };

  const _build_team_member_leave = (conversation_et, user_id) => {
    return {
      conversation: conversation_et.id,
      data: {
        user_ids: [user_id],
      },
      from: user_id,
      id: z.util.create_random_uuid(),
      time: new Date().toISOString(),
      type: z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE,
    };
  };

  const _build_unable_to_decrypt = (event, decrypt_error, error_code) => {
    const {conversation: conversation_id, data: event_data, from, time} = event;

    return {
      conversation: conversation_id,
      error: `${decrypt_error.message} (${event_data.sender})`,
      error_code: `${error_code} (${event_data.sender})`,
      from: from,
      id: z.util.create_random_uuid(),
      time: time,
      type: z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT,
    };
  };

  const _build_incoming_message_too_big = (event, message_error, error_code) => {
    const {conversation: conversation_id, data: event_data, from, time} = event;

    return {
      conversation: conversation_id,
      error: `${message_error.message} (${event_data.sender})`,
      error_code: `${error_code} (${event_data.sender})`,
      from: from,
      id: z.util.create_random_uuid(),
      time: time,
      type: z.event.Client.CONVERSATION.INCOMING_MESSAGE_TOO_BIG,
    };
  };

  const _build_voice_channel_activate = (call_message_et) => {
    const {conversation_id, user_id, time} = call_message_et;

    return {
      conversation: conversation_id,
      from: user_id,
      id: z.util.create_random_uuid(),
      protocol_version: z.calling.CallingRepository.CONFIG.PROTOCOL_VERSION,
      time: time,
      type: z.event.Client.CONVERSATION.VOICE_CHANNEL_ACTIVATE,
    };
  };

  const _build_voice_channel_deactivate = (call_message_et, creating_user_et, reason = z.calling.enum.TERMINATION_REASON.COMPLETED) => {
    const {conversation_id, user_id, time = new Date().toISOString()} = call_message_et;

    return {
      conversation: conversation_id,
      data: {
        reason: reason,
      },
      from: creating_user_et ? creating_user_et.id : user_id,
      id: z.util.create_random_uuid(),
      protocol_version: z.calling.CallingRepository.CONFIG.PROTOCOL_VERSION,
      time: time,
      type: z.event.Client.CONVERSATION.VOICE_CHANNEL_DEACTIVATE,
    };
  };

  return {
    build_all_verified: _build_all_verified,
    build_calling: _build_calling,
    build_degraded: _build_degraded,
    build_delete: _build_delete,
    build_incoming_message_too_big: _build_incoming_message_too_big,
    build_missed: _build_missed,
    build_team_member_leave: _build_team_member_leave,
    build_unable_to_decrypt: _build_unable_to_decrypt,
    build_voice_channel_activate: _build_voice_channel_activate,
    build_voice_channel_deactivate: _build_voice_channel_deactivate,
  };
})();
