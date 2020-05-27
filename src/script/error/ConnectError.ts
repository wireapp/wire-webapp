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

import {BaseError, BASE_ERROR_TYPE} from './BaseError';

enum CONNECT_ERROR_TYPE {
  NO_CONTACTS = 'NO_CONTACTS',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  UPLOAD = 'UPLOAD',
}

export class ConnectError extends BaseError {
  constructor(type: CONNECT_ERROR_TYPE | BASE_ERROR_TYPE, message: string) {
    super(type, message);
  }

  static get MESSAGE(): Record<CONNECT_ERROR_TYPE, string> {
    return {
      NOT_SUPPORTED: 'Source not supported',
      NO_CONTACTS: 'No contacts found for matching',
      UPLOAD: 'Address book upload failed',
    };
  }

  static get TYPE(): Record<CONNECT_ERROR_TYPE, CONNECT_ERROR_TYPE> {
    return {
      NOT_SUPPORTED: CONNECT_ERROR_TYPE.NOT_SUPPORTED,
      NO_CONTACTS: CONNECT_ERROR_TYPE.NO_CONTACTS,
      UPLOAD: CONNECT_ERROR_TYPE.UPLOAD,
    };
  }
}
