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

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';
import {UserState} from 'Repositories/user/UserState';
import {container} from 'tsyringe';
import {t} from 'Util/LocalizerUtil';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {SystemMessage} from './SystemMessage';

import {SystemMessageType} from '../../../message/SystemMessageType';
import {User} from '../User';

export class RenameMessage extends SystemMessage {
  public readonly name: string;
  private readonly userState = container.resolve(UserState);

  constructor(name: string, userId?: string, userDomain?: string) {
    super();

    this.type = CONVERSATION_EVENT.RENAME;
    this.system_message_type = SystemMessageType.CONVERSATION_RENAME;
    this.name = name;

    if (userId) {
      this.from = userId;
      this.fromDomain = userDomain;
      this.user(new User(userId, userDomain));
    }

    this.caption = this.generateCaption();
  }

  private generateCaption(): string {
    if (!this.user()) {
      return t('conversationRename');
    }

    return matchQualifiedIds(this.user().qualifiedId, this.userState.self()?.qualifiedId)
      ? t('conversationRenameYou')
      : t('conversationRename');
  }
}
