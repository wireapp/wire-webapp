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

import {ClientEvent} from 'Repositories/event/Client';
import {translate} from 'Util/localizerUtil';

import {SystemMessage} from './SystemMessage';

import {SystemMessageType} from '../../../message/SystemMessageType';

export type DescriptionUpdateAction = 'add' | 'edit';

export class DescriptionUpdateMessage extends SystemMessage {
  public readonly description: string;
  public readonly action: DescriptionUpdateAction;

  constructor(description: string, action: DescriptionUpdateAction = 'edit') {
    super();

    this.type = ClientEvent.CONVERSATION.DESCRIPTION_UPDATE;
    this.system_message_type = SystemMessageType.CONVERSATION_DESCRIPTION_UPDATE;
    this.description = description;
    this.action = action;
    this.caption = translate(action === 'add' ? 'conversationDescriptionAddedYou' : 'conversationDescriptionEditedYou');
  }
}
