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

import Dexie from 'dexie';

class StorageService {
  // Construct an new StorageService.
  constructor() {
    this.logger = new z.util.Logger('StorageService', z.config.LOGGER.OPTIONS);

    this.db = undefined;
    this.dbName = undefined;
    this.userId = undefined;

    this._afterDbInit = () => {};

    this.updateListeners = [];
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
  init(userId = this.userId) {
    return Promise.resolve().then(() => {
      const isPermanent = z.util.StorageUtil.getValue(z.storage.StorageKey.AUTH.PERSIST);
      const clientType = isPermanent ? z.client.ClientType.PERMANENT : z.client.ClientType.TEMPORARY;

      this.userId = userId;
      this.dbName = `wire@${z.util.Environment.backend.current}@${userId}@${clientType}`;

      this.db = new Dexie(this.dbName);

      this.db.on('blocked', () => this.logger.error('Database is blocked'));

      this._upgradeStores();

      return this.db
        .open()
        .then(() => {
          this.logger.info(`Storage Service initialized with database '${this.dbName}' version '${this.db.verno}'`);
          this._afterDbInit();
          return this.dbName;
        })
        .catch(error => {
          const logMessage = `Failed to initialize database '${this.dbName}': ${error.message || error}`;
          this.logger.error(logMessage, {error: error});
          throw new z.error.StorageError(z.error.StorageError.TYPE.FAILED_TO_OPEN);
        });
    });
  }

  _upgradeStores() {
    z.storage.StorageSchemata.SCHEMATA.forEach(({schema, upgrade, version}) => {
      if (upgrade) {
        return this.db
          .version(version)
          .stores(schema)
          .upgrade(transaction => {
            this.logger.warn(`Database upgrade to version '${version}'`);
            upgrade(transaction, this.db);
          });
      }

      this.db.version(version).stores(schema);
    });
  }

  // Hooks
  addUpdatedListener(storeName, callback) {
    this.updateListeners.push(callback);
    const initHook = () => {
      if (this.updateListeners.length > 0) {
        const updateListeners = this.updateListeners;
        this.db[storeName].hook('updating', function(modifications, primaryKey, previousRecord, transaction) {
          // we need to wait for the transaction to be finished in order to be able to access the DB later on
          this.onsuccess = updatedRecord =>
            transaction.on('complete', () =>
              updateListeners.forEach(callbackFn => callbackFn(updatedRecord, previousRecord))
            );
        });
      }
    };
    if (!this.db) {
      // waiting for the DB to be initialized
      return (this._afterDbInit = initHook);
    }
    initHook();
  }

  //##############################################################################
  // Interactions
  //##############################################################################

  /**
   * Clear all stores.
   * @returns {Promise} Resolves when all stores have been cleared
   */
  clearStores() {
    const deleteStorePromises = Object.keys(this.db._dbSchema).map(storeName => this.deleteStore(storeName));
    return Promise.all(deleteStorePromises);
  }

  /**
   * Removes persisted data.
   *
   * @param {string} storeName - Name of the object store
   * @param {string} primaryKey - Primary key
   * @returns {Promise} Resolves when the object is deleted
   */
  delete(storeName, primaryKey) {
    if (this.db[storeName]) {
      return this.db[storeName]
        .delete(primaryKey)
        .then(() => {
          this.logger.info(`Deleted '${primaryKey}' from object store '${storeName}'`);
          return primaryKey;
        })
        .catch(error => {
          this.logger.error(`Failed to delete '${primaryKey}' from store '${storeName}'`, error);
          throw error;
        });
    }

    return Promise.reject(new z.error.StorageError(z.error.StorageError.TYPE.DATA_STORE_NOT_FOUND));
  }

  /**
   * Delete the IndexedDB with all its stores.
   * @returns {Promise} Resolves if a database is found and cleared
   */
  deleteDatabase() {
    if (this.db) {
      return this.db
        .delete()
        .then(() => {
          this.logger.info(`Clearing IndexedDB '${this.dbName}' successful`);
          return true;
        })
        .catch(error => {
          this.logger.error(`Clearing IndexedDB '${this.dbName}' failed`);
          throw error;
        });
    }
    this.logger.error(`IndexedDB '${this.dbName}' not found`);
    return Promise.resolve(true);
  }

  /**
   * Delete a database store.
   * @param {string} storeName - Name of database store to delete
   * @returns {Promise} Resolves when the store has been deleted
   */
  deleteStore(storeName) {
    this.logger.info(`Clearing object store '${storeName}' in database '${this.dbName}'`);
    return this.db[storeName].clear();
  }

  /**
   * Delete multiple database stores.
   * @param {Array<string>} storeNames - Names of database stores to delete
   * @returns {Promise} Resolves when the stores have been deleted
   */
  deleteStores(storeNames) {
    const deleteStorePromises = storeNames.map(storeName => this.deleteStore(storeName));
    return Promise.all(deleteStorePromises);
  }

  /**
   * Returns an array of all records for a given object store.
   *
   * @param {string} storeName - Name of object store
   * @returns {Promise} Resolves with the records from the object store
   */
  getAll(storeName) {
    return this.db[storeName]
      .toArray()
      .then(resultArray => resultArray.filter(result => result))
      .catch(error => {
        this.logger.error(`Failed to load objects from store '${storeName}'`, error);
        throw error;
      });
  }

  /**
   * @param {Array<string>} tableNames - Names of tables to get
   * @returns {Array<Table>} Matching tables
   */
  getTables(tableNames) {
    return tableNames.map(tableName => this.db[tableName]);
  }

  /**
   * Loads persisted data via a promise.
   * @note If a key cannot be found, it resolves and returns "undefined".
   *
   * @param {string} storeName - Name of object store
   * @param {string} primaryKey - Primary key of object to be retrieved
   * @returns {Promise} Resolves with the record matching the primary key
   */
  load(storeName, primaryKey) {
    return this.db[storeName].get(primaryKey).catch(error => {
      this.logger.error(`Failed to load '${primaryKey}' from store '${storeName}'`, error);
      throw error;
    });
  }

  /**
   * Saves objects in the local database.
   *
   * @param {string} storeName - Name of object store where to save the object
   * @param {string} primaryKey - Primary key which should be used to store the object
   * @param {Object} entity - Data to store in object store
   * @returns {Promise} Resolves with the primary key of the persisted object
   */
  save(storeName, primaryKey, entity) {
    if (!entity) {
      return Promise.reject(new z.error.StorageError(z.error.StorageError.TYPE.NO_DATA));
    }

    return this.db[storeName].put(entity, primaryKey).catch(error => {
      this.logger.error(`Failed to put '${primaryKey}' into store '${storeName}'`, error);
      throw error;
    });
  }

  /**
   * Closes the database. This operation completes immediately and there is no returned Promise.
   * @see https://github.com/dfahlander/Dexie.js/wiki/Dexie.close()
   * @param {string} [reason='unknown reason'] - Cause for the termination
   * @returns {undefined} No return value
   */
  terminate(reason = 'unknown reason') {
    this.logger.info(`Closing database connection with '${this.db.name}' because of '${reason}'.`);
    this.db.close();
  }

  /**
   * Update previously persisted data via a promise.
   *
   * @param {string} storeName - Name of object store
   * @param {string} primaryKey - Primary key of object to be updated
   * @param {Object} changes - Object containing the key paths to each property you want to change
   * @returns {Promise} Promise with the number of updated records (0 if no records were changed).
   */
  update(storeName, primaryKey, changes) {
    return this.db[storeName]
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

export default StorageService;
