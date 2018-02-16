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
  const _build_all_verified = (conversationEntity, timeOffset) => {
    const {self, id} = conversationEntity;

    return {
      conversation: id,
      data: {
        type: z.message.VerificationMessageType.VERIFIED,
      },
      from: self.id,
      id: z.util.create_random_uuid(),
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Client.CONVERSATION.VERIFICATION,
    };
  };

  const _build_asset_add = (conversationEntity, data, timeOffset) => {
    const {self, id} = conversationEntity;

    return {
      conversation: id,
      data: data,
      from: self.id,
      status: z.message.StatusType.SENDING,
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Client.CONVERSATION.ASSET_ADD,
    };
  };

  const _build_calling = (conversationEntity, eCallMessage, userId, clientId) => {
    return {
      content: eCallMessage,
      conversation: conversationEntity.id,
      from: userId,
      sender: clientId,
      type: z.event.Client.CALL.E_CALL,
    };
  };

  const _build_degraded = (conversationEntity, userIds, type, timeOffset) => {
    const {self, id} = conversationEntity;

    return {
      conversation: id,
      data: {
        type: type,
        user_ids: userIds,
      },
      from: self.id,
      id: z.util.create_random_uuid(),
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Client.CONVERSATION.VERIFICATION,
    };
  };

  const _build_delete = (conversationId, messageId, time, deletedMessageEntity) => {
    return {
      conversation: conversationId,
      data: {
        deleted_time: time,
      },
      from: deletedMessageEntity.from,
      id: messageId,
      time: new Date(deletedMessageEntity.timestamp()).toISOString(),
      type: z.event.Client.CONVERSATION.DELETE_EVERYWHERE,
    };
  };

  const _build_incoming_message_too_big = (event, messageError, errorCode) => {
    const {conversation: conversationId, data: event_data, from, time} = event;

    return {
      conversation: conversationId,
      error: `${messageError.message} (${event_data.sender})`,
      error_code: `${errorCode} (${event_data.sender})`,
      from: from,
      id: z.util.create_random_uuid(),
      time: time,
      type: z.event.Client.CONVERSATION.INCOMING_MESSAGE_TOO_BIG,
    };
  };

  const _buildMemberLeave = (conversationEntity, userId, timeOffset) => {
    const {self, id} = conversationEntity;

    return {
      conversation: id,
      data: {
        user_ids: [userId],
      },
      from: self.id,
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Backend.CONVERSATION.MEMBER_LEAVE,
    };
  };

  const _build_message_add = (conversationEntity, timeOffset) => {
    const {self, id} = conversationEntity;

    return {
      conversation: id,
      data: {},
      from: self.id,
      status: z.message.StatusType.SENDING,
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Client.CONVERSATION.MESSAGE_ADD,
    };
  };

  const _build_missed = (conversationEntity, timeOffset) => {
    const {id, self} = conversationEntity;

    return {
      conversation: id,
      from: self.id,
      id: z.util.create_random_uuid(),
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Client.CONVERSATION.MISSED_MESSAGES,
    };
  };

  const _build_team_member_leave = (conversationEntity, userEntity, isoDate) => {
    return {
      conversation: conversationEntity.id,
      data: {
        name: userEntity.name(),
        user_ids: [userEntity.id],
      },
      from: userEntity.id,
      id: z.util.create_random_uuid(),
      time: isoDate,
      type: z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE,
    };
  };

  const _build_unable_to_decrypt = (event, decryptError, errorCode) => {
    const {conversation: conversationId, data: event_data, from, time} = event;

    return {
      conversation: conversationId,
      error: `${decryptError.message} (${event_data.sender})`,
      error_code: `${errorCode} (${event_data.sender})`,
      from: from,
      id: z.util.create_random_uuid(),
      time: time,
      type: z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT,
    };
  };

  const _build_voice_channel_activate = callMessageEntity => {
    const {conversationId, user_id, time} = callMessageEntity;

    return {
      conversation: conversationId,
      from: user_id,
      id: z.util.create_random_uuid(),
      protocol_version: z.calling.CallingRepository.CONFIG.PROTOCOL_VERSION,
      time: time,
      type: z.event.Client.CONVERSATION.VOICE_CHANNEL_ACTIVATE,
    };
  };

  const _build_voice_channel_deactivate = (
    callMessageEntity,
    reason = z.calling.enum.TERMINATION_REASON.COMPLETED,
    timeOffset = 0
  ) => {
    const {conversationId, user_id, time = new Date(Date.now() - timeOffset).toISOString()} = callMessageEntity;

    return {
      conversation: conversationId,
      data: {
        reason: reason,
      },
      from: user_id,
      id: z.util.create_random_uuid(),
      protocol_version: z.calling.CallingRepository.CONFIG.PROTOCOL_VERSION,
      time: time,
      type: z.event.Client.CONVERSATION.VOICE_CHANNEL_DEACTIVATE,
    };
  };

  return {
    build_all_verified: _build_all_verified,
    build_asset_add: _build_asset_add,
    build_calling: _build_calling,
    build_degraded: _build_degraded,
    build_delete: _build_delete,
    build_incoming_message_too_big: _build_incoming_message_too_big,
    build_member_leave: _buildMemberLeave,
    build_message_add: _build_message_add,
    build_missed: _build_missed,
    build_team_member_leave: _build_team_member_leave,
    build_unable_to_decrypt: _build_unable_to_decrypt,
    build_voice_channel_activate: _build_voice_channel_activate,
    build_voice_channel_deactivate: _build_voice_channel_deactivate,
  };
})();
