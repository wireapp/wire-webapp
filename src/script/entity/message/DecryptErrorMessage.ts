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

import ko from 'knockout';

import {Message} from './Message';

import {SuperType} from '../../message/SuperType';

const UNKNOWN_ERROR_CODE = 999;
export class DecryptErrorMessage extends Message {
  public client_id: string;
  public error_code: number;
  public domain?: string;
  public readonly is_recoverable: ko.PureComputed<boolean>;
  public readonly is_resetting_session: ko.Observable<boolean>;

  constructor() {
    super();
    this.super_type = SuperType.UNABLE_TO_DECRYPT;

    this.error_code = 0;
    this.client_id = '';

    this.is_recoverable = ko.pureComputed(() => {
      // We consider a decryption error recoverable if the error code starts with 2 or if the error code is unknown
      // in the case of the unknown error the session might actually not be recoverable but since we now use coreCrypto to decrypt, all errors are now unknown
      return this.error_code.toString().startsWith('2') || this.error_code === UNKNOWN_ERROR_CODE;
    });
    this.is_resetting_session = ko.observable(false);
  }
}
