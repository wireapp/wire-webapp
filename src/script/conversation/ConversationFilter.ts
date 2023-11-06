/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {matchQualifiedIds} from 'Util/QualifiedId';

import type {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';

export class ConversationFilter {
  static is1To1WithUser(conversationEntity: Conversation, userEntity: User): boolean {
    const [user] = conversationEntity.participating_user_ids();
    return matchQualifiedIds(userEntity, user);
  }

  static isInTeam(conversationEntity: Conversation, userEntity: User): boolean {
    return userEntity.teamId === conversationEntity.teamId && conversationEntity.domain === userEntity.domain;
  }

  static showCallControls(conversationEntity: Conversation, hasCall: boolean): boolean {
    const isSupportedConversation = conversationEntity.isGroup() || conversationEntity.is1to1();
    const hasParticipants = !!conversationEntity.participating_user_ids().length;
    const isActiveConversation = hasParticipants && !conversationEntity.removed_from_conversation();
    return !hasCall && isSupportedConversation && isActiveConversation;
  }
}
