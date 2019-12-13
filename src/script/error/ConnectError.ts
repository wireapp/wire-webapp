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

export enum ConnectErrorType {
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NO_CONTACTS = 'NO_CONTACTS',
  UPLOAD = 'UPLOAD',
}

export class ConnectError extends Error {
  static readonly TYPE = ConnectErrorType;
  static readonly MESSAGE: Record<ConnectErrorType, string> = {
    NOT_SUPPORTED: 'Source not supported',
    NO_CONTACTS: 'No contacts found for matching',
    UPLOAD: 'Address book upload failed',
  };
  readonly type: ConnectErrorType;

  constructor(type: ConnectErrorType, message?: string) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type;
    this.message = message || ConnectError.MESSAGE[type];
  }
}
