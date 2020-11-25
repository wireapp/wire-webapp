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

import type {LegalHoldStatus} from '@wireapp/protocol-messaging';
import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event';
import type {REASON as AVS_REASON} from '@wireapp/avs';
import {createRandomUuid} from 'Util/util';
import {CALL, CONVERSATION, ClientEvent} from '../event/Client';
import type {Call as CallEntity} from '../calling/Call';
import {StatusType} from '../message/StatusType';
import {VerificationMessageType} from '../message/VerificationMessageType';
import type {Conversation} from '../entity/Conversation';
import type {Message} from '../entity/message/Message';
import type {User} from '../entity/User';
import {EventRecord} from '../storage';

export interface BaseEvent {
  conversation: string;
  from: string;
  id?: string;
  time: string | number;
}

export interface ConversationEvent<T> extends BaseEvent {
  data: T;
  id: string;
  type: CONVERSATION;
}

export interface CallingEvent {
  content: CallEntity;
  conversation: string;
  from: number;
  sender: number;
  type: CALL;
}

export interface BackendEventMessage<T> extends BaseEvent {
  data: T;
  type: string;
}

export interface ErrorEvent extends BaseEvent {
  error: string;
  error_code: string;
  id: string;
  type: CONVERSATION;
}

export interface VoiceChannelActivateEvent extends BaseEvent {
  id: string;
  protocol_version: number;
  type: string;
}

export type AllVerifiedEvent = ConversationEvent<{type: VerificationMessageType}>;
export type AssetAddEvent = Omit<ConversationEvent<any>, 'id'> &
  Partial<Pick<ConversationEvent<any>, 'id'>> & {status: StatusType};
export type DegradedMessageEvent = ConversationEvent<{type: VerificationMessageType; userIds: string[]}>;
export type DeleteEvent = ConversationEvent<{deleted_time: number}>;
export type GroupCreationEvent = ConversationEvent<{allTeamMembers: boolean; name: string; userIds: string[]}>;
export type LegalHoldMessageEvent = ConversationEvent<{legal_hold_status: LegalHoldStatus}>;
export type MemberJoinEvent = BackendEventMessage<{user_ids: string[]}>;
export type MemberLeaveEvent = BackendEventMessage<{user_ids: string[]}>;
export type MessageAddEvent = Omit<ConversationEvent<{}>, 'id'> & {status: StatusType};
export type MissedEvent = BaseEvent & {id: string; type: string};
export type OneToOneCreationEvent = ConversationEvent<{userIds: string[]}>;
export type TeamMemberLeaveEvent = ConversationEvent<{name: string; user_ids: string[]}>;
export type VoiceChannelDeactivateEvent = ConversationEvent<{duration: number; reason: AVS_REASON}> & {
  protocol_version: number;
};
export type FileTypeRestrictedEvent = ConversationEvent<{fileExt: string; isIncoming: boolean; name: string}>;

export const EventBuilder = {
  build1to1Creation(conversationEntity: Conversation, timestamp: number = 0): OneToOneCreationEvent {
    const {creator: creatorId, id} = conversationEntity;
    const isoDate = new Date(timestamp).toISOString();

    return {
      conversation: id,
      data: {
        userIds: conversationEntity.participating_user_ids(),
      },
      from: creatorId,
      id: createRandomUuid(),
      time: isoDate,
      type: ClientEvent.CONVERSATION.ONE2ONE_CREATION,
    };
  },

  buildAllVerified(conversationEntity: Conversation, currentTimestamp: number): AllVerifiedEvent {
    return {
      conversation: conversationEntity.id,
      data: {
        type: VerificationMessageType.VERIFIED,
      },
      from: conversationEntity.selfUser().id,
      id: createRandomUuid(),
      time: conversationEntity.get_next_iso_date(currentTimestamp),
      type: ClientEvent.CONVERSATION.VERIFICATION,
    };
  },

  buildAssetAdd(conversationEntity: Conversation, data: any, currentTimestamp: number): AssetAddEvent {
    return {
      conversation: conversationEntity.id,
      data,
      from: conversationEntity.selfUser().id,
      status: StatusType.SENDING,
      time: conversationEntity.get_next_iso_date(currentTimestamp),
      type: ClientEvent.CONVERSATION.ASSET_ADD,
    };
  },

  buildCalling(
    conversationEntity: Conversation,
    callMessage: CallEntity,
    userId: number,
    clientId: number,
  ): CallingEvent {
    return {
      content: callMessage,
      conversation: conversationEntity.id,
      from: userId,
      sender: clientId,
      type: ClientEvent.CALL.E_CALL,
    };
  },

  buildDegraded(
    conversationEntity: Conversation,
    userIds: string[],
    type: VerificationMessageType,
    currentTimestamp: number,
  ): DegradedMessageEvent {
    return {
      conversation: conversationEntity.id,
      data: {
        type,
        userIds,
      },
      from: conversationEntity.selfUser().id,
      id: createRandomUuid(),
      time: conversationEntity.get_next_iso_date(currentTimestamp),
      type: ClientEvent.CONVERSATION.VERIFICATION,
    };
  },

  buildDelete(conversationId: string, messageId: string, time: number, deletedMessageEntity: Message): DeleteEvent {
    return {
      conversation: conversationId,
      data: {
        deleted_time: time,
      },
      from: deletedMessageEntity.from,
      id: messageId,
      time: new Date(deletedMessageEntity.timestamp()).toISOString(),
      type: ClientEvent.CONVERSATION.DELETE_EVERYWHERE,
    };
  },

  buildFileTypeRestricted(
    conversation: Conversation,
    user: User,
    isIncoming: boolean,
    fileExt: string,
    id: string,
  ): FileTypeRestrictedEvent {
    return {
      conversation: conversation.id,
      data: {
        fileExt,
        isIncoming,
        name: user.name(),
      },
      from: user.id,
      id,
      time: conversation.get_next_iso_date(),
      type: ClientEvent.CONVERSATION.FILE_TYPE_RESTRICTED,
    };
  },

  buildGroupCreation(
    conversationEntity: Conversation,
    isTemporaryGuest: boolean = false,
    timestamp: number,
  ): GroupCreationEvent {
    const {creator: creatorId, id} = conversationEntity;
    const selfUserId = conversationEntity.selfUser().id;
    const isoDate = new Date(timestamp || 0).toISOString();

    const userIds = conversationEntity.participating_user_ids().slice();
    const createdBySelf = creatorId === selfUserId || isTemporaryGuest;
    if (!createdBySelf) {
      userIds.push(selfUserId);
    }

    return {
      conversation: id,
      data: {
        allTeamMembers: conversationEntity.withAllTeamMembers(),
        name: conversationEntity.name(),
        userIds,
      },
      from: isTemporaryGuest ? selfUserId : creatorId,
      id: createRandomUuid(),
      time: isoDate,
      type: ClientEvent.CONVERSATION.GROUP_CREATION,
    };
  },

  buildIncomingMessageTooBig(event: any, messageError: Error, errorCode: number): ErrorEvent {
    const {conversation: conversationId, data: eventData, from, time} = event;

    return {
      conversation: conversationId,
      error: `${messageError.message} (${eventData.sender})`,
      error_code: `${errorCode} (${eventData.sender})`,
      from,
      id: createRandomUuid(),
      time,
      type: ClientEvent.CONVERSATION.INCOMING_MESSAGE_TOO_BIG,
    };
  },

  buildLegalHoldMessage(
    conversationId: string,
    userId: string,
    timestamp: number,
    legalHoldStatus: LegalHoldStatus,
    beforeMessage?: boolean,
  ): LegalHoldMessageEvent {
    return {
      conversation: conversationId,
      data: {
        legal_hold_status: legalHoldStatus,
      },
      from: userId,
      id: createRandomUuid(),
      time: new Date(new Date(timestamp).getTime() + (beforeMessage ? -1 : 1)).toISOString(),
      type: ClientEvent.CONVERSATION.LEGAL_HOLD_UPDATE,
    };
  },

  buildMemberJoin(
    conversationEntity: Conversation,
    sender: string,
    joiningUserIds: string[],
    timestamp?: number,
  ): MemberJoinEvent {
    if (!timestamp) {
      timestamp = conversationEntity.get_last_known_timestamp() + 1;
    }
    const isoDate = new Date(timestamp).toISOString();

    return {
      conversation: conversationEntity.id,
      data: {
        user_ids: joiningUserIds,
      },
      from: sender,
      time: isoDate,
      type: CONVERSATION_EVENT.MEMBER_JOIN,
    };
  },

  buildMemberLeave(
    conversationEntity: Conversation,
    userId: string,
    removedBySelfUser: boolean,
    currentTimestamp: number,
  ): MemberLeaveEvent {
    return {
      conversation: conversationEntity.id,
      data: {
        user_ids: [userId],
      },
      from: removedBySelfUser ? conversationEntity.selfUser().id : userId,
      time: conversationEntity.get_next_iso_date(currentTimestamp),
      type: CONVERSATION_EVENT.MEMBER_LEAVE,
    };
  },

  buildMessageAdd(conversationEntity: Conversation, currentTimestamp: number): MessageAddEvent {
    return {
      conversation: conversationEntity.id,
      data: {},
      from: conversationEntity.selfUser().id,
      status: StatusType.SENDING,
      time: conversationEntity.get_next_iso_date(currentTimestamp),
      type: ClientEvent.CONVERSATION.MESSAGE_ADD,
    };
  },

  buildMissed(conversationEntity: Conversation, currentTimestamp: number): MissedEvent {
    return {
      conversation: conversationEntity.id,
      from: conversationEntity.selfUser().id,
      id: createRandomUuid(),
      time: conversationEntity.get_next_iso_date(currentTimestamp),
      type: ClientEvent.CONVERSATION.MISSED_MESSAGES,
    };
  },

  buildTeamMemberLeave(
    conversationEntity: Conversation,
    userEntity: User,
    isoDate: string | number,
  ): TeamMemberLeaveEvent {
    return {
      conversation: conversationEntity.id,
      data: {
        name: userEntity.name(),
        user_ids: [userEntity.id],
      },
      from: userEntity.id,
      id: createRandomUuid(),
      time: isoDate,
      type: ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE,
    };
  },

  buildUnableToDecrypt(event: EventRecord, decryptionError: Error, errorCode: number): ErrorEvent {
    const {conversation: conversationId, data: eventData, from, time} = event;

    return {
      conversation: conversationId,
      error: `${decryptionError.message} (${eventData.sender})`,
      error_code: `${errorCode} (${eventData.sender})`,
      from,
      id: createRandomUuid(),
      time,
      type: ClientEvent.CONVERSATION.UNABLE_TO_DECRYPT,
    };
  },

  buildVoiceChannelActivate(
    conversationId: string,
    userId: string,
    time: string,
    protocolVersion: number,
  ): VoiceChannelActivateEvent {
    return {
      conversation: conversationId,
      from: userId,
      id: createRandomUuid(),
      protocol_version: protocolVersion,
      time,
      type: ClientEvent.CONVERSATION.VOICE_CHANNEL_ACTIVATE,
    };
  },

  buildVoiceChannelDeactivate(
    conversationId: string,
    userId: string,
    duration: number,
    reason: AVS_REASON,
    time: string,
    protocolVersion: number,
  ): VoiceChannelDeactivateEvent {
    return {
      conversation: conversationId,
      data: {
        duration,
        reason,
      },
      from: userId,
      id: createRandomUuid(),
      protocol_version: protocolVersion,
      time,
      type: ClientEvent.CONVERSATION.VOICE_CHANNEL_DEACTIVATE,
    };
  },
};
