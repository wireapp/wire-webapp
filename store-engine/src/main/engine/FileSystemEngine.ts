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

import CRUDEngine from './CRUDEngine';
import {isBrowser} from './EnvironmentUtil';
import {RecordAlreadyExistsError, RecordNotFoundError, UnsupportedError} from './error';
import {RecordTypeError} from './error/';

const fs = require('bro-fs');

export type FileSystemEngineOptions = {
  fileExtension: string;
  type: number;
  size: number;
};

const TEN_MEGABYTES = 1024 * 1024 * 10;

export default class FileSystemEngine implements CRUDEngine {
  public storeName: string = '';

  private config: FileSystemEngineOptions = {
    fileExtension: '.dat',
    type: typeof window === 'undefined' ? 0 : window.TEMPORARY,
    size: TEN_MEGABYTES,
  };

  constructor() {}

  public async isSupported(): Promise<void> {
    if (!isBrowser() || !fs.isSupported()) {
      const message = `File and Directory Entries API is not available on your platform.`;
      throw new UnsupportedError(message);
    }
  }

  public async init(storeName: string = '', options?: FileSystemEngineOptions): Promise<FileSystem> {
    await this.isSupported();
    this.config = {...this.config, ...options};
    this.storeName = storeName;
    const fileSystem: FileSystem = await fs.init({type: this.config.type, bytes: this.config.size});
    await fs.mkdir(this.storeName);
    return fileSystem;
  }

  private createDirectoryPath(tableName: string): string {
    return `${this.storeName}/${tableName}`;
  }

  private createFilePath(tableName: string, primaryKey: string): string {
    const directory = this.createDirectoryPath(tableName);
    return `${directory}/${primaryKey}${this.config.fileExtension}`;
  }

  async append(tableName: string, primaryKey: string, additions: string): Promise<string> {
    const filePath = this.createFilePath(tableName, primaryKey);
    return this.read(tableName, primaryKey)
      .then((record: any) => {
        if (typeof record === 'string') {
          record += additions;
        } else {
          const message: string = `Cannot append text to record "${primaryKey}" because it's not a string.`;
          throw new RecordTypeError(message);
        }
        return record;
      })
      .then((updatedRecord: any) => fs.writeFile(filePath, updatedRecord))
      .then(() => primaryKey);
  }

  private async createDirectory(tableName: string): Promise<string> {
    const directoryPath = this.createDirectoryPath(tableName);
    await fs.mkdir(directoryPath);
    return directoryPath;
  }

  async create<T>(tableName: string, primaryKey: string, entity: T): Promise<string> {
    if (!entity) {
      const message: string = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
      throw new RecordTypeError(message);
    }

    const filePath = this.createFilePath(tableName, primaryKey);
    const isExistent = await fs.exists(filePath);

    if (isExistent) {
      const message: string = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
      throw new RecordAlreadyExistsError(message);
    } else {
      let data;
      try {
        data = JSON.stringify(entity);
      } catch (error) {
        data = entity;
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
    const promises: Array<Promise<string>> = [];

    for (const primaryKey of primaryKeys) {
      promises.push(this.delete(tableName, primaryKey));
    }

    return Promise.all(promises)
      .then(() => true)
      .catch(() => false);
  }

  async read<T>(tableName: string, primaryKey: string): Promise<T> {
    const filePath = this.createFilePath(tableName, primaryKey);
    try {
      const data = await fs.readFile(filePath, {type: 'Text'});
      try {
        return JSON.parse(data);
      } catch (error) {
        return data;
      }
    } catch (error) {
      const message: string = `Record "${primaryKey}" in "${tableName}" could not be found.`;
      throw new RecordNotFoundError(message);
    }
  }

  async readAll<T>(tableName: string): Promise<T[]> {
    const primaryKeys = await this.readAllPrimaryKeys(tableName);
    const promises: Array<Promise<T>> = [];

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
}
