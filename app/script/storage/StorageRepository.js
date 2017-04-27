/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.storage = z.storage || {};

z.storage.StorageRepository = class StorageRepository {
  /**
   * Construct an new Storage Repository.
   * @param {z.storage.StorageService} storage_service - Service for all storage related interactions
   */
  constructor(storage_service) {
    this.storage_service = storage_service;
    this.logger = new z.util.Logger('z.storage.StorageRepository', z.config.LOGGER.OPTIONS);
  }

  /**
   * Clear all database stores.
   * @returns {Promise} Resolves when stores have been deleted
   */
  clear_all_stores() {
    return this.storage_service.clear_all_stores()
      .then(() => this.logger.info(`Cleared database '${this.storage_service.db_name}'`));
  }

  /**
   * Delete cryptography related information.
   * @note Retain history but clean other information.
   * @returns {Promise} Resolves when stores have been deleted
   */
  delete_cryptography() {
    return this.storage_service.delete_stores([
      z.storage.StorageService.OBJECT_STORE.AMPLIFY,
      z.storage.StorageService.OBJECT_STORE.CLIENTS,
      z.storage.StorageService.OBJECT_STORE.KEYS,
      z.storage.StorageService.OBJECT_STORE.SESSIONS,
      z.storage.StorageService.OBJECT_STORE.PRE_KEYS,
    ]);
  }

  /**
   * Delete everything from the database
   * @note Nukes it - no way to recover data
   * @returns {Promise} Resolves when database has been deleted
   */
  delete_everything() {
    this.logger.warn(`Deleting database '${this.storage_service.db_name}'`);
    return this.storage_service.delete_everything();
  }

  /**
   * Get a value for a given primary key from the amplify value store.
   *
   * @param {string} primary_key - Primary key to retrieve the object for
   * @returns {Promise} Resolves with the retrieved value
   */
  get_value(primary_key) {
    return this.storage_service.load(z.storage.StorageService.OBJECT_STORE.AMPLIFY, primary_key)
      .then(function(record) {
        if (record && record.value) {
          return record.value;
        }
        throw new z.storage.StorageError(z.storage.StorageError.TYPE.NOT_FOUND);
      });
  }

  /**
   * Save a value in the amplify value store.
   *
   * @param {string} primary_key - Primary key to save the object with
   * @param {value} value - Object to be stored
   * @returns {Promise} Resolves with the primary key
  */
  save_value(primary_key, value) {
    return this.storage_service.save(z.storage.StorageService.OBJECT_STORE.AMPLIFY, primary_key, {value: value});
  }

  /**
   * Closes the database connection.
   * @param {string} reason - Cause for the termination
   * @returns {undefined} No return value
   */
  terminate(reason) {
    this.storage_service.terminate(reason);
  }
};
