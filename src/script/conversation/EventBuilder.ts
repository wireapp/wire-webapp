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

import {MemberLeaveReason} from '@wireapp/api-client/lib/conversation/data/';
import {ConversationOtrMessageAddEvent, CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import {AddUsersFailureReasons} from '@wireapp/core/lib/conversation';
import {DecryptionError} from '@wireapp/core/lib/errors/DecryptionError';

import type {REASON as AVS_REASON} from '@wireapp/avs';
import type {LegalHoldStatus} from '@wireapp/protocol-messaging';

import {createUuid} from 'Util/uuid';

import type {Conversation} from '../entity/Conversation';
import type {Message} from '../entity/message/Message';
import type {User} from '../entity/User';
import {ClientEvent, CONVERSATION} from '../event/Client';
import {StatusType} from '../message/StatusType';
import {VerificationMessageType} from '../message/VerificationMessageType';
import {AssetRecord, EventRecord, ReadReceipt, UserReactionMap} from '../storage';

interface BaseEvent {
  conversation: string;
  data?: unknown;
  from: string;
  id: string;
  from_client_id?: string;
  qualified_conversation?: QualifiedId;
  qualified_from?: QualifiedId;
  server_time?: string;
  time: string;
}

interface ConversationEvent<T> extends BaseEvent {
  data: T;
  id: string;
  type: CONVERSATION;
}

interface BackendEventMessage<T> extends Omit<BaseEvent, 'id'> {
  data: T;
  id?: string;
  type: string;
}

interface VoiceChannelActivateEvent extends BaseEvent {
  protocol_version: number;
  type: CONVERSATION.VOICE_CHANNEL_ACTIVATE;
}
type AllVerifiedEventData = {type: VerificationMessageType.VERIFIED};
type AllVerifiedEvent = ConversationEvent<AllVerifiedEventData> & {
  type: typeof ClientEvent.CONVERSATION.VERIFICATION;
};
type AssetAddEvent = Omit<ConversationEvent<any>, 'id'> &
  Partial<Pick<ConversationEvent<any>, 'id'>> & {status: StatusType; type: CONVERSATION.ASSET_ADD};
type DegradedMessageEventData = {type: VerificationMessageType; userIds: QualifiedId[]};
type DegradedMessageEvent = ConversationEvent<DegradedMessageEventData> & {
  type: typeof ClientEvent.CONVERSATION.VERIFICATION;
};
type FederationStopEvent = ConversationEvent<{domains: string[]}> & {
  type: CONVERSATION.FEDERATION_STOP;
};
type GroupCreationEventData = {
  allTeamMembers: boolean;
  name: string;
  userIds: QualifiedId[];
};
type GroupCreationEvent = ConversationEvent<GroupCreationEventData> & {type: CONVERSATION.GROUP_CREATION};
type LegalHoldMessageEvent = ConversationEvent<{legal_hold_status: LegalHoldStatus}> & {
  type: CONVERSATION.LEGAL_HOLD_UPDATE;
};
type MemberJoinEvent = BackendEventMessage<{qualified_user_ids?: QualifiedId[]; user_ids: string[]}> & {
  type: CONVERSATION_EVENT.MEMBER_JOIN;
};
type MemberLeaveEvent = BackendEventMessage<{
  name?: string;
  qualified_user_ids?: QualifiedId[];
  reason?: MemberLeaveReason;
  user_ids: string[];
}> & {
  type: CONVERSATION_EVENT.MEMBER_LEAVE;
};
type MessageAddEvent = Omit<
  ConversationEvent<{
    sender: string;
    content: string;
    replacing_message_id?: string;
    previews?: string[];
    expects_read_confirmation?: boolean;
  }>,
  'id'
> & {
  /** who have received/read the event */
  read_receipts?: ReadReceipt[];
  /** who reacted to the event */
  reactions?: UserReactionMap;
  edited_time?: string;
  status: StatusType;
  type: CONVERSATION.MESSAGE_ADD;
};
type MissedEvent = BaseEvent & {id: string; type: CONVERSATION.MISSED_MESSAGES};
type MLSConversationRecoveredEvent = BaseEvent & {id: string; type: CONVERSATION.MLS_CONVERSATION_RECOVERED};
type OneToOneCreationEvent = ConversationEvent<{userIds: QualifiedId[]}> & {
  type: CONVERSATION.ONE2ONE_CREATION;
};
type TeamMemberLeaveEvent = Omit<MemberLeaveEvent, 'type'> & {
  type: CONVERSATION.TEAM_MEMBER_LEAVE;
};
type DeleteEverywhereEvent = ConversationEvent<{}> & {
  type: CONVERSATION.DELETE_EVERYWHERE;
};
type VoiceChannelDeactivateEvent = ConversationEvent<{duration: number; reason: AVS_REASON}> & {
  protocol_version: number;
  type: CONVERSATION.VOICE_CHANNEL_DEACTIVATE;
};
type FileTypeRestrictedEvent = ConversationEvent<{fileExt: string; isIncoming: boolean; name: string}> & {
  type: CONVERSATION.FILE_TYPE_RESTRICTED;
};
type CallingTimeoutEvent = ConversationEvent<{reason: AVS_REASON.NOONE_JOINED | AVS_REASON.EVERYONE_LEFT}> & {
  type: CONVERSATION.CALL_TIME_OUT;
};
type FailedToAddUsersMessageEvent = ConversationEvent<{
  qualifiedIds: QualifiedId[];
  reason: AddUsersFailureReasons;
  backends: string[];
}> & {
  type: CONVERSATION.FAILED_TO_ADD_USERS;
};

interface ErrorEvent extends BaseEvent {
  error: string;
  error_code: number | string;
  id: string;
  type: CONVERSATION.UNABLE_TO_DECRYPT | CONVERSATION.INCOMING_MESSAGE_TOO_BIG;
}

function buildQualifiedId(conversation: QualifiedId | string) {
  const qualifiedId = typeof conversation === 'string' ? {domain: '', id: conversation} : conversation;
  return {
    conversation: qualifiedId.id,
    qualified_conversation: {domain: qualifiedId.domain, id: qualifiedId.id},
  };
}

export const EventBuilder = {
  build1to1Creation(conversationEntity: Conversation, timestamp: number = 0): OneToOneCreationEvent {
    const {creator: creatorId} = conversationEntity;
    const isoDate = new Date(timestamp).toISOString();

    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        userIds: conversationEntity.participating_user_ids(),
      },
      from: creatorId,
      id: createUuid(),
      time: isoDate,
      type: ClientEvent.CONVERSATION.ONE2ONE_CREATION,
    };
  },

  buildAllVerified(conversationEntity: Conversation): AllVerifiedEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        type: VerificationMessageType.VERIFIED,
      },
      from: conversationEntity.selfUser().id,
      id: createUuid(),
      time: new Date(conversationEntity.getNextTimestamp()).toISOString(),
      type: ClientEvent.CONVERSATION.VERIFICATION,
    };
  },

  buildAssetAdd(conversationEntity: Conversation, data: AssetRecord, currentTimestamp: number): AssetAddEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data,
      from: conversationEntity.selfUser().id,
      status: StatusType.SENDING,
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: ClientEvent.CONVERSATION.ASSET_ADD,
    };
  },

  buildCallingTimeoutEvent(
    reason: AVS_REASON.NOONE_JOINED | AVS_REASON.EVERYONE_LEFT,
    conversation: Conversation,
    userId: string,
  ): CallingTimeoutEvent {
    return {
      ...buildQualifiedId(conversation),
      data: {
        reason,
      },
      from: userId,
      id: createUuid(),
      time: conversation.getNextIsoDate(),
      type: ClientEvent.CONVERSATION.CALL_TIME_OUT,
    };
  },

  buildFailedToAddUsersEvent(
    failedToAdd: {users: QualifiedId[]; reason: AddUsersFailureReasons; backends: string[]},
    conversation: Conversation,
    userId: string,
  ): FailedToAddUsersMessageEvent {
    return {
      ...buildQualifiedId(conversation),
      data: {
        qualifiedIds: failedToAdd.users,
        reason: failedToAdd.reason,
        backends: failedToAdd.backends,
      },
      from: userId,
      id: createUuid(),
      time: conversation.getNextIsoDate(),
      type: ClientEvent.CONVERSATION.FAILED_TO_ADD_USERS,
    };
  },

  buildDegraded(
    conversationEntity: Conversation,
    userIds: QualifiedId[],
    type: VerificationMessageType,
  ): DegradedMessageEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        type,
        userIds,
      },
      from: conversationEntity.selfUser().id,
      id: createUuid(),
      time: new Date(conversationEntity.getNextTimestamp()).toISOString(),
      type: ClientEvent.CONVERSATION.VERIFICATION,
    };
  },

  buildDelete(
    conversation: Conversation,
    messageId: string,
    time: string,
    deletedMessageEntity: Message,
  ): DeleteEverywhereEvent {
    return {
      ...buildQualifiedId(conversation),
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
      ...buildQualifiedId(conversation),
      data: {
        fileExt,
        isIncoming,
        name: user.name(),
      },
      from: user.id,
      id,
      time: conversation.getNextIsoDate(),
      type: ClientEvent.CONVERSATION.FILE_TYPE_RESTRICTED,
    };
  },

  buildGroupCreation(
    conversationEntity: Conversation,
    isTemporaryGuest: boolean = false,
    timestamp: number,
  ): GroupCreationEvent {
    const {creator: creatorId} = conversationEntity;
    const selfUserId = conversationEntity.selfUser().id;
    const isoDate = new Date(timestamp || 0).toISOString();

    const userIds = conversationEntity.participating_user_ids().slice();
    const createdBySelf = creatorId === selfUserId || isTemporaryGuest;
    if (!createdBySelf) {
      userIds.push(conversationEntity.selfUser().qualifiedId);
    }

    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        allTeamMembers: conversationEntity.withAllTeamMembers(),
        name: conversationEntity.name(),
        userIds,
      },
      from: isTemporaryGuest ? selfUserId : creatorId,
      id: createUuid(),
      time: isoDate,
      type: ClientEvent.CONVERSATION.GROUP_CREATION,
    };
  },

  buildIncomingMessageTooBig(
    event: ConversationOtrMessageAddEvent,
    messageError: Error,
    errorCode: number,
  ): ErrorEvent {
    const {qualified_conversation: conversationId, conversation, data: eventData, from, time} = event;

    return {
      ...buildQualifiedId(conversationId || conversation),
      error: `${messageError.message} (${eventData.sender})`,
      error_code: errorCode,
      from,
      id: createUuid(),
      time,
      type: ClientEvent.CONVERSATION.INCOMING_MESSAGE_TOO_BIG,
    };
  },

  buildLegalHoldMessage(
    conversationId: QualifiedId,
    userId: QualifiedId,
    timestamp: number,
    legalHoldStatus: LegalHoldStatus,
    beforeMessage?: boolean,
  ): LegalHoldMessageEvent {
    return {
      ...buildQualifiedId(conversationId),
      data: {
        legal_hold_status: legalHoldStatus,
      },
      from: userId.id,
      id: createUuid(),
      qualified_conversation: conversationId,
      qualified_from: userId,
      time: new Date(timestamp + (beforeMessage ? -1 : 0)).toISOString(),
      type: ClientEvent.CONVERSATION.LEGAL_HOLD_UPDATE,
    };
  },

  buildMemberJoin(
    conversationEntity: Conversation,
    sender: QualifiedId,
    joiningUserIds: QualifiedId[],
    timestamp?: number,
  ): MemberJoinEvent {
    if (!timestamp) {
      timestamp = conversationEntity.getLastKnownTimestamp() + 1;
    }
    const isoDate = new Date(timestamp).toISOString();

    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        user_ids: joiningUserIds.map(({id}) => id),
      },
      from: sender.id,
      time: isoDate,
      type: CONVERSATION_EVENT.MEMBER_JOIN,
    };
  },

  buildMemberLeave(
    conversationEntity: Conversation,
    userId: QualifiedId,
    removedBySelfUser: boolean,
    currentTimestamp: number,
  ): MemberLeaveEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        qualified_user_ids: [userId],
        user_ids: [userId.id],
      },
      from: removedBySelfUser ? conversationEntity.selfUser().id : userId.id,
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: CONVERSATION_EVENT.MEMBER_LEAVE,
    };
  },

  buildFederationStop(
    conversationEntity: Conversation,
    selfUser: User,
    domains: string[],
    currentTimestamp: number,
  ): FederationStopEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        domains,
      },
      id: createUuid(),
      from: selfUser.id,
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: CONVERSATION.FEDERATION_STOP,
    };
  },

  buildMessageAdd(conversationEntity: Conversation, currentTimestamp: number, senderId: string): MessageAddEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        content: '',
        sender: senderId,
      },
      from: conversationEntity.selfUser().id,
      status: StatusType.SENDING,
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: ClientEvent.CONVERSATION.MESSAGE_ADD,
    };
  },

  buildMissed(conversationEntity: Conversation, currentTimestamp: number): MissedEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      from: conversationEntity.selfUser().id,
      id: createUuid(),
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: ClientEvent.CONVERSATION.MISSED_MESSAGES,
    };
  },

  buildMLSConversationRecovered(
    conversationEntity: Conversation,
    currentTimestamp: number,
  ): MLSConversationRecoveredEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      from: conversationEntity.selfUser().id,
      id: createUuid(),
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: ClientEvent.CONVERSATION.MLS_CONVERSATION_RECOVERED,
    };
  },

  buildTeamMemberLeave(
    conversationEntity: Conversation,
    userEntity: User,
    isoDate: string | number,
  ): TeamMemberLeaveEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        name: userEntity.name(),
        user_ids: [userEntity.id],
      },
      from: userEntity.id,
      id: createUuid(),
      time: new Date(isoDate).toISOString(),
      type: ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE,
    };
  },

  buildUnableToDecrypt(event: Partial<EventRecord>, decryptionError: DecryptionError): ErrorEvent {
    const {qualified_conversation: conversationId, qualified_from, conversation, data: eventData, from, time} = event;

    return {
      ...buildQualifiedId(conversationId || conversation),
      error: `${decryptionError.message} (${eventData.sender})`,
      error_code: decryptionError.code ?? '',
      from,
      id: createUuid(),
      qualified_from: qualified_from || {domain: '', id: from},
      time,
      type: ClientEvent.CONVERSATION.UNABLE_TO_DECRYPT,
    };
  },

  buildVoiceChannelActivate(
    conversation: QualifiedId,
    userId: QualifiedId,
    time: string,
    protocolVersion: number,
  ): VoiceChannelActivateEvent {
    return {
      ...buildQualifiedId(conversation),
      from: userId.id,
      id: createUuid(),
      protocol_version: protocolVersion,
      qualified_from: userId,
      time,
      type: ClientEvent.CONVERSATION.VOICE_CHANNEL_ACTIVATE,
    };
  },

  buildVoiceChannelDeactivate(
    conversation: QualifiedId,
    userId: QualifiedId,
    duration: number,
    reason: AVS_REASON,
    time: string,
    protocolVersion: number,
  ): VoiceChannelDeactivateEvent {
    return {
      ...buildQualifiedId(conversation),
      data: {
        duration,
        reason,
      },
      from: userId.id,
      id: createUuid(),
      protocol_version: protocolVersion,
      qualified_from: userId,
      time,
      type: ClientEvent.CONVERSATION.VOICE_CHANNEL_DEACTIVATE,
    };
  },
};
