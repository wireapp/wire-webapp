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

import JSZip from 'jszip';

import StorageSchemata from '../storage/StorageSchemata';

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
   * @param {z.connection.ConnectionRepository} connectionRepository - Repository for all connection interactions
   * @param {z.conversation.ConversationRepository} conversationRepository - Repository for all conversation interactions
   * @param {UserRepository} userRepository - Repository for all user interactions
   */
  constructor(backupService, clientRepository, connectionRepository, conversationRepository, userRepository) {
    this.logger = new z.util.Logger('z.backup.BackupRepository', z.config.LOGGER.OPTIONS);

    this.backupService = backupService;
    this.clientRepository = clientRepository;
    this.connectionRepository = connectionRepository;
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
    const onProgress = (tableRows, exportedEntitiesCount) => {
      progressCallback(tableRows.length);
      this.logger.log(`Exported '${exportedEntitiesCount}' conversation states from history`);

      tableRows.forEach(conversation => delete conversation.verification_state);
    };

    return this._exportHistoryFromTable(conversationsTable, onProgress);
  }

  _exportHistoryEvents(tables, progressCallback) {
    const eventsTable = tables.find(table => table.name === this.EVENTS_STORE_NAME);
    const onProgress = (tableRows, exportedEntitiesCount) => {
      progressCallback(tableRows.length);
      this.logger.log(`Exported '${exportedEntitiesCount}' events from history`);

      for (let index = tableRows.length - 1; index >= 0; index -= 1) {
        const event = tableRows[index];
        const isTypeVerification = event.type === z.event.Client.CONVERSATION.VERIFICATION;
        if (isTypeVerification) {
          tableRows.splice(index, 1);
        }
      }
    };

    return this._exportHistoryFromTable(eventsTable, onProgress);
  }

  _exportHistoryFromTable(table, onProgress) {
    const tableData = [];
    let exportedEntitiesCount = 0;

    return this.backupService
      .exportTable(table, tableRows => {
        if (this.isCanceled) {
          throw new z.backup.CancelError();
        }
        exportedEntitiesCount += tableRows.length;

        onProgress(tableRows, exportedEntitiesCount);
        tableData.push(tableRows);
      })
      .then(() => [].concat(...tableData));
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
    return this.backupService.getHistoryCount();
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
    const conversationFileDescriptor = fileDescriptors.find(fileDescriptor => {
      return fileDescriptor.filename === BackupRepository.CONFIG.FILENAME.CONVERSATIONS;
    });

    const eventFileDescriptor = fileDescriptors.find(fileDescriptor => {
      return fileDescriptor.filename === BackupRepository.CONFIG.FILENAME.EVENTS;
    });

    const conversationEntities = JSON.parse(conversationFileDescriptor.content);
    const eventEntities = JSON.parse(eventFileDescriptor.content);
    const entityCount = conversationEntities.length + eventEntities.length;
    initCallback(entityCount);

    return this._importHistoryConversations(conversationEntities, progressCallback)
      .then(importedEntities => this._importHistoryEvents(eventEntities, progressCallback).then(() => importedEntities))
      .then(importedEntities => {
        this.conversationRepository.updateConversations(importedEntities);
        this.conversationRepository.map_connections(this.connectionRepository.connectionEntities());
      });
  }

  _importHistoryConversations(conversationEntities, progressCallback) {
    const entityCount = conversationEntities.length;
    let importedEntities = [];

    const entityChunks = z.util.ArrayUtil.chunk(conversationEntities, z.backup.BackupService.CONFIG.BATCH_SIZE);

    const importConversationChunk = chunk =>
      this.conversationRepository.updateConversationStates(chunk).then(importedConversationEntities => {
        importedEntities = importedEntities.concat(importedConversationEntities);
        this.logger.log(`Imported '${importedEntities.length}' of '${entityCount}' conversation states from backup`);
        progressCallback(chunk.length);
      });

    return this._chunkImport(importConversationChunk, entityChunks).then(() => importedEntities);
  }

  _importHistoryEvents(eventEntities, progressCallback) {
    const entityCount = eventEntities.length;
    let importedEntities = 0;

    const entities = eventEntities.map(entity => this.mapEntityDataType(entity));
    const entityChunks = z.util.ArrayUtil.chunk(entities, z.backup.BackupService.CONFIG.BATCH_SIZE);

    const importEventChunk = chunk =>
      this.backupService.importEntities(this.EVENTS_STORE_NAME, chunk).then(() => {
        importedEntities += chunk.length;
        this.logger.log(`Imported '${importedEntities}' of '${entityCount}' events from backup`);
        progressCallback(chunk.length);
      });

    return this._chunkImport(importEventChunk, entityChunks);
  }

  _chunkImport(importFunction, chunks) {
    return chunks.reduce((promise, chunk) => {
      return promise.then(result => {
        if (this.isCanceled) {
          return Promise.reject(new z.backup.CancelError());
        }
        return importFunction(chunk);
      });
    }, Promise.resolve());
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
          entity.data[field] = new Uint8Array(Object.values(dataField));
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
    const localMetadata = this.createMetaData();
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

    const lowestDbVersion = Math.min(archiveMetadata.version, localMetadata.version);
    const involvesDatabaseMigration = StorageSchemata.SCHEMATA.reduce((involvesMigration, schemaData) => {
      if (schemaData.version > lowestDbVersion) {
        return involvesMigration || !!schemaData.upgrade;
      }
      return involvesMigration;
    }, false);

    if (involvesDatabaseMigration) {
      const message = `History cannot be restored: Database version mismatch`;
      throw new z.backup.IncompatibleBackupError(message);
    }
  }
};
