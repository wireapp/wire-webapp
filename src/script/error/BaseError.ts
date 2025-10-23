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

export enum BASE_ERROR_TYPE {
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  UNKNOWN = 'UNKNOWN',
}

export class BaseError extends Error {
  type: BASE_ERROR_TYPE | string;

  constructor(type: BASE_ERROR_TYPE | string, message: string) {
    super(message);

    this.type = type;
    this.name = this.constructor.name;
  }

  static get MESSAGE(): Record<string, string> {
    return {
      INVALID_PARAMETER: 'Invalid parameter passed',
      MISSING_PARAMETER: 'Required parameter is not defined',
      MISSING_QUALIFIED_ID: 'Required qualified ID is not defined',
      UNKNOWN: 'Unknown',
    };
  }

  static get TYPE(): Record<string, string> {
    return {
      INVALID_PARAMETER: BASE_ERROR_TYPE.INVALID_PARAMETER,
      MISSING_PARAMETER: BASE_ERROR_TYPE.MISSING_PARAMETER,
      UNKNOWN: BASE_ERROR_TYPE.UNKNOWN,
    };
  }
}
