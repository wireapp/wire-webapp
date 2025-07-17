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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {Message} from './Message';

import {E2EIVerificationMessageType} from '../../../message/E2EIVerificationMessageType';
import {SuperType} from '../../../message/SuperType';

export class E2EIVerificationMessage extends Message {
  public messageType: E2EIVerificationMessageType;
  public userIds?: QualifiedId[];

  constructor(messageType: E2EIVerificationMessageType, userIds?: QualifiedId[]) {
    super();

    this.super_type = SuperType.E2EI_VERIFICATION;
    this.messageType = messageType;
    this.userIds = userIds;
  }
}
