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
  static get CONFIG() {
    return {
      META_FILENAME: 'export.json',
    };
  }

  /**
   * Construct a new Backup repository.
   * @class z.backup.BackupRepository
   * @param {z.backup.BackupService} backupService - Backup service implementation
   * @param {z.client.ClientRepository} clientRepository - Repository for all client interactions
   * @param {z.user.UserRepository} userRepository - Repository for all user and connection interactions
   */
  constructor(backupService, clientRepository, userRepository) {
    this.logger = new z.util.Logger('z.backup.BackupRepository', z.config.LOGGER.OPTIONS);

    this.backupService = backupService;
    this.clientRepository = clientRepository;
    this.userRepository = userRepository;

    this.isCanceled = false;
  }

  cancelAction() {
    this.isCanceled = true;
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

  /**
   * Gather needed data for the export and generates the history
   *
   * @param {function} progressCallback - called on every step of the export
   * @returns {Promise<JSZip>} The promise that contains all the exported tables
   */
  generateHistory(progressCallback) {
    const tables = this.backupService.getTables();
    const meta = this.createMetaDescription();
    const tablesData = {};
    this.isCanceled = false;

    const loadDataPromises = tables.map(table => {
      return this.backupService.exportTable(table, (tableName, rows) => {
        if (this.isCanceled) {
          throw new z.backup.CancelError();
        }
        progressCallback(rows.length);
        tablesData[tableName] = (tablesData[tableName] || []).concat(rows);
      });
    });

    return Promise.all(loadDataPromises)
      .then(() => {
        const zip = new JSZip();

        // first write the metadata file
        zip.file(BackupRepository.CONFIG.META_FILENAME, JSON.stringify(meta));

        // then all the other tables
        Object.keys(tablesData).forEach(tableName => {
          zip.file(`${tableName}.json`, JSON.stringify(tablesData[tableName]));
        });

        return zip;
      })
      .catch(error => {
        this.logger.error(`Failed to export history: ${error.message}`, error);

        if (error instanceof z.backup.CancelError) {
          throw error;
        }

        throw new z.backup.ExportError();
      });
  }

  getBackupInitData() {
    const userName = this.userRepository.self().username();
    return this.backupService.getHistoryCount().then(numberOfRecords => ({numberOfRecords, userName}));
  }

  importHistory(archive, initCallback, progressCallback) {
    this.isCanceled = false;
    const files = archive.files;
    if (!files[BackupRepository.CONFIG.META_FILENAME]) {
      throw new z.backup.InvalidMetaDataError();
    }

    const verifyMetadataPromise = files[BackupRepository.CONFIG.META_FILENAME]
      .async('string')
      .then(JSON.parse)
      .then(metadata => this.verifyMetadata(metadata));

    const unzipPromise = verifyMetadataPromise.then(() => {
      return Promise.all(
        Object.values(archive.files)
          .filter(zippedFile => zippedFile.name !== this.ARCHIVE_META_FILENAME)
          .map(zippedFile => zippedFile.async('string').then(value => ({content: value, filename: zippedFile.name})))
      );
    });

    const importEntriesPromise = unzipPromise.then(fileDescriptors => {
      initCallback(fileDescriptors.length);
      fileDescriptors.forEach(fileDescriptor => {
        if (this.isCanceled) {
          throw new z.backup.CancelError();
        }
        const tableName = fileDescriptor.filename.replace('.json', '');
        const entities = JSON.parse(fileDescriptor.content);
        entities.forEach(entity => this.backupService.importEntity(tableName, entity));
        progressCallback();
      });
    });

    return importEntriesPromise;
  }

  verifyMetadata(archiveMetadata) {
    const localMetadata = this.createMetaDescription();
    const isExpectedUserId = archiveMetadata.user_id === localMetadata.user_id;
    if (!isExpectedUserId) {
      const fromUserId = archiveMetadata.user_id;
      const toUserId = localMetadata.user_id;
      const message = `History from user "${fromUserId}" cannot be restored for user "${toUserId}".`;
      throw new z.backup.DifferentAccountError(message);
    }

    const isExpectedPlatform = archiveMetadata.platform === localMetadata.platform;
    if (!isExpectedPlatform) {
      const message = `History created from "${archiveMetadata.platform}" device cannot be imported`;
      throw new z.backup.IncompatiblePlatformError(message);
    }

    const isExpectedVersion = archiveMetadata.version === localMetadata.version;
    if (!isExpectedVersion) {
      const message = `History cannot be restored: Database version mismatch`;
      throw new z.backup.IncompatibleBackupError(message);
    }
  }
};
