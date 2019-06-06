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
import {Type} from './Type';

export class DecodeError extends BaseError {
  static readonly INT_OVERFLOW = 'Integer overflow';
  static readonly INVALID_TYPE = 'Invalid type';
  static readonly TOO_LONG = 'Field too long';
  static readonly TOO_NESTED = 'Object nested too deep';
  static readonly UNEXPECTED_EOF = 'Unexpected end-of-buffer';
  static readonly UNEXPECTED_TYPE = 'Unexpected type';

  constructor(public message: string, public extra?: Type[]) {
    super(message);

    Object.setPrototypeOf(this, DecodeError.prototype);
    this.extra = extra;
  }
}
