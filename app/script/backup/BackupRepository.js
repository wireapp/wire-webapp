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
      FILENAME: {
        CONVERSATIONS: 'conversations.json',
        EVENTS: 'events.json',
        METADATA: 'export.json',
      },
      UINT8ARRAY_FIELDS: ['otr_key', 'sha256'],
    };
  }

  /**
   * Construct a new Backup repository.
   * @class z.backup.BackupRepository
   * @param {z.backup.BackupService} backupService - Backup service implementation
   * @param {z.client.ClientRepository} clientRepository - Repository for all client interactions
   * @param {z.conversation.ConversationRepository} conversationRepository - Repository for all conversation interactions
   * @param {z.user.UserRepository} userRepository - Repository for all user and connection interactions
   */
  constructor(backupService, clientRepository, conversationRepository, userRepository) {
    this.logger = new z.util.Logger('z.backup.BackupRepository', z.config.LOGGER.OPTIONS);

    this.backupService = backupService;
    this.clientRepository = clientRepository;
    this.conversationRepository = conversationRepository;
    this.userRepository = userRepository;

    this.canceled = false;

    this.CONVERSATIONS_STORE_NAME = z.storage.StorageSchemata.OBJECT_STORE.CONVERSATIONS;
    this.EVENTS_STORE_NAME = z.storage.StorageSchemata.OBJECT_STORE.EVENTS;
  }

  cancelAction() {
    this.isCanceled = true;
  }

  get isCanceled() {
    return this.canceled;
  }

  set isCanceled(isCanceled) {
    this.canceled = isCanceled;
  }

  createMetaData() {
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
    this.isCanceled = false;

    return Promise.resolve()
      .then(() => this._exportHistory(progressCallback))
      .then(exportedData => this._compressHistoryFiles(exportedData))
      .catch(error => {
        this.logger.error(`Could not export history: ${error.message}`, error);

        const isCancelError = error instanceof z.backup.CancelError;
        throw isCancelError ? error : new z.backup.ExportError();
      });
  }

  _exportHistory(progressCallback) {
    const tables = this.backupService.getTables();
    const tableData = {};

    return Promise.resolve()
      .then(() => this._exportHistoryConversations(tables, progressCallback))
      .then(conversationsData => {
        tableData[this.CONVERSATIONS_STORE_NAME] = conversationsData;
        return this._exportHistoryEvents(tables, progressCallback);
      })
      .then(eventsData => {
        tableData[this.EVENTS_STORE_NAME] = eventsData;
        return tableData;
      });
  }

  _exportHistoryConversations(tables, progressCallback) {
    const conversationsTable = tables.find(table => table.name === this.CONVERSATIONS_STORE_NAME);
    const onComplete = tableRows => {
      tableRows.forEach(conversation => delete conversation.verification_state);
    };

    return this._exportHistoryFromTable(conversationsTable, progressCallback, onComplete);
  }

  _exportHistoryEvents(tables, progressCallback) {
    const eventsTable = tables.find(table => table.name === this.EVENTS_STORE_NAME);
    const onComplete = tableRows => {
      for (let index = tableRows.length - 1; index >= 0; index -= 1) {
        const event = tableRows[index];
        const isTypeVerification = event.type === z.event.Client.CONVERSATION.VERIFICATION;
        if (isTypeVerification) {
          tableRows.splice(index, 1);
        }
      }
    };

    return this._exportHistoryFromTable(eventsTable, progressCallback, onComplete);
  }

  _exportHistoryFromTable(table, progressCallback, onComplete) {
    const tableData = [];

    return this.backupService
      .exportTable(table, tableRows => {
        if (this.isCanceled) {
          throw new z.backup.CancelError();
        }
        progressCallback(tableRows.length);
        tableData.push(tableRows);
      })
      .then(() => {
        const data = [].concat(...tableData);
        onComplete(data);
        return data;
      });
  }

  _compressHistoryFiles(exportedData) {
    const metaData = this.createMetaData();
    const zip = new JSZip();

    // first write the metadata file
    zip.file(BackupRepository.CONFIG.FILENAME.METADATA, JSON.stringify(metaData));

    // then all the other tables
    Object.keys(exportedData).forEach(tableName => {
      zip.file(`${tableName}.json`, JSON.stringify(exportedData[tableName]));
    });

    return zip;
  }

  getBackupInitData() {
    const userName = this.userRepository.self().username();
    return this.backupService.getHistoryCount().then(numberOfRecords => ({numberOfRecords, userName}));
  }

  importHistory(archive, initCallback, progressCallback) {
    this.isCanceled = false;
    const files = archive.files;
    if (!files[BackupRepository.CONFIG.FILENAME.METADATA]) {
      throw new z.backup.InvalidMetaDataError();
    }

    return this.verifyMetadata(files)
      .then(() => this._extractHistoryFiles(files))
      .then(fileDescriptors => this._importHistoryData(fileDescriptors, initCallback, progressCallback))
      .catch(error => {
        this.logger.error(`Could not export history: ${error.message}`, error);
        throw error;
      });
  }

  _importHistoryData(fileDescriptors, initCallback, progressCallback) {
    initCallback(fileDescriptors.length);

    const conversationFileDescriptor = fileDescriptors.find(fileDescriptor => {
      return fileDescriptor.filename === BackupRepository.CONFIG.FILENAME.CONVERSATIONS;
    });

    const eventFileDescriptor = fileDescriptors.find(fileDescriptor => {
      return fileDescriptor.filename === BackupRepository.CONFIG.FILENAME.EVENTS;
    });

    return this._importHistoryConversations(conversationFileDescriptor, progressCallback).then(() => {
      return this._importHistoryEvents(eventFileDescriptor, progressCallback);
    });
  }

  _importHistoryConversations(conversationData, progressCallback) {
    if (this.isCanceled) {
      return Promise.reject(new z.backup.CancelError());
    }

    const entities = JSON.parse(conversationData.content).map(entity => this.mapEntityDataType(entity));
    return this.conversationRepository.updateConversations(entities).then(() => {
      this.logger.log(`Imported state of '${entities.length}' conversations from backup`, conversationData);
      progressCallback();
    });
  }

  _importHistoryEvents(eventData, progressCallback) {
    if (this.isCanceled) {
      return Promise.reject(new z.backup.CancelError());
    }

    const entities = JSON.parse(eventData.content);
    return this.backupService.importEntities(this.EVENTS_STORE_NAME, entities).then(() => {
      this.logger.log(`Imported '${entities.length}' events from backup`, eventData);
      progressCallback();
    });
  }

  _extractHistoryFiles(files) {
    const unzipPromises = Object.values(files)
      .filter(zippedFile => zippedFile.name !== BackupRepository.CONFIG.FILENAME.METADATA)
      .map(zippedFile => zippedFile.async('string').then(value => ({content: value, filename: zippedFile.name})));

    return Promise.all(unzipPromises).then(fileDescriptors => {
      this.logger.log('Unzipped files for history import', fileDescriptors);
      return fileDescriptors;
    });
  }

  mapEntityDataType(entity) {
    if (entity.data) {
      BackupRepository.CONFIG.UINT8ARRAY_FIELDS.forEach(field => {
        const dataField = entity.data[field];
        if (dataField) {
          const values = Object.keys(dataField).map(key => dataField[key]);
          entity.data[field] = new Uint8Array(values);
        }
      });
    }
    return entity;
  }

  verifyMetadata(files) {
    return files[BackupRepository.CONFIG.FILENAME.METADATA]
      .async('string')
      .then(JSON.parse)
      .then(metadata => this._verifyMetadata(metadata))
      .then(() => this.logger.log('Validated metadata during history import', files));
  }

  _verifyMetadata(archiveMetadata) {
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
