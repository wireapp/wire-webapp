/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {SuperType} from '../../message/SuperType';
import {Message} from './Message';

export class FileTypeRestrictedMessage extends Message {
  constructor(
    public readonly isIncoming: boolean,
    public readonly name: string,
    public readonly fileExt: string,
    timestamp: number,
  ) {
    super();
    this.super_type = SuperType.FILE_TYPE_RESTRICTED;
    this.timestamp(timestamp);
  }
}
