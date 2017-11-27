interface CRUDEngine {
  storeName: string;
  create<T>(tableName: string, primaryKey: string, entity: T): Promise<string>;
  // TODO: Implement "createAll"
  delete(tableName: string, primaryKey: string): Promise<string>;
  deleteAll(tableName: string): Promise<boolean>;
  read<T>(tableName: string, primaryKey: string): Promise<T>;
  readAll<T>(tableName: string): Promise<T[]>;
  readAllPrimaryKeys(tableName: string): Promise<string[]>;
  update(tableName: string, primaryKey: string, changes: Object): Promise<string>;
  // TODO: Implement "updateAll"
}

export default CRUDEngine;
