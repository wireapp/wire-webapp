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

import {MemberLeaveReason} from '@wireapp/api-client/lib/conversation/data';
import {
  CONVERSATION_EVENT,
  ConversationMLSMessageAddEvent,
  ConversationOtrMessageAddEvent,
} from '@wireapp/api-client/lib/event';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {AddUsersFailure} from '@wireapp/core/lib/conversation';
import {ReactionType} from '@wireapp/core/lib/conversation/ReactionType';
import {DecryptionError} from '@wireapp/core/lib/errors/DecryptionError';

import type {REASON as AVS_REASON} from '@wireapp/avs';
import type {Asset, LegalHoldStatus} from '@wireapp/protocol-messaging';

import {createUuid} from 'Util/uuid';

import {AssetTransferState} from '../assets/AssetTransferState';
import type {Conversation} from '../entity/Conversation';
import type {Message} from '../entity/message/Message';
import type {User} from '../entity/User';
import {ClientEvent, CONVERSATION} from '../event/Client';
import {E2EIVerificationMessageType} from '../message/E2EIVerificationMessageType';
import {StatusType} from '../message/StatusType';
import {VerificationMessageType} from '../message/VerificationMessageType';
import {ReactionMap, ReadReceipt, UserReactionMap} from '../storage';

export interface BaseEvent {
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

export interface ConversationEvent<Type extends CONVERSATION | CONVERSATION_EVENT, Data = undefined> extends BaseEvent {
  data: Data;
  type: Type;
}

export interface BackendEventMessage<Type, Data> extends Omit<BaseEvent, 'id'> {
  data: Data;
  id?: string;
  type: Type;
}

export type VoiceChannelActivateEvent = ConversationEvent<CONVERSATION.VOICE_CHANNEL_ACTIVATE> & {
  protocol_version: number;
};
export type VoiceChannelDeactivateEvent = ConversationEvent<
  CONVERSATION.VOICE_CHANNEL_DEACTIVATE,
  {duration: number; reason: AVS_REASON}
> & {
  protocol_version: number;
};

export type AllVerifiedEventData = {type: VerificationMessageType.VERIFIED};
export type AllVerifiedEvent = ConversationEvent<CONVERSATION.VERIFICATION, AllVerifiedEventData>;
export type OneToOneMigratedToMlsEvent = ConversationEvent<CONVERSATION.ONE2ONE_MIGRATED_TO_MLS>;
export type AssetAddEvent = ConversationEvent<
  CONVERSATION.ASSET_ADD,
  {
    expects_read_confirmation?: boolean;
    key?: string;
    preview_key?: string;
    info?: {
      name: string;
    };
    content_type: string;
    content_length: number;
    status: AssetTransferState;
    reason?: Asset.NotUploaded | AssetTransferState;
  }
>;

export type DegradedMessageEventData = {type: VerificationMessageType; userIds: QualifiedId[]};
export type DegradedMessageEvent = ConversationEvent<CONVERSATION.VERIFICATION, DegradedMessageEventData>;
export type DeleteEvent = ConversationEvent<
  CONVERSATION.MESSAGE_DELETE,
  {deleted_time: number; message_id: string; time: string}
>;
export type FederationStopEvent = ConversationEvent<CONVERSATION.FEDERATION_STOP, {domains: string[]}>;
export type GroupCreationEventData = {
  allTeamMembers: boolean;
  name: string;
  userIds: QualifiedId[];
};
export type GroupCreationEvent = ConversationEvent<CONVERSATION.GROUP_CREATION, GroupCreationEventData>;
export type LegalHoldMessageEvent = ConversationEvent<
  CONVERSATION.LEGAL_HOLD_UPDATE,
  {legal_hold_status: LegalHoldStatus}
>;
export type MemberJoinEvent = BackendEventMessage<
  CONVERSATION_EVENT.MEMBER_JOIN,
  {qualified_user_ids?: QualifiedId[]; user_ids: string[]}
>;
export type MemberLeaveEvent = BackendEventMessage<
  CONVERSATION_EVENT.MEMBER_LEAVE,
  {
    name?: string;
    qualified_user_ids?: QualifiedId[];
    reason?: MemberLeaveReason;
    user_ids: string[];
  }
>;
export type MessageAddEvent = ConversationEvent<
  CONVERSATION.MESSAGE_ADD,
  {
    sender: string;
    content: string;
    replacing_message_id?: string;
    previews?: string[];
    expects_read_confirmation?: boolean;
    mentions?: string[];
    quote?:
      | string
      | {
          message_id: string;
          user_id: string;
          hash: Uint8Array;
        }
      | {error: {type: string}};
    /** @deprecated this was legacy field for the text content */
    message?: string;
    /** @deprecated this was legacy field for the conversationId */
    id?: string;
  }
> & {
  /** who have received/read the event */
  read_receipts?: ReadReceipt[];
  /** who reacted to the event */
  reactions?: UserReactionMap | ReactionMap;
  edited_time?: string;
  status: StatusType;
  version?: number;
};
export type MissedEvent = BaseEvent & {id: string; type: CONVERSATION.MISSED_MESSAGES};
export type JoinedAfterMLSMigrationFinalisationEvent = BaseEvent & {
  type: CONVERSATION.JOINED_AFTER_MLS_MIGRATION;
};
export type MLSMigrationFinalisationOngoingCallEvent = BaseEvent & {
  type: CONVERSATION.MLS_MIGRATION_ONGOING_CALL;
};
export type MLSConversationRecoveredEvent = BaseEvent & {id: string; type: CONVERSATION.MLS_CONVERSATION_RECOVERED};
export type OneToOneCreationEvent = ConversationEvent<CONVERSATION.ONE2ONE_CREATION, {userIds: QualifiedId[]}>;
export type TeamMemberLeaveEvent = Omit<MemberLeaveEvent, 'type'> & {
  type: CONVERSATION.TEAM_MEMBER_LEAVE;
};
export type ReactionEvent = ConversationEvent<CONVERSATION.REACTION, {message_id: string; reaction: ReactionType}>;
export type MessageHiddenEvent = ConversationEvent<
  CONVERSATION.MESSAGE_HIDDEN,
  {conversation_id: string; message_id: string}
>;
export type ConfirmationEvent = ConversationEvent<
  CONVERSATION.CONFIRMATION,
  {
    message_id: string;
    more_message_ids: string[];
    status: StatusType;
  }
>;
export type ButtonActionConfirmationEvent = ConversationEvent<
  CONVERSATION.BUTTON_ACTION_CONFIRMATION,
  {buttonId: string; messageId: string}
>;
export type DeleteEverywhereEvent = ConversationEvent<
  CONVERSATION.DELETE_EVERYWHERE,
  {
    deleted_time: string;
  }
>;
export type CompositeMessageAddEvent = ConversationEvent<
  CONVERSATION.COMPOSITE_MESSAGE_ADD,
  {items: {button: {id: string; text: string}; text: MessageAddEvent['data']}[]}
>;
export type IncomingMessageTooBigEvent = ConversationEvent<CONVERSATION.INCOMING_MESSAGE_TOO_BIG>;
export type KnockEvent = ConversationEvent<
  CONVERSATION.KNOCK,
  {
    expects_read_confirmation?: boolean;
  }
>;
export type LocationEvent = ConversationEvent<
  CONVERSATION.LOCATION,
  {
    expects_read_confirmation?: boolean;
  }
>;
export type UnableToDecryptEvent = ConversationEvent<CONVERSATION.UNABLE_TO_DECRYPT>;
export type VerificationEvent = ConversationEvent<CONVERSATION.VERIFICATION>;
export type FileTypeRestrictedEvent = ConversationEvent<
  CONVERSATION.FILE_TYPE_RESTRICTED,
  {fileExt: string; isIncoming: boolean; name: string}
>;
export type CallingTimeoutEvent = ConversationEvent<
  CONVERSATION.CALL_TIME_OUT,
  {reason: AVS_REASON.NOONE_JOINED | AVS_REASON.EVERYONE_LEFT}
>;
export type FailedToAddUsersMessageEvent = ConversationEvent<CONVERSATION.FAILED_TO_ADD_USERS, AddUsersFailure[]>;

export interface ErrorEvent
  extends ConversationEvent<CONVERSATION.UNABLE_TO_DECRYPT | CONVERSATION.INCOMING_MESSAGE_TOO_BIG> {
  error: string;
  error_code: number | string;
  id: string;
}

// E2EI Verification Events
export type E2EIVerificationEventData = {type: E2EIVerificationMessageType; userIds?: QualifiedId[]};
export type E2EIVerificationEvent = ConversationEvent<CONVERSATION.E2EI_VERIFICATION, E2EIVerificationEventData>;

export type ClientConversationEvent =
  | AllVerifiedEvent
  | E2EIVerificationEvent
  | AssetAddEvent
  | ErrorEvent
  | CompositeMessageAddEvent
  | ConfirmationEvent
  | FederationStopEvent
  | DeleteEvent
  | DeleteEverywhereEvent
  | DegradedMessageEvent
  | ButtonActionConfirmationEvent
  | KnockEvent
  | IncomingMessageTooBigEvent
  | GroupCreationEvent
  | TeamMemberLeaveEvent
  | ReactionEvent
  | LegalHoldMessageEvent
  | MessageAddEvent
  | MessageHiddenEvent
  | MemberLeaveEvent
  | MemberJoinEvent
  | OneToOneCreationEvent
  | OneToOneMigratedToMlsEvent
  | VoiceChannelDeactivateEvent
  | FileTypeRestrictedEvent
  | CallingTimeoutEvent
  | FailedToAddUsersMessageEvent
  | UnableToDecryptEvent
  | MissedEvent
  | JoinedAfterMLSMigrationFinalisationEvent
  | MLSMigrationFinalisationOngoingCallEvent
  | MLSConversationRecoveredEvent
  | LocationEvent
  | VoiceChannelActivateEvent
  | VerificationEvent;

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

  build1to1MigratedToMLS(conversationEntity: Conversation): OneToOneMigratedToMlsEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      time: new Date().toISOString(),
      type: ClientEvent.CONVERSATION.ONE2ONE_MIGRATED_TO_MLS,
      from: conversationEntity.selfUser().id,
      data: undefined,
      id: createUuid(),
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

  buildAllE2EIVerified(conversationEntity: Conversation): E2EIVerificationEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        type: E2EIVerificationMessageType.VERIFIED,
      },
      from: '',
      id: createUuid(),
      time: conversationEntity.getNextIsoDate(),
      type: ClientEvent.CONVERSATION.E2EI_VERIFICATION,
    };
  },

  buildE2EIDegraded(
    conversationEntity: Conversation,
    type: E2EIVerificationMessageType,
    userIds?: QualifiedId[],
  ): E2EIVerificationEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        type,
        userIds,
      },
      from: '',
      id: createUuid(),
      time: conversationEntity.getNextIsoDate(),
      type: ClientEvent.CONVERSATION.E2EI_VERIFICATION,
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
    failedToAdd: AddUsersFailure[],
    conversation: Conversation,
    userId: string,
  ): FailedToAddUsersMessageEvent {
    return {
      ...buildQualifiedId(conversation),
      data: failedToAdd,
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
    timestamp: number = 0,
  ): GroupCreationEvent {
    const {creator: creatorId} = conversationEntity;
    const selfUserId = conversationEntity.selfUser().id;
    const isoDate = new Date(timestamp).toISOString();

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
      data: undefined,
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
    userIds: QualifiedId[],
    from: string,
    currentTimestamp: number,
  ): MemberLeaveEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        qualified_user_ids: userIds,
        user_ids: userIds.map(({id}) => id),
      },
      from: from,
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

  buildMessageAdd(
    conversationEntity: Conversation,
    currentTimestamp: number,
    senderId: string,
    clientId: string,
  ): MessageAddEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        content: '',
        sender: clientId,
      },
      id: createUuid(),
      from: senderId,
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

  buildJoinedAfterMLSMigrationFinalisation(
    conversationEntity: Conversation,
    currentTimestamp: number,
  ): JoinedAfterMLSMigrationFinalisationEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      from: conversationEntity.selfUser().id,
      id: createUuid(),
      data: null,
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: ClientEvent.CONVERSATION.JOINED_AFTER_MLS_MIGRATION,
    };
  },

  buildMLSMigrationFinalisationOngoingCall(
    conversationEntity: Conversation,
    currentTimestamp: number,
  ): MLSMigrationFinalisationOngoingCallEvent {
    return {
      ...buildQualifiedId(conversationEntity),
      from: conversationEntity.selfUser().id,
      id: createUuid(),
      data: null,
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: ClientEvent.CONVERSATION.MLS_MIGRATION_ONGOING_CALL,
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

  buildUnableToDecrypt(
    event: ConversationOtrMessageAddEvent | ConversationMLSMessageAddEvent,
    decryptionError: DecryptionError,
  ): ErrorEvent {
    const {qualified_conversation: conversationId, qualified_from, conversation, data: eventData, from, time} = event;

    return {
      ...buildQualifiedId(conversationId || conversation),
      error: `${decryptionError.message} (${(eventData as any).sender})`,
      data: undefined,
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
      data: undefined,
      from: userId.id,
      id: createUuid(),
      protocol_version: protocolVersion,
      qualified_from: userId,
      time,
      type: CONVERSATION.VOICE_CHANNEL_ACTIVATE,
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
