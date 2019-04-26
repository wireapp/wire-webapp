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

import {Environment} from 'Util/Environment';

import {Conversation} from '../entity/Conversation';
import {ConversationType, UserType, PlatformType} from './attribute';

/**
 * Get corresponding tracking attribute for conversation type.
 * @param {Conversation} conversationEntity - Conversation to map type of
 * @returns {ConversationType} Mapped conversation type
 */
function getConversationType(conversationEntity) {
  if (conversationEntity instanceof Conversation) {
    return conversationEntity.is1to1() ? ConversationType.ONE_TO_ONE : ConversationType.GROUP;
  }
}

function getGuestAttributes(conversationEntity) {
  const isTeamConversation = !!conversationEntity.team_id;
  if (isTeamConversation) {
    const isAllowGuests = !conversationEntity.isTeamOnly();
    const _getUserType = _conversationEntity => {
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

function getParticipantTypes(userEntities, countSelf) {
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
 * @returns {PlatformType} Mapped platform type
 */
function getPlatform() {
  if (!Environment.desktop) {
    return PlatformType.BROWSER_APP;
  }

  if (Environment.os.win) {
    return PlatformType.DESKTOP_WINDOWS;
  }
  return Environment.os.mac ? PlatformType.DESKTOP_MACOS : PlatformType.DESKTOP_LINUX;
}

export {getConversationType, getGuestAttributes, getParticipantTypes, getPlatform};
