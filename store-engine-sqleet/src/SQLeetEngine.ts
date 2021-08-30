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

import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';
import * as websql from '@wireapp/websql';
import fs from 'fs';

import {
  RESERVED_COLUMN,
  SQLeetEnginePrimaryKeyName,
  SQLiteDatabaseDefinition,
  SQLiteProvidedSchema,
  SQLiteTableDefinition,
  SQLiteType,
  createTableIfNotExists,
  escape,
  getFormattedColumnsFromColumns,
  getFormattedColumnsFromTableName,
  getProtectedColumnReferences,
  hashColumnName,
  isSingleColumnTable,
} from './SchemaConverter';

declare const WebAssembly: any;

export class SQLeetEngine implements CRUDEngine {
  private autoIncrementedPrimaryKey: number = 1;
  private readonly db: websql.Database;
  private readonly schema: SQLiteDatabaseDefinition<string> = {};
  public storeName = '';

  constructor(
    private readonly workerLocation: string,
    providedSchema: SQLiteProvidedSchema<string>,
    private readonly encryptionKey: string,
    private readonly nodeDatabaseDir?: string,
  ) {
    // Map single column to SQL entity
    for (const [tableName, entity] of Object.entries(providedSchema)) {
      const isSingleColumnTable = typeof entity === 'string';
      this.schema[tableName] = isSingleColumnTable
        ? {[RESERVED_COLUMN]: entity as SQLiteType}
        : (entity as SQLiteTableDefinition<string>);
    }

    if (nodeDatabaseDir) {
      fs.mkdirSync(nodeDatabaseDir, {recursive: true});
    }

    try {
      this.db = new websql.Database(this.workerLocation, {
        allowMainWebWorker: true,
        allowWebWorkerFallback: true,
      });
    } catch (error) {
      throw new Error(`An error happened while initializing the engine: ${(error as Error).message}`);
    }
  }

  async init(storeName: string): Promise<websql.Database> {
    await this.isSupported();

    this.storeName = storeName;
    await this.db.mount({key: this.encryptionKey}, this.storeName, this.nodeDatabaseDir);

    // Create tables
    const statement = Object.entries(this.schema)
      .map(([tableName, table]) => createTableIfNotExists(tableName, table))
      .join('');
    await this.db.run(statement);

    return this.db;
  }

  async clearTables(): Promise<void> {
    const tableNames = Object.keys(this.schema);
    await Promise.all(tableNames.map(tableName => this.deleteAll(tableName)));
  }

  async export(): Promise<string> {
    return this.db.export('utf8');
  }

  async purge(): Promise<void> {
    // Databases must be closed, when you're finished with them, or the memory consumption will grow forever
    if (this.db) {
      await this.db.close();
      await this.db.wipe(this.storeName);
    }
  }

  private buildValues<EntityType = Record<string, SQLiteType>>(
    tableName: string,
    providedEntities: EntityType,
  ): {columns: Record<string, string>; values: Record<string, any>} {
    const table = this.schema[tableName];
    if (!table) {
      throw new Error(`Table "${tableName}" does not exist.`);
    }

    if (providedEntities instanceof Object) {
      for (const [key, property] of Object.entries(providedEntities)) {
        if (property === null || property === undefined) {
          delete (providedEntities as any)[key];
        }
      }
    }

    // If the table contains the single magic column then convert it
    const entities = isSingleColumnTable(table)
      ? ({[RESERVED_COLUMN]: providedEntities} as any as EntityType)
      : (providedEntities as EntityType);

    const columns: Record<string, string> = {};
    const values: Record<string, any> = {};
    for (const entity in entities) {
      // Ensure the column name exists in the scheme as a first line of defense against SQL injection
      if (typeof table[entity] !== 'string') {
        continue;
      }
      let value: string | EntityType[Extract<keyof EntityType, string>] = entities[entity];
      // Stringify objects for the database
      if (table[entity] === SQLiteType.JSON || (table[entity] === SQLiteType.JSON_OR_TEXT && value instanceof Object)) {
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

  private mapJSONProperties<EntityType = Object>(
    table: Record<string, SQLiteType>,
    entities: EntityType[],
  ): EntityType[] {
    for (const record in entities) {
      for (const column in entities[record]) {
        if (table[column] === SQLiteType.JSON) {
          entities[record][column] = JSON.parse(entities[record][column] as any);
        } else if (table[column] === SQLiteType.JSON_OR_TEXT) {
          try {
            entities[record][column] = JSON.parse(entities[record][column] as any);
          } catch (error) {}
        }
      }
    }

    return entities;
  }

  async create<EntityType = Object, PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
    entity: EntityType,
  ): Promise<PrimaryKey> {
    if (!entity) {
      const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
      throw new StoreEngineError.RecordTypeError(message);
    }
    if (primaryKey === undefined) {
      primaryKey = this.autoIncrementedPrimaryKey as unknown as PrimaryKey;
      this.autoIncrementedPrimaryKey += 1;
    }
    const {columns, values} = this.buildValues(tableName, entity);
    const newValues = Object.keys(values).join(',');
    const escapedTableName = escape(tableName);
    const statement = `INSERT INTO ${escapedTableName} (${getFormattedColumnsFromColumns(
      columns,
      true,
    )}) VALUES (@primaryKey,${newValues});`;
    try {
      await this.db.run(statement, {
        ...values,
        '@primaryKey': primaryKey,
      });
    } catch (error) {
      if ((error as Error).message.startsWith(`UNIQUE constraint failed: `)) {
        const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
        throw new StoreEngineError.RecordAlreadyExistsError(message);
      } else {
        throw error;
      }
    }
    return primaryKey;
  }

  async delete<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): Promise<PrimaryKey> {
    const escapedTableName = escape(tableName);
    const statement = `DELETE FROM ${escapedTableName} WHERE ${SQLeetEnginePrimaryKeyName}=@primaryKey;`;
    await this.db.run(statement, {
      '@primaryKey': primaryKey,
    });
    return primaryKey;
  }

  async deleteAll(tableName: string): Promise<boolean> {
    const escapedTableName = escape(tableName);
    const statement = `DELETE FROM ${escapedTableName}`;
    await this.db.run(statement);
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
    const statement = await this.db.prepare(selectRecordStatement, {
      '@primaryKey': primaryKey,
    });
    const entities = await statement.getAsObject();
    const [record] = this.mapJSONProperties(table, entities);
    await statement.free();

    if (typeof record === 'undefined') {
      const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
      throw new StoreEngineError.RecordNotFoundError(message);
    }

    if (isSingleColumnTable(table)) {
      return record[RESERVED_COLUMN];
    }

    return record as EntityType;
  }

  async readAll<T>(tableName: string): Promise<T[]> {
    const table = this.schema[tableName];
    const columns = getFormattedColumnsFromTableName(table);
    const escapedTableName = escape(tableName);

    const selectRecordStatement = `SELECT ${columns} FROM ${escapedTableName};`;
    const statement = await this.db.prepare(selectRecordStatement);
    const entities = (await statement.getAsObject()) as T[];
    await statement.free();

    return this.mapJSONProperties(table, entities);
  }

  async readAllPrimaryKeys(tableName: string): Promise<string[]> {
    const escapedTableName = escape(tableName);
    const statement = `SELECT ${SQLeetEnginePrimaryKeyName} FROM ${escapedTableName};`;

    const record = await this.db.execute(statement);
    if (record[0]?.values) {
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
    const references = getProtectedColumnReferences(columns);
    const statement = `UPDATE ${escapedTableName} SET ${references} WHERE ${SQLeetEnginePrimaryKeyName}=@primaryKey;`;
    await this.db.run(statement, {
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
      const isRecordNotFound =
        error instanceof StoreEngineError.RecordNotFoundError ||
        (error as Error).constructor.name === StoreEngineError.RecordNotFoundError.name;
      if (isRecordNotFound) {
        return this.create(tableName, primaryKey, changes);
      }
      throw error;
    }
    return primaryKey;
  }

  /** Should be called when done with all database operations. In Node.js it is important to call this function when done, otherwise the Node.js "process" cannot finish. */
  async close(): Promise<void> {
    await this.db.close();
    const workerInstance = await this.db._getWorkerInstance();
    if (workerInstance.terminate && typeof workerInstance.terminate == 'function') {
      workerInstance.terminate();
    }
  }

  /** Should be called in browser environments to persist data in IndexedDB. Otherwise the data will be lost as it only exists in memory. */
  save(): Promise<void> {
    return this.db.saveChanges();
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
    throw new StoreEngineError.UnsupportedError('WebAssembly is not supported.');
  }
}
