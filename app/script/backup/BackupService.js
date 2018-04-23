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

'use strict';

window.z = window.z || {};
window.z.backup = z.backup || {};

z.backup.BackupService = class BackupService {
  static get CONFIG() {
    return {
      SUPPORTED_TABLES: [
        z.storage.StorageSchemata.OBJECT_STORE.CONVERSATIONS,
        z.storage.StorageSchemata.OBJECT_STORE.EVENTS,
      ],
    };
  }

  constructor(storageService) {
    this.logger = new z.util.Logger('z.backup.BackupService', z.config.LOGGER.OPTIONS);
    this.storageService = storageService;
  }

  exportTable(table, onProgress) {
    const collection = table.toCollection();
    return table
      .count()
      .then(n => new DexieBatch({batchSize: 10000, limit: n}))
      .then(batchDriver => batchDriver.eachBatch(collection, batch => onProgress(table.name, batch)));
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
    const isEventsTable = tableName === z.storage.StorageSchemata.OBJECT_STORE.EVENTS;
    const primaryKeys = isEventsTable ? undefined : entities.map(entity => entity.id);
    return this.storageService.db[tableName].bulkPut(entities, primaryKeys);
  }
};
