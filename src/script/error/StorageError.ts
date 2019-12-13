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

export enum StorageErrorType {
  FAILED_TO_OPEN = 'FAILED_TO_OPEN',
  INVALID_TIME = 'INVALID_TIME',
  INVALID_TIMESTAMP = 'INVALID_TIMESTAMP',
  NON_SEQUENTIAL_UPDATE = 'NON_SEQUENTIAL_UPDATE',
  NOT_FOUND = 'NOT_FOUND',
  NO_CONVERSATION_ID = 'NO_CONVERSATION_ID',
  NO_DATA = 'NO_DATA',
  NO_SENDER_ID = 'NO_SENDER_ID',
  NO_TIME = 'NO_TIME',
}

export class StorageError extends Error {
  static readonly TYPE = StorageErrorType;
  static readonly MESSAGE: Record<StorageErrorType, string> = {
    FAILED_TO_OPEN: 'Failed to open database',
    INVALID_TIME: 'Event time needs to be ISO 8601',
    INVALID_TIMESTAMP: 'Invalid timestamp',
    NON_SEQUENTIAL_UPDATE: 'Update is non sequential',
    NOT_FOUND: 'Record matching primary key was not found',
    NO_CONVERSATION_ID: 'Missing conversation ID',
    NO_DATA: 'Storage value is undefined or null',
    NO_SENDER_ID: 'Missing sender ID',
    NO_TIME: 'Missing time',
  };
  readonly type: StorageErrorType;

  constructor(type: StorageErrorType, message?: string) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type;
    this.message = message || StorageError.MESSAGE[type];
  }
}
