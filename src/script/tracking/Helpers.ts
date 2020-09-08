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

import {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';
import {ConversationType, UserType, PlatformType} from './attribute';
import {Runtime} from '@wireapp/commons';

/**
 * Get corresponding tracking attribute for conversation type.
 * @param conversationEntity Conversation to map type of
 * @returns Mapped conversation type
 */
export function getConversationType(conversationEntity: Conversation): ConversationType;
export function getConversationType(conversationEntity: any): void;
export function getConversationType(conversationEntity: any): ConversationType | void {
  if (conversationEntity instanceof Conversation) {
    return conversationEntity.is1to1() ? ConversationType.ONE_TO_ONE : ConversationType.GROUP;
  }
}

export function getGuestAttributes(conversationEntity: Conversation): {is_allow_guests: boolean; user_type: UserType} {
  const isTeamConversation = !!conversationEntity.team_id;
  if (isTeamConversation) {
    const isAllowGuests = !conversationEntity.isTeamOnly();
    const _getUserType = (_conversationEntity: Conversation) => {
      if (_conversationEntity.selfUser().isTemporaryGuest()) {
        return UserType.TEMPORARY_GUEST;
      }

      return _conversationEntity.isGuest() ? UserType.GUEST : UserType.USER;
    };

    return {
      is_allow_guests: isAllowGuests,
      user_type: _getUserType(conversationEntity),
    };
  }

  return {
    is_allow_guests: false,
    user_type: UserType.USER,
  };
}

export function getParticipantTypes(
  userEntities: User[],
  countSelf?: boolean,
): {guests: number; temporaryGuests: number; users: number} {
  const initialValue = {guests: 0, temporaryGuests: 0, users: countSelf ? 1 : 0};
  return userEntities.reduce((accumulator, userEntity) => {
    if (userEntity.isTemporaryGuest()) {
      accumulator.temporaryGuests += 1;
    } else if (userEntity.isGuest()) {
      accumulator.guests += 1;
    } else {
      accumulator.users += 1;
    }

    return accumulator;
  }, initialValue);
}

/**
 * Get the platform identifier.
 * @returns Mapped platform type
 */
export function getPlatform(): PlatformType {
  if (!Runtime.isDesktopApp()) {
    return PlatformType.BROWSER_APP;
  }

  if (Runtime.isWindows()) {
    return PlatformType.DESKTOP_WINDOWS;
  }
  return Runtime.isMacOS() ? PlatformType.DESKTOP_MACOS : PlatformType.DESKTOP_LINUX;
}
