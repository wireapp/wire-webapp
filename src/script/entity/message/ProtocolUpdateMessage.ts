/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import ko from 'knockout';

import {SystemMessageType} from 'src/script/message/SystemMessageType';
import {t} from 'Util/LocalizerUtil';

import {SystemMessage} from './SystemMessage';

export class ProtocolUpdateMessage extends SystemMessage {
  constructor(public protocol: ConversationProtocol.MIXED | ConversationProtocol.MLS) {
    super();
    this.system_message_type = SystemMessageType.CONVERSATION_PROTOCOL_UPDATE;
    this.caption = ko.pureComputed(() =>
      this.protocol === ConversationProtocol.MIXED
        ? t('conversationProtocolUpdatedToMixed')
        : t('conversationProtocolUpdatedToMLS'),
    );
  }
}
