/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {ClientEvent} from 'Repositories/event/client';
import {Translate} from 'Util/localizerUtil';

import {SystemMessage} from './systemmessage';

import {SystemMessageType} from '../../../message/systemmessagetype';

export class MemberRoleUpdateMessage extends SystemMessage {
  constructor(translate: Translate) {
    super(translate);

    this.type = ClientEvent.CONVERSATION.MEMBER_ROLE_UPDATE;
    this.system_message_type = SystemMessageType.MEMBER_ROLE_UPDATE;
    this.caption = translate('conversationYouPromotedToAdmin');
  }
}
