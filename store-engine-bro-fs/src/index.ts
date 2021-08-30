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

import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';
import * as fs from 'bro-fs';
import * as path from 'path';

export interface FileSystemEngineOptions {
  fileExtension: string;
  size: number;
  type: number;
}

const TEN_MEGABYTES = 1024 * 1024 * 10;

export class FileSystemEngine implements CRUDEngine {
  public storeName = '';

  private autoIncrementedPrimaryKey: number = 1;
  private config: FileSystemEngineOptions = {
    fileExtension: '.dat',
    size: TEN_MEGABYTES,
    type: typeof window === 'undefined' ? 0 : window.TEMPORARY,
  };

  constructor() {}

  async isSupported(): Promise<void> {
    if (typeof window === 'undefined' || !fs.isSupported()) {
      const message = `File and Directory Entries API is not available on your platform.`;
      throw new StoreEngineError.UnsupportedError(message);
    }
  }

  // eslint-disable-next-line no-undef
  async init(storeName = '', options?: FileSystemEngineOptions): Promise<FileSystem> {
    await this.isSupported();
    this.config = {...this.config, ...options};
    this.storeName = storeName;
    // eslint-disable-next-line no-undef
    const fileSystem: FileSystem = await fs.init({bytes: this.config.size, type: this.config.type});
    await fs.mkdir(this.storeName);
    return fileSystem;
  }

  public async clearTables(): Promise<void> {
    const files = await fs.readdir(this.storeName);
    const tableNames = files.map(file => path.join(this.storeName, file.name));
    await Promise.all(tableNames.map(tableName => this.deleteAll(tableName)));
  }

  private createDirectoryPath(tableName: string): string {
    return `${this.storeName}/${tableName}`;
  }

  private createFilePath<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): string {
    const directory = this.createDirectoryPath(tableName);
    return `${directory}/${primaryKey}${this.config.fileExtension}`;
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

    const filePath = this.createFilePath(tableName, primaryKey);
    const isExistent = await fs.exists(filePath);

    if (isExistent) {
      const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
      throw new StoreEngineError.RecordAlreadyExistsError(message);
    } else {
      let data: string;
      try {
        data = JSON.stringify(entity);
      } catch (error) {
        data = String(entity);
      }

      await fs.writeFile(filePath, data);
      return primaryKey;
    }
  }

  async delete<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): Promise<PrimaryKey> {
    const filePath = this.createFilePath(tableName, primaryKey);
    await fs.unlink(filePath);
    return primaryKey;
  }

  async deleteAll(tableName: string): Promise<boolean> {
    const primaryKeys = await this.readAllPrimaryKeys(tableName);
    const promises = primaryKeys.map(primaryKey => this.delete(tableName, primaryKey));

    try {
      await Promise.all(promises);
      return true;
    } catch (error) {
      return false;
    }
  }

  async read<EntityType = Object, PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): Promise<EntityType> {
    const filePath = this.createFilePath(tableName, primaryKey);
    let data: string;
    try {
      data = await fs.readFile(filePath, {type: 'Text'});
    } catch (error) {
      const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
      throw new StoreEngineError.RecordNotFoundError(message);
    }

    try {
      const parsed = JSON.parse(data);
      return parsed;
    } catch (error) {
      return data as any;
    }
  }

  async readAll<T>(tableName: string): Promise<T[]> {
    const primaryKeys = await this.readAllPrimaryKeys(tableName);
    const promises: Promise<T>[] = [];

    for (const primaryKey of primaryKeys) {
      promises.push(this.read(tableName, primaryKey));
    }

    return Promise.all(promises);
  }

  async readAllPrimaryKeys(tableName: string): Promise<string[]> {
    const directoryPath = this.createDirectoryPath(tableName);

    // eslint-disable-next-line no-undef
    let entries: FileEntry[];
    try {
      entries = await fs.readdir(directoryPath, {deep: true});
    } catch (error) {
      entries = [];
    }

    // eslint-disable-next-line no-undef
    const names = entries.map((entry: FileEntry) => `${entry.name}`);

    const primaryKeys: string[] = [];

    for (const name of names.sort()) {
      const nameWithoutExtension = name.substr(0, name.indexOf('.'));
      primaryKeys.push(nameWithoutExtension);
    }

    return primaryKeys;
  }

  async update<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey> {
    const filePath = this.createFilePath(tableName, primaryKey);
    let record = await this.read(tableName, primaryKey);
    if (typeof record === 'string') {
      record = JSON.parse(record);
    }
    const updatedRecord: Object = {...record, ...changes};
    const updatedRecord_1 = JSON.stringify(updatedRecord);
    await fs.writeFile(filePath, updatedRecord_1);
    return primaryKey;
  }

  async purge(): Promise<void> {
    await fs.rmdir(this.storeName);
  }

  async updateOrCreate<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey> {
    let internalPrimaryKey;

    try {
      internalPrimaryKey = await this.update(tableName, primaryKey, changes);
    } catch (error) {
      if (
        error instanceof StoreEngineError.RecordNotFoundError ||
        (error as Error).constructor.name === StoreEngineError.RecordNotFoundError.name
      ) {
        internalPrimaryKey = await this.create(tableName, primaryKey, changes);
      } else {
        throw error;
      }
    }
    return internalPrimaryKey;
  }
}
