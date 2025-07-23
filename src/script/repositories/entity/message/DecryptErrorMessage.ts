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

import {ProteusErrors} from '@wireapp/core/lib/messagingProtocols/proteus';

import {Message} from './Message';

import {SuperType} from '../../../message/SuperType';

export class DecryptErrorMessage extends Message {
  constructor(
    public readonly clientId: string,
    public readonly code: number,
  ) {
    super();
    this.super_type = SuperType.UNABLE_TO_DECRYPT;
  }

  get isRecoverable(): boolean {
    return !this.isIdentityChanged && this.code >= 200 && this.code < 300;
  }

  get isIdentityChanged(): boolean {
    return this.code === ProteusErrors.RemoteIdentityChanged;
  }
}
