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

import {applyEncryptionMiddleware, NON_INDEXED_FIELDS} from 'dexie-encrypted';

import type {CRUDEngine} from '@wireapp/store-engine';
import {MemoryEngine} from '@wireapp/store-engine';
import {IndexedDBEngine} from '@wireapp/store-engine-dexie';

import {getLogger} from 'Util/Logger';

import {DexieDatabase} from '../storage/DexieDatabase';

const logger = getLogger('StoreEngineProvider');

export enum DatabaseTypes {
  /** a permament storage that will still live after logout */
  PERMANENT,
  /** a storage that will be lost when the app is reloaded */
  EFFEMERAL,
}

const providePermanentEngine = async (
  storeName: string,
  key?: Uint8Array,
  requestPersistentStorage?: boolean,
): Promise<CRUDEngine> => {
  const db = new DexieDatabase(storeName);

  const encryptionConfig = key ? {events: NON_INDEXED_FIELDS} : {};
  const encryptionKey = key ? key : new Uint8Array(32).fill(0);
  applyEncryptionMiddleware(db, encryptionKey, encryptionConfig, async () =>
    logger.info('DB encyption config has changed'),
  );
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
  {key, requestPersistentStorage}: {key?: Uint8Array; requestPersistentStorage?: boolean} = {},
): Promise<CRUDEngine> {
  switch (type) {
    case DatabaseTypes.PERMANENT:
      return providePermanentEngine(storeName, key, requestPersistentStorage);

    case DatabaseTypes.EFFEMERAL:
      return new MemoryEngine();
  }
}
