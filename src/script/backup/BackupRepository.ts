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

import Dexie from 'dexie';
import JSZip, {JSZipObject} from 'jszip';

import {chunk} from 'Util/ArrayUtil';
import {Logger, getLogger} from 'Util/Logger';

import {ClientRepository} from '../client/ClientRepository';
import {ConnectionRepository} from '../connection/ConnectionRepository';
import {ConversationRepository} from '../conversation/ConversationRepository';
import {Conversation} from '../entity/Conversation';
import {ClientEvent} from '../event/Client';
import {StorageSchemata} from '../storage/StorageSchemata';
import {UserRepository} from '../user/UserRepository';
import {BackupService} from './BackupService';

export interface Metadata {
  client_id: string;
  creation_time: string;
  platform: 'Web';
  user_handle: string;
  user_id: string;
  user_name: string;
  version: number;
}

export interface FileDescriptor {
  content: string;
  filename: string;
}

export class BackupRepository {
  private readonly backupService: BackupService;
  private readonly clientRepository: ClientRepository;
  private readonly connectionRepository: ConnectionRepository;
  private readonly conversationRepository: ConversationRepository;
  private readonly logger: Logger;
  private readonly userRepository: UserRepository;
  private canceled: boolean;

  // tslint:disable-next-line:typedef
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

  constructor(
    backupService: BackupService,
    clientRepository: ClientRepository,
    connectionRepository: ConnectionRepository,
    conversationRepository: ConversationRepository,
    userRepository: UserRepository,
  ) {
    this.logger = getLogger('BackupRepository');

    this.backupService = backupService;
    this.clientRepository = clientRepository;
    this.connectionRepository = connectionRepository;
    this.conversationRepository = conversationRepository;
    this.userRepository = userRepository;

    this.canceled = false;
  }

  public cancelAction(): void {
    this.isCanceled = true;
  }

  get isCanceled(): boolean {
    return this.canceled;
  }

  set isCanceled(isCanceled) {
    this.canceled = isCanceled;
  }

  public createMetaData(): Metadata {
    return {
      client_id: this.clientRepository.currentClient().id,
      creation_time: new Date().toISOString(),
      platform: 'Web',
      user_handle: this.userRepository.self().username(),
      user_id: this.userRepository.self().id,
      user_name: this.userRepository.self().name(),
      version: this.backupService.getDatabaseVersion(),
    };
  }

  /**
   * Gather needed data for the export and generates the history
   *
   * @param progressCallback called on every step of the export
   * @returns The promise that contains all the exported tables
   */
  public generateHistory(progressCallback: (tableRows: number) => void): Promise<JSZip> {
    this.isCanceled = false;

    return Promise.resolve()
      .then(() => this._exportHistory(progressCallback))
      .then(exportedData => this.compressHistoryFiles(exportedData))
      .catch(error => {
        this.logger.error(`Could not export history: ${error.message}`, error);

        const isCancelError = error instanceof window.z.backup.CancelError;
        throw isCancelError ? error : new window.z.backup.ExportError();
      });
  }

  private _exportHistory(progressCallback: (tableRows: number) => void): Dexie.Promise<Record<string, any[]>> {
    const tables = this.backupService.getTables();
    const tableData: Record<string, any[]> = {};

    return this._exportHistoryConversations(tables, progressCallback)
      .then(conversationsData => {
        tableData[StorageSchemata.OBJECT_STORE.CONVERSATIONS] = conversationsData;
        return this._exportHistoryEvents(tables, progressCallback);
      })
      .then(eventsData => {
        tableData[StorageSchemata.OBJECT_STORE.EVENTS] = eventsData;
        return tableData;
      });
  }

  private _exportHistoryConversations(
    tables: Dexie.Table<any, string>[],
    progressCallback: (chunkLength: number) => void,
  ): Dexie.Promise<any[]> {
    const conversationsTable = tables.find(table => table.name === StorageSchemata.OBJECT_STORE.CONVERSATIONS);
    const onProgress = (tableRows: any[], exportedEntitiesCount: number) => {
      progressCallback(tableRows.length);
      this.logger.log(`Exported '${exportedEntitiesCount}' conversation states from history`);

      tableRows.forEach(conversation => delete conversation.verification_state);
    };

    return this._exportHistoryFromTable(conversationsTable, onProgress);
  }

  private _exportHistoryEvents(
    tables: Dexie.Table<any, string>[],
    progressCallback: (chunkLength: number) => void,
  ): Dexie.Promise<any[]> {
    const eventsTable = tables.find(table => table.name === StorageSchemata.OBJECT_STORE.EVENTS);
    const onProgress = (tableRows: any[], exportedEntitiesCount: number) => {
      progressCallback(tableRows.length);
      this.logger.log(`Exported '${exportedEntitiesCount}' events from history`);

      for (let index = tableRows.length - 1; index >= 0; index -= 1) {
        const event = tableRows[index];
        const isTypeVerification = event.type === ClientEvent.CONVERSATION.VERIFICATION;
        if (isTypeVerification) {
          tableRows.splice(index, 1);
        }
      }
    };

    return this._exportHistoryFromTable(eventsTable, onProgress);
  }

  private _exportHistoryFromTable(
    table: Dexie.Table<any, string>,
    onProgress: (tableRows: any[], exportedEntitiesCount: number) => void,
  ): Dexie.Promise<any[]> {
    const tableData: any[] = [];
    let exportedEntitiesCount = 0;

    return this.backupService
      .exportTable(table, tableRows => {
        if (this.isCanceled) {
          throw new window.z.backup.CancelError();
        }
        exportedEntitiesCount += tableRows.length;

        onProgress(tableRows, exportedEntitiesCount);
        tableData.push(tableRows);
      })
      .then(() => [].concat(...tableData));
  }

  private compressHistoryFiles(exportedData: Record<string, any>): JSZip {
    const metaData = this.createMetaData();
    const zip = new JSZip();

    // first write the metadata file
    zip.file(BackupRepository.CONFIG.FILENAME.METADATA, JSON.stringify(metaData, null, 2));

    // then all the other tables
    Object.keys(exportedData).forEach(tableName => {
      zip.file(`${tableName}.json`, JSON.stringify(exportedData[tableName]));
    });

    return zip;
  }

  public getBackupInitData(): Promise<number> {
    return this.backupService.getHistoryCount();
  }

  public importHistory(
    archive: JSZip,
    initCallback: (numberOfRecords: number) => void,
    progressCallback: (numberProcessed: number) => void,
  ): Promise<void> {
    this.isCanceled = false;
    const files = archive.files;
    if (!files[BackupRepository.CONFIG.FILENAME.METADATA]) {
      throw new window.z.backup.InvalidMetaDataError();
    }

    return this.verifyMetadata(files)
      .then(() => this._extractHistoryFiles(files))
      .then(fileDescriptors => this._importHistoryData(fileDescriptors, initCallback, progressCallback))
      .catch(error => {
        this.logger.error(`Could not export history: ${error.message}`, error);
        throw error;
      });
  }

  private async _importHistoryData(
    fileDescriptors: FileDescriptor[],
    initCallback: (numberOfRecords: number) => void,
    progressCallback: (numberProcessed: number) => void,
  ): Promise<void> {
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

    const importedEntities = await this._importHistoryConversations(conversationEntities, progressCallback);
    await this._importHistoryEvents(eventEntities, progressCallback);
    this.conversationRepository.updateConversations(importedEntities);
    this.conversationRepository.map_connections(this.connectionRepository.connectionEntities());
    // doesn't need to be awaited
    this.conversationRepository.checkForDeletedConversations();
  }

  private _importHistoryConversations(
    conversationEntities: Conversation[],
    progressCallback: (chunkLength: number) => void,
  ): Promise<any[]> {
    const entityCount = conversationEntities.length;
    let importedEntities: any[] = [];

    const entityChunks = chunk(conversationEntities, BackupService.CONFIG.BATCH_SIZE);

    const importConversationChunk = (conversationChunk: any[]): Promise<void> =>
      this.conversationRepository.updateConversationStates(conversationChunk).then(importedConversationEntities => {
        importedEntities = importedEntities.concat(importedConversationEntities);
        this.logger.log(`Imported '${importedEntities.length}' of '${entityCount}' conversation states from backup`);
        progressCallback(conversationChunk.length);
      });

    return this._chunkImport(importConversationChunk, entityChunks).then(() => importedEntities);
  }

  private _importHistoryEvents(eventEntities: any[], progressCallback: (chunkLength: number) => void): Promise<void> {
    const entityCount = eventEntities.length;
    let importedEntities = 0;

    const entities = eventEntities.map(entity => this.mapEntityDataType(entity));
    const entityChunks = chunk(entities, BackupService.CONFIG.BATCH_SIZE);

    const importEventChunk = (eventChunk: any[]): Promise<void> =>
      this.backupService.importEntities(StorageSchemata.OBJECT_STORE.EVENTS, eventChunk).then(() => {
        importedEntities += eventChunk.length;
        this.logger.log(`Imported '${importedEntities}' of '${entityCount}' events from backup`);
        progressCallback(eventChunk.length);
      });

    return this._chunkImport(importEventChunk, entityChunks);
  }

  private async _chunkImport(importFunction: (eventChunk: any[]) => Promise<void>, importChunks: any[]): Promise<void> {
    for (const importChunk of importChunks) {
      await importFunction(importChunk);
      if (this.isCanceled) {
        throw new window.z.backup.CancelError();
      }
    }
  }

  private _extractHistoryFiles(files: Record<string, JSZipObject>): Promise<FileDescriptor[]> {
    const unzipPromises = Object.values(files)
      .filter(zippedFile => zippedFile.name !== BackupRepository.CONFIG.FILENAME.METADATA)
      .map(zippedFile => zippedFile.async('string').then(value => ({content: value, filename: zippedFile.name})));

    return Promise.all(unzipPromises).then(fileDescriptors => {
      this.logger.log('Unzipped files for history import', fileDescriptors);
      return fileDescriptors;
    });
  }

  public mapEntityDataType(entity: any): any {
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

  public verifyMetadata(files: Record<string, JSZipObject>): Promise<void> {
    return files[BackupRepository.CONFIG.FILENAME.METADATA]
      .async('string')
      .then(rawData => JSON.parse(rawData))
      .then(metadata => this._verifyMetadata(metadata))
      .then(() => this.logger.log('Validated metadata during history import', files));
  }

  private _verifyMetadata(archiveMetadata: Metadata): void {
    const localMetadata = this.createMetaData();
    const isExpectedUserId = archiveMetadata.user_id === localMetadata.user_id;
    if (!isExpectedUserId) {
      const fromUserId = archiveMetadata.user_id;
      const toUserId = localMetadata.user_id;
      const message = `History from user "${fromUserId}" cannot be restored for user "${toUserId}".`;
      throw new window.z.backup.DifferentAccountError(message);
    }

    const isExpectedPlatform = archiveMetadata.platform === localMetadata.platform;
    if (!isExpectedPlatform) {
      const message = `History created from "${archiveMetadata.platform}" device cannot be imported`;
      throw new window.z.backup.IncompatiblePlatformError(message);
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
      throw new window.z.backup.IncompatibleBackupError(message);
    }
  }
}
