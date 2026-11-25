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

import {isNan, isNullOrUndefined, isTruthy, isUndefined} from '@sindresorhus/is';

import type {REASON as AVS_REASON} from '@wireapp/avs';
import type {LegalHoldStatus} from '@wireapp/protocol-messaging';

import {
  VoiceChannelActivateEvent,
  VoiceChannelDeactivateEvent,
  AllVerifiedEvent,
  OneToOneMigratedToMlsEvent,
  DegradedMessageEvent,
  FederationStopEvent,
  GroupCreationEvent,
  LegalHoldMessageEvent,
  MemberJoinEvent,
  MemberLeaveEvent,
  MessageAddEvent,
  MissedEvent,
  JoinedAfterMLSMigrationFinalisationEvent,
  MLSMigrationFinalisationOngoingCallEvent,
  MLSConversationRecoveredEvent,
  OneToOneCreationEvent,
  TeamMemberLeaveEvent,
  DeleteEverywhereEvent,
  FileTypeRestrictedEvent,
  MemberRoleUpdateEvent,
  CallingTimeoutEvent,
  FailedToAddUsersMessageEvent,
  ErrorEvent,
  E2EIVerificationEvent,
} from './EventBuilder.events';
import {BuildMessageAddParams} from './EventBuilder.types';

import {
  CONVERSATION_EVENT,
  ConversationMLSMessageAddEvent,
  ConversationOtrMessageAddEvent,
} from '../../../apiClient/event/conversationEvent';
import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import {AddUsersFailure} from '../../../core/conversation';
import {DecryptionError} from '../../../core/errors/decryptionError';
import {E2EIVerificationMessageType} from '../../../message/e2eiVerificationMessageType';
import {StatusType} from '../../../message/statusType';
import {VerificationMessageType} from '../../../message/verificationMessageType';
import {createUuid} from '../../../util/uuid';
import type {Conversation} from '../../entity/Conversation';
import type {Message} from '../../entity/message/message';
import type {User} from '../../entity/User';
import {ClientEvent, CONVERSATION} from '../../event/Client';

type QualifiedConversationPayload = {conversation: string; qualified_conversation: QualifiedId};

function buildQualifiedId(conversation: QualifiedId | string): QualifiedConversationPayload {
  const qualifiedId = typeof conversation === 'string' ? {domain: '', id: conversation} : conversation;
  return {
    conversation: qualifiedId.id,
    qualified_conversation: {domain: qualifiedId.domain, id: qualifiedId.id},
  };
}

function getConversationSelfUser(conversationEntity: Conversation): User {
  const conversationSelfUser = conversationEntity.selfUser();
  if (!isUndefined(conversationSelfUser)) {
    return conversationSelfUser;
  }

  const firstConversationParticipant = conversationEntity.participating_user_ets()[0];
  if (!isUndefined(firstConversationParticipant)) {
    return firstConversationParticipant;
  }

  return {
    id: '',
    qualifiedId: {domain: '', id: ''},
  } as User;
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

  build1to1MigratedToMLS(conversationEntity: Conversation, currentTimestamp: number): OneToOneMigratedToMlsEvent {
    const selfUser = getConversationSelfUser(conversationEntity);
    return {
      ...buildQualifiedId(conversationEntity),
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: ClientEvent.CONVERSATION.ONE2ONE_MIGRATED_TO_MLS,
      from: selfUser.id,
      data: undefined,
      id: createUuid(),
    };
  },

  buildAllVerified(conversationEntity: Conversation): AllVerifiedEvent {
    const selfUser = getConversationSelfUser(conversationEntity);
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        type: VerificationMessageType.VERIFIED,
      },
      from: selfUser.id,
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
    const selfUser = getConversationSelfUser(conversationEntity);
    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        type,
        userIds,
      },
      from: selfUser.id,
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

  buildMemberRoleUpdate(
    conversation: Conversation,
    conversationRole: string,
    userId: QualifiedId,
    fromUserId: string,
  ): MemberRoleUpdateEvent {
    return {
      ...buildQualifiedId(conversation),
      data: {
        conversation_role: conversationRole,
        user_id: userId,
      },
      from: fromUserId,
      id: createUuid(),
      time: conversation.getNextIsoDate(),
      type: ClientEvent.CONVERSATION.MEMBER_ROLE_UPDATE,
    };
  },

  buildGroupCreation(
    conversationEntity: Conversation,
    isTemporaryGuest: boolean = false,
    timestamp: number = 0,
  ): GroupCreationEvent {
    const {creator: creatorId} = conversationEntity;
    const selfUser = getConversationSelfUser(conversationEntity);
    const selfUserId = selfUser.id;
    const isoDate = new Date(timestamp).toISOString();

    const userIds = conversationEntity.participating_user_ids().slice();
    const createdBySelf = creatorId === selfUserId || isTemporaryGuest;
    if (!createdBySelf) {
      userIds.push(selfUser.qualifiedId);
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
      ...buildQualifiedId(isTruthy(conversationId) ? conversationId : conversation),
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
      time: new Date(timestamp + (beforeMessage === true ? -1 : 0)).toISOString(),
      type: ClientEvent.CONVERSATION.LEGAL_HOLD_UPDATE,
    };
  },

  buildMemberJoin(
    conversationEntity: Conversation,
    sender: QualifiedId,
    joiningUserIds: QualifiedId[],
    timestamp?: number,
  ): MemberJoinEvent {
    if (isNullOrUndefined(timestamp) || timestamp === 0 || isNan(timestamp)) {
      timestamp = conversationEntity.getLastKnownTimestamp() + 1;
    }
    const isoDate = new Date(timestamp).toISOString();

    return {
      ...buildQualifiedId(conversationEntity),
      data: {
        user_ids: joiningUserIds.map(({id}) => {
          return id;
        }),
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
        user_ids: userIds.map(({id}) => {
          return id;
        }),
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

  buildMessageAdd({conversationEntity, currentTimestamp, senderId, clientId}: BuildMessageAddParams): MessageAddEvent {
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
    const selfUser = getConversationSelfUser(conversationEntity);
    return {
      ...buildQualifiedId(conversationEntity),
      from: selfUser.id,
      id: createUuid(),
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: ClientEvent.CONVERSATION.MISSED_MESSAGES,
    };
  },

  buildMLSConversationRecovered(
    conversationEntity: Conversation,
    currentTimestamp: number,
  ): MLSConversationRecoveredEvent {
    const selfUser = getConversationSelfUser(conversationEntity);
    return {
      ...buildQualifiedId(conversationEntity),
      from: selfUser.id,
      id: createUuid(),
      time: conversationEntity.getNextIsoDate(currentTimestamp),
      type: ClientEvent.CONVERSATION.MLS_CONVERSATION_RECOVERED,
    };
  },

  buildJoinedAfterMLSMigrationFinalisation(
    conversationEntity: Conversation,
    currentTimestamp: number,
  ): JoinedAfterMLSMigrationFinalisationEvent {
    const selfUser = getConversationSelfUser(conversationEntity);
    return {
      ...buildQualifiedId(conversationEntity),
      from: selfUser.id,
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
    const selfUser = getConversationSelfUser(conversationEntity);
    return {
      ...buildQualifiedId(conversationEntity),
      from: selfUser.id,
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
      ...buildQualifiedId(isTruthy(conversationId) ? conversationId : conversation),
      error: `${decryptionError.message} (${(eventData as any).sender})`,
      data: undefined,
      error_code: decryptionError.code ?? '',
      from,
      id: createUuid(),
      qualified_from: isTruthy(qualified_from) ? qualified_from : {domain: '', id: from},
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
