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

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';

import {ConversationEphemeralHandler} from 'Repositories/conversation/ConversationEphemeralHandler';
import {t} from 'Util/LocalizerUtil';
import {formatDuration} from 'Util/TimeUtil';

import {SystemMessage} from './SystemMessage';

import {SystemMessageType} from '../../../message/SystemMessageType';

export class MessageTimerUpdateMessage extends SystemMessage {
  public readonly message_timer: number;

  constructor(messageTimer: number | null) {
    super();

    this.type = CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE;
    this.system_message_type = SystemMessageType.CONVERSATION_MESSAGE_TIMER_UPDATE;

    this.message_timer = ConversationEphemeralHandler.validateTimer(messageTimer);

    this.caption = getCaption(this.message_timer, this.user().isMe);
  }
}

const getCaption = (messageTimer: number, isSelfUser: boolean) => {
  if (messageTimer) {
    const timeString = formatDuration(messageTimer).text;
    return isSelfUser
      ? t('conversationUpdatedTimerYou', {time: timeString})
      : t('conversationUpdatedTimer', {time: timeString});
  }

  return isSelfUser ? t('conversationResetTimerYou') : t('conversationResetTimer');
};
