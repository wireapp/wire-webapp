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

import type Dexie from 'dexie';
import DexieBatch from 'dexie-batch';
import {container} from 'tsyringe';

import {Logger, getLogger} from 'Util/Logger';

import {StorageSchemata, StorageService} from '../storage';

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

  async importEntities(tableName: string, entities: any[]): Promise<void> {
    // We don't want to set the primaryKey for the events table
    const isEventsTable = tableName === StorageSchemata.OBJECT_STORE.EVENTS;
    const primaryKeys = isEventsTable ? undefined : entities.map(entity => entity.id);
    if (this.storageService.db) {
      await this.storageService.db.table(tableName).bulkPut(entities, primaryKeys);
    } else {
      for (const entity of entities) {
        await this.storageService.save(tableName, entity.id, entity);
      }
    }
  }
}
