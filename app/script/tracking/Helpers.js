/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.tracking = z.tracking || {};

z.tracking.helpers = {
  /**
   * Get corresponding tracking attribute for conversation type.
   * @param {z.entity.Conversation} conversation_et - Conversation to map type of
   * @returns {z.tracking.attribute.ConversationType} Mapped conversation type
   */
  get_conversation_type(conversation_et) {
    if (conversation_et instanceof z.entity.Conversation) {
      if (conversation_et.is_one2one()) {
        return z.tracking.attribute.ConversationType.ONE_TO_ONE;
      }
      return z.tracking.attribute.ConversationType.GROUP;
    }
  },

  /**
   * Get corresponding tracking attribute for message type.
   * @param {z.entity.Message} message_et - Message to map type of
   * @returns {z.tracking.attribute.MessageType} Mapped message type
   */
  get_message_type(message_et) {
    if (message_et instanceof z.entity.Message) {
      switch (false) {
        case !message_et.is_system():
          return z.tracking.attribute.MessageType.SYSTEM;
        case !message_et.is_ping():
          return z.tracking.attribute.MessageType.PING;
        case !message_et.has_asset():
          return z.tracking.attribute.MessageType.FILE;
        case !message_et.has_asset_image():
          return z.tracking.attribute.MessageType.IMAGE;
        case !message_et.has_asset_location():
          return z.tracking.attribute.MessageType.LOCATION;
        default:
          return z.tracking.attribute.MessageType.TEXT;
      }
    }
  },

  /**
   * Get the platform identifier.
   * @returns {z.tracking.attribute.PlatformType} Mapped platform type
   */
  get_platform() {
    if (z.util.Environment.electron) {
      if (z.util.Environment.os.win) {
        return z.tracking.attribute.PlatformType.DESKTOP_WINDOWS;
      }
      if (z.util.Environment.os.mac) {
        return z.tracking.attribute.PlatformType.DESKTOP_MACOS;
      }
      return z.tracking.attribute.PlatformType.DESKTOP_LINUX;
    }
    return z.tracking.attribute.PlatformType.BROWSER_APP;
  },
};
