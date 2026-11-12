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

import axios from 'axios';
import {Dexie} from 'dexie';
import {result, type Maybe, type Task} from 'true-myth';

import {BackendError} from '../apiClient/http/backendError';
import type {MetaClient} from '../core/client/clientService';
import {LowDiskSpaceError} from '../core/storage/engine/error/lowDiskSpaceError';
import {BASE_ERROR_TYPE} from '../error/baseError';
import {CLIENT_ERROR_TYPE, ClientError} from '../error/clientError';
import type {Logger} from '../util/logger';

function isClientRequestFailure(error: Error): boolean {
  return error instanceof BackendError || axios.isAxiosError(error);
}

function isClientStorageFailure(error: Error): boolean {
  return error instanceof Dexie.DexieError || error instanceof DOMException || error instanceof LowDiskSpaceError;
}

/**
 * Loads the local client during app initialization.
 *
 * `NO_VALID_CLIENT` makes the app wipe all local data, so it is only used when the client is missing locally or was
 * removed on the backend. If the client could not be loaded at all (e.g. the database cannot be read because the disk
 * is full), the failure keeps its cause and cannot be reported as a missing client.
 */
export function loadLocalClient(
  getLocalClient: () => Task<Maybe<MetaClient>, Error>,
  logger: Logger,
): Task<MetaClient, ClientError> {
  return getLocalClient()
    .mapRejected(error => {
      logger.error('Failed to load the local client', error);
      let errorType: CLIENT_ERROR_TYPE | BASE_ERROR_TYPE = BASE_ERROR_TYPE.UNKNOWN;
      if (isClientRequestFailure(error)) {
        errorType = CLIENT_ERROR_TYPE.REQUEST_FAILURE;
      } else if (isClientStorageFailure(error)) {
        errorType = CLIENT_ERROR_TYPE.DATABASE_FAILURE;
      }
      const clientError = new ClientError(errorType, 'Failed to load the local client');
      clientError.cause = error;

      return clientError;
    })
    .andThen(localClient => {
      if (localClient.isNothing) {
        return result.err(new ClientError(CLIENT_ERROR_TYPE.NO_VALID_CLIENT, 'Client has been deleted on backend'));
      }

      return result.ok(localClient.value);
    });
}
