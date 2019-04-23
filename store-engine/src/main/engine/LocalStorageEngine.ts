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

import {CRUDEngine} from './CRUDEngine';
import {isBrowser} from './EnvironmentUtil';
import {RecordAlreadyExistsError, RecordNotFoundError, RecordTypeError, UnsupportedError} from './error/';

export class LocalStorageEngine implements CRUDEngine {
  public storeName = '';

  public async isSupported(): Promise<void> {
    if (!isBrowser() || !window.localStorage) {
      const message = `LocalStorage is not available on your platform.`;
      throw new UnsupportedError(message);
    }
  }

  public async init(storeName: string): Promise<Storage> {
    await this.isSupported();
    this.storeName = storeName;
    return window.localStorage;
  }

  public async purge(): Promise<void> {
    window.localStorage.clear();
  }

  private createKey(tableName: string, primaryKey: string): string {
    return `${this.storeName}@${tableName}@${primaryKey}`;
  }

  public create<T>(tableName: string, primaryKey: string, entity: T): Promise<string> {
    if (entity) {
      const key: string = this.createKey(tableName, primaryKey);
      return this.read(tableName, primaryKey)
        .catch(error => {
          if (error instanceof RecordNotFoundError) {
            return undefined;
          }
          throw error;
        })
        .then(record => {
          if (record) {
            const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
            throw new RecordAlreadyExistsError(message);
          } else {
            if (typeof record === 'string') {
              window.localStorage.setItem(key, String(entity));
            } else {
              window.localStorage.setItem(key, JSON.stringify(entity));
            }
            return primaryKey;
          }
        });
    }
    const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
    return Promise.reject(new RecordTypeError(message));
  }

  public delete(tableName: string, primaryKey: string): Promise<string> {
    return Promise.resolve().then(() => {
      const key: string = this.createKey(tableName, primaryKey);
      window.localStorage.removeItem(key);
      return primaryKey;
    });
  }

  public deleteAll(tableName: string): Promise<boolean> {
    return Promise.resolve().then(() => {
      Object.keys(localStorage).forEach((key: string) => {
        const prefix = `${this.storeName}@${tableName}@`;
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    });
  }

  public read<T>(tableName: string, primaryKey: string): Promise<T> {
    return Promise.resolve().then(() => {
      const key = `${this.storeName}@${tableName}@${primaryKey}`;
      const record = window.localStorage.getItem(key);
      if (record) {
        try {
          return JSON.parse(record);
        } catch (error) {
          return record;
        }
      }
      const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
      throw new RecordNotFoundError(message);
    });
  }

  public readAll<T>(tableName: string): Promise<T[]> {
    const promises: Promise<T>[] = [];

    Object.keys(localStorage).forEach((key: string) => {
      const prefix = `${this.storeName}@${tableName}@`;
      if (key.startsWith(prefix)) {
        const primaryKey = key.replace(prefix, '');
        promises.push(this.read(tableName, primaryKey));
      }
    });

    return Promise.all(promises);
  }

  public readAllPrimaryKeys(tableName: string): Promise<string[]> {
    const primaryKeys: string[] = [];

    Object.keys(localStorage).forEach((primaryKey: string) => {
      const prefix = `${this.storeName}@${tableName}@`;
      if (primaryKey.startsWith(prefix)) {
        primaryKeys.push(primaryKey.replace(prefix, ''));
      }
    });

    return Promise.resolve(primaryKeys);
  }

  public update(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    return this.read(tableName, primaryKey)
      .then((entity: Object) => {
        return {...entity, ...changes};
      })
      .then((updatedEntity: Object) => {
        return this.create(tableName, primaryKey, updatedEntity).catch(error => {
          if (error instanceof RecordAlreadyExistsError) {
            return this.delete(tableName, primaryKey).then(() => this.create(tableName, primaryKey, updatedEntity));
          } else {
            throw error;
          }
        });
      });
  }

  public updateOrCreate(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    return this.update(tableName, primaryKey, changes)
      .catch(error => {
        if (error instanceof RecordNotFoundError) {
          return this.create(tableName, primaryKey, changes);
        }
        throw error;
      })
      .then(() => primaryKey);
  }

  append(tableName: string, primaryKey: string, additions: string): Promise<string> {
    return this.read(tableName, primaryKey).then((record: any) => {
      if (typeof record === 'string') {
        record += additions;
      } else {
        const message = `Cannot append text to record "${primaryKey}" because it's not a string.`;
        throw new RecordTypeError(message);
      }

      const key: string = this.createKey(tableName, primaryKey);
      window.localStorage.setItem(key, record);

      return primaryKey;
    });
  }
}
