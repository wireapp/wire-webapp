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

import {isString} from '@sindresorhus/is';

export class LabeledError extends Error {
  public label: string;

  constructor(label: string, error: Error);
  constructor(label: string, message: string);
  constructor(label: string, messageOrError: string | Error) {
    const hasPlainMessage = isString(messageOrError);
    super(
      hasPlainMessage ? messageOrError : messageOrError.message,
      hasPlainMessage ? undefined : {cause: messageOrError},
    );
    this.label = label;

    if (hasPlainMessage) {
      this.name = this.constructor.name;
    } else {
      this.name = messageOrError.name;
      this.stack = messageOrError.stack;
    }
  }

  static GENERAL_ERRORS = {
    LOW_DISK_SPACE: 'low-disk-space',
    SYSTEM_KEYCHAIN_ACCESS: 'system-keychain-access',
    CORE_CRYPTO_DATABASE_OPEN: 'core-crypto-database-open',
  };
}
