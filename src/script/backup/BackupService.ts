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

import Dexie from 'dexie';
import DexieBatch from 'dexie-batch';
import {container} from 'tsyringe';

import {Logger, getLogger} from 'Util/Logger';

import {StorageService} from '../storage';

export class BackupService {
  private readonly logger: Logger;

  static get CONFIG() {
    return {
      BATCH_SIZE: 5_000,
    };
  }

  constructor(private readonly storageService = container.resolve(StorageService)) {
    this.logger = getLogger('BackupService');
  }

  async exportTable<T>(table: Dexie.Table<T, unknown>, onProgress: (batch: T[]) => void): Promise<void> {
    const collection = table.toCollection();
    const tableCount = await table.count();
    const parallelBatchDriver = new DexieBatch({batchSize: BackupService.CONFIG.BATCH_SIZE, limit: tableCount});
    const batchCount = await parallelBatchDriver.eachBatch(collection, batch => onProgress(batch));
    this.logger.log(`Exported store '${table.name}' in '${batchCount}' batches`);
  }

  getDatabaseVersion(): number {
    if (this.storageService.db) {
      return this.storageService.db.verno;
    }
    return 1;
  }

  async getHistoryCount(): Promise<number> {
    const recordsPerTable = await Promise.all(this.getTables().map(table => table.count()));
    return recordsPerTable.reduce((accumulator, recordCount) => accumulator + recordCount, 0);
  }

  getTables() {
    return [
      this.storageService.db!.conversations,
      this.storageService.db!.events,
      this.storageService.db!.users,
    ] as const;
  }

  /**
   * Will import all entities in the Database.
   * If a primaryKey generator is given, it will only import the entities that are not already in the DB
   *
   * @param tableName the table to put the entities in
   * @param entities the entities to insert
   * @param generatePrimaryKey a function that will generate a primaryKey for the entity (will only add entities that are not in the DB)
   */
  async importEntities<T>(
    tableName: string,
    entities: T[],
    generatePrimaryKey?: (entry: T) => string,
  ): Promise<number> {
    const primaryKeys = generatePrimaryKey ? entities.map(generatePrimaryKey) : undefined;
    if (this.storageService.db) {
      try {
        await this.storageService.db.table(tableName).bulkAdd(entities, primaryKeys);
        return entities.length;
      } catch (error) {
        if (error instanceof Dexie.BulkError) {
          const {failures} = error;
          const successCount = entities.length - failures.length;
          return successCount;
        }
        throw error;
      }
    }

    for (const entity of entities) {
      const key = generatePrimaryKey ? generatePrimaryKey(entity) : undefined;
      await this.storageService.save(tableName, key, entity);
    }
    return entities.length;
  }
}
