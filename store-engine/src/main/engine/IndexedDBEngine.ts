import CRUDEngine from './CRUDEngine';
import Dexie from 'dexie';
import RecordAlreadyExistsError from './error/RecordAlreadyExistsError';
import RecordTypeError from './error/RecordTypeError';
import RecordNotFoundError from './error/RecordNotFoundError';

export interface DexieInstance extends Dexie {
  [index: string]: any;
}

export default class IndexedDBEngine implements CRUDEngine {
  public storeName: string = '';

  constructor(private db?: DexieInstance) {}

  init(storeName: string): Promise<any> {
    if (this.db) {
      this.storeName = this.db.name;
    } else {
      this.storeName = storeName;
      this.db = new Dexie(this.storeName);
    }
    return Promise.resolve(this.db);
  }

  purge(): Promise<void> {
    return this.db ? this.db.delete() : Dexie.delete(this.storeName);
  }

  public create<T>(tableName: string, primaryKey: string, entity: T): Promise<string> {
    if (entity) {
      return this.db![tableName].add(entity, primaryKey).catch((error: Dexie.DexieError) => {
        if (error instanceof Dexie.ConstraintError) {
          const message: string = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
          throw new RecordAlreadyExistsError(message);
        } else {
          throw error;
        }
      });
    }
    const message: string = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
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
    return Promise.resolve()
      .then(() => {
        return this.db![tableName].get(primaryKey);
      })
      .then((record: T) => {
        if (record) {
          return record;
        }
        const message: string = `Record "${primaryKey}" in "${tableName}" could not be found.`;
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
    return this.db![tableName].update(primaryKey, changes).then((updatedRecords: number) => primaryKey);
  }
}
