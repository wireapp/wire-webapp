/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

/**
 * This error means we are trying to add users that are parts of 2 backends that are not federating with each other to a new conversation.
 */
export class NonFederatingBackendsError extends Error {
  constructor(public readonly backends: string[]) {
    super('2 backends are not connected');
    this.name = 'NonFederatingBackendError';
  }
}

export function isNonFederatingBackendsError(error: unknown): error is NonFederatingBackendsError {
  return !!error && typeof error === 'object' && 'name' in error && error.name === 'NonFederatingBackendError';
}
