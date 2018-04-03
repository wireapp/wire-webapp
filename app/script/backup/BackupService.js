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
  constructor(storageService) {
    this.storageService = storageService;
  }

  getDatabaseVersion() {
    return this.storageService.db.verno;
  }

  getHistory() {
    const tableContainer = this.storageService.getTables(['conversations', 'events']);
    const promises = tableContainer.map(table => {
      const collection = table.toCollection();
      return table
        .count()
        .then(n => new DexieBatch({batchSize: 10000, limit: n}))
        .then(batchDriver => {
          const batches = [];
          return batchDriver
            .eachBatch(collection, batch => batches.push(batch))
            .then(() => ({batches, name: table.name}));
        });
    });
    return Promise.all(promises);
  }

  getHistoryCount() {
    const tableContainer = this.storageService.getTables(['conversations', 'events']);
    return Promise.all(tableContainer.map(table => table.count()));
  }

  setHistory(tableName, data) {
    const entity = JSON.parse(data);
    if (tableName === 'conversations') {
      this.storageService.save(tableName, entity.id, entity);
    } else {
      this.storageService.save(tableName, undefined, entity);
    }
  }

  setMetadata(metaData) {
    // TODO
  }
};
