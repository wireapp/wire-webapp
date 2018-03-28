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
    return this.storageService.getTables(['conversations', 'events']).then(tableContainer => {
      const promises = tableContainer.map(table => table.toArray().then(rows => ({name: table.name, rows})));
      return Promise.all(promises);
    });
  }

  setHistory(tableName, data) {
    this.storageService.save(tableName, undefined, JSON.parse(data));
  }

  setMetadata(metaData) {
    // TODO
  }
};
