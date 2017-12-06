import CRUDEngine from './CRUDEngine';
import {RecordAlreadyExistsError, RecordNotFoundError, RecordTypeError} from './error';

export default class LocalStorageEngine implements CRUDEngine {
  constructor(public storeName: string) {}

  public create<T>(tableName: string, primaryKey: string, entity: T): Promise<string> {
    if (entity) {
      const key: string = `${this.storeName}@${tableName}@${primaryKey}`;
      return Promise.resolve()
        .then(() => this.read(tableName, primaryKey))
        .catch(error => {
          if (error instanceof RecordNotFoundError) {
            return undefined;
          }
          throw error;
        })
        .then((record: T) => {
          if (record) {
            const message: string = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
            throw new RecordAlreadyExistsError(message);
          } else {
            window.localStorage.setItem(key, JSON.stringify(entity));
            return primaryKey;
          }
        });
    }
    const message: string = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
    return Promise.reject(new RecordTypeError(message));
  }

  public delete(tableName: string, primaryKey: string): Promise<string> {
    return Promise.resolve().then(() => {
      const key: string = `${this.storeName}@${tableName}@${primaryKey}`;
      window.localStorage.removeItem(key);
      return primaryKey;
    });
  }

  public deleteAll(tableName: string): Promise<boolean> {
    return Promise.resolve().then(() => {
      Object.keys(localStorage).forEach((key: string) => {
        const prefix: string = `${this.storeName}@${tableName}@`;
        if (key.startsWith(prefix)) {
          localStorage.removeItem(key);
        }
      });
      return true;
    });
  }

  public read<T>(tableName: string, primaryKey: string): Promise<T> {
    return Promise.resolve().then(() => {
      const key: string = `${this.storeName}@${tableName}@${primaryKey}`;
      const record = window.localStorage.getItem(key);
      if (record) {
        return JSON.parse(record);
      }
      const message: string = `Record "${primaryKey}" in "${tableName}" could not be found.`;
      throw new RecordNotFoundError(message);
    });
  }

  public readAll<T>(tableName: string): Promise<T[]> {
    const promises: Array<Promise<T>> = [];

    Object.keys(localStorage).forEach((key: string) => {
      const prefix: string = `${this.storeName}@${tableName}@`;
      if (key.startsWith(prefix)) {
        const primaryKey = key.replace(prefix, '');
        promises.push(this.read(tableName, primaryKey));
      }
    });

    return Promise.all(promises);
  }

  public readAllPrimaryKeys(tableName: string): Promise<string[]> {
    const primaryKeys: Array<string> = [];

    Object.keys(localStorage).forEach((primaryKey: string) => {
      const prefix: string = `${this.storeName}@${tableName}@`;
      if (primaryKey.startsWith(prefix)) {
        primaryKeys.push(primaryKey.replace(prefix, ''));
      }
    });

    return Promise.resolve(primaryKeys);
  }

  public update(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    return this.read(tableName, primaryKey)
      .then((entity: Object) => {
        return Object.assign(entity, changes);
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
}
