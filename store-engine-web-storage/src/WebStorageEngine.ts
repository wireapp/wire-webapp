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

export class WebStorageEngine implements CRUDEngine {
  private autoIncrementedPrimaryKey: number = 1;
  private readonly webStorage: Storage;
  public storeName = '';

  constructor(useSessionStorage: boolean = false) {
    this.webStorage = useSessionStorage ? window.sessionStorage : window.localStorage;
  }

  public append<PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
    additions: string,
  ): Promise<PrimaryKey> {
    return this.read(tableName, primaryKey).then((record: any) => {
      if (typeof record === 'string') {
        record += additions;
      } else {
        const message = `Cannot append text to record "${primaryKey}" because it's not a string.`;
        throw new StoreEngineError.RecordTypeError(message);
      }

      const key = this.createKey<PrimaryKey>(tableName, primaryKey);
      this.webStorage.setItem(`${key}`, record);

      return primaryKey;
    });
  }

  public create<EntityType, PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
    entity: EntityType,
  ): Promise<PrimaryKey> {
    if (entity) {
      const internalPrimaryKey: any = this.createKey<PrimaryKey>(tableName, primaryKey);
      return this.read(tableName, primaryKey)
        .catch(error => {
          if (error instanceof StoreEngineError.RecordNotFoundError) {
            return undefined;
          }
          throw error;
        })
        .then(record => {
          if (record) {
            const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
            throw new StoreEngineError.RecordAlreadyExistsError(message);
          } else {
            if (typeof entity === 'string') {
              this.webStorage.setItem(`${internalPrimaryKey}`, entity);
            } else {
              this.webStorage.setItem(`${internalPrimaryKey}`, JSON.stringify(entity));
            }

            const keyWithoutPrefix = internalPrimaryKey.replace(this.createPrefix(tableName), '');
            const numericKey = parseInt(keyWithoutPrefix, 10);
            const returnKey = isNaN(numericKey) ? keyWithoutPrefix : numericKey;

            return returnKey as PrimaryKey;
          }
        });
    }
    const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
    return Promise.reject(new StoreEngineError.RecordTypeError(message));
  }

  public delete<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): Promise<PrimaryKey> {
    return Promise.resolve().then(() => {
      const key = this.createKey<PrimaryKey>(tableName, primaryKey);
      this.webStorage.removeItem(`${key}`);
      return primaryKey;
    });
  }

  public deleteAll(tableName: string): Promise<boolean> {
    return Promise.resolve().then(() => {
      Object.keys(localStorage).forEach((key: string) => {
        const prefix = this.createPrefix(tableName);
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    });
  }

  public async init(storeName: string): Promise<Storage> {
    await this.isSupported();
    this.storeName = storeName;
    return window.localStorage;
  }

  public async isSupported(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) {
      const message = `LocalStorage is not available on your platform.`;
      throw new StoreEngineError.UnsupportedError(message);
    }
  }

  public async purge(): Promise<void> {
    this.webStorage.clear();
  }

  public read<EntityType = Object, PrimaryKey = string>(
    tableName: string,
    primaryKey: PrimaryKey,
  ): Promise<EntityType> {
    return Promise.resolve().then(() => {
      const key = `${this.storeName}@${tableName}@${primaryKey}`;
      const record = this.webStorage.getItem(key);
      if (record) {
        try {
          const parsed = JSON.parse(record);
          return parsed;
        } catch (error) {
          return record;
        }
      }
      const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
      throw new StoreEngineError.RecordNotFoundError(message);
    });
  }

  public readAll<T>(tableName: string): Promise<T[]> {
    const promises: Promise<T>[] = [];

    Object.keys(localStorage).forEach((key: string) => {
      const prefix = this.createPrefix(tableName);
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
      const prefix = this.createPrefix(tableName);
      if (primaryKey.startsWith(prefix)) {
        primaryKeys.push(primaryKey.replace(prefix, ''));
      }
    });

    return Promise.resolve(primaryKeys);
  }

  public update<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey> {
    return this.read(tableName, primaryKey)
      .then(entity => {
        return {...entity, ...changes};
      })
      .then(updatedEntity => {
        return this.create(tableName, primaryKey, updatedEntity).catch(error => {
          if (error instanceof StoreEngineError.RecordAlreadyExistsError) {
            return this.delete(tableName, primaryKey).then(() => this.create(tableName, primaryKey, updatedEntity));
          } else {
            throw error;
          }
        });
      });
  }

  public updateOrCreate<PrimaryKey = string, ChangesType = Object>(
    tableName: string,
    primaryKey: PrimaryKey,
    changes: ChangesType,
  ): Promise<PrimaryKey> {
    return this.update(tableName, primaryKey, changes)
      .catch(error => {
        if (error instanceof StoreEngineError.RecordNotFoundError) {
          return this.create(tableName, primaryKey, changes);
        }
        throw error;
      })
      .then(internalPrimaryKey => internalPrimaryKey);
  }

  private createKey<PrimaryKey = string>(tableName: string, primaryKey: PrimaryKey): PrimaryKey {
    if (primaryKey === undefined) {
      primaryKey = (this.autoIncrementedPrimaryKey as unknown) as PrimaryKey;
      this.autoIncrementedPrimaryKey += 1;
    }
    return (`${this.createPrefix(tableName)}${primaryKey}` as unknown) as PrimaryKey;
  }

  private createPrefix(tableName: string): string {
    return `${this.storeName}@${tableName}@`;
  }
}
