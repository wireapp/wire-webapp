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

import {t} from 'utils/LocalizerUtil';

window.z = window.z || {};
window.z.entity = z.entity || {};

z.entity.MessageTimerUpdateMessage = class MessageTimerUpdateMessage extends z.entity.SystemMessage {
  constructor(messageTimer) {
    super();

    this.type = z.event.Backend.CONVERSATION.MESSAGE_TIMER_UPDATE;
    this.system_message_type = z.message.SystemMessageType.CONVERSATION_MESSAGE_TIMER_UPDATE;

    this.message_timer = z.conversation.ConversationEphemeralHandler.validateTimer(messageTimer);

    this.caption = ko.pureComputed(() => {
      if (this.message_timer) {
        const timeString = z.util.TimeUtil.formatDuration(this.message_timer).text;
        return this.user().is_me
          ? t('conversationUpdatedTimerYou', timeString)
          : t('conversationUpdatedTimer', timeString);
      }

      return this.user().is_me ? t('conversationResetTimerYou') : t('conversationResetTimer');
    });
  }
};
