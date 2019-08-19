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

import {t} from 'Util/LocalizerUtil';

import {Message} from './Message';
import {CALL_MESSAGE_TYPE} from '../../message/CallMessageType';
import {SuperType} from '../../message/SuperType';

export class CallMessage extends Message {
  constructor(type, reason = undefined, duration = 0) {
    super();
    this.super_type = SuperType.CALL;
    this.call_message_type = type;
    this.finished_reason = reason;
    this.duration = duration;

    this.caption = ko.pureComputed(() =>
      this.user().is_me ? t('conversationVoiceChannelDeactivateYou') : t('conversationVoiceChannelDeactivate'),
    );
  }

  is_activation() {
    return this.call_message_type === CALL_MESSAGE_TYPE.ACTIVATED;
  }

  is_deactivation() {
    return this.call_message_type === CALL_MESSAGE_TYPE.DEACTIVATED;
  }

  was_completed() {
    return this.duration > 0;
  }
}
