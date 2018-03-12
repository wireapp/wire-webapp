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

'use strict';

window.z = window.z || {};
window.z.storage = z.storage || {};

z.storage.StorageError = class StorageError extends Error {
  constructor(type) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || StorageError.TYPE.UNKNOWN;

    switch (this.type) {
      case StorageError.TYPE.DATA_STORE_NOT_FOUND:
        this.message = 'Data store not found';
        break;
      case StorageError.TYPE.FAILED_TO_OPEN:
        this.message = 'Failed to open database';
        break;
      case StorageError.TYPE.INVALID_TIMESTAMP:
        this.message = 'Invalid timestamp';
        break;
      case StorageError.TYPE.NO_CONVERSATION_ID:
        this.message = 'Missing conversation ID';
        break;
      case StorageError.TYPE.NO_DATA:
        this.message = 'Storage value is undefined or null';
        break;
      case StorageError.TYPE.NO_SENDER_ID:
        this.message = 'Missing sender ID';
        break;
      case StorageError.TYPE.NO_TIME:
        this.message = 'Missing time';
        break;
      case StorageError.TYPE.NON_SEQUENTIAL_UPDATE:
        this.message = 'Update is non sequential';
        break;
      case StorageError.TYPE.NOT_FOUND:
        this.message = 'Record matching primary key was not found';
        break;
      case StorageError.TYPE.INVALID_TIME:
        this.message = 'Event time needs to be ISO 8601';
        break;
      case StorageError.TYPE.SKIP_LOADING:
        this.message = 'Skipped loading of sessions and pre-keys';
        break;
      default:
        this.message = 'Unknown StorageError';
    }
  }

  static get TYPE() {
    return {
      DATA_STORE_NOT_FOUND: 'StorageError.TYPE.DATA_STORE_NOT_FOUND',
      FAILED_TO_OPEN: 'StorageError.TYPE.FAILED_TO_OPEN',
      INVALID_TIME: 'StorageError.TYPE.INVALID_TIME',
      INVALID_TIMESTAMP: 'StorageError.TYPE.INVALID_TIMESTAMP',
      NO_CONVERSATION_ID: 'StorageError.TYPE.NO_CONVERSATION_ID',
      NO_DATA: 'StorageError.TYPE.NO_DATA',
      NO_SENDER_ID: 'StorageError.TYPE.NO_SENDER_ID',
      NO_TIME: 'StorageError.TYPE.NO_TIME',
      NON_SEQUENTIAL_UPDATE: 'StorageError.TYPE.NON_SEQUENTIAL_UPDATE',
      NOT_FOUND: 'StorageError.TYPE.NOT_FOUND',
      SKIP_LOADING: 'StorageError:TYPE.SKIP_SESSIONS',
      UNKNOWN: 'StorageError.TYPE.UNKNOWN',
    };
  }
};
