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

import DexieBatch from 'dexie-batch';

export default class BackupService {
  static get CONFIG() {
    return {
      BATCH_SIZE: 10000,
      SUPPORTED_TABLES: [
        z.storage.StorageSchemata.OBJECT_STORE.CONVERSATIONS,
        z.storage.StorageSchemata.OBJECT_STORE.EVENTS,
      ],
    };
  }

  constructor(storageService, logger) {
    this.logger = logger;
    this.storageService = storageService;

    this.EVENTS_STORE_NAME = z.storage.StorageSchemata.OBJECT_STORE.EVENTS;
  }

  exportTable(table, onProgress) {
    const collection = table.toCollection();
    return table
      .count()
      .then(count => new DexieBatch({batchSize: BackupService.CONFIG.BATCH_SIZE, limit: count}))
      .then(batchDriver => batchDriver.eachBatch(collection, batch => onProgress(batch)))
      .then(count => this.logger.log(`Exported store '${table.name}' in '${count}' batches`));
  }

  getDatabaseVersion() {
    return this.storageService.db.verno;
  }

  getHistoryCount() {
    return Promise.all(this.getTables().map(table => table.count())).then(recordsPerTable => {
      return recordsPerTable.reduce((accumulator, recordCount) => accumulator + recordCount, 0);
    });
  }

  getTables() {
    return this.storageService.getTables(BackupService.CONFIG.SUPPORTED_TABLES);
  }

  importEntities(tableName, entities) {
    // We don't want to set the primaryKey for the events table
    const isEventsTable = tableName === this.EVENTS_STORE_NAME;
    const primaryKeys = isEventsTable ? undefined : entities.map(entity => entity.id);
    return this.storageService.db[tableName].bulkPut(entities, primaryKeys);
  }
}
