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

export function toError(errorCandidate: unknown): Error {
  if (is.error(errorCandidate)) {
    return errorCandidate;
  }

  if (is.object(errorCandidate)) {
    if ('message' in errorCandidate && is.string(errorCandidate.message)) {
      return new Error(errorCandidate.message, {cause: errorCandidate});
    }

    return new Error('Unknown error', {cause: errorCandidate});
  }

  if (is.string(errorCandidate)) {
    return new Error(errorCandidate);
  }

  return new Error('Unknown error', {cause: errorCandidate});
}
