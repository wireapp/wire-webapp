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

import type {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';

export function isTeamConversation(conversationEntity: Conversation, userEntity: User) {
  return userEntity.teamId === conversationEntity.team_id;
}

export function isRemovedFromConversation(conversationEntity: Conversation) {
  return conversationEntity.removed_from_conversation();
}

export function is1To1WithUser(conversationEntity: Conversation, userEntity: User) {
  if (conversationEntity.is1to1()) {
    const [userId] = conversationEntity.participating_user_ids();
    return userEntity.id === userId;
  }
  return false;
}

export function isInTeam(conversationEntity: Conversation, userEntity: User) {
  return userEntity.teamId === conversationEntity.team_id;
}
