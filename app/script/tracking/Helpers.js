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

window.z = window.z || {};
window.z.tracking = z.tracking || {};

z.tracking.helpers = {
  /**
   * Get corresponding tracking attribute for conversation type.
   * @param {z.entity.Conversation} conversationEntity - Conversation to map type of
   * @returns {z.tracking.attribute.ConversationType} Mapped conversation type
   */
  getConversationType(conversationEntity) {
    if (conversationEntity instanceof z.entity.Conversation) {
      return conversationEntity.is1to1()
        ? z.tracking.attribute.ConversationType.ONE_TO_ONE
        : z.tracking.attribute.ConversationType.GROUP;
    }
  },

  getGuestAttributes(conversationEntity) {
    const isTeamConversation = !!conversationEntity.team_id;
    if (isTeamConversation) {
      const isAllowGuests = !conversationEntity.isTeamOnly();
      const _getUserType = _conversationEntity => {
        if (_conversationEntity.selfUser().isTemporaryGuest()) {
          return z.tracking.attribute.UserType.TEMPORARY_GUEST;
        }

        return _conversationEntity.isGuest() ? z.tracking.attribute.UserType.GUEST : z.tracking.attribute.UserType.USER;
      };

      return {
        is_allow_guests: isAllowGuests,
        user_type: _getUserType(conversationEntity),
      };
    }

    return {
      is_allow_guests: false,
      user_type: z.tracking.attribute.UserType.USER,
    };
  },

  getParticipantTypes(userEntities, countSelf) {
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
  },

  /**
   * Get the platform identifier.
   * @returns {z.tracking.attribute.PlatformType} Mapped platform type
   */
  getPlatform() {
    if (!z.util.Environment.desktop) {
      return z.tracking.attribute.PlatformType.BROWSER_APP;
    }

    if (z.util.Environment.os.win) {
      return z.tracking.attribute.PlatformType.DESKTOP_WINDOWS;
    }
    return z.util.Environment.os.mac
      ? z.tracking.attribute.PlatformType.DESKTOP_MACOS
      : z.tracking.attribute.PlatformType.DESKTOP_LINUX;
  },
};
