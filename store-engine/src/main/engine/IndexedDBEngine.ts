import Dexie from 'dexie';
import CRUDEngine from './CRUDEngine';
import {LowDiskSpaceError, RecordTypeError, UnsupportedError} from './error/';
import RecordAlreadyExistsError from './error/RecordAlreadyExistsError';
import RecordNotFoundError from './error/RecordNotFoundError';

// @see https://dexie.org/docs/Typescript#create-a-subclass
export interface DexieInstance extends Dexie {
  [index: string]: any;
}

export default class IndexedDBEngine implements CRUDEngine {
  private db?: DexieInstance;
  public storeName = '';

  // Check if IndexedDB is accessible (which won't be the case when browsing with Firefox in private mode or being on
  // page "about:blank")
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
      return Promise.reject(new UnsupportedError('Could not find indexedDB in global scope'));
    }
  }

  // @see https://developers.google.com/web/updates/2017/08/estimating-available-storage-space
  private async hasEnoughQuota(): Promise<void> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const {quota, usage} = await navigator.storage.estimate();

      if (typeof quota === 'number' && typeof usage === 'number') {
        const diskIsFull = usage >= quota;
        if (diskIsFull) {
          const errorMessage = `Out of disk space. Using "${usage}" out of "${quota}" bytes.`;
          return Promise.reject(new LowDiskSpaceError(errorMessage));
        }
      }
    }

    return Promise.resolve();
  }

  public async isSupported(): Promise<void> {
    await this.canUseIndexedDB();
    await this.hasEnoughQuota();
  }

  public async init(storeName: string): Promise<DexieInstance> {
    await this.isSupported();
    return this.assignDb(new Dexie(storeName));
  }

  public initWithDb(db: DexieInstance): Promise<DexieInstance> {
    return Promise.resolve(this.assignDb(db));
  }

  // If you want to add listeners to the database and you don't care if it is a new database (init)
  // or an existing (initWithDB) one, then this method is the right place to do it.
  private assignDb(db: DexieInstance): DexieInstance {
    this.db = db;
    this.storeName = this.db.name;
    return this.db;
  }

  public purge(): Promise<void> {
    return this.db ? this.db.delete() : Dexie.delete(this.storeName);
  }

  private mapDatabaseError(error: Dexie.DexieError, tableName: string, primaryKey: string): Error {
    const isAlreadyExisting = error instanceof Dexie.ConstraintError;
    /** @see https://github.com/dfahlander/Dexie.js/issues/776 */
    const hasNotEnoughDiskSpace =
      error.name === Dexie.errnames.QuotaExceeded || (error.inner && error.inner.name === Dexie.errnames.QuotaExceeded);

    if (isAlreadyExisting) {
      const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
      return new RecordAlreadyExistsError(message);
    } else if (hasNotEnoughDiskSpace) {
      const message = `Cannot save "${primaryKey}" in "${tableName}" because there is low disk space.`;
      return new LowDiskSpaceError(message);
    } else {
      return error;
    }
  }

  public create<T>(tableName: string, primaryKey: string, entity: T): Promise<string> {
    if (entity) {
      return this.db![tableName].add(entity, primaryKey).catch((error: Dexie.DexieError) => {
        throw this.mapDatabaseError(error, tableName, primaryKey);
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
