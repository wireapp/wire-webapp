/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

z.conversation.EventBuilder = {
  build1to1Creation(conversationEntity, timestamp = 0) {
    const {creator: creatorId, id} = conversationEntity;

    return {
      conversation: id,
      data: {
        userIds: conversationEntity.participating_user_ids(),
      },
      from: creatorId,
      id: z.util.createRandomUuid(),
      time: new Date(timestamp).toISOString(),
      type: z.event.Client.CONVERSATION.ONE2ONE_CREATION,
    };
  },
  buildAllVerified(conversationEntity, timeOffset) {
    const {id, self} = conversationEntity;

    return {
      conversation: id,
      data: {
        type: z.message.VerificationMessageType.VERIFIED,
      },
      from: self.id,
      id: z.util.createRandomUuid(),
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Client.CONVERSATION.VERIFICATION,
    };
  },
  buildAssetAdd(conversationEntity, data, timeOffset) {
    const {id, self} = conversationEntity;

    return {
      conversation: id,
      data: data,
      from: self.id,
      status: z.message.StatusType.SENDING,
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Client.CONVERSATION.ASSET_ADD,
    };
  },
  buildCalling(conversationEntity, callMessage, userId, clientId) {
    return {
      content: callMessage,
      conversation: conversationEntity.id,
      from: userId,
      sender: clientId,
      type: z.event.Client.CALL.E_CALL,
    };
  },
  buildDegraded(conversationEntity, userIds, type, timeOffset) {
    const {id, self} = conversationEntity;

    return {
      conversation: id,
      data: {
        type: type,
        userIds: userIds,
      },
      from: self.id,
      id: z.util.createRandomUuid(),
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Client.CONVERSATION.VERIFICATION,
    };
  },
  buildDelete(conversationId, messageId, time, deletedMessageEntity) {
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
  },
  buildGroupCreation(conversationEntity, isTemporaryGuest = false, timestamp = 0) {
    const {creator: creatorId, id, self: selfUser} = conversationEntity;

    const userIds = conversationEntity.participating_user_ids();
    const createdBySelf = creatorId === selfUser.id || isTemporaryGuest;
    if (!createdBySelf) {
      userIds.push(selfUser.id);
    }

    return {
      conversation: id,
      data: {
        name: conversationEntity.name(),
        userIds: userIds,
      },
      from: isTemporaryGuest ? selfUser.id : creatorId,
      id: z.util.createRandomUuid(),
      time: new Date(timestamp).toISOString(),
      type: z.event.Client.CONVERSATION.GROUP_CREATION,
    };
  },
  buildIncomingMessageTooBig(event, messageError, errorCode) {
    const {conversation: conversationId, data: eventData, from, time} = event;

    return {
      conversation: conversationId,
      error: `${messageError.message} (${eventData.sender})`,
      error_code: `${errorCode} (${eventData.sender})`,
      from: from,
      id: z.util.createRandomUuid(),
      time: time,
      type: z.event.Client.CONVERSATION.INCOMING_MESSAGE_TOO_BIG,
    };
  },
  buildMemberLeave(conversationEntity, userId, removedBySelfUser, timeOffset) {
    const {id, self} = conversationEntity;

    return {
      conversation: id,
      data: {
        user_ids: [userId],
      },
      from: removedBySelfUser ? self.id : userId,
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Backend.CONVERSATION.MEMBER_LEAVE,
    };
  },
  buildMessageAdd(conversationEntity, timeOffset) {
    const {id, self} = conversationEntity;

    return {
      conversation: id,
      data: {},
      from: self.id,
      status: z.message.StatusType.SENDING,
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Client.CONVERSATION.MESSAGE_ADD,
    };
  },
  buildMissed(conversationEntity, timeOffset) {
    const {id, self} = conversationEntity;

    return {
      conversation: id,
      from: self.id,
      id: z.util.createRandomUuid(),
      time: conversationEntity.get_next_iso_date(timeOffset),
      type: z.event.Client.CONVERSATION.MISSED_MESSAGES,
    };
  },
  buildTeamMemberLeave(conversationEntity, userEntity, isoDate) {
    return {
      conversation: conversationEntity.id,
      data: {
        name: userEntity.name(),
        user_ids: [userEntity.id],
      },
      from: userEntity.id,
      id: z.util.createRandomUuid(),
      time: isoDate,
      type: z.event.Client.CONVERSATION.TEAM_MEMBER_LEAVE,
    };
  },
  buildUnableToDecrypt(event, decryptionError, errorCode) {
    const {conversation: conversationId, data: eventData, from, time} = event;

    return {
      conversation: conversationId,
      error: `${decryptionError.message} (${eventData.sender})`,
      error_code: `${errorCode} (${eventData.sender})`,
      from: from,
      id: z.util.createRandomUuid(),
      time: time,
      type: z.event.Client.CONVERSATION.UNABLE_TO_DECRYPT,
    };
  },
  buildVoiceChannelActivate(callMessageEntity) {
    const {conversationId, userId, time} = callMessageEntity;

    return {
      conversation: conversationId,
      from: userId,
      id: z.util.createRandomUuid(),
      protocol_version: z.calling.CallingRepository.CONFIG.PROTOCOL_VERSION,
      time: time,
      type: z.event.Client.CONVERSATION.VOICE_CHANNEL_ACTIVATE,
    };
  },
  buildVoiceChannelDeactivate(callMessageEntity, reason, timeOffset = 0) {
    const {conversationId, userId, time = new Date(Date.now() - timeOffset).toISOString()} = callMessageEntity;

    return {
      conversation: conversationId,
      data: {
        reason: reason || z.calling.enum.TERMINATION_REASON.COMPLETED,
      },
      from: userId,
      id: z.util.createRandomUuid(),
      protocol_version: z.calling.CallingRepository.CONFIG.PROTOCOL_VERSION,
      time: time,
      type: z.event.Client.CONVERSATION.VOICE_CHANNEL_DEACTIVATE,
    };
  },
};
