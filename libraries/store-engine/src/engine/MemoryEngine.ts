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

import is from '@sindresorhus/is';

import {CRUDEngine} from './CRUDEngine';
import {RecordAlreadyExistsError, RecordNotFoundError, RecordTypeError} from './error';

export type MemoryStore = Record<string, Record<string, any>>;

export class MemoryEngine implements CRUDEngine {
  public storeName = '';
  private readonly stores: MemoryStore = {};
  private autoIncrementedPrimaryKey: number = 1;

  private get store(): Record<string, Record<string, any>> {
    return this.stores[this.storeName]!;
  }

  private getTable(tableName: string): Record<PropertyKey, any> {
    return this.store[tableName]! as Record<PropertyKey, any>;
  }

  create<EntityType, PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
    entity: EntityType,
  ): Promise<PrimaryKey> {
    if (!is.nullOrUndefined(entity)) {
      this.prepareTable(tableName);

      if (primaryKey === undefined) {
        primaryKey = this.autoIncrementedPrimaryKey as unknown as PrimaryKey;
        this.autoIncrementedPrimaryKey += 1;
      }

      const table = this.getTable(tableName);
      const record = table[primaryKey as PropertyKey];

      if (!is.nullOrUndefined(record)) {
        const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
        const error = new RecordAlreadyExistsError(message);
        return Promise.reject(error);
      }

      table[primaryKey as PropertyKey] = entity;

      return Promise.resolve(primaryKey);
    }

    const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
    return Promise.reject(new RecordTypeError(message));
  }

  public async clearTables(): Promise<void> {
    const tableNames = Object.keys(this.stores);
    await Promise.all(tableNames.map(tableName => this.deleteAll(tableName)));
  }

  public async delete<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): Promise<PrimaryKey> {
    this.prepareTable(tableName);
    delete this.getTable(tableName)[primaryKey as PropertyKey];
    return primaryKey;
  }

  public async deleteAll(tableName: string): Promise<boolean> {
    delete this.store[tableName];
    return true;
  }

  public async init(storeName: string): Promise<MemoryStore> {
    return this.assignDb(storeName, {});
  }

  public async initWithObject<ObjectType = Object>(storeName: string, object: ObjectType): Promise<MemoryStore> {
    return this.assignDb(storeName, object);
  }

  private assignDb<ObjectType = Object>(storeName: string, object: ObjectType): MemoryStore {
    this.storeName = storeName;
    this.stores[this.storeName] = (
      Boolean(this.stores[this.storeName]) ? this.stores[this.storeName] : object
    ) as Record<string, Record<string, any>>;
    return this.stores;
  }

  public async isSupported(): Promise<void> {
    // Always available
  }

  public async purge(): Promise<void> {
    delete this.stores[this.storeName];
  }

  public read<EntityType = Object, PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
  ): Promise<EntityType> {
    this.prepareTable(tableName);
    const table = this.getTable(tableName);
    if (Object.prototype.hasOwnProperty.call(table, primaryKey as PropertyKey)) {
      return Promise.resolve(table[primaryKey as PropertyKey]);
    }
    const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
    return Promise.reject(new RecordNotFoundError(message));
  }

  public readAll<T>(tableName: string): Promise<T[]> {
    this.prepareTable(tableName);
    const promises: Promise<T>[] = [];

    for (const primaryKey of Object.keys(this.getTable(tableName))) {
      promises.push(this.read(tableName, primaryKey));
    }

    return Promise.all(promises);
  }

  public readAllPrimaryKeys(tableName: string): Promise<string[]> {
    this.prepareTable(tableName);
    return Promise.resolve(Object.keys(this.getTable(tableName)));
  }

  public async update<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey> {
    this.prepareTable(tableName);
    const entity = await this.read(tableName, primaryKey);
    const updatedEntity = {...entity, ...changes};
    this.getTable(tableName)[primaryKey as PropertyKey] = updatedEntity;
    return primaryKey;
  }

  async updateOrCreate<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey> {
    this.prepareTable(tableName);
    try {
      await this.update(tableName, primaryKey, changes);
      return primaryKey;
    } catch (error) {
      if (error instanceof RecordNotFoundError) {
        const newPrimaryKey = await this.create(tableName, primaryKey, changes);
        return newPrimaryKey;
      }
      throw error;
    }
  }

  private prepareTable(tableName: string): void {
    if (!Boolean(this.stores[this.storeName])) {
      this.stores[this.storeName] = {};
    }
    if (!Boolean(this.store[tableName])) {
      this.store[tableName] = {};
    }
  }
}
