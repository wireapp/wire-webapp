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
import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event/';
import type {QualifiedId} from '@wireapp/api-client/src/user/';
import type {REASON as AVS_REASON} from '@wireapp/avs';

import {createRandomUuid} from 'Util/util';

import {CALL, CONVERSATION, ClientEvent} from '../event/Client';
import type {Call as CallEntity} from '../calling/Call';
import {StatusType} from '../message/StatusType';
import {VerificationMessageType} from '../message/VerificationMessageType';
import type {Conversation} from '../entity/Conversation';
import type {Message} from '../entity/message/Message';
import type {User} from '../entity/User';
import {AssetRecord, EventRecord} from '../storage';
import {ReactionType} from '@wireapp/core/src/main/conversation';
import {ConversationOtrMessageAddEvent} from '@wireapp/api-client/src/event';

export interface QualifiedIdOptional {
  domain: string | null;
  id: string;
}

export interface BaseEvent {
  conversation: string;
  data?: unknown;
  from: string;
  id: string;
  qualified_conversation: QualifiedId;
  server_time?: string;
  time: string;
}

export interface ConversationEvent<T> extends BaseEvent {
  data: T;
  id: string;
  type: CONVERSATION;
}

export interface CallingEvent {
  content: CallEntity;
  conversation: string;
  from: string;
  sender: string;
  time?: string;
  type: CALL;
}

export interface BackendEventMessage<T> extends Omit<BaseEvent, 'id'> {
  data: T;
  id?: string;
  type: string;
}

export interface ErrorEvent extends BaseEvent {
  error: string;
  error_code: string;
  type: CONVERSATION;
}

export interface VoiceChannelActivateEvent extends BaseEvent {
  protocol_version: number;
  type: CONVERSATION.VOICE_CHANNEL_ACTIVATE;
}
export type AllVerifiedEventData = {type: VerificationMessageType};
export type AllVerifiedEvent = ConversationEvent<AllVerifiedEventData>;
export type AssetAddEvent = Omit<ConversationEvent<any>, 'id'> &
  Partial<Pick<ConversationEvent<any>, 'id'>> & {status: StatusType; type: CONVERSATION.ASSET_ADD};
export type DegradedMessageEventData = {type: VerificationMessageType; userIds: QualifiedIdOptional[]};
export type DegradedMessageEvent = ConversationEvent<DegradedMessageEventData>;
export type DeleteEvent = ConversationEvent<{deleted_time: number; message_id: string; time: string}> & {
  type: CONVERSATION.MESSAGE_DELETE;
};
export type GroupCreationEventData = {
  allTeamMembers: boolean;
  name: string;
  userIds: QualifiedIdOptional[];
};
export type GroupCreationEvent = ConversationEvent<GroupCreationEventData> & {type: CONVERSATION.GROUP_CREATION};
export type LegalHoldMessageEvent = ConversationEvent<{legal_hold_status: LegalHoldStatus}> & {
  type: CONVERSATION.LEGAL_HOLD_UPDATE;
};
export type MemberJoinEvent = BackendEventMessage<{user_ids: string[]}>;
export type MemberLeaveEvent = BackendEventMessage<{user_ids: string[]}>;
export type MessageAddEvent = Omit<ConversationEvent<{}>, 'id'> & {
  edited_time?: string;
  status: StatusType;
  type: CONVERSATION.MESSAGE_ADD;
};
export type MissedEvent = BaseEvent & {id: string; type: CONVERSATION.MISSED_MESSAGES};
export type OneToOneCreationEvent = ConversationEvent<{userIds: QualifiedIdOptional[]}> & {
  type: CONVERSATION.ONE2ONE_CREATION;
};
export type TeamMemberLeaveEvent = ConversationEvent<{name: string; user_ids: string[]}> & {
  type: CONVERSATION.TEAM_MEMBER_LEAVE;
};
export type ReactionEvent = ConversationEvent<{message_id: string; reaction: ReactionType}> & {
  type: CONVERSATION.REACTION;
};
export type MessageHiddenEvent = ConversationEvent<{conversation_id: string; message_id: string}> & {
  type: CONVERSATION.MESSAGE_HIDDEN;
};
export type ButtonActionConfirmationEvent = ConversationEvent<{buttonId: string; messageId: string}> & {
  type: CONVERSATION.BUTTON_ACTION_CONFIRMATION;
};
export type DeleteEverywhereEvent = ConversationEvent<{}> & {
  type: CONVERSATION.DELETE_EVERYWHERE;
};
export type CompositeMessageAddEvent = ConversationEvent<{}> & {
  type: CONVERSATION.COMPOSITE_MESSAGE_ADD;
};
export type IncomingMessageTooBigEvent = ConversationEvent<{}> & {
  type: CONVERSATION.INCOMING_MESSAGE_TOO_BIG;
};
export type KnockEvent = ConversationEvent<{}> & {
  type: CONVERSATION.KNOCK;
};
export type LocationEvent = ConversationEvent<{}> & {
  type: CONVERSATION.LOCATION;
};
export type UnableToDecryptEvent = ConversationEvent<{}> & {
  type: CONVERSATION.UNABLE_TO_DECRYPT;
};
export type VerificationEvent = ConversationEvent<{}> & {
  type: CONVERSATION.VERIFICATION;
};
export type VoiceChannelDeactivateEvent = ConversationEvent<{duration: number; reason: AVS_REASON}> & {
  protocol_version: number;
  type: CONVERSATION.VOICE_CHANNEL_DEACTIVATE;
};
export type FileTypeRestrictedEvent = ConversationEvent<{fileExt: string; isIncoming: boolean; name: string}> & {
  type: CONVERSATION.FILE_TYPE_RESTRICTED;
};
export type CallingTimeoutEvent = ConversationEvent<{reason: AVS_REASON.NOONE_JOINED | AVS_REASON.EVERYONE_LEFT}> & {
  type: CONVERSATION.CALL_TIME_OUT;
};

export interface ErrorEvent extends BaseEvent {
  error: string;
  error_code: string;
  id: string;
  type: CONVERSATION;
}

export type ClientConversationEvent =
  | AssetAddEvent
  | CompositeMessageAddEvent
  | DeleteEvent
  | DeleteEverywhereEvent
  | ButtonActionConfirmationEvent
  | KnockEvent
  | IncomingMessageTooBigEvent
  | GroupCreationEvent
  | TeamMemberLeaveEvent
  | ReactionEvent
  | LegalHoldMessageEvent
  | MessageAddEvent
  | MessageHiddenEvent
  | OneToOneCreationEvent
  | VoiceChannelDeactivateEvent
  | FileTypeRestrictedEvent
  | CallingTimeoutEvent
  | UnableToDecryptEvent
  | MissedEvent
  | LocationEvent
  | VoiceChannelActivateEvent
  | VerificationEvent;

function buildQualifiedId(conversation: {domain?: string; id: string}) {
  return {
    conversation: conversation.id,
    qualified_conversation: {
      domain: conversation.domain,
      id: conversation.id,
    },
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
      id: createRandomUuid(),
      time: isoDate,
      type: ClientEvent.CONVERSATION.ONE2ONE_CREATION,
    };
  },

  buildAllVerified(conversationEntity: Conversation, currentTimestamp: number): AllVerifiedEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        type: VerificationMessageType.VERIFIED,
      },
      from: conversationEntity.selfUser().id,
      id: createRandomUuid(),
      time: conversationEntity.getNextIsoDate(currentTimestamp),
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

  buildCalling(
    conversationEntity: Conversation,
    callMessage: CallEntity,
    userId: string,
    clientId: string,
  ): CallingEvent {
    return {
      content: callMessage,
      conversation: conversationEntity.id,
      from: userId,
      sender: clientId,
      type: ClientEvent.CALL.E_CALL,
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
      id: createRandomUuid(),
      time: conversation.getNextIsoDate(),
      type: ClientEvent.CONVERSATION.CALL_TIME_OUT,
    };
  },

  buildDegraded(
    conversationEntity: Conversation,
    userIds: QualifiedIdOptional[],
    type: VerificationMessageType,
    currentTimestamp: number,
  ): DegradedMessageEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        type,
        userIds,
      },
      from: conversationEntity.selfUser().id,
      id: createRandomUuid(),
      time: conversationEntity.getNextIsoDate(currentTimestamp),
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
    const selfUserDomain = conversationEntity.selfUser().domain;
    const isoDate = new Date(timestamp || 0).toISOString();

    const userIds = conversationEntity.participating_user_ids().slice();
    const createdBySelf = creatorId === selfUserId || isTemporaryGuest;
    if (!createdBySelf) {
      userIds.push({domain: selfUserDomain, id: selfUserId});
    }

    return {
      ...buildQualifiedId(conversationEntity),
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

  buildIncomingMessageTooBig(
    event: ConversationOtrMessageAddEvent,
    messageError: Error,
    errorCode: number,
  ): ErrorEvent {
    const {qualified_conversation: conversationId, data: eventData, from, time} = event;

    return {
      ...buildQualifiedId(conversationId),
      error: `${messageError.message} (${eventData.sender})`,
      error_code: `${errorCode} (${eventData.sender})`,
      from,
      id: createRandomUuid(),
      time,
      type: ClientEvent.CONVERSATION.INCOMING_MESSAGE_TOO_BIG,
    };
  },

  buildLegalHoldMessage(
    conversationId: QualifiedIdOptional,
    userId: string,
    timestamp: number | string,
    legalHoldStatus: LegalHoldStatus,
    beforeMessage?: boolean,
  ): LegalHoldMessageEvent {
    return {
      ...buildQualifiedId(conversationId),
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
    sender: QualifiedIdOptional,
    joiningUserIds: QualifiedIdOptional[],
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
        user_ids: [userId.id],
      },
      from: removedBySelfUser ? conversationEntity.selfUser().id : userId.id,
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: CONVERSATION_EVENT.MEMBER_LEAVE,
    };
  },

  buildMessageAdd(conversationEntity: Conversation, currentTimestamp: number, senderId: string): MessageAddEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
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
      id: createRandomUuid(),
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: ClientEvent.CONVERSATION.MISSED_MESSAGES,
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
      id: createRandomUuid(),
      time: new Date(isoDate).toISOString(),
      type: ClientEvent.CONVERSATION.TEAM_MEMBER_LEAVE,
    };
  },

  buildUnableToDecrypt(event: EventRecord, decryptionError: Error, errorCode: number): ErrorEvent {
    const {qualified_conversation: conversationId, data: eventData, from, time} = event;

    return {
      ...buildQualifiedId(conversationId),
      error: `${decryptionError.message} (${eventData.sender})`,
      error_code: `${errorCode} (${eventData.sender})`,
      from,
      id: createRandomUuid(),
      time,
      type: ClientEvent.CONVERSATION.UNABLE_TO_DECRYPT,
    };
  },

  buildVoiceChannelActivate(
    conversation: QualifiedIdOptional,
    userId: string,
    time: string,
    protocolVersion: number,
  ): VoiceChannelActivateEvent {
    return {
      ...buildQualifiedId(conversation),
      from: userId,
      id: createRandomUuid(),
      protocol_version: protocolVersion,
      time,
      type: ClientEvent.CONVERSATION.VOICE_CHANNEL_ACTIVATE,
    };
  },

  buildVoiceChannelDeactivate(
    conversation: QualifiedIdOptional,
    userId: string,
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
      from: userId,
      id: createRandomUuid(),
      protocol_version: protocolVersion,
      time,
      type: ClientEvent.CONVERSATION.VOICE_CHANNEL_DEACTIVATE,
    };
  },
};
