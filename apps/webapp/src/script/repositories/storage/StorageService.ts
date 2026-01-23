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

import Dexie, {Transaction} from 'dexie';
import {singleton} from 'tsyringe';

import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';
import {IndexedDBEngine} from '@wireapp/store-engine-dexie';

import {Logger, getLogger} from 'Util/Logger';
import {loadValue, storeValue} from 'Util/StorageUtil';

import {DexieDatabase} from './DexieDatabase';
import {StorageSchemata} from './StorageSchemata';

import {StorageError} from '../../error/StorageError';

interface DatabaseListener {
  callback: DatabaseListenerCallback;
  store: string;
  type: DEXIE_CRUD_EVENT;
}

export type DatabaseListenerCallback = (changes: {obj: any; oldObj: any}) => void;

enum DEXIE_CRUD_EVENT {
  DELETING = 'deleting',
  UPDATING = 'updating',
}

@singleton()
export class StorageService {
  public db?: DexieDatabase;
  private readonly dbListeners: DatabaseListener[] = [];
  private hasHookSupport: boolean;
  private engine: CRUDEngine;
  private readonly logger: Logger;
  public dbName?: string;

  constructor() {
    this.logger = getLogger('StorageService');
  }

  //##############################################################################
  // Initialization
  //##############################################################################

  /**
   * Initialize the IndexedDB for a user.
   *
   * @param userId User ID
   * @param requestPersistentStorage if a persistent storage should be requested
   * @returns Resolves with the database name
   */
  init(engine: CRUDEngine): string {
    this.engine = engine;
    this.dbName = this.engine.storeName;
    this.hasHookSupport = this.engine instanceof IndexedDBEngine;

    try {
      if (this.hasHookSupport) {
        this.db = this.engine['db'];
        this._initCrudHooks(this.db);
      }
      return this.dbName;
    } catch (error) {
      const logMessage = `Failed to initialize database '${this.dbName}': ${error.message || error}`;
      this.logger.error(logMessage, {error});
      throw new StorageError(StorageError.TYPE.FAILED_TO_OPEN, StorageError.MESSAGE.FAILED_TO_OPEN);
    }
  }

  private _initCrudHooks(db: DexieDatabase): void {
    const callListener = (
      table: string,
      eventType: string,
      obj: Object,
      updatedObj: Object,
      transaction: Transaction,
    ) => {
      transaction.on('complete', () => {
        this.dbListeners
          .filter(listener => listener.store === table && listener.type === eventType)
          .forEach(({callback}) => callback({obj: updatedObj, oldObj: obj}));
      });
    };

    const listenableTables = [StorageSchemata.OBJECT_STORE.EVENTS];

    listenableTables.forEach(table => {
      db.table(table).hook(
        DEXIE_CRUD_EVENT.UPDATING,
        function (modifications: Object, primaryKey: string, obj: Object, transaction: Transaction): void {
          this.onsuccess = updatedObj => callListener(table, DEXIE_CRUD_EVENT.UPDATING, obj, updatedObj, transaction);
        },
      );

      db.table(table).hook(
        DEXIE_CRUD_EVENT.DELETING,
        function (primaryKey: string, obj: Object, transaction: Transaction): void {
          this.onsuccess = (): void => callListener(table, DEXIE_CRUD_EVENT.DELETING, obj, undefined, transaction);
        },
      );
    });
  }

  addUpdatedListener(storeName: string, callback: DatabaseListenerCallback): void {
    this.dbListeners.push({callback, store: storeName, type: DEXIE_CRUD_EVENT.UPDATING});
  }

  addDeletedListener(storeName: string, callback: DatabaseListenerCallback): void {
    this.dbListeners.push({callback, store: storeName, type: DEXIE_CRUD_EVENT.DELETING});
  }

  //##############################################################################
  // Interactions
  //##############################################################################

  /**
   * Clear all stores.
   *
   * @returns Resolves when all stores have been cleared
   */
  async clearStores(): Promise<void[]> {
    const deleteStorePromises = Object.keys(this.db?._dbSchema ?? [])
      // avoid clearing tables needed by third parties (dexie-observable for eg)
      .filter(table => !table.startsWith('_'))
      .map(storeName => this.deleteStore(storeName));
    return Promise.all(deleteStorePromises);
  }

  /**
   * Removes persisted data.
   *
   * @param storeName Name of the object store
   * @param primaryKey Primary key
   * @returns Resolves when the object is deleted
   */
  async delete(storeName: string, primaryKey: string): Promise<string> {
    if (this.hasHookSupport) {
      return this.engine.delete(storeName, primaryKey);
    }

    const oldRecord = await this.engine.read<unknown>(storeName, primaryKey);
    const deletedKey = await this.engine.delete(storeName, primaryKey);

    this.notifyListeners(storeName, DEXIE_CRUD_EVENT.DELETING, oldRecord, undefined);

    return deletedKey;
  }

  async deleteDatabase(): Promise<boolean> {
    try {
      await this.engine.purge();
      this.logger.info(`Deleting database '${this.dbName}' successful`);
      this.dbName = undefined;
      return true;
    } catch (error) {
      this.logger.error(`Deleting database '${this.dbName}' failed`);
      throw error;
    }
  }

  async deleteStore(storeName: string): Promise<void> {
    this.logger.info(`Deleting object store '${storeName}' in database '${this.dbName}'`);
    await this.engine.deleteAll(storeName);
  }

  /**
   * Delete multiple database stores.
   *
   * @param storeNames Names of database stores to delete
   * @returns Resolves when the stores have been deleted
   */
  async deleteStores(storeNames: string[]): Promise<void> {
    const deleteStorePromises = storeNames.map(storeName => this.deleteStore(storeName));
    await Promise.all(deleteStorePromises);
  }

  async deleteEventInConversation(storeName: string, conversationId: string, eventId: string): Promise<number> {
    if (!this.db) {
      return 0;
    }

    return this.db
      .table(storeName)
      .where('id')
      .equals(eventId)
      .and(record => record.conversation === conversationId)
      .delete();
  }

  async deleteEventsByDate(storeName: string, conversationId: string, isoDate?: string): Promise<number> {
    if (!this.db) {
      return 0;
    }

    return this.db
      .table(storeName)
      .where('conversation')
      .equals(conversationId)
      .filter(record => !isoDate || isoDate >= record.time)
      .delete();
  }

  /**
   * Returns an array of all records for a given object store.
   *
   * @param storeName Name of object store
   * @returns Resolves with the records from the object store
   */
  async getAll<T = Object>(storeName: string): Promise<T[]> {
    try {
      const records = await this.engine.readAll<T>(storeName);
      return records.filter(Boolean);
    } catch (error) {
      this.logger.error(`Failed to load objects from store '${storeName}'`, error);
      throw error;
    }
  }

  /**
   * @param tableNames Names of tables to get
   * @returns Resolves with matching tables
   */
  getTables(tableNames: string[]): Dexie.Table<any, any>[] {
    if (!this.db) {
      return [];
    }
    return tableNames.map(tableName => this.db.table(tableName));
  }

  /**
   * Loads persisted data via a promise.
   * @note If a key cannot be found, it resolves and returns "undefined".
   *
   * @param storeName Name of object store
   * @param primaryKey Primary key of object to be retrieved
   * @returns Resolves with the record matching the primary key
   */
  async load<T = Object>(storeName: string, primaryKey: string): Promise<T | undefined> {
    try {
      return await this.engine.read<T>(storeName, primaryKey);
    } catch (error) {
      if (error instanceof StoreEngineError.RecordNotFoundError) {
        return undefined;
      }
      this.logger.error(`Failed to load '${primaryKey}' from store '${storeName}'`, error);
      throw error;
    }
  }

  async loadFromSimpleStorage<T = Object>(primaryKey: string): Promise<T | undefined> {
    return loadValue(primaryKey);
  }

  async readAllPrimaryKeys(storeName: string): Promise<string[]> {
    return this.engine.readAllPrimaryKeys(storeName);
  }

  /**
   * Saves objects in the local database.
   *
   * @param storeName Name of object store where to save the object
   * @param primaryKey Primary key which should be used to store the object
   * @param entity Data to store in object store
   * @returns Resolves with the primary key of the persisted object
   */
  async save<T = Object>(storeName: string, primaryKey: string, entity: T): Promise<string> {
    if (!entity) {
      throw new StorageError(StorageError.TYPE.NO_DATA, StorageError.MESSAGE.NO_DATA);
    }

    try {
      const newKey = await this.engine.updateOrCreate(storeName, primaryKey, entity);
      return newKey;
    } catch (error) {
      this.logger.error(`Failed to update or create '${primaryKey}' in store '${storeName}'`, error);
      throw error;
    }
  }

  async saveToSimpleStorage<T = Object>(primaryKey: string, entity: T): Promise<void> {
    storeValue(primaryKey, entity);
  }

  /**
   * Closes the database. This operation completes immediately and there is no returned Promise.
   * @see https://github.com/dfahlander/Dexie.js/wiki/Dexie.close()
   * @param reason Cause for the termination
   */
  terminate(reason: string = 'unknown reason'): void {
    this.logger.info(`Closing database connection with '${this.dbName}' because of '${reason}'.`);
    if (this.db) {
      this.db.close();
    }
  }

  private notifyListeners<T, U>(storeName: string, eventType: DEXIE_CRUD_EVENT, oldRecord: T, newRecord: U): void {
    this.dbListeners
      .filter(dbListener => dbListener.store === storeName && dbListener.type === eventType)
      .forEach(dbListener => dbListener.callback({obj: newRecord, oldObj: oldRecord}));
  }

  /**
   * Update previously persisted data via a promise.
   *
   * @param storeName Name of object store
   * @param primaryKey Primary key of object to be updated
   * @param changes Object containing the key paths to each property you want to change
   * @returns Promise with the number of updated records (0 if no records were changed).
   */
  async update<T extends Record<string, any>>(storeName: string, primaryKey: string, changes: T): Promise<number> {
    try {
      if (this.hasHookSupport) {
        const numberOfUpdates = await this.db.table(storeName).update(primaryKey, changes);
        const logMessage = `Updated ${numberOfUpdates} record(s) with key '${primaryKey}' in store '${storeName}'`;
        if (changes?.data?.content && typeof changes.data === 'object' && typeof changes.data.content === 'string') {
          this.logger.log(logMessage, {...changes, data: {...changes.data, content: ''}});
        } else {
          this.logger.log(logMessage, changes);
        }
        return numberOfUpdates;
      }
      const oldRecord = await this.load<unknown>(storeName, primaryKey);
      await this.engine.update(storeName, primaryKey, changes);
      const newRecord = await this.load<unknown>(storeName, primaryKey);

      this.notifyListeners(storeName, DEXIE_CRUD_EVENT.UPDATING, oldRecord, newRecord);

      return 1;
    } catch (error) {
      this.logger.error(`Failed to update '${primaryKey}' in store '${storeName}'`, error);
      throw error;
    }
  }
}
