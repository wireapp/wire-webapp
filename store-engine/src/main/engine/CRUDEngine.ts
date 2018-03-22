interface CRUDEngine {
  storeName: string;

  /**
   * Initializes the store engine. This need to be done prior to operating with it.
   * @param {string} storeName - Name of the store
   * @param {Array} settings - Database-specific settings
   * @returns {Promise<any>} Resolves with the underlying (unwrapped) instance of a database.
   */
  init(storeName: string, ...settings: any[]): Promise<any>;

  /**
   * Deletes the store.
   * @returns {Promise<void>} Resolves if store got deleted.
   */
  purge(): Promise<void>;

  /**
   * Creates a record by its primary key within a table.
   * @param {string} tableName - Table name
   * @param {string} primaryKey - Primary key to be used to store the record
   * @param {T} entity - Any kind of object that should be stored
   * @returns {Promise<string>} Resolves with the primary key of the stored record.
   */
  create<T>(tableName: string, primaryKey: string, entity: T): Promise<string>;

  /**
   * Deletes a record by its primary key within a table.
   * @param {string} tableName - Table name
   * @param {string} primaryKey - Primary key to be used to delete the record
   * @returns {Promise<string>} Resolves with the primary key of the deleted record.
   */
  delete(tableName: string, primaryKey: string): Promise<string>;

  /**
   * Deletes all records within a table.
   * @param {string} tableName - Table name
   * @returns {Promise<boolean>} Resolves with `true`, if all records have been removed.
   */
  deleteAll(tableName: string): Promise<boolean>;

  /**
   * Finds a record by its primary key within a table.
   * @param {string} tableName - Table name
   * @param {string} primaryKey - Primary key to query the record
   * @throws {RecordNotFoundError} Will be thrown, if the record could not be found.
   * @returns {Promise<T>} Resolves with the record.
   */
  read<T>(tableName: string, primaryKey: string): Promise<T>;

  /**
   * Reads all records from a table.
   * @param {string} tableName - Table name
   * @returns {Promise<T[]>} Resolves with an array of records from a table.
   */
  readAll<T>(tableName: string): Promise<T[]>;

  /**
   * Returns all primary keys of records that are stored in a table.
   * @param {string} tableName - Table name
   * @returns {Promise<string[]>} Returns an array of primary keys.
   */
  readAllPrimaryKeys(tableName: string): Promise<string[]>;

  /**
   * Updates a record with a set of properties.
   * @param {string} tableName - Table name
   * @param {string} primaryKey - Primary key of record which should get updated.
   * @param {Object} changes - Updated properties that should be saved for the record
   * @returns {Promise<string>} Resolves with the primary key of the updated record.
   */
  update(tableName: string, primaryKey: string, changes: Object): Promise<string>;

  /**
   * Updates a record with a set of properties.
   * If the record doesn't exist, The record will be created automatically.
   * @param {string} tableName - Table name
   * @param {string} primaryKey - Primary key of record which should get updated.
   * @param {Object} changes - Updated properties that should be saved for the record
   * @returns {Promise<string>} Resolves with the primary key of the updated record.
   */
  updateOrCreate(tableName: string, primaryKey: string, changes: Object): Promise<string>;
}

export default CRUDEngine;
