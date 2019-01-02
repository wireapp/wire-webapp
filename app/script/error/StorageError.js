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

window.z = window.z || {};
window.z.error = z.error || {};

z.error.StorageError = class StorageError extends z.error.BaseError {
  constructor(type, message) {
    super('StorageError', type, message);
  }

  static get MESSAGE() {
    return {
      DATA_STORE_NOT_FOUND: 'Data store not found',
      FAILED_TO_OPEN: 'Failed to open database',
      INVALID_TIME: 'Event time needs to be ISO 8601',
      INVALID_TIMESTAMP: 'Invalid timestamp',
      NO_CONVERSATION_ID: 'Missing conversation ID',
      NO_DATA: 'Storage value is undefined or null',
      NO_SENDER_ID: 'Missing sender ID',
      NO_TIME: 'Missing time',
      NON_SEQUENTIAL_UPDATE: 'Update is non sequential',
      NOT_FOUND: 'Record matching primary key was not found',
    };
  }

  static get TYPE() {
    return {
      DATA_STORE_NOT_FOUND: 'DATA_STORE_NOT_FOUND',
      FAILED_TO_OPEN: 'FAILED_TO_OPEN',
      INVALID_TIME: 'INVALID_TIME',
      INVALID_TIMESTAMP: 'INVALID_TIMESTAMP',
      NO_CONVERSATION_ID: 'NO_CONVERSATION_ID',
      NO_DATA: 'NO_DATA',
      NO_SENDER_ID: 'NO_SENDER_ID',
      NO_TIME: 'NO_TIME',
      NON_SEQUENTIAL_UPDATE: 'NON_SEQUENTIAL_UPDATE',
      NOT_FOUND: 'NOT_FOUND',
    };
  }
};
