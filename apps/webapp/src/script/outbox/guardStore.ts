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

import type {OutboxStore, StorageFailed} from './types';

export function getErrorName(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}

async function failsafe<Outcome>(call: () => Promise<Outcome>): Promise<Outcome | StorageFailed> {
  try {
    return await call();
  } catch (error) {
    return {type: 'storage-failed', errorName: getErrorName(error)};
  }
}

/** The store answers with outcomes and never rejects; a store that rejects anyway is `storage-failed` */
export function guardStore(store: OutboxStore): OutboxStore {
  return {
    loadLatest: async () => {
      return failsafe(async () => {
        return store.loadLatest();
      });
    },
    append: async snapshot => {
      return failsafe(async () => {
        return store.append(snapshot);
      });
    },
    remove: async operationIds => {
      return failsafe(async () => {
        return store.remove(operationIds);
      });
    },
  };
}
