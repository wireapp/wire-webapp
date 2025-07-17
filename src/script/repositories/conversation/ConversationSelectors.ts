/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {
  CONVERSATION_TYPE,
  ConversationProtocol,
  Conversation as BackendConversation,
} from '@wireapp/api-client/lib/conversation/';
import {QualifiedId} from '@wireapp/api-client/lib/user/';

import {Conversation} from 'Repositories/entity/Conversation';
import {matchQualifiedIds} from 'Util/QualifiedId';

export type ProteusConversation = Conversation & {protocol: ConversationProtocol.PROTEUS};
export type MixedConversation = Conversation & {groupId: string; protocol: ConversationProtocol.MIXED};
export type MLSConversation = Conversation & {groupId: string; protocol: ConversationProtocol.MLS};
export type MLSCapableConversation = MixedConversation | MLSConversation;

export function isProteusConversation(conversation: Conversation): conversation is ProteusConversation {
  return !conversation.groupId && conversation.protocol === ConversationProtocol.PROTEUS;
}

export function isMixedConversation(conversation: Conversation): conversation is MixedConversation {
  return !!conversation.groupId && conversation.protocol === ConversationProtocol.MIXED;
}

export function isMLSConversation(conversation: Conversation): conversation is MLSConversation {
  return !!conversation.groupId && conversation.protocol === ConversationProtocol.MLS;
}

export function isMLSCapableConversation(conversation: Conversation): conversation is MLSCapableConversation {
  return isMixedConversation(conversation) || isMLSConversation(conversation);
}

export function isGroupMLSConversation(conversation: Conversation): conversation is MLSConversation {
  return isMLSConversation(conversation) && conversation.isGroupOrChannel();
}

export function isSelfConversation(conversation: Conversation): boolean {
  return conversation.type() === CONVERSATION_TYPE.SELF;
}

export function isTeamConversation(conversation: Conversation): boolean {
  return conversation.type() === CONVERSATION_TYPE.GLOBAL_TEAM;
}

export function isProteusTeam1to1Conversation({
  name,
  type,
  inTeam,
  otherMembersLength,
}: {
  name: string | undefined;
  type: CONVERSATION_TYPE;
  inTeam: boolean;
  otherMembersLength: number;
}): boolean {
  const isGroupConversation = type === CONVERSATION_TYPE.REGULAR;
  const hasOneParticipant = otherMembersLength === 1;
  return isGroupConversation && hasOneParticipant && inTeam && !name;
}

export function isBackendProteus1to1Conversation(conversation: BackendConversation): boolean {
  const isProteus1to1 =
    conversation.protocol === ConversationProtocol.PROTEUS && conversation.type === CONVERSATION_TYPE.ONE_TO_ONE;

  const {name, type, team, members} = conversation;

  return (
    isProteusTeam1to1Conversation({
      name,
      type,
      inTeam: !!team,
      otherMembersLength: members.others.length,
    }) || isProteus1to1
  );
}

export function isConnectionRequestConversation(conversation: Conversation): boolean {
  return conversation.type() === CONVERSATION_TYPE.CONNECT;
}

interface ProtocolToConversationType {
  [ConversationProtocol.PROTEUS]: ProteusConversation;
  [ConversationProtocol.MLS]: MLSConversation;
}

const is1to1ConversationWithUser =
  <Protocol extends ConversationProtocol.PROTEUS | ConversationProtocol.MLS>(userId: QualifiedId, protocol: Protocol) =>
  (conversation: Conversation): conversation is ProtocolToConversationType[Protocol] => {
    const doesProtocolMatch =
      protocol === ConversationProtocol.PROTEUS ? isProteusConversation(conversation) : isMLSConversation(conversation);

    if (!doesProtocolMatch) {
      return false;
    }

    const connection = conversation.connection();
    if (connection?.userId) {
      return matchQualifiedIds(connection.userId, userId);
    }

    const isProteusConnectType =
      protocol === ConversationProtocol.PROTEUS && isConnectionRequestConversation(conversation);

    if (!conversation.is1to1() && !isProteusConnectType) {
      return false;
    }

    const conversationMembersIds = conversation.participating_user_ids();
    const otherUserQualifiedId = conversationMembersIds.length === 1 ? conversationMembersIds[0] : null;
    const doesUserIdMatch = !!otherUserQualifiedId && matchQualifiedIds(otherUserQualifiedId, userId);

    return doesUserIdMatch;
  };

export const isProteus1to1ConversationWithUser = (userId: QualifiedId) =>
  is1to1ConversationWithUser(userId, ConversationProtocol.PROTEUS);

export const isMLS1to1ConversationWithUser = (userId: QualifiedId) =>
  is1to1ConversationWithUser(userId, ConversationProtocol.MLS);

export const isReadableConversation = (conversation: Conversation): boolean => {
  const states_to_filter = [
    ConnectionStatus.MISSING_LEGAL_HOLD_CONSENT,
    ConnectionStatus.CANCELLED,
    ConnectionStatus.PENDING,
  ];

  const connection = conversation.connection();

  return !(isSelfConversation(conversation) || (connection && states_to_filter.includes(connection.status())));
};
