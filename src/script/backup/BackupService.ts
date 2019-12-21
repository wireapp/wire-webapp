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

import {Logger, getLogger} from 'Util/Logger';

import {StorageSchemata, StorageService} from '../storage';

export class BackupService {
  private readonly logger: Logger;
  private readonly storageService: StorageService;

  // tslint:disable-next-line:typedef
  static get CONFIG() {
    return {
      BATCH_SIZE: 10000,
      SUPPORTED_TABLES: [StorageSchemata.OBJECT_STORE.CONVERSATIONS, StorageSchemata.OBJECT_STORE.EVENTS],
    };
  }

  constructor(storageService: StorageService) {
    this.logger = getLogger('BackupService');
    this.storageService = storageService;
  }

  public exportTable(table: Dexie.Table<any, string>, onProgress: (batch: any[]) => void): Dexie.Promise<void> {
    const collection = table.toCollection();
    return table
      .count()
      .then(count => new DexieBatch({batchSize: BackupService.CONFIG.BATCH_SIZE, limit: count}))
      .then(batchDriver => batchDriver.eachBatch(collection, batch => onProgress(batch)))
      .then(count => this.logger.log(`Exported store '${table.name}' in '${count}' batches`));
  }

  public getDatabaseVersion(): number {
    if (this.storageService.db) {
      return this.storageService.db.verno;
    }
    return 1;
  }

  public getHistoryCount(): Promise<number> {
    return Promise.all(this.getTables().map(table => table.count())).then(recordsPerTable => {
      return recordsPerTable.reduce((accumulator, recordCount) => accumulator + recordCount, 0);
    });
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
