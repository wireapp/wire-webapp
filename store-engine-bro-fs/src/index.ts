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

import {CRUDEngine} from '@wireapp/store-engine';
import {
  RecordAlreadyExistsError,
  RecordNotFoundError,
  RecordTypeError,
  UnsupportedError,
} from '@wireapp/store-engine/dist/commonjs/engine/error/';
import * as fs from 'bro-fs';

export interface FileSystemEngineOptions {
  fileExtension: string;
  size: number;
  type: number;
}

const TEN_MEGABYTES = 1024 * 1024 * 10;

export class FileSystemEngine implements CRUDEngine {
  public storeName = '';

  constructor() {}

  private config: FileSystemEngineOptions = {
    fileExtension: '.dat',
    size: TEN_MEGABYTES,
    type: typeof window === 'undefined' ? 0 : window.TEMPORARY,
  };

  async isSupported(): Promise<void> {
    if (typeof window === 'undefined' || !fs.isSupported()) {
      const message = `File and Directory Entries API is not available on your platform.`;
      throw new UnsupportedError(message);
    }
  }

  async init(storeName = '', options?: FileSystemEngineOptions): Promise<FileSystem> {
    await this.isSupported();
    this.config = {...this.config, ...options};
    this.storeName = storeName;
    const fileSystem: FileSystem = await fs.init({type: this.config.type, bytes: this.config.size});
    await fs.mkdir(this.storeName);
    return fileSystem;
  }

  async append(tableName: string, primaryKey: string, additions: string): Promise<string> {
    const filePath = this.createFilePath(tableName, primaryKey);
    const record = await this.read(tableName, primaryKey);

    if (typeof record === 'string') {
      await fs.writeFile(filePath, record + additions);
      return primaryKey;
    } else {
      const message = `Cannot append text to record "${primaryKey}" because it's not a string.`;
      throw new RecordTypeError(message);
    }
  }

  async create<T>(tableName: string, primaryKey: string, entity: T): Promise<string> {
    if (!entity) {
      const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
      throw new RecordTypeError(message);
    }

    const filePath = this.createFilePath(tableName, primaryKey);
    const isExistent = await fs.exists(filePath);

    if (isExistent) {
      const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
      throw new RecordAlreadyExistsError(message);
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

  async delete(tableName: string, primaryKey: string): Promise<string> {
    const filePath = this.createFilePath(tableName, primaryKey);
    await fs.unlink(filePath);
    return primaryKey;
  }

  async deleteAll(tableName: string): Promise<boolean> {
    const primaryKeys = await this.readAllPrimaryKeys(tableName);
    const promises: Promise<string>[] = [];

    for (const primaryKey of primaryKeys) {
      promises.push(this.delete(tableName, primaryKey));
    }

    try {
      await Promise.all(promises);
      return true;
    } catch (error) {
      return false;
    }
  }

  async read<T>(tableName: string, primaryKey: string): Promise<T> {
    const filePath = this.createFilePath(tableName, primaryKey);
    let data: string;
    try {
      data = await fs.readFile(filePath, {type: 'Text'});
    } catch (error) {
      const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
      throw new RecordNotFoundError(message);
    }

    try {
      return JSON.parse(data);
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

    let entries: FileEntry[];
    try {
      entries = await fs.readdir(directoryPath, {deep: true});
    } catch (error) {
      entries = [];
    }

    const names = entries.map((entry: FileEntry) => entry.name);

    const primaryKeys: string[] = [];

    for (const name of names.sort()) {
      const nameWithoutExtension = name.substr(0, name.indexOf('.'));
      primaryKeys.push(nameWithoutExtension);
    }

    return primaryKeys;
  }

  update(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    const filePath = this.createFilePath(tableName, primaryKey);
    return this.read(tableName, primaryKey)
      .then((record: any) => {
        if (typeof record === 'string') {
          record = JSON.parse(record);
        }
        const updatedRecord: Object = {...record, ...changes};
        return JSON.stringify(updatedRecord);
      })
      .then((updatedRecord: any) => fs.writeFile(filePath, updatedRecord))
      .then(() => primaryKey);
  }

  async purge(): Promise<void> {
    await fs.rmdir(this.storeName);
  }

  updateOrCreate(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    return this.update(tableName, primaryKey, changes)
      .catch(error => {
        if (error instanceof RecordNotFoundError) {
          return this.create(tableName, primaryKey, changes);
        }
        throw error;
      })
      .then(() => primaryKey);
  }

  private createDirectoryPath(tableName: string): string {
    return `${this.storeName}/${tableName}`;
  }

  private createFilePath(tableName: string, primaryKey: string): string {
    const directory = this.createDirectoryPath(tableName);
    return `${directory}/${primaryKey}${this.config.fileExtension}`;
  }
}
