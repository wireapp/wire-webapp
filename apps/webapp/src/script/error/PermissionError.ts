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

import {BaseError} from './BaseError';

enum PERMISSION_ERROR_TYPE {
  DENIED = 'DENIED',
  UNSUPPORTED = 'UNSUPPORTED',
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
}

export class PermissionError extends BaseError {
  constructor(type: PERMISSION_ERROR_TYPE, message: string) {
    super(type, message);
  }

  static get MESSAGE(): Record<PERMISSION_ERROR_TYPE, string> {
    return {
      DENIED: 'Permission was denied',
      UNSUPPORTED: 'Permissions API is not supported',
      UNSUPPORTED_TYPE: 'Permissions API does not support requested type',
    };
  }

  static get TYPE(): Record<PERMISSION_ERROR_TYPE, PERMISSION_ERROR_TYPE> {
    return {
      DENIED: PERMISSION_ERROR_TYPE.DENIED,
      UNSUPPORTED: PERMISSION_ERROR_TYPE.UNSUPPORTED,
      UNSUPPORTED_TYPE: PERMISSION_ERROR_TYPE.UNSUPPORTED_TYPE,
    };
  }
}
