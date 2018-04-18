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
    this.storageService = storageService;
  }

  getDatabaseVersion() {
    return this.storageService.db.verno;
  }

  exportTable(table, onProgress) {
    const collection = table.toCollection();
    return table
      .count()
      .then(n => new DexieBatch({batchSize: 10000, limit: n}))
      .then(batchDriver => {
        return batchDriver.eachBatch(collection, batch => {
          onProgress(table.name, batch);
        });
      });
  }

  getHistoryCount() {
    return this.getTables().reduce((count, table) => count + table.count(), 0);
  }

  getTables() {
    return this.storageService.getTables(BackupService.CONFIG.SUPPORTED_TABLES);
  }

  importEntity(tableName, entity) {
    const isConversationTable = tableName === z.storage.StorageSchemata.OBJECT_STORE.CONVERSATIONS;
    // we don't want to force the primaryKey if the table is not the conversations table
    const primaryKey = isConversationTable ? entity.id : undefined;

    this.storageService.save(tableName, primaryKey, entity);
  }
};
