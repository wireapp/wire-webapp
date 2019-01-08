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

window.z = window.z || {};
window.z.storage = z.storage || {};

z.storage.StorageRepository = class StorageRepository {
  static get CONFIG() {
    return {
      CRYPTOGRAPHY_TABLES: [
        z.storage.StorageSchemata.OBJECT_STORE.AMPLIFY,
        z.storage.StorageSchemata.OBJECT_STORE.CLIENTS,
        z.storage.StorageSchemata.OBJECT_STORE.KEYS,
        z.storage.StorageSchemata.OBJECT_STORE.SESSIONS,
        z.storage.StorageSchemata.OBJECT_STORE.PRE_KEYS,
      ],
    };
  }

  /**
   * Construct an new Storage Repository.
   * @param {StorageService} storageService - Service for all storage related interactions
   */
  constructor(storageService) {
    this.storageService = storageService;
    this.logger = new z.util.Logger('z.storage.StorageRepository', z.config.LOGGER.OPTIONS);

    this.AMPLIFY_STORE_NAME = z.storage.StorageSchemata.OBJECT_STORE.AMPLIFY;
  }

  /**
   * Clear all database stores.
   * @returns {Promise} Resolves when stores have been deleted
   */
  clearStores() {
    return this.storageService
      .clearStores()
      .then(() => this.logger.info(`Cleared database '${this.storageService.dbName}'`));
  }

  /**
   * Delete cryptography related information.
   * @note Retain history but clean other information.
   * @returns {Promise} Resolves when stores have been deleted
   */
  deleteCryptographyStores() {
    return this.storageService.deleteStores(StorageRepository.CONFIG.CRYPTOGRAPHY_TABLES);
  }

  /**
   * Delete everything from the database
   * @note Nukes it - no way to recover data
   * @returns {Promise} Resolves when database has been deleted
   */
  deleteDatabase() {
    this.logger.warn(`Deleting database '${this.storageService.dbName}'`);
    return this.storageService.deleteDatabase();
  }

  /**
   * Get a value for a given primary key from the amplify value store.
   *
   * @param {string} primaryKey - Primary key to retrieve the object for
   * @returns {Promise} Resolves with the retrieved value
   */
  getValue(primaryKey) {
    return this.storageService.load(this.AMPLIFY_STORE_NAME, primaryKey).then(record => {
      if (record && record.value) {
        return record.value;
      }
      throw new z.error.StorageError(z.error.StorageError.TYPE.NOT_FOUND);
    });
  }

  /**
   * Save a value in the amplify value store.
   *
   * @param {string} primaryKey - Primary key to save the object with
   * @param {value} value - Object to be stored
   * @returns {Promise} Resolves with the primary key
   */
  saveValue(primaryKey, value) {
    return this.storageService.save(this.AMPLIFY_STORE_NAME, primaryKey, {value: value});
  }

  /**
   * Closes the database connection.
   * @param {string} reason - Cause for the termination
   * @returns {undefined} No return value
   */
  terminate(reason) {
    this.storageService.terminate(reason);
  }
};
