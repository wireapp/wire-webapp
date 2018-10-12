import Dexie from 'dexie';
import CRUDEngine from './CRUDEngine';
import {UnsupportedError} from './error/';
import RecordAlreadyExistsError from './error/RecordAlreadyExistsError';
import RecordNotFoundError from './error/RecordNotFoundError';
import RecordTypeError from './error/RecordTypeError';

export interface DexieInstance extends Dexie {
  [index: string]: any;
}

export default class IndexedDBEngine implements CRUDEngine {
  private db?: DexieInstance;
  public storeName = '';

  private canUseIndexedDB(): Promise<void> {
    const platform = typeof global === 'undefined' ? window : global;
    if ('indexedDB' in platform) {
      return new Promise((resolve, reject) => {
        const name = 'test';
        const DBOpenRequest = platform.indexedDB.open(name);
        DBOpenRequest.onerror = error => reject(error);
        DBOpenRequest.onsuccess = () => {
          const db = DBOpenRequest.result;
          db.close();
          const deleteRequest = platform.indexedDB.deleteDatabase(name);
          deleteRequest.onerror = error => reject(error);
          deleteRequest.onsuccess = () => resolve();
        };
      });
    } else {
      return Promise.reject(new Error('Could not find indexedDB in global scope'));
    }
  }

  public async isSupported(): Promise<void> {
    const message = `IndexedDB is not available on your platform.`;
    const unsupportedError = new UnsupportedError(message);

    try {
      // Check if IndexedDB is accessible (which won't be the case when browsing with Firefox in private mode)
      await this.canUseIndexedDB();
    } catch (error) {
      // This will be triggered on pages like "about:blank"
      throw unsupportedError;
    }
  }

  public async init(storeName: string): Promise<any> {
    await this.isSupported();
    this.db = new Dexie(storeName);
    this.storeName = this.db.name;
    return this.db;
  }

  public initWithDb(db: DexieInstance): Promise<DexieInstance> {
    this.db = db;
    this.storeName = this.db.name;
    return Promise.resolve(this.db);
  }

  public purge(): Promise<void> {
    return this.db ? this.db.delete() : Dexie.delete(this.storeName);
  }

  public create<T>(tableName: string, primaryKey: string, entity: T): Promise<string> {
    if (entity) {
      return this.db![tableName].add(entity, primaryKey).catch((error: Dexie.DexieError) => {
        if (error instanceof Dexie.ConstraintError) {
          const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
          throw new RecordAlreadyExistsError(message);
        } else {
          throw error;
        }
      });
    }
    const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
    return Promise.reject(new RecordTypeError(message));
  }

  public delete(tableName: string, primaryKey: string): Promise<string> {
    return Promise.resolve()
      .then(() => this.db![tableName].delete(primaryKey))
      .then(() => primaryKey);
  }

  public deleteAll(tableName: string): Promise<boolean> {
    return this.db![tableName].clear().then(() => true);
  }

  public read<T>(tableName: string, primaryKey: string): Promise<T> {
    return this.db![tableName].get(primaryKey).then((record: T) => {
      if (record) {
        return record;
      }
      const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
      throw new RecordNotFoundError(message);
    });
  }

  public readAll<T>(tableName: string): Promise<T[]> {
    return this.db![tableName].toArray();
  }

  public readAllPrimaryKeys(tableName: string): Promise<string[]> {
    return this.db![tableName].toCollection().keys();
  }

  public update(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    return this.db![tableName].update(primaryKey, changes).then((updatedRecords: number) => {
      if (updatedRecords === 0) {
        const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
        throw new RecordNotFoundError(message);
      }
      return primaryKey;
    });
  }

  public updateOrCreate(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    return this.db![tableName].put(changes, primaryKey);
  }

  public append(tableName: string, primaryKey: string, additions: string): Promise<string> {
    return this.db![tableName].get(primaryKey).then((record: any) => {
      if (typeof record === 'string') {
        record += additions;
      } else {
        const message = `Cannot append text to record "${primaryKey}" because it's not a string.`;
        throw new RecordTypeError(message);
      }
      return this.updateOrCreate(tableName, primaryKey, record);
    });
  }
}
