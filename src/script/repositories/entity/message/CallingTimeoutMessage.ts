/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {REASON as AVS_REASON} from '@wireapp/avs';

import {Message} from './Message';

import {SuperType} from '../../../message/SuperType';

export class CallingTimeoutMessage extends Message {
  constructor(
    public reason: AVS_REASON.NOONE_JOINED | AVS_REASON.EVERYONE_LEFT,
    time: number,
  ) {
    super();
    this.super_type = SuperType.CALL_TIME_OUT;
    this.timestamp(time);
  }

  get isNoOneJoined(): boolean {
    return this.reason === AVS_REASON.NOONE_JOINED;
  }

  get isEveryOneLeft(): boolean {
    return this.reason === AVS_REASON.EVERYONE_LEFT;
  }
}
