/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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
import {
  RecordAlreadyExistsError,
  RecordNotFoundError,
  RecordTypeError,
  UnsupportedError,
} from '@wireapp/store-engine/dist/commonjs/engine/error/';
import initSqlJs from 'sql.js';

import {
  SQLeetEnginePrimaryKeyName,
  SQLiteDatabaseDefinition,
  SQLiteType,
  createTableIfNotExists,
  escape,
  getFormattedColumnsFromColumns,
  getFormattedColumnsFromTableName,
  getProtectedColumnReferences,
  hashColumnName,
} from './SchemaConverter';

declare const WebAssembly: any;

// https://lowrey.me/lodash-zipobject-in-es6-javascript/
const zipObject = (props: any[], values: any[]) =>
  props.reduce((prev, prop, i) => ({...prev, ...{[prop]: values[i]}}), {});

export class SQLeetEngine implements CRUDEngine {
  private db: any;
  private rawDatabase: string | undefined;
  private readonly schema: SQLiteDatabaseDefinition<Record<string, any>>;
  private readonly encryptionKey: string;
  private readonly dbConfig: any;
  public storeName = '';

  constructor(
    wasmLocation: Uint8Array | string,
    schema: SQLiteDatabaseDefinition<Record<string, any>>,
    encryptionKey: string,
    rawDatabase?: string,
  ) {
    this.schema = schema;
    this.encryptionKey = encryptionKey;
    this.dbConfig = {};

    if (typeof wasmLocation === 'string') {
      this.dbConfig.locateFile = () => wasmLocation;
    } else if (wasmLocation instanceof Uint8Array) {
      this.dbConfig.wasmBinary = wasmLocation;
    }
    if (rawDatabase) {
      this.rawDatabase = rawDatabase;
    }
  }

  // TODO: Remove "append" functionality from "CRUDEngine" completely
  append<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey, additions: string): Promise<PrimaryKey> {
    throw new Error('Method not implemented.');
  }

  async init(storeName: string): Promise<any> {
    await this.isSupported();

    this.storeName = storeName;

    let existingDatabase: Uint8Array | undefined = undefined;
    if (this.rawDatabase) {
      existingDatabase = await this.load(this.rawDatabase);
      this.rawDatabase = undefined;
    }

    const SQL = await initSqlJs(this.dbConfig);
    this.db = new SQL.Database(existingDatabase);

    // Settings
    this.db.run('PRAGMA `encoding`="UTF-8";');
    this.db.run(`PRAGMA \`key\`=${escape(this.encryptionKey)};`);

    // Create tables
    let statement = '';

    for (const tableName in this.schema) {
      const table = this.schema[tableName];
      statement += createTableIfNotExists(tableName, table);
    }

    this.db.run(statement);

    return this.db;
  }

  public async export<T>(): Promise<string> {
    if (!this.db) {
      throw new Error('SQLite needs to be available');
    }
    const database: Uint8Array = new Uint8Array(this.db.export());
    const strings = [];
    const chunkSize = 0xffff;
    // There is a maximum stack size. We cannot call `String.fromCharCode` with as many arguments as we want
    for (let i = 0; i * chunkSize < database.length; i++) {
      strings[i] = String.fromCharCode.apply(null, <any>database.subarray(i * chunkSize, (i + 1) * chunkSize));
    }
    return strings.join('');
  }

  private async load(database: string): Promise<Uint8Array | undefined> {
    const databaseBinary = new Uint8Array(database.length);
    for (let i = 0; i < database.length; i++) {
      databaseBinary[i] = database.charCodeAt(i);
    }
    return databaseBinary;
  }

  async purge(): Promise<void> {
    // Databases must be closed, when you're finished with them, or the memory consumption will grow forever.
    if (this.db) {
      this.db.close();
    }
    this.db = null;
    this.rawDatabase = undefined;
  }

  private buildValues<EntityType = Record<string, SQLiteType>>(
    tableName: string,
    entities: EntityType,
  ): {columns: Record<string, string>; values: Record<string, any>} {
    const table = this.schema[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }
    const columns: Record<string, string> = {};
    const values: Record<string, any> = {};
    for (const entity in entities) {
      // Ensure the column name exists in the scheme as a first line of defense against SQL injection
      if (typeof table[entity] !== 'string') {
        continue;
      }
      let value: string | EntityType[Extract<keyof EntityType, string>] = entities[entity];
      // Stringify objects for the database
      if (table[entity] === SQLiteType.JSON) {
        value = JSON.stringify(value) as SQLiteType;
      }
      const reference = `@${hashColumnName(entity)}`;
      columns[reference] = entity;
      values[reference] = value;
    }

    if (Object.keys(columns).length === 0) {
      throw new Error(
        `Entity is empty for table "${tableName}". Are you sure you set the right scheme / column names?`,
      );
    }

    return {columns, values};
  }

  async create<EntityType = Object, PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
    entity: EntityType,
  ): Promise<PrimaryKey> {
    if (!entity) {
      const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
      throw new RecordTypeError(message);
    }
    const {columns, values} = this.buildValues(tableName, entity);
    const newValues = Object.keys(values).join(',');
    const escapedTableName = escape(tableName);
    const statement = `INSERT INTO ${escapedTableName} (${getFormattedColumnsFromColumns(
      columns,
      true,
    )}) VALUES (@primaryKey,${newValues});`;
    try {
      this.db.run(statement, {
        ...values,
        '@primaryKey': primaryKey,
      });
    } catch (error) {
      if (error.message.startsWith(`UNIQUE constraint failed: `)) {
        const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
        throw new RecordAlreadyExistsError(message);
      } else {
        throw error;
      }
    }
    return primaryKey;
  }

  async delete<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): Promise<PrimaryKey> {
    const escapedTableName = escape(tableName);
    const statement = `DELETE FROM ${escapedTableName} WHERE ${SQLeetEnginePrimaryKeyName}=@primaryKey;`;
    this.db.run(statement, {
      '@primaryKey': primaryKey,
    });
    return primaryKey;
  }

  async deleteAll(tableName: string): Promise<boolean> {
    const escapedTableName = escape(tableName);
    const statement = `DELETE FROM ${escapedTableName}`;
    this.db.run(statement);
    return true;
  }

  async read<EntityType = Object, PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): Promise<EntityType> {
    const table = this.schema[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }
    const columns = getFormattedColumnsFromTableName(table);
    const escapedTableName = escape(tableName);
    const selectRecordStatement = `SELECT ${columns} FROM ${escapedTableName} WHERE ${SQLeetEnginePrimaryKeyName}=@primaryKey;`;
    const statement = this.db.prepare(selectRecordStatement);
    const record = statement.getAsObject({
      '@primaryKey': primaryKey,
    });
    statement.free();

    if (Object.keys(record).length === 0) {
      const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
      throw new RecordNotFoundError(message);
    }

    for (const column in record) {
      if (table[column] === SQLiteType.JSON) {
        record[column] = JSON.parse(record[column]);
      }
    }

    return record;
  }

  async readAll<T>(tableName: string): Promise<T[]> {
    const table = this.schema[tableName];
    const columns = getFormattedColumnsFromTableName(table);
    const escapedTableName = escape(tableName);

    const selectRecordStatement = `SELECT ${columns} FROM ${escapedTableName};`;
    let records = this.db.exec(selectRecordStatement);

    // Ensure the record is not empty
    if (records && records[0]) {
      records = records[0];
    } else {
      return [];
    }

    return records.values.map((record: any[]) => zipObject(records.columns, record));
  }

  async readAllPrimaryKeys(tableName: string): Promise<string[]> {
    const escapedTableName = escape(tableName);
    const statement = `SELECT ${SQLeetEnginePrimaryKeyName} FROM ${escapedTableName};`;
    const record = this.db.exec(statement);
    if (record[0] && record[0].values) {
      return record[0].values.map((value: string[]) => value[0]);
    }
    return [];
  }

  async update<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey> {
    await this.read(tableName, primaryKey);
    const {values, columns} = this.buildValues(tableName, changes);
    const escapedTableName = escape(tableName);
    const statement = `UPDATE ${escapedTableName} SET ${getProtectedColumnReferences(
      columns,
    )} WHERE ${SQLeetEnginePrimaryKeyName}=@primaryKey;`;
    this.db.run(statement, {
      ...values,
      '@primaryKey': primaryKey,
    });
    return primaryKey;
  }

  async updateOrCreate<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey> {
    try {
      await this.update(tableName, primaryKey, changes);
    } catch (error) {
      const isRecordNotFound = error instanceof RecordNotFoundError;
      if (isRecordNotFound) {
        await this.create(tableName, primaryKey, changes);
      } else {
        throw error;
      }
    }
    return primaryKey;
  }

  async isSupported(): Promise<void> {
    if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00));
      if (module instanceof WebAssembly.Module) {
        if (new WebAssembly.Instance(module) instanceof WebAssembly.Instance) {
          return;
        }
      }
    }
    throw new UnsupportedError('WebAssembly is not supported.');
  }
}
