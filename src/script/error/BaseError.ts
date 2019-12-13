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

export enum BaseErrorType {
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  UNKNOWN = 'UNKNOWN',
}

export class BaseError extends Error {
  static readonly TYPE = BaseErrorType;
  static readonly MESSAGE: Record<BaseErrorType, string> = {
    INVALID_PARAMETER: 'Invalid parameter passed',
    MISSING_PARAMETER: 'Required parameter is not defined',
    UNKNOWN: 'Unknown',
  };
  readonly type: BaseErrorType;

  constructor() {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
  }

  protected getType<T = BaseErrorType>(type: keyof T, knownTypes: T): T[keyof T] | BaseErrorType.UNKNOWN {
    return knownTypes[type] || BaseErrorType.UNKNOWN;
  }

  protected getMessage<T>(name: string, knownMessages: T, type?: keyof T): string {
    return type.toString() || knownMessages[type]?.toString() || `${BaseError.MESSAGE.UNKNOWN} ${name}`;
  }
}
