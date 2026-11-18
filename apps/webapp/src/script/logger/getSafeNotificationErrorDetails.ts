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

import {isInRange, isInteger} from '@sindresorhus/is';

import {BackendError} from '../apiClient/http/backendError';
import {getSafeErrorDetails} from '../commons/util/StringUtil';

const minimumHttpStatusCode = 100;
const maximumHttpStatusCode = 599;

// Processing errors can include plaintext, ciphertext, or other event values in their messages.
// Only include messages known to be fixed text supplied by the application.
const safeNotificationErrorMessages: ReadonlySet<string> = new Set([
  'Services are not set.',
  'Button action message has no button action content',
  'Network Error',
]);

export function getSafeNotificationErrorDetails(error: unknown): {
  readonly errorName: string;
  readonly errorMessage?: string;
} {
  if (error instanceof BackendError) {
    const statusCode = error.code;
    const hasHttpStatusCode =
      isInteger(statusCode) && isInRange(statusCode, [minimumHttpStatusCode, maximumHttpStatusCode]);

    return {
      errorName: 'BackendError',
      errorMessage: hasHttpStatusCode ? `Backend request failed (HTTP ${statusCode})` : 'Backend request failed',
    };
  }
  const {errorName, errorMessage} = getSafeErrorDetails(error);

  return safeNotificationErrorMessages.has(errorMessage) ? {errorName, errorMessage} : {errorName};
}
