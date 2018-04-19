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
    this.ARCHIVE_META_FILENAME = 'meta.json';
    this.backupService = backupService;
    this.clientRepository = clientRepository;
    this.logger = new z.util.Logger('z.backup.BackupRepository', z.config.LOGGER.OPTIONS);
    this.userRepository = userRepository;
  }

  createMetaDescription() {
    return {
      client_id: this.clientRepository.currentClient().id,
      creation_time: new Date().toISOString(),
      platform: 'Web',
      user_id: this.userRepository.self().id,
      version: this.backupService.getDatabaseVersion(),
    };
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
    const isBackupImportError = error.constructor.name === 'ImportError';

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
      throw new z.backup.InvalidMetaDataError();
    }

    const verifyMetadataPromise = files[this.ARCHIVE_META_FILENAME]
      .async('string')
      .then(JSON.parse)
      .then(metadata => verifyMetadata(metadata, this.createMetaDescription()));

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

    return Promise.all([verifyMetadataPromise, importEntriesPromise]);

    function verifyMetadata(archiveMetadata, localMetadata) {
      if (archiveMetadata.user_id !== localMetadata.user_id) {
        const fromUserId = archiveMetadata.user_id;
        const toUserId = localMetadata.user_id;
        const message = `History from user "${fromUserId}" cannot be restored for user "${toUserId}".`;
        throw new z.backup.DifferentAccountError(message);
      }

      if (archiveMetadata.version !== localMetadata.version) {
        const message = `History cannot be restored: database versions don't match`;
        throw new z.backup.IncompatibleBackupError(message);
      }
    }
  }

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
        throw new z.backup.ExportError();
      });
  }
};
