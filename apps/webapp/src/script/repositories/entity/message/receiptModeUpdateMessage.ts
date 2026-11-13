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
import {container} from 'tsyringe';

import {UserState} from 'Repositories/user/userState';
import {type Translate} from 'Util/localizerUtil';
import {matchQualifiedIds} from 'Util/qualifiedId';

import {SystemMessage} from './systemMessage';

import {SystemMessageType} from '../../../message/systemMessageType';
import {User} from '../User';

export class ReceiptModeUpdateMessage extends SystemMessage {
  private readonly userState = container.resolve(UserState);

  constructor(isReceiptEnabled: boolean, userId: string, userDomain: string | undefined, translate: Translate) {
    super(translate);

    this.type = CONVERSATION_EVENT.RECEIPT_MODE_UPDATE;
    this.system_message_type = SystemMessageType.CONVERSATION_RECEIPT_MODE_UPDATE;

    if (userId) {
      this.from = userId;
      this.fromDomain = userDomain;
      this.user(new User(userId, userDomain ?? '', this.translate));
    }

    const isSelfUser = !!userId && matchQualifiedIds(this.user().qualifiedId, this.userState.self()?.qualifiedId);
    this.caption = getCaption(isReceiptEnabled, isSelfUser, this.translate);
  }
}

const getCaption = (isReceiptEnabled: boolean, isSelfUser: boolean, translate: Translate) => {
  if (isReceiptEnabled) {
    return isSelfUser ? translate('conversationReceiptsOnYou') : translate('conversationReceiptsOn');
  }
  return isSelfUser ? translate('conversationReceiptsOffYou') : translate('conversationReceiptsOff');
};
