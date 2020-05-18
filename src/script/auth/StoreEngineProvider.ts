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
import {IndexedDBEngine} from '@wireapp/store-engine-dexie';
import {SQLeetEngine} from '@wireapp/store-engine-sqleet';
import Dexie from 'dexie';

import {saveRandomEncryptionKey} from 'Util/ephemeralValueStore';

import {StorageSchemata} from '../storage';
import {SQLeetSchemata} from '../storage/SQLeetSchemata';

export const providePermanentEngine = async (storeName: string): Promise<CRUDEngine> => {
  const db = new Dexie(storeName);
  const databaseSchemata = StorageSchemata.SCHEMATA;
  databaseSchemata.forEach(({schema, upgrade, version}) => {
    if (upgrade) {
      return db
        .version(version)
        .stores(schema)
        .upgrade((transaction: Dexie.Transaction) => upgrade(transaction, db));
    }
    return db.version(version).stores(schema);
  });
  const engine = new IndexedDBEngine();
  await engine.initWithDb(db);
  return engine;
};

export const provideTemporaryAndNonPersistentEngine = async (storeName: string): Promise<CRUDEngine> => {
  await Dexie.delete('/sqleet');
  const encryptionKey = await saveRandomEncryptionKey();
  const engine = new SQLeetEngine('/worker/sqleet-worker.js', SQLeetSchemata.getLatest(), encryptionKey);
  await engine.init(storeName);
  return engine;
};
