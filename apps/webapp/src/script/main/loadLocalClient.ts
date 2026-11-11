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

import {isNullOrUndefined} from '@sindresorhus/is';

import type {MetaClient} from '../core/client/clientService';
import {CLIENT_ERROR_TYPE, ClientError} from '../error/clientError';
import type {Logger} from '../util/logger';

/**
 * Loads the local client during app initialization.
 *
 * `NO_VALID_CLIENT` makes the app wipe all local data, so it is only used when the client is missing locally or was
 * removed on the backend. If the client could not be loaded at all (e.g. the database cannot be read because the disk
 * is full), `DATABASE_FAILURE` is used instead, which keeps local data.
 */
export async function loadLocalClient(
  getLocalClient: () => Promise<MetaClient | undefined> | undefined,
  logger: Logger,
): Promise<MetaClient> {
  let localClient: MetaClient | undefined;

  try {
    localClient = await getLocalClient();
  } catch (error: unknown) {
    logger.error('Failed to load the local client', error);
    throw new ClientError(CLIENT_ERROR_TYPE.DATABASE_FAILURE, 'Failed to load the local client');
  }

  if (isNullOrUndefined(localClient)) {
    throw new ClientError(CLIENT_ERROR_TYPE.NO_VALID_CLIENT, 'Client has been deleted on backend');
  }

  return localClient;
}
