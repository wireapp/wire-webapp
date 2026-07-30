/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import is from '@sindresorhus/is';
import {Result} from 'true-myth';

export type CommandResult<valueType> = Result<valueType, Error>;

export function commandSuccess<valueType>(value: valueType): CommandResult<valueType> {
  return Result.ok<valueType, Error>(value);
}

export function commandFailure<valueType>(message: string): CommandResult<valueType> {
  return Result.err<valueType, Error>(new Error(message));
}

export function commandFailureWithCause<valueType>(message: string, cause: unknown): CommandResult<valueType> {
  return Result.err<valueType, Error>(new Error(message, {cause}));
}

export function errorMessage(error: unknown): string {
  if (is.error(error)) {
    return error.message;
  }

  return 'Unknown failure';
}

export function redactSecret(message: string, secret: string): string {
  if (secret.length === 0) {
    return message;
  }

  return message.replaceAll(secret, '[REDACTED]');
}
