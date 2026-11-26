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

import type {Table} from 'dexie';

import {createDexieOutboxStore} from './createDexieOutboxStore';

import {createOutbox, type OperationSnapshot, type Outbox} from '../../outbox';
import {getLogger} from '../../util/logger';

/** Structural, so that this module doesn't pull the storage service and its imports into a cycle */
type ApplicationOutboxDependencies = {
  storageService: {db?: {outbox: Table<OperationSnapshot, number>}};
  serverTimeHandler: {toServerTimestamp: () => number};
};

/** The outbox over the app's database and server time. Starting it needs the database to be open. */
export function createApplicationOutbox({storageService, serverTimeHandler}: ApplicationOutboxDependencies): Outbox {
  const store = createDexieOutboxStore(() => {
    if (storageService.db === undefined) {
      throw new Error('The database is not open');
    }
    return storageService.db.outbox;
  });

  return createOutbox({
    store,
    getServerTime: () => {
      return serverTimeHandler.toServerTimestamp();
    },
    logger: getLogger('Outbox'),
  });
}
