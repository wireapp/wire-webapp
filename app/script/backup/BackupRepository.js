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

z.backup.BackupRepository = class BackupRepository {
  /**
   * Construct a new Backup repository.
   * @class z.backup.BackupRepository
   * @param {z.backup.BackupService} backupService - Backup service implementation
   * @param {z.client.ClientRepository} clientRepository - Repository for all client interactions
   * @param {z.user.UserRepository} userRepository - Repository for all user and connection interactions
   */
  constructor(backupService, clientRepository, userRepository) {
    this.backupService = backupService;
    this.clientRepository = clientRepository;
    this.userRepository = userRepository;
    this.ARCHIVE_META_FILENAME = 'meta.json';
  }

  createMetaDescription() {
    return {
      client_id: this.clientRepository.currentClient().id,
      creation_time: new Date().toISOString(),
      platform: 'Desktop',
      user_id: this.userRepository.self().id,
      version: this.backupService.getDatabaseVersion(),
    };
  }

  cancelBackup() {
    amplify.publish(z.event.WebApp.BACKUP.EXPORT.CANCEL);
  }

  exportBackup() {
    return this.backupService.getHistoryCount().then(numberOfRecords => {
      const userName = this.userRepository.self().username();
      return {
        numberOfRecords,
        userName,
      };
    });
  }

  getUserData() {
    const clientId = this.clientRepository.currentClient().id;
    const userId = this.userRepository.self().id;

    return {
      clientId,
      userId,
    };
  }

  onError(error) {
    const isBackupImportError = error.constructor.name === 'BackupImportError';

    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.CONFIRM, {
      action: () => this.exportBackup(),
      preventClose: true,
      text: {
        action: z.l10n.text(z.string.backupErrorAction),
        message: isBackupImportError ? z.l10n.text(z.string.backupImportGenericErrorSecondary) : error.message,
        title: isBackupImportError
          ? z.l10n.text(z.string.backupImportGenericErrorHeadline)
          : z.l10n.text(z.string.backupExportGenericErrorHeadline),
      },
    });
  }

  importHistory(archive) {
    const files = archive.files;
    if (!files[this.ARCHIVE_META_FILENAME]) {
      throw new z.backup.importError.InvalidMetaDataError();
    }

    const metaCheckPromise = files[this.ARCHIVE_META_FILENAME]
      .async('string')
      .then(JSON.parse)
      .then(metadata => checkMetas(metadata, this.createMetaDescription()));

    const unzipPromises = Object.values(archive.files)
      .filter(zippedFile => zippedFile.name !== this.ARCHIVE_META_FILENAME)
      .map(zippedFile => zippedFile.async('string').then(value => ({content: value, filename: zippedFile.name})));

    const importEntriesPromise = Promise.all(unzipPromises).then(fileDescriptors => {
      fileDescriptors.forEach(fileDescriptor => {
        const tableName = fileDescriptor.filename.replace('.json', '');
        const entities = JSON.parse(fileDescriptor.content);
        entities.forEach(entity => this.backupService.importEntity(tableName, entity));
      });
    });

    return Promise.all([metaCheckPromise, importEntriesPromise]);

    function checkMetas(archiveMeta, currentMetadata) {
      if (archiveMeta.user_id !== currentMetadata.user_id) {
        const message = `History from user "${metadata.user_id}" cannot be restored for user "${user_id}".`;
        throw new z.backup.importError.DifferentAccountError(message);
      }

      if (archiveMeta.version !== currentMetadata.version) {
        const message = `History cannot be restored: database versions don't match`;
        throw new z.backup.importError.IncompatibleBackupError(message);
      }
    }
  }

  /**
   * Gather needed data for the export and generates the history
   *
   * @returns {Promise<archive>} The promise that contains all the exported tables
   */
  generateHistory() {
    const tables = this.backupService.getTables();
    const meta = this.createMetaDescription();
    const tablesData = {};

    const loadDataPromises = tables.map(table => {
      return this.backupService.exportTable(table, (tableName, rows) => {
        tablesData[tableName] = (tablesData[tableName] || []).concat(rows);
      });
    });

    return Promise.all(loadDataPromises)
      .then(() => {
        const zip = new JSZip();

        // first write the metadata file
        zip.file(this.ARCHIVE_META_FILENAME, JSON.stringify(meta));

        // then all the other tables
        Object.keys(tablesData).forEach(tableName => {
          zip.file(`${tableName}.json`, JSON.stringify(tablesData[tableName]));
        });

        return zip;
      })
      .catch(() => {
        throw new z.backup.exportError.BackupExportError();
      });
  }
};
