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

import {CRUDEngine} from '@wireapp/store-engine';
import {IndexedDBEngine} from '@wireapp/store-engine-dexie';
import Dexie from 'dexie';

import {Logger, getLogger} from 'Util/Logger';
import {loadValue} from 'Util/StorageUtil';

import {Config} from '../auth/config';
import {ClientType} from '../client/ClientType';
import {StorageKey} from './StorageKey';
import {StorageSchemata} from './StorageSchemata';

interface DatabaseListener {
  callback: DatabaseListenerCallback;
  store: string;
  type: string;
}

type DatabaseListenerCallback = (changes: {obj: Object; oldObj: Object}) => void;

// @see https://dexie.org/docs/Observable/Dexie.Observable
type DexieObservable = {_dbSchema?: Object};

export class StorageService {
  private readonly logger: Logger;
  private readonly engine: CRUDEngine;
  public dbName?: string;
  private userId?: string;
  private readonly dbListeners: DatabaseListener[];
  private db: Dexie & DexieObservable;

  static get DEXIE_CRUD_EVENTS(): Record<string, string> {
    return {
      DELETING: 'deleting',
      UPDATING: 'updating',
    };
  }

  constructor() {
    this.logger = getLogger('StorageService');
    this.engine = new IndexedDBEngine();

    this.dbName = undefined;
    this.userId = undefined;

    this.dbListeners = [];
  }

  //##############################################################################
  // Initialization
  //##############################################################################

  /**
   * Initialize the IndexedDB for a user.
   *
   * @param {string} userId - User ID
   * @returns {Promise} Resolves with the database name
   */
  async init(userId = this.userId): Promise<string> {
    const isPermanent = loadValue(StorageKey.AUTH.PERSIST);
    const clientType = isPermanent ? ClientType.PERMANENT : ClientType.TEMPORARY;

    this.userId = userId;
    this.dbName = `wire@${Config.ENVIRONMENT}@${userId}@${clientType}`;

    this.db = new Dexie(this.dbName);

    this._upgradeStores(this.db);

    try {
      await this.engine.initWithDb(this.db);
      await this.db.open();
      this._initCrudHooks();
      this.logger.info(`Storage Service initialized with database '${this.dbName}' version '${this.db.verno}'`);
      return this.dbName;
    } catch (error) {
      const logMessage = `Failed to initialize database '${this.dbName}': ${error.message || error}`;
      this.logger.error(logMessage, {error});
      throw new z.error.StorageError(z.error.StorageError.TYPE.FAILED_TO_OPEN);
    }
  }

  _initCrudHooks(): void {
    const callListener = (
      table: string,
      eventType: string,
      obj: Object,
      updatedObj: Object,
      transaction: Dexie.Transaction,
    ) => {
      transaction.on('complete', () => {
        this.dbListeners
          .filter(listener => listener.store === table && listener.type === eventType)
          .forEach(({callback}) => callback({obj: updatedObj, oldObj: obj}));
      });
    };

    const listenableTables = [StorageSchemata.OBJECT_STORE.EVENTS];

    listenableTables.forEach((table: string): void => {
      this.db
        .table(table)
        .hook('updating', function(
          modifications: Object,
          primaryKey: string,
          obj: Object,
          transaction: Dexie.Transaction,
        ): void {
          this.onsuccess = updatedObj =>
            callListener(table, StorageService.DEXIE_CRUD_EVENTS.UPDATING, obj, updatedObj, transaction);
        });

      this.db
        .table(table)
        .hook('deleting', function(primaryKey: string, obj: Object, transaction: Dexie.Transaction): void {
          this.onsuccess = (): void =>
            callListener(table, StorageService.DEXIE_CRUD_EVENTS.DELETING, obj, undefined, transaction);
        });
    });
  }

  _upgradeStores(db: Dexie): void {
    StorageSchemata.SCHEMATA.forEach(({schema, upgrade, version}) => {
      const versionUpdate = db.version(version).stores(schema);
      if (upgrade) {
        versionUpdate.upgrade((transaction: Dexie.Transaction) => {
          this.logger.warn(`Database upgrade to version '${version}'`);
          upgrade(transaction, db);
        });
      }
    });
  }

  addUpdatedListener(storeName: string, callback: DatabaseListenerCallback): void {
    this.dbListeners.push({callback, store: storeName, type: StorageService.DEXIE_CRUD_EVENTS.UPDATING});
  }

  addDeletedListener(storeName: string, callback: DatabaseListenerCallback): void {
    this.dbListeners.push({callback, store: storeName, type: StorageService.DEXIE_CRUD_EVENTS.DELETING});
  }

  //##############################################################################
  // Interactions
  //##############################################################################

  /**
   * Clear all stores.
   * @returns Resolves when all stores have been cleared
   */
  clearStores(): Promise<void[]> {
    const deleteStorePromises = Object.keys(this.db._dbSchema)
      // avoid clearing tables needed by third parties (dexie-observable for eg)
      .filter(table => !table.startsWith('_'))
      .map(storeName => this.deleteStore(storeName));
    return Promise.all(deleteStorePromises);
  }

  /**
   * Removes persisted data.
   *
   * @param storeName - Name of the object store
   * @param primaryKey - Primary key
   * @returns Resolves when the object is deleted
   */
  delete(storeName: string, primaryKey: string): Promise<string> {
    return this.engine.delete(storeName, primaryKey);
  }

  async deleteDatabase(): Promise<boolean> {
    try {
      await this.engine.purge();
      this.logger.info(`Clearing IndexedDB '${this.dbName}' successful`);
    } catch (error) {
      this.logger.error(`Clearing IndexedDB '${this.dbName}' failed`);
      throw error;
    }
    return true;
  }

  async deleteStore(storeName: string): Promise<void> {
    this.logger.info(`Clearing object store '${storeName}' in database '${this.dbName}'`);
    await this.engine.deleteAll(storeName);
  }

  /**
   * Delete multiple database stores.
   * @param storeNames - Names of database stores to delete
   * @returns Resolves when the stores have been deleted
   */
  deleteStores(storeNames: string[]): Promise<any> {
    const deleteStorePromises = storeNames.map(storeName => this.deleteStore(storeName));
    return Promise.all(deleteStorePromises);
  }

  /**
   * Returns an array of all records for a given object store.
   *
   * @param storeName - Name of object store
   * @returns Resolves with the records from the object store
   */
  getAll<T>(storeName: string): Promise<T[]> {
    return this.db
      .table(storeName)
      .toArray()
      .then(resultArray => resultArray.filter(result => result))
      .catch(error => {
        this.logger.error(`Failed to load objects from store '${storeName}'`, error);
        throw error;
      });
  }

  /**
   * @param tableNames - Names of tables to get
   * @returns Matching tables
   */
  getTables(tableNames: string[]): Dexie.Table<any, any>[] {
    return tableNames.map(tableName => this.db.table(tableName));
  }

  /**
   * Loads persisted data via a promise.
   * @note If a key cannot be found, it resolves and returns "undefined".
   *
   * @param storeName - Name of object store
   * @param primaryKey - Primary key of object to be retrieved
   * @returns Resolves with the record matching the primary key
   */
  load<T>(storeName: string, primaryKey: string): Promise<T> {
    return this.db
      .table(storeName)
      .get(primaryKey)
      .catch(error => {
        this.logger.error(`Failed to load '${primaryKey}' from store '${storeName}'`, error);
        throw error;
      });
  }

  /**
   * Saves objects in the local database.
   *
   * @param storeName - Name of object store where to save the object
   * @param primaryKey - Primary key which should be used to store the object
   * @param entity - Data to store in object store
   * @returns Resolves with the primary key of the persisted object
   */
  async save<T>(storeName: string, primaryKey: string, entity: T): Promise<string> {
    if (!entity) {
      return Promise.reject(new z.error.StorageError(z.error.StorageError.TYPE.NO_DATA));
    }

    try {
      await this.engine.updateOrCreate(storeName, primaryKey, entity);
      return primaryKey;
    } catch (error) {
      this.logger.error(`Failed to put '${primaryKey}' into store '${storeName}'`, error);
      throw error;
    }
  }

  /**
   * Closes the database. This operation completes immediately and there is no returned Promise.
   * @see https://github.com/dfahlander/Dexie.js/wiki/Dexie.close()
   * @param [reason='unknown reason'] - Cause for the termination
   * @returns No return value
   */
  terminate(reason: string = 'unknown reason'): void {
    this.logger.info(`Closing database connection with '${this.db.name}' because of '${reason}'.`);
    this.db.close();
  }

  /**
   * Update previously persisted data via a promise.
   *
   * @param storeName - Name of object store
   * @param primaryKey - Primary key of object to be updated
   * @param changes - Object containing the key paths to each property you want to change
   * @returns Promise with the number of updated records (0 if no records were changed).
   */
  update(storeName: string, primaryKey: string, changes: Object): Promise<number> {
    return this.db
      .table(storeName)
      .update(primaryKey, changes)
      .then(numberOfUpdates => {
        const logMessage = `Updated ${numberOfUpdates} record(s) with key '${primaryKey}' in store '${storeName}'`;
        this.logger.info(logMessage, changes);
        return numberOfUpdates;
      })
      .catch(error => {
        this.logger.error(`Failed to update '${primaryKey}' in store '${storeName}'`, error);
        throw error;
      });
  }
}
