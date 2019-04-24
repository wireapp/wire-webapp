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

import {t} from 'utils/LocalizerUtil';
import {BackendEvent} from '../../event/Backend';
import {SystemMessageType} from '../message/SystemMessageType';

window.z = window.z || {};
window.z.entity = z.entity || {};

z.entity.RenameMessage = class RenameMessage extends z.entity.SystemMessage {
  constructor() {
    super();

    this.type = BackendEvent.CONVERSATION.RENAME;
    this.system_message_type = SystemMessageType.CONVERSATION_RENAME;

    this.caption = ko.pureComputed(() => (this.user().is_me ? t('conversationRenameYou') : t('conversationRename')));
  }
};
