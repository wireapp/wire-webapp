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

import {AddUsersFailure} from '@wireapp/core/lib/conversation';

import {Message} from './Message';

import {SuperType} from '../../../message/SuperType';

export class FailedToAddUsersMessage extends Message {
  constructor(
    public readonly failures: AddUsersFailure[],
    time: number,
  ) {
    super();
    this.super_type = SuperType.FAILED_TO_ADD_USERS;
    this.timestamp(time);
  }
}
