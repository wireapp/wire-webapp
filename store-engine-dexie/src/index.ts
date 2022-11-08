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

import Dexie, {DexieError, IndexableType} from 'dexie';
import logdown = require('logdown');

import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';

type DexieObservable = {_dbSchema?: Object};

export class IndexedDBEngine implements CRUDEngine {
  private db: Dexie & DexieObservable = new Dexie('');
  private readonly logger: logdown.Logger;
  public storeName = '';

  constructor() {
    this.logger = logdown('@wireapp/store-engine-dexie', {
      logger: console,
      markdown: false,
    });
  }

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
    }
    return Promise.reject(new StoreEngineError.UnsupportedError('Could not find indexedDB in global scope'));
  }

  /** @see https://developers.google.com/web/updates/2017/08/estimating-available-storage-space */
  private async hasEnoughQuota(): Promise<void> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const {quota, usage} = await navigator.storage.estimate();

      if (typeof quota === 'number' && typeof usage === 'number') {
        const diskIsFull = usage >= quota;
        if (diskIsFull) {
          const errorMessage = `Out of disk space. Using "${usage}" out of "${quota}" bytes.`;
          throw new StoreEngineError.LowDiskSpaceError(errorMessage);
        }
      }
    }
  }

  public async isSupported(): Promise<void> {
    await this.canUseIndexedDB();
    await this.hasEnoughQuota();
  }

  public async init(storeName: string, registerPersisted: boolean = false): Promise<Dexie> {
    await this.isSupported();
    const dexie = this.assignDb(new Dexie(storeName));
    if (registerPersisted) {
      await this.registerPersistentStorage();
    }
    return dexie;
  }

  public async initWithDb(db: Dexie, registerPersisted: boolean = false): Promise<Dexie> {
    const dexie = this.assignDb(db);
    if (registerPersisted) {
      await this.registerPersistentStorage();
    }
    return dexie;
  }

  public async isStoragePersisted(): Promise<boolean> {
    if (navigator.storage?.persisted) {
      const isPersisted = await navigator.storage.persisted();
      return isPersisted;
    }
    return false;
  }

  // If you want to add listeners to the database and you don't care if it is a new database (`init()`)
  // or an existing (`initWithDb()`) one, then this method is the right place to do it.
  private assignDb(db: Dexie): Dexie {
    this.db = db;
    this.storeName = this.db.name;
    return this.db;
  }

  public purge(): Promise<void> {
    return this.db ? this.db.delete() : Dexie.delete(this.storeName);
  }

  private mapDatabaseError<PrimaryKey = string>(error: DexieError, tableName: string, primaryKey: PrimaryKey): Error {
    const isAlreadyExisting = error instanceof Dexie.ConstraintError;
    /** @see https://github.com/dfahlander/Dexie.js/issues/776 */
    const hasNotEnoughDiskSpace =
      error.name === Dexie.errnames.QuotaExceeded || error.inner?.name === Dexie.errnames.QuotaExceeded;

    if (isAlreadyExisting) {
      const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
      return new StoreEngineError.RecordAlreadyExistsError(message);
    } else if (hasNotEnoughDiskSpace) {
      const message = `Cannot save "${primaryKey}" in "${tableName}" because there is low disk space.`;
      return new StoreEngineError.LowDiskSpaceError(message);
    }
    return error;
  }

  public async create<EntityType = Object, PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
    entity: EntityType,
  ): Promise<PrimaryKey> {
    if (entity) {
      try {
        const newPrimaryKey = await this.db.table<EntityType, PrimaryKey>(tableName).add(entity, primaryKey);
        return newPrimaryKey;
      } catch (error) {
        throw this.mapDatabaseError(error as DexieError, tableName, primaryKey);
      }
    }
    const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
    throw new StoreEngineError.RecordTypeError(message);
  }

  public async delete<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): Promise<PrimaryKey> {
    await this.db.table<any, PrimaryKey>(tableName).delete(primaryKey);
    return primaryKey;
  }

  public async deleteAll(tableName: string): Promise<boolean> {
    await this.db.table(tableName).clear();
    return true;
  }

  public async clearTables(): Promise<void> {
    const tableNames = this.db.tables.map(table => table.name);
    await Promise.all(tableNames.map(tableName => this.deleteAll(tableName)));
  }

  public async read<EntityType = Object, PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
  ): Promise<EntityType> {
    const record = await this.db.table<EntityType>(tableName).get(primaryKey as IndexableType);
    if (record) {
      return record;
    }
    const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
    throw new StoreEngineError.RecordNotFoundError(message);
  }

  public readAll<EntityType>(tableName: string): Promise<EntityType[]> {
    return this.db.table(tableName).toArray();
  }

  public async readAllPrimaryKeys<PrimaryKey = string>(tableName: string): Promise<PrimaryKey[]> {
    const keys = await this.db.table<PrimaryKey>(tableName).toCollection().keys();
    return keys.map(key => key as any as PrimaryKey);
  }

  /**
   * Register a persistent storage in the browser.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
   * @see https://developers.google.com/web/updates/2016/06/persistent-storage
   */
  public async registerPersistentStorage(): Promise<boolean> {
    if (!navigator || !navigator.storage || !navigator.storage.persist) {
      return false;
    }

    const granted = await navigator.storage.persist();

    if (granted) {
      this.logger.info('Storage will not be cleared except by explicit user action');
      return true;
    }

    this.logger.info('Storage may be cleared by the UA under storage pressure.');
    return false;
  }

  public async update<PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: any,
  ): Promise<PrimaryKey> {
    const updatedRecords = await this.db.table(tableName).update(primaryKey, changes);
    if (updatedRecords === 0) {
      const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
      throw new StoreEngineError.RecordNotFoundError(message);
    }
    return primaryKey;
  }

  public updateOrCreate<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey> {
    return this.db.table<ChangesType, PrimaryKey>(tableName).put(changes, primaryKey);
  }
}
