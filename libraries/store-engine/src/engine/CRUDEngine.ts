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

/**
 * Interface definition for pure CRUD operations.
 * @see https://en.wikipedia.org/wiki/Create,_read,_update_and_delete
 */
export interface CRUDEngineBase {
  /**
   * Creates a record by its primary key within a table.
   * @param tableName Table name
   * @param primaryKey Primary key to be used to store the record
   * @param entity Any kind of object that should be stored
   * @returns Resolves with the primary key of the stored record.
   */
  create<EntityType = Object, PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
    entity: EntityType,
  ): Promise<PrimaryKey>;

  /**
   * Finds a record by its primary key within a table.
   * @param tableName Table name
   * @param primaryKey Primary key to query the record
   * @throws {RecordNotFoundError} Will be thrown, if the record could not be found.
   * @returns Resolves with the record.
   */
  read<EntityType = Object, PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): Promise<EntityType>;

  /**
   * Updates a record with a set of properties.
   * @param tableName Table name
   * @param primaryKey Primary key of record which should get updated
   * @param changes Updated properties that should be saved for the record
   * @returns Resolves with the primary key of the updated record.
   */
  update<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey>;

  /**
   * Deletes a record by its primary key within a table.
   * @param tableName Table name
   * @param primaryKey Primary key to be used to delete the record
   * @returns Resolves with the primary key of the deleted record.
   */
  delete<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): Promise<PrimaryKey>;
}

/**
 * Interface definition for CRUD operations with support for collections.
 */
export interface CRUDEngineBaseCollection extends CRUDEngineBase {
  /**
   * Reads all records from a table.
   */
  readAll<EntityType>(tableName: string): Promise<EntityType[]>;

  /**
   * Returns all primary keys of records that are stored in a table.
   */
  readAllPrimaryKeys(tableName: string): Promise<string[]>;

  /**
   * Deletes all records within a table.
   * @param tableName Table name
   * @returns Resolves with `true`, if all records have been removed.
   */
  deleteAll(tableName: string): Promise<boolean>;
}

/**
 * Extends collection-aware CRUD operations with convenience methods for practical usage in web applications (such as "Wire for Web").
 */
export interface CRUDEngine extends CRUDEngineBaseCollection {
  [index: string]: any;
  /**
   * Clears all tables without deleting them.
   * @returns Resolves when all tables are cleared.
   */
  clearTables(): Promise<void>;

  /**
   * Initializes the store engine. This needs to be done prior to operating with it.
   * @param storeName Name of the store
   * @param settings Database-specific settings
   * @returns Resolves with the underlying (unwrapped) instance of a database.
   * @throws {UnsupportedError} Error when feature is not available on targeted platform.
   */
  init(storeName: string, ...settings: any[]): Promise<any>;

  /**
   * Checks wether the engine is supported in the current environment.
   * @returns Resolves if supported, rejects if unsupported.
   */
  isSupported(): Promise<void>;

  /**
   * Deletes the store.
   * @returns Resolves if store got deleted.
   */
  purge(): Promise<void>;

  storeName: string;

  /**
   * Updates a record with a set of properties.
   * If the record doesn't exist, The record will be created automatically.
   * @param tableName Table name
   * @param primaryKey Primary key of record which should get updated
   * @param changes Updated properties that should be saved for the record
   * @returns Resolves with the primary key of the updated record.
   */
  updateOrCreate<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey>;
}
