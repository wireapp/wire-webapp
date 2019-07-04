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
  PathValidationError,
  RecordAlreadyExistsError,
  RecordNotFoundError,
  RecordTypeError,
  UnsupportedError,
} from '@wireapp/store-engine/dist/commonjs/engine/error/';
import fs from 'fs-extra';
import path from 'path';

export class FileEngine implements CRUDEngine {
  [index: string]: any;

  public storeName = '';
  public options: {fileExtension: string} = {
    fileExtension: '.dat',
  };
  // Using a reference to Node.js' "path" module to influence the platform-specific behaviour in our tests
  public static path: any = path;

  public static enforcePathRestrictions(givenTrustedRoot: string, givenPath: string): string {
    const trustedRoot = FileEngine.path.resolve(givenTrustedRoot);

    const trustedRootDetails = FileEngine.path.parse(trustedRoot);
    if (trustedRootDetails.root === trustedRootDetails.dir && trustedRootDetails.base === '') {
      const message = `"${trustedRoot}" cannot be the root of the filesystem.`;
      throw new PathValidationError(message);
    }

    const unsafePath = FileEngine.path.resolve(trustedRoot, givenPath);
    if (unsafePath.startsWith(trustedRoot) === false) {
      const message = `Path traversal has been detected. Allowed path was "${trustedRoot}" but tested path "${givenPath}" attempted to reach "${unsafePath}"`;
      throw new PathValidationError(message);
    }

    return unsafePath;
  }

  constructor(private readonly baseDirectory = './') {}

  public async isSupported(): Promise<void> {
    const isNodeOrElectron = typeof process === 'object';

    if (!isNodeOrElectron) {
      const message = `Node.js File System Module is not available on your platform.`;
      throw new UnsupportedError(message);
    }
  }

  public async init(storeName = '', options?: {fileExtension: string}): Promise<string> {
    await this.isSupported();

    FileEngine.enforcePathRestrictions(this.baseDirectory, storeName);
    this.storeName = FileEngine.path.resolve(this.baseDirectory, storeName);
    await fs.ensureDir(this.storeName);

    this.options = {...this.options, ...options};
    return this.storeName;
  }

  public purge(): Promise<void> {
    return fs.remove(this.storeName);
  }

  public async create<T>(tableName: string, primaryKey: string, entity: any): Promise<string> {
    if (entity) {
      const filePath = this.resolvePath(tableName, primaryKey);
      if (typeof entity === 'object') {
        try {
          entity = JSON.stringify(entity);
        } catch (error) {
          entity = entity.toString();
        }
      }

      try {
        await fs.writeFile(filePath, entity, {flag: 'wx'});
        return primaryKey;
      } catch (error) {
        if (error.code === 'ENOENT') {
          await fs.outputFile(filePath, entity);
          return primaryKey;
        } else if (error.code === 'EEXIST') {
          const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
          throw new RecordAlreadyExistsError(message);
        }
        throw error;
      }
    } else {
      const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
      throw new RecordTypeError(message);
    }
  }

  async delete(tableName: string, primaryKey: string): Promise<string> {
    const file = this.resolvePath(tableName, primaryKey);
    await fs.remove(file);
    return primaryKey;
  }

  async deleteAll(tableName: string): Promise<boolean> {
    const directory = this.resolvePath(tableName);

    try {
      await fs.remove(directory);
      return true;
    } catch (error) {
      return false;
    }
  }

  async read<T>(tableName: string, primaryKey: string): Promise<T> {
    const file = await this.resolvePath(tableName, primaryKey);
    let data: any;

    try {
      data = await fs.readFile(file, {encoding: 'utf8', flag: 'r'});
    } catch (error) {
      if (error.code === 'ENOENT') {
        const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
        throw new RecordNotFoundError(message);
      }
      throw error;
    }

    try {
      data = JSON.parse(data);
    } catch (error) {
      // No JSON found but that's okay
    }

    return data;
  }

  async readAll<T>(tableName: string): Promise<T[]> {
    const directory = this.resolvePath(tableName);
    const files = await fs.readdir(directory);
    const recordNames = files.map(file => FileEngine.path.basename(file, FileEngine.path.extname(file)));
    const promises = recordNames.map(primaryKey => this.read<T>(tableName, primaryKey));
    return Promise.all(promises);
  }

  public async readAllPrimaryKeys(tableName: string): Promise<string[]> {
    const directory = this.resolvePath(tableName);
    let files: string[];

    try {
      files = await fs.readdir(directory);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }

    return files.map(file => FileEngine.path.parse(file).name);
  }

  public async append(tableName: string, primaryKey: string, additions: string): Promise<string> {
    const file = this.resolvePath(tableName, primaryKey);
    let record = await this.read(tableName, primaryKey);
    if (typeof record === 'string') {
      record += additions;
    } else {
      const message = `Cannot append text to record "${primaryKey}" because it's not a string.`;
      throw new RecordTypeError(message);
    }
    const updatedRecord = record;
    await fs.outputFile(file, updatedRecord);
    return primaryKey;
  }

  public async update(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    const file = this.resolvePath(tableName, primaryKey);
    let record = await this.read(tableName, primaryKey);
    if (typeof record === 'string') {
      record = JSON.parse(record);
    }
    const updatedRecord = JSON.stringify({...record, ...changes});
    await fs.outputFile(file, updatedRecord);
    return primaryKey;
  }

  public async updateOrCreate(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    try {
      await this.update(tableName, primaryKey, changes);
    } catch (error) {
      if (error instanceof RecordNotFoundError) {
        return this.create(tableName, primaryKey, changes);
      }
      throw error;
    }
    return primaryKey;
  }

  private resolvePath(tableName: string, primaryKey = ''): string {
    const tableNamePath = FileEngine.enforcePathRestrictions(this.storeName, tableName);
    const primaryKeyPath = FileEngine.enforcePathRestrictions(
      tableNamePath,
      primaryKey ? `${primaryKey}${this.options.fileExtension}` : '',
    );

    return primaryKeyPath;
  }
}
