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

export class BaseError extends Error {
  constructor(name, type, message) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;

    const ErrorInstanceClass = z.error[name];
    const knownTypes = {...BaseError.TYPE, ...ErrorInstanceClass.TYPE};
    const isValidType = Object.values(knownTypes).includes(type);

    this.type = isValidType ? type : BaseError.TYPE.UNKNOWN;

    this.message = message || ErrorInstanceClass.MESSAGE[this.type] || BaseError.MESSAGE[this.type];
    if (!this.message) {
      this.message = `${BaseError.MESSAGE.UNKNOWN} ${name}`;
    }
  }

  static get MESSAGE() {
    return {
      INVALID_PARAMETER: 'Invalid parameter passed',
      MISSING_PARAMETER: 'Required parameter is not defined',
      UNKNOWN: 'Unknown',
    };
  }

  static get TYPE() {
    return {
      INVALID_PARAMETER: 'INVALID_PARAMETER',
      MISSING_PARAMETER: 'MISSING_PARAMETER',
      UNKNOWN: 'UNKNOWN',
    };
  }
}
