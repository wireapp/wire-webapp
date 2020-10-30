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

import {TEAM_EVENT} from '@wireapp/api-client/src/event/TeamEvent';

import {t} from 'Util/LocalizerUtil';

import {SystemMessageType} from '../../message/SystemMessageType';
import type {Conversation} from '../Conversation';
import {SystemMessage} from './SystemMessage';

export class DeleteConversationMessage extends SystemMessage {
  public readonly system_message_type: SystemMessageType;
  public readonly caption: string;

  constructor(conversationEntity: Conversation) {
    super();

    this.type = TEAM_EVENT.DELETE;
    this.system_message_type = SystemMessageType.CONVERSATION_DELETE;

    this.caption = conversationEntity
      ? t('notificationConversationDeletedNamed', conversationEntity.name())
      : t('notificationConversationDeleted');
  }
}
