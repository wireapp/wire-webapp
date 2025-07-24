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

import {Message} from './Message';
import {RenameMessage} from './RenameMessage';

import {SuperType} from '../../../message/SuperType';
import {SystemMessageType} from '../../../message/SystemMessageType';

export class SystemMessage extends Message {
  public caption?: string;
  public system_message_type: SystemMessageType;

  constructor() {
    super();
    this.super_type = SuperType.SYSTEM;
    this.system_message_type = SystemMessageType.NORMAL;
  }

  isConversationRename(): this is RenameMessage {
    return this.system_message_type === SystemMessageType.CONVERSATION_RENAME;
  }
}
