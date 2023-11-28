/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import type {CRUDEngine} from '@wireapp/store-engine';
import {MemoryEngine} from '@wireapp/store-engine';
import {IndexedDBEngine} from '@wireapp/store-engine-dexie';

import {DexieDatabase} from '../storage/DexieDatabase';

export enum DatabaseTypes {
  /** a permament storage that will still live after logout */
  PERMANENT,
  /** a storage that will be lost when the app is reloaded */
  EFFEMERAL,
}

const providePermanentEngine = async (storeName: string, requestPersistentStorage: boolean): Promise<CRUDEngine> => {
  const db = new DexieDatabase(storeName);

  const engine = new IndexedDBEngine();
  try {
    await engine.initWithDb(db, requestPersistentStorage);
  } catch (error) {
    await engine.initWithDb(db, false);
  }
  return engine;
};

export async function createStorageEngine(
  storeName: string,
  type: DatabaseTypes,
  requestPersistentStorage: boolean = false,
): Promise<CRUDEngine> {
  switch (type) {
    case DatabaseTypes.PERMANENT:
      return providePermanentEngine(storeName, requestPersistentStorage);

    case DatabaseTypes.EFFEMERAL:
      return new MemoryEngine();
  }
}
