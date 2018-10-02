import * as fs from 'fs-extra';
import * as path from 'path';
import CRUDEngine from './CRUDEngine';
import {isBrowser} from './EnvironmentUtil';
import {
  PathValidationError,
  RecordAlreadyExistsError,
  RecordNotFoundError,
  RecordTypeError,
  UnsupportedError,
} from './error';

export default class FileEngine implements CRUDEngine {
  public storeName = '';
  private options: {fileExtension: string} = {
    fileExtension: '.dat',
  };
  private static readonly path = path;

  constructor(private readonly baseDirectory = './') {}

  public async isSupported(): Promise<void> {
    if (isBrowser()) {
      const message = `Node.js File System Module is not available on your platform.`;
      throw new UnsupportedError(message);
    }
  }

  public async init(storeName = '', options?: {fileExtension: string}): Promise<any> {
    await this.isSupported();

    FileEngine.enforcePathRestrictions(this.baseDirectory, storeName);
    this.storeName = FileEngine.path.resolve(this.baseDirectory, storeName);

    this.options = {...this.options, ...options};
    return Promise.resolve(storeName);
  }

  public purge(): Promise<void> {
    return fs.remove(this.storeName);
  }

  static enforcePathRestrictions(givenTrustedRoot: string, givenPath: string): string {
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

  private resolvePath(tableName: string, primaryKey = ''): Promise<string> {
    return new Promise((resolve, reject) => {
      const tableNamePath = FileEngine.enforcePathRestrictions(this.storeName, tableName);
      const primaryKeyPath = FileEngine.enforcePathRestrictions(
        tableNamePath,
        primaryKey ? `${primaryKey}${this.options.fileExtension}` : ''
      );

      return resolve(primaryKeyPath);
    });
  }

  create<T>(tableName: string, primaryKey: string, entity: any): Promise<string> {
    return new Promise((resolve, reject) => {
      if (entity) {
        this.resolvePath(tableName, primaryKey)
          .then((filePath: string) => {
            if (typeof entity === 'object') {
              try {
                entity = JSON.stringify(entity);
              } catch (error) {
                entity = entity.toString();
              }
            }

            fs.writeFile(filePath, entity, {flag: 'wx'}, (error: NodeJS.ErrnoException) => {
              if (error) {
                if (error.code === 'ENOENT') {
                  fs.outputFile(filePath, entity)
                    .then(() => resolve(primaryKey))
                    .catch((error: Error) => reject(error));
                } else if (error.code === 'EEXIST') {
                  const message = `Record "${primaryKey}" already exists in "${tableName}". You need to delete the record first if you want to overwrite it.`;
                  reject(new RecordAlreadyExistsError(message));
                } else {
                  reject(error);
                }
              } else {
                resolve(primaryKey);
              }
            });
          })
          .catch(reject);
      } else {
        const message = `Record "${primaryKey}" cannot be saved in "${tableName}" because it's "undefined" or "null".`;
        reject(new RecordTypeError(message));
      }
    });
  }

  delete(tableName: string, primaryKey: string): Promise<string> {
    return this.resolvePath(tableName, primaryKey).then(file => {
      return fs.remove(file).then(() => primaryKey);
    });
  }

  deleteAll(tableName: string): Promise<boolean> {
    return this.resolvePath(tableName).then(directory => {
      return fs
        .remove(directory)
        .then(() => true)
        .catch(() => false);
    });
  }

  read<T>(tableName: string, primaryKey: string): Promise<T> {
    return this.resolvePath(tableName, primaryKey).then(file => {
      return new Promise<T>((resolve, reject) => {
        fs.readFile(file, {encoding: 'utf8', flag: 'r'}, (error, data: any) => {
          if (error) {
            if (error.code === 'ENOENT') {
              const message = `Record "${primaryKey}" in "${tableName}" could not be found.`;
              reject(new RecordNotFoundError(message));
            } else {
              reject(error);
            }
          } else {
            try {
              data = JSON.parse(data);
            } catch (error) {
              // No JSON found but that's okay
            }
            resolve(data);
          }
        });
      });
    });
  }

  readAll<T>(tableName: string): Promise<T[]> {
    return this.resolvePath(tableName).then(
      directory =>
        new Promise<T[]>((resolve, reject) => {
          fs.readdir(directory, (error: NodeJS.ErrnoException, files: string[]) => {
            if (error) {
              return reject(error);
            } else {
              const recordNames = files.map(file => FileEngine.path.basename(file, FileEngine.path.extname(file)));
              const promises: Promise<T>[] = recordNames.map(primaryKey => this.read(tableName, primaryKey));
              return Promise.all(promises).then((records: T[]) => resolve(records));
            }
          });
        })
    );
  }

  readAllPrimaryKeys(tableName: string): Promise<string[]> {
    return this.resolvePath(tableName).then(directory => {
      return new Promise<string[]>(resolve => {
        fs.readdir(directory, (error: NodeJS.ErrnoException, files: string[]) => {
          if (error) {
            if (error.code === 'ENOENT') {
              resolve([]);
            } else {
              throw error;
            }
          } else {
            const fileNames: string[] = files.map((file: string) => FileEngine.path.parse(file).name);
            resolve(fileNames);
          }
        });
      });
    });
  }

  append(tableName: string, primaryKey: string, additions: string): Promise<string> {
    return this.resolvePath(tableName, primaryKey).then(file => {
      return this.read(tableName, primaryKey)
        .then((record: any) => {
          if (typeof record === 'string') {
            record += additions;
          } else {
            const message = `Cannot append text to record "${primaryKey}" because it's not a string.`;
            throw new RecordTypeError(message);
          }
          return record;
        })
        .then((updatedRecord: any) => fs.outputFile(file, updatedRecord))
        .then(() => primaryKey);
    });
  }

  update(tableName: string, primaryKey: string, changes: Object): Promise<string> {
    return this.resolvePath(tableName, primaryKey).then(file => {
      return this.read(tableName, primaryKey)
        .then((record: any) => {
          if (typeof record === 'string') {
            record = JSON.parse(record);
          }
          const updatedRecord: Object = {...record, ...changes};
          return JSON.stringify(updatedRecord);
        })
        .then((updatedRecord: any) => fs.outputFile(file, updatedRecord))
        .then(() => primaryKey);
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
}
