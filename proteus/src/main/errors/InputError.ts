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

class InputError extends ProteusError {
  static CODE = {
    CASE_400: 400,
    CASE_401: 401,
    CASE_402: 402,
    CASE_403: 403,
    CASE_404: 404,
    CASE_405: 405,
    CASE_406: 406,
    CASE_407: 407,
    CASE_408: 408,
    CASE_409: 409,
  };

  constructor(message = 'Invalid input', code = 4) {
    super(message, code);
    Object.setPrototypeOf(this, InputError.prototype);
  }
}

namespace InputError {
  export class RangeError extends InputError {
    constructor(message = 'Invalid array length', code: number) {
      super(message, code);
      Object.setPrototypeOf(this, RangeError.prototype);
    }
  }

  export class TypeError extends InputError {
    constructor(message = 'Invalid type', code: number) {
      super(message, code);
      Object.setPrototypeOf(this, TypeError.prototype);
    }
  }

  export class ConversionError extends InputError {
    constructor(message = 'Conversion error', code: number) {
      super(message, code);
      Object.setPrototypeOf(this, ConversionError.prototype);
    }
  }
}

export {InputError};
