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

export class LabeledError extends Error {
  public label: string;

  constructor(label: string, error: Error);
  constructor(label: string, message: string);
  constructor(label: string, messageOrError: string | Error) {
    super();
    this.label = label;

    if (typeof messageOrError === 'string') {
      this.name = this.constructor.name;
      this.message = messageOrError;
    } else {
      this.name = messageOrError.name;
      this.message = messageOrError.message;
      this.stack = messageOrError.stack;
    }
  }

  static GENERAL_ERRORS = {
    LOW_DISK_SPACE: 'low-disk-space',
    SYSTEM_KEYCHAIN_ACCESS: 'system-keychain-access',
  };
}
