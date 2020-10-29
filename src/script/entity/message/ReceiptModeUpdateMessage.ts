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

import {SystemMessageType} from '../../message/SystemMessageType';
import {SystemMessage} from './SystemMessage';

export class ReceiptModeUpdateMessage extends SystemMessage {
  public caption: ko.PureComputed<string>;

  constructor(isReceiptEnabled: boolean) {
    super();

    this.type = CONVERSATION_EVENT.RECEIPT_MODE_UPDATE;
    this.system_message_type = SystemMessageType.CONVERSATION_RECEIPT_MODE_UPDATE;

    this.caption = ko.pureComputed(() => {
      if (isReceiptEnabled) {
        return this.user().isMe ? t('conversationReceiptsOnYou') : t('conversationReceiptsOn');
      }
      return this.user().isMe ? t('conversationReceiptsOffYou') : t('conversationReceiptsOff');
    });
  }
}
