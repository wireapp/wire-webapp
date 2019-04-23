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

import {ProteusError} from './ProteusError';

class DecodeError extends ProteusError {
  static CODE = {
    CASE_300: 300,
    CASE_301: 301,
    CASE_302: 302,
    CASE_303: 303,
  };

  constructor(message = 'Unknown decoding error', code = 3) {
    super(message, code);
    Object.setPrototypeOf(this, DecodeError.prototype);
  }
}

namespace DecodeError {
  export class InvalidType extends DecodeError {
    constructor(message = 'Invalid type', code: number) {
      super(message, code);
      Object.setPrototypeOf(this, InvalidType.prototype);
    }
  }

  export class InvalidArrayLen extends DecodeError {
    constructor(message = 'Invalid array length', code: number) {
      super(message, code);
      Object.setPrototypeOf(this, InvalidArrayLen.prototype);
    }
  }

  export class LocalIdentityChanged extends DecodeError {
    constructor(message = 'Local identity changed', code: number) {
      super(message, code);
      Object.setPrototypeOf(this, LocalIdentityChanged.prototype);
    }
  }
}

export {DecodeError};
