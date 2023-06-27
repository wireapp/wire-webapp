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

import {CONVERSATION_TYPE, ConversationProtocol} from '@wireapp/api-client/lib/conversation/';

import {Conversation} from '../entity/Conversation';

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

export function isSelfConversation(conversation: Conversation): boolean {
  return conversation.type() === CONVERSATION_TYPE.SELF;
}

export function isTeamConversation(conversation: Conversation): boolean {
  return conversation.type() === CONVERSATION_TYPE.GLOBAL_TEAM;
}
