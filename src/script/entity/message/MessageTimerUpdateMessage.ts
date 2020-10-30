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

import ko from 'knockout';
import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event';

import {t} from 'Util/LocalizerUtil';
import {formatDuration} from 'Util/TimeUtil';

import {ConversationEphemeralHandler} from '../../conversation/ConversationEphemeralHandler';
import {SystemMessageType} from '../../message/SystemMessageType';
import {SystemMessage} from './SystemMessage';

export class MessageTimerUpdateMessage extends SystemMessage {
  public readonly message_timer: number;
  public readonly caption: ko.PureComputed<string>;

  constructor(messageTimer: number) {
    super();

    this.type = CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE;
    this.system_message_type = SystemMessageType.CONVERSATION_MESSAGE_TIMER_UPDATE;

    this.message_timer = ConversationEphemeralHandler.validateTimer(messageTimer);

    this.caption = ko.pureComputed(() => {
      if (this.message_timer) {
        const timeString = formatDuration(this.message_timer).text;
        return this.user().isMe
          ? t('conversationUpdatedTimerYou', timeString)
          : t('conversationUpdatedTimer', timeString);
      }

      return this.user().isMe ? t('conversationResetTimerYou') : t('conversationResetTimer');
    });
  }
}
