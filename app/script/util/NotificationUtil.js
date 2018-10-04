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

'use strict';

window.z = window.z || {};
window.z.util = z.util || {};

z.util.NotificationUtil = {
  /**
   * @param {z.entity.Conversation} conversationEntity - The conversation to filter from.
   * @param {z.entity.Message} messageEntity - The message to filter from.
   * @param {EVENTS_TO_NOTIFY} eventsToNotify - The events which should be counted in.
   * @param {z.entity.User} selfUser - The user to filter from.
   * @returns {boolean} If the conversation should send a notification.
   */
  shouldNotify: (conversationEntity, messageEntity, eventsToNotify, selfUser) => {
    const isEventToNotify =
      eventsToNotify.includes(messageEntity.super_type) && !messageEntity.isEdited() && !messageEntity.isLinkPreview();

    const isSelfMentioned =
      isEventToNotify && messageEntity.is_content() && messageEntity.isUserMentioned(selfUser().id);

    switch (conversationEntity.notificationState()) {
      case z.conversation.NotificationSetting.STATE.EVERYTHING: {
        return isEventToNotify;
      }
      case z.conversation.NotificationSetting.STATE.NOTHING: {
        return false;
      }
      case z.conversation.NotificationSetting.STATE.ONLY_MENTIONS: {
        return isSelfMentioned;
      }
    }
  },
};
