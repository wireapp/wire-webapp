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

import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';
import Dexie from 'dexie';

type DexieObservable = {_dbSchema?: Object};

export class IndexedDBEngine implements CRUDEngine {
  private db: Dexie & DexieObservable = new Dexie('');
  public storeName = '';

  // Check if IndexedDB is accessible (which won't be the case when browsing with Firefox in private mode or being on
  // page "about:blank")
  private canUseIndexedDB(): Promise<void> {
    const platform = typeof global === 'undefined' ? window : global;
    if ('indexedDB' in platform) {
      return new Promise((resolve, reject) => {
        const name = 'test';
        const DBOpenRequest = platform.indexedDB.open(name);
        DBOpenRequest.onerror = error => reject(error);
        DBOpenRequest.onsuccess = () => {
          const db = DBOpenRequest.result;
          db.close();
          const deleteRequest = platform.indexedDB.deleteDatabase(name);
          deleteRequest.onerror = error => reject(error);
          deleteRequest.onsuccess = () => resolve();
        };
      });
    } else {
      return Promise.reject(new StoreEngineError.UnsupportedError('Could not find indexedDB in global scope'));
    }
  }

  /** @see https://developers.google.com/web/updates/2017/08/estimating-available-storage-space */
  private async hasEnoughQuota(): Promise<void> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const {quota, usage} = await navigator.storage.estimate();

      if (typeof quota === 'number' && typeof usage === 'number') {
        const diskIsFull = usage >= quota;
        if (diskIsFull) {
          const errorMessage = `Out of disk space. Using "${usage}" out of "${quota}" bytes.`;
          return Promise.reject(new StoreEngineError.LowDiskSpaceError(errorMessage));
        }
      }
    }

    return Promise.resolve();
  }

  public async isSupported(): Promise<void> {
    await this.canUseIndexedDB();
    await this.hasEnoughQuota();
  }

  public async init(storeName: string): Promise<Dexie> {
    await this.isSupported();
    return this.assignDb(new Dexie(storeName));
  }

  public initWithDb(db: Dexie): Promise<Dexie> {
    return Promise.resolve(this.assignDb(db));
  }

  // If you want to add listeners to the database and you don't care if it is a new database (init)
  // or an existing (initWithDB) one, then this method is the right place to do it.
  private assignDb(db: Dexie): Dexie {
    this.db = db;
    this.storeName = this.db.name;
    return this.db;
  }

  public purge(): Promise<void> {
    return this.db ? this.db.delete() : Dexie.delete(this.storeName);
  }

  private mapDatabaseError<PrimaryKey = string>(
    error: Dexie.DexieError,
    tableName: string,
    primaryKey: PrimaryKey,
  ): Error {
    const isAlreadyExisting = error instanceof Dexie.ConstraintError;
    /** @see https://github.com/dfahlander/Dexie.js/issues/776 */
    const hasNotEnoughDiskSpace =
      error.name === Dexie.errnames.QuotaExceeded || (error.inner && error.inner.name === Dexie.errnames.QuotaExceeded);

    if (isAlreadyExisting) {
      const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
      return new StoreEngineError.RecordAlreadyExistsError(message);
    } else if (hasNotEnoughDiskSpace) {
      const message = `Cannot save "${primaryKey}" in "${tableName}" because there is low disk space.`;
      return new StoreEngineError.LowDiskSpaceError(message);
    } else {
      return error;
    }
  }

  public create<EntityType = Object, PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
    entity: EntityType,
  ): Promise<PrimaryKey> {
    if (entity) {
      return this.db
        .table(tableName)
        .add(entity, primaryKey)
        .catch((error: Dexie.DexieError) => {
          throw this.mapDatabaseError(error, tableName, primaryKey);
        });
    }
    const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
    return Promise.reject(new StoreEngineError.RecordTypeError(message));
  }

  public delete<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): Promise<PrimaryKey> {
    return this.db
      .table(tableName)
      .delete(primaryKey)
      .then(() => primaryKey);
  }

  public deleteAll(tableName: string): Promise<boolean> {
    return this.db
      .table(tableName)
      .clear()
      .then(() => true);
  }

  public read<EntityType = Object, PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
  ): Promise<EntityType> {
    return this.db
      .table<EntityType>(tableName)
      .get(primaryKey)
      .then(record => {
        if (record) {
          return record;
        }
        const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
        throw new StoreEngineError.RecordNotFoundError(message);
      });
  }

  public readAll<EntityType>(tableName: string): Promise<EntityType[]> {
    return this.db.table(tableName).toArray();
  }

  public async readAllPrimaryKeys<PrimaryKey = string>(tableName: string): Promise<PrimaryKey[]> {
    const keys = await this.db
      .table<PrimaryKey>(tableName)
      .toCollection()
      .keys();
    return keys.map(key => (key as any) as PrimaryKey);
  }

  public update<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey, changes: Object): Promise<PrimaryKey> {
    return this.db
      .table(tableName)
      .update(primaryKey, changes)
      .then((updatedRecords: number) => {
        if (updatedRecords === 0) {
          const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
          throw new StoreEngineError.RecordNotFoundError(message);
        }
        return primaryKey;
      });
  }

  public updateOrCreate<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey> {
    return this.db.table<ChangesType, PrimaryKey>(tableName).put(changes, primaryKey);
  }

  public append<PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
    additions: string,
  ): Promise<PrimaryKey> {
    return this.db
      .table(tableName)
      .get(primaryKey)
      .then(record => {
        if (typeof record === 'string') {
          record += additions;
        } else {
          const message = `Cannot append text to record "${primaryKey}" because it's not a string.`;
          throw new StoreEngineError.RecordTypeError(message);
        }
        return this.updateOrCreate(tableName, primaryKey, record);
      });
  }
}
