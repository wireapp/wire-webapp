import CRUDEngine from './CRUDEngine';
import {RecordAlreadyExistsError, RecordNotFoundError, RecordTypeError} from './error/';

export interface MemoryStore {
  [index: string]: {[index: string]: any};
}

export default class MemoryEngine implements CRUDEngine {
  public storeName = '';
  private readonly stores: MemoryStore = {};

  public async isSupported(): Promise<void> {
    // Always available
  }

  public async init(storeName: string): Promise<MemoryStore> {
    this.storeName = storeName;
    this.stores[this.storeName] = this.stores[this.storeName] || {};
    return this.stores;
  }

  public async purge(): Promise<void> {
    delete this.stores[this.storeName];
  }

  private prepareTable(tableName: string) {
    if (!this.stores[this.storeName][tableName]) {
      this.stores[this.storeName][tableName] = {};
    }
  }

  public create<T>(tableName: string, primaryKey: string, entity: T): Promise<string> {
    if (entity) {
      this.prepareTable(tableName);

      const record = this.stores[this.storeName][tableName][primaryKey];

      if (record) {
        const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
        const error = new RecordAlreadyExistsError(message);
        return Promise.reject(error);
      }

      this.stores[this.storeName][tableName][primaryKey] = entity;
      return Promise.resolve(primaryKey);
    }

    const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
    return Promise.reject(new RecordTypeError(message));
  }

  public delete(tableName: string, primaryKey: string): Promise<string> {
    this.prepareTable(tableName);
    return Promise.resolve().then(() => {
      delete this.stores[this.storeName][tableName][primaryKey];
      return primaryKey;
    });
  }

  public deleteAll(tableName: string): Promise<boolean> {
    return Promise.resolve().then(() => {
      delete this.stores[this.storeName][tableName];
      return true;
    });
  }

  public read<T>(tableName: string, primaryKey: string): Promise<T> {
    this.prepareTable(tableName);
    const record = this.stores[this.storeName][tableName][primaryKey];

    if (record) {
      return Promise.resolve(record);
    } else {
      const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
      return Promise.reject(new RecordNotFoundError(message));
    }
  }

  public readAll<T>(tableName: string): Promise<T[]> {
    this.prepareTable(tableName);
    const promises: Promise<T>[] = [];

    for (const primaryKey of Object.keys(this.stores[this.storeName][tableName])) {
      promises.push(this.read(tableName, primaryKey));
    }

    return Promise.all(promises);
  }

  public readAllPrimaryKeys(tableName: string): Promise<string[]> {
    this.prepareTable(tableName);
    return Promise.resolve(Object.keys(this.stores[this.storeName][tableName]));
  }

  public update(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    this.prepareTable(tableName);
    return this.read(tableName, primaryKey)
      .then((entity: Object) => {
        return {...entity, ...changes};
      })
      .then((updatedEntity: Object) => {
        this.stores[this.storeName][tableName][primaryKey] = updatedEntity;
        return primaryKey;
      });
  }

  public updateOrCreate(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    this.prepareTable(tableName);
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
    this.prepareTable(tableName);
    return this.read(tableName, primaryKey).then((record: any) => {
      if (typeof record === 'string') {
        record += additions;
      } else {
        const message = `Cannot append text to record "${primaryKey}" because it's not a string.`;
        throw new RecordTypeError(message);
      }
      this.stores[this.storeName][tableName][primaryKey] = record;
      return primaryKey;
    });
  }
}
