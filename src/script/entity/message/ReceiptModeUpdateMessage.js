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

import SystemMessage from './SystemMessage';
import {t} from 'utils/LocalizerUtil';

export default class ReceiptModeUpdateMessage extends SystemMessage {
  constructor(isReceiptEnabled) {
    super();

    this.type = z.event.Backend.CONVERSATION.RECEIPT_MODE_UPDATE;
    this.system_message_type = z.message.SystemMessageType.CONVERSATION_RECEIPT_MODE_UPDATE;

    this.caption = ko.pureComputed(() => {
      if (isReceiptEnabled) {
        return this.user().is_me ? t('conversationReceiptsOnYou') : t('conversationReceiptsOn');
      }
      return this.user().is_me ? t('conversationReceiptsOffYou') : t('conversationReceiptsOff');
    });
  }
}
