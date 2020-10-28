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
      BATCH_SIZE: 10000,
      SUPPORTED_TABLES: [StorageSchemata.OBJECT_STORE.CONVERSATIONS, StorageSchemata.OBJECT_STORE.EVENTS],
    };
  }

  constructor(private readonly storageService = container.resolve(StorageService)) {
    this.logger = getLogger('BackupService');
  }

  public async exportTable(table: Dexie.Table<any, string>, onProgress: (batch: any[]) => void): Promise<void> {
    const collection = table.toCollection();
    const tableCount = await table.count();
    const batchDriver = new DexieBatch({batchSize: BackupService.CONFIG.BATCH_SIZE, limit: tableCount});
    const batchCount = await batchDriver.eachBatch(collection, batch => onProgress(batch));
    return this.logger.log(`Exported store '${table.name}' in '${batchCount}' batches`);
  }

  public getDatabaseVersion(): number {
    if (this.storageService.db) {
      return this.storageService.db.verno;
    }
    return 1;
  }

  public async getHistoryCount(): Promise<number> {
    const recordsPerTable = await Promise.all(this.getTables().map(table => table.count()));
    return recordsPerTable.reduce((accumulator, recordCount) => accumulator + recordCount, 0);
  }

  public getTables(): Dexie.Table<any, string>[] {
    return this.storageService.getTables(BackupService.CONFIG.SUPPORTED_TABLES);
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
