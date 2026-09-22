/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {TEAM_EVENT} from '@wireapp/api-client/lib/event/teamEvent';

import {type Translate} from 'Util/localizerUtil';

import {SystemMessage} from './systemMessage';

import {SystemMessageType} from '../../../message/systemMessageType';
import type {Conversation} from '../Conversation';

export class DeleteConversationMessage extends SystemMessage {
  constructor(conversationEntity: Conversation, translate: Translate) {
    super(translate);

    this.type = TEAM_EVENT.DELETE;
    this.system_message_type = SystemMessageType.CONVERSATION_DELETE;

    this.caption = conversationEntity
      ? this.translate('notificationConversationDeletedNamed', {name: conversationEntity.name()})
      : this.translate('notificationConversationDeleted');
  }
}
