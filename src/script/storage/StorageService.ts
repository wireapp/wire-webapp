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

import {CRUDEngine, MemoryEngine, error as StoreEngineError} from '@wireapp/store-engine';
import {IndexedDBEngine} from '@wireapp/store-engine-dexie';
import Dexie from 'dexie';

import {Logger, getLogger} from 'Util/Logger';
import {loadValue} from 'Util/StorageUtil';

import {MemoryStore} from '@wireapp/store-engine/dist/commonjs/engine';
import {isTemporaryClientAndNonPersistent} from 'Util/util';
import {Config} from '../auth/config';
import {ClientType} from '../client/ClientType';
import {StorageKey} from './StorageKey';
import {StorageSchemata} from './StorageSchemata';

interface DatabaseListener {
  callback: DatabaseListenerCallback;
  store: string;
  type: DEXIE_CRUD_EVENT;
}

type DatabaseListenerCallback = (changes: {obj: Object; oldObj: Object}) => void;

// @see https://dexie.org/docs/Observable/Dexie.Observable
type DexieObservable = {_dbSchema?: Object};

enum DEXIE_CRUD_EVENT {
  DELETING = 'deleting',
  UPDATING = 'updating',
}

export class StorageService {
  public db?: Dexie & DexieObservable;
  public objectDb?: MemoryStore;
  private readonly hasHookSupport: boolean;
  private readonly dbListeners: DatabaseListener[];
  private readonly engine: CRUDEngine;
  private readonly isTemporaryAndNonPersistent: boolean;
  private readonly logger: Logger;
  private userId?: string;
  public dbName?: string;

  static get DEXIE_CRUD_EVENTS(): typeof DEXIE_CRUD_EVENT {
    return DEXIE_CRUD_EVENT;
  }

  constructor() {
    this.logger = getLogger('StorageService');

    this.dbName = undefined;
    this.userId = undefined;

    this.isTemporaryAndNonPersistent = isTemporaryClientAndNonPersistent();

    this.engine = this.isTemporaryAndNonPersistent ? new MemoryEngine() : new IndexedDBEngine();
    this.hasHookSupport = this.engine instanceof IndexedDBEngine;

    this.dbListeners = [];
  }

  //##############################################################################
  // Initialization
  //##############################################################################

  /**
   * Initialize the IndexedDB for a user.
   *
   * @param userId - User ID
   * @returns Resolves with the database name
   */
  async init(userId = this.userId): Promise<string> {
    const isPermanent = loadValue(StorageKey.AUTH.PERSIST);
    const clientType = isPermanent ? ClientType.PERMANENT : ClientType.TEMPORARY;

    this.userId = userId;
    this.dbName = `wire@${Config.ENVIRONMENT}@${userId}@${clientType}`;

    this.db = new Dexie(this.dbName);
    this._upgradeStores(this.db);

    try {
      if (this.isTemporaryAndNonPersistent) {
        await this.moveDexieToMemory();
        this.logger.info(`Storage Service initialized with in-memory database '${this.dbName}'`);
      } else {
        await this.engine.initWithDb(this.db);
        await this.db.open();
        this._initCrudHooks();
        this.logger.info(`Storage Service initialized with database '${this.dbName}' version '${this.db.verno}'`);
      }
      return this.dbName;
    } catch (error) {
      const logMessage = `Failed to initialize database '${this.dbName}': ${error.message || error}`;
      this.logger.error(logMessage, {error});
      throw new z.error.StorageError(z.error.StorageError.TYPE.FAILED_TO_OPEN);
    }
  }

  private async moveDexieToMemory(): Promise<void> {
    const objectDb: MemoryStore = {};

    for (const table of this.db.tables as Dexie.Table<Record<string, any>, string>[]) {
      const keys = await table.toCollection().keys();
      objectDb[table.name] = {};
      for (const key of keys.map(key => key.toString())) {
        objectDb[table.name][key] = await table.get(key);
      }
    }

    await this.engine.initWithObject(this.dbName, objectDb);
    this.objectDb = objectDb;

    await this.db.delete();
    await this.db.close();

    this.db = undefined;
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

    listenableTables.forEach(table => {
      this.db
        .table(table)
        .hook(DEXIE_CRUD_EVENT.UPDATING, function(
          modifications: Object,
          primaryKey: string,
          obj: Object,
          transaction: Dexie.Transaction,
        ): void {
          this.onsuccess = updatedObj => callListener(table, DEXIE_CRUD_EVENT.UPDATING, obj, updatedObj, transaction);
        });

      this.db
        .table(table)
        .hook(DEXIE_CRUD_EVENT.DELETING, function(
          primaryKey: string,
          obj: Object,
          transaction: Dexie.Transaction,
        ): void {
          this.onsuccess = (): void => callListener(table, DEXIE_CRUD_EVENT.DELETING, obj, undefined, transaction);
        });
    });
  }

  private _upgradeStores(db: Dexie): void {
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
   * @returns Resolves when all stores have been cleared
   */
  async clearStores(): Promise<void[]> {
    const deleteStorePromises = this.isTemporaryAndNonPersistent
      ? [this.engine.purge()]
      : Object.keys(this.db._dbSchema)
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
      this.logger.info(`Clearing IndexedDB '${this.dbName}' successful`);
      this.dbName = undefined;
      return true;
    } catch (error) {
      this.logger.error(`Clearing IndexedDB '${this.dbName}' failed`);
      throw error;
    }
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
  async deleteStores(storeNames: string[]): Promise<void> {
    const deleteStorePromises = storeNames.map(storeName => this.deleteStore(storeName));
    await Promise.all(deleteStorePromises);
  }

  async deleteEventInConversation(storeName: string, conversationId: string, eventId: string): Promise<number> {
    if (this.isTemporaryAndNonPersistent) {
      let deletedRecords = 0;
      const primaryKeys = await this.readAllPrimaryKeys(storeName);

      for (const primaryKey of primaryKeys) {
        const record = await this.load<{conversation: string; id: string; time: number}>(storeName, primaryKey);
        if (record && record.id === eventId && record.conversation === conversationId) {
          await this.delete(storeName, primaryKey);
          deletedRecords++;
        }
      }

      return deletedRecords;
    }

    return this.db
      .table(storeName)
      .where('id')
      .equals(eventId)
      .and(record => record.conversation === conversationId)
      .delete();
  }

  async deleteEventsByDate(storeName: string, conversationId: string, isoDate: string): Promise<number> {
    if (this.isTemporaryAndNonPersistent) {
      let deletedRecords = 0;
      const primaryKeys = await this.readAllPrimaryKeys(storeName);

      for (const primaryKey of primaryKeys) {
        const record = await this.load<{conversation: string; time: string}>(storeName, primaryKey);
        if (record && record.conversation === conversationId && (!isoDate || isoDate >= record.time)) {
          await this.delete(storeName, primaryKey);
          deletedRecords++;
        }
      }

      return deletedRecords;
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
   * @param storeName - Name of object store
   * @returns Resolves with the records from the object store
   */
  async getAll<T = Object>(storeName: string): Promise<T[]> {
    try {
      const resultArray = await this.engine.readAll<T>(storeName);
      return resultArray.filter(Boolean);
    } catch (error) {
      this.logger.error(`Failed to load objects from store '${storeName}'`, error);
      throw error;
    }
  }

  /**
   * @param tableNames - Names of tables to get
   * @returns Resolves with matching tables
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
  async load<T = Object>(storeName: string, primaryKey: string): Promise<T> {
    try {
      const record = await this.engine.read<T>(storeName, primaryKey);
      return record;
    } catch (error) {
      if (error instanceof StoreEngineError.RecordNotFoundError) {
        return undefined;
      }
      this.logger.error(`Failed to load '${primaryKey}' from store '${storeName}'`, error);
      throw error;
    }
  }

  async readAllPrimaryKeys(storeName: string): Promise<string[]> {
    return this.engine.readAllPrimaryKeys(storeName);
  }

  /**
   * Saves objects in the local database.
   *
   * @param storeName - Name of object store where to save the object
   * @param primaryKey - Primary key which should be used to store the object
   * @param entity - Data to store in object store
   * @returns Resolves with the primary key of the persisted object
   */
  async save<T = Object>(storeName: string, primaryKey: string, entity: T): Promise<string> {
    if (!entity) {
      throw new z.error.StorageError(z.error.StorageError.TYPE.NO_DATA);
    }

    const isOutdatedRequest = !this.dbName && primaryKey;
    if (isOutdatedRequest) {
      this.logger.warn(
        `Could not update or create '${primaryKey}' in store '${storeName}' because database connection was already closed (which is expected behaviour when a self user just got deleted).`,
        error,
      );
      return primaryKey;
    }

    if (this.isTemporaryAndNonPersistent) {
      try {
        const newKey = await this.engine.create(storeName, primaryKey, entity);
        return newKey;
      } catch (error) {
        if (error instanceof StoreEngineError.RecordAlreadyExistsError) {
          await this.update(storeName, primaryKey, entity);
          return primaryKey;
        }
        this.logger.error(`Failed to create '${primaryKey}' in store '${storeName}'`, error);
        throw error;
      }
    } else {
      try {
        const newKey = await this.engine.updateOrCreate(storeName, primaryKey, entity);
        return newKey;
      } catch (error) {
        this.logger.error(`Failed to update or create '${primaryKey}' in store '${storeName}'`, error);
        throw error;
      }
    }
  }

  /**
   * Closes the database. This operation completes immediately and there is no returned Promise.
   * @see https://github.com/dfahlander/Dexie.js/wiki/Dexie.close()
   * @param reason - Cause for the termination
   * @returns No return value
   */
  terminate(reason: string = 'unknown reason'): void {
    this.logger.info(`Closing database connection with '${this.dbName}' because of '${reason}'.`);
    if (!this.isTemporaryAndNonPersistent) {
      this.db.close();
    }
  }

  private notifyListeners(storeName: string, eventType: DEXIE_CRUD_EVENT, oldRecord: any, newRecord: any): void {
    this.dbListeners
      .filter(dbListener => dbListener.store === storeName && dbListener.type === eventType)
      .forEach(dbListener => dbListener.callback({obj: newRecord, oldObj: oldRecord}));
  }

  /**
   * Update previously persisted data via a promise.
   *
   * @param storeName - Name of object store
   * @param primaryKey - Primary key of object to be updated
   * @param changes - Object containing the key paths to each property you want to change
   * @returns Promise with the number of updated records (0 if no records were changed).
   */
  async update<T = Object>(storeName: string, primaryKey: string, changes: T): Promise<number> {
    try {
      if (this.hasHookSupport) {
        const numberOfUpdates = await this.db.table(storeName).update(primaryKey, changes);
        const logMessage = `Updated ${numberOfUpdates} record(s) with key '${primaryKey}' in store '${storeName}'`;
        this.logger.info(logMessage, changes);
        return numberOfUpdates;
      } else {
        const oldRecord = await this.engine.read<unknown>(storeName, primaryKey);
        await this.engine.update(storeName, primaryKey, changes);
        const newRecord = await this.engine.read<unknown>(storeName, primaryKey);

        this.notifyListeners(storeName, DEXIE_CRUD_EVENT.UPDATING, oldRecord, newRecord);

        return 1;
      }
    } catch (error) {
      this.logger.error(`Failed to update '${primaryKey}' in store '${storeName}'`, error);
      throw error;
    }
  }
}
