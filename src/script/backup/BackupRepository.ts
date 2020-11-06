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

import type Dexie from 'dexie';

import {chunk} from 'Util/ArrayUtil';
import {Logger, getLogger} from 'Util/Logger';

import type {ConnectionRepository} from '../connection/ConnectionRepository';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {Conversation, SerializedConversation} from '../entity/Conversation';
import {ClientEvent} from '../event/Client';
import {StorageSchemata} from '../storage/StorageSchemata';
import {BackupService} from './BackupService';
import {WebWorker} from '../util/worker';
import {
  CancelError,
  DifferentAccountError,
  ExportError,
  IncompatibleBackupError,
  IncompatiblePlatformError,
  InvalidMetaDataError,
} from './Error';
import {container} from 'tsyringe';
import {ClientState} from '../client/ClientState';
import {UserState} from '../user/UserState';

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
  content: Uint8Array;
  filename: string;
}

export class BackupRepository {
  private readonly backupService: BackupService;
  private readonly connectionRepository: ConnectionRepository;
  private readonly conversationRepository: ConversationRepository;
  private readonly logger: Logger;
  private canceled: boolean;

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
    connectionRepository: ConnectionRepository,
    conversationRepository: ConversationRepository,
    private readonly clientState = container.resolve(ClientState),
    private readonly userState = container.resolve(UserState),
  ) {
    this.logger = getLogger('BackupRepository');

    this.backupService = backupService;
    this.connectionRepository = connectionRepository;
    this.conversationRepository = conversationRepository;

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
      client_id: this.clientState.currentClient().id,
      creation_time: new Date().toISOString(),
      platform: 'Web',
      user_handle: this.userState.self().username(),
      user_id: this.userState.self().id,
      user_name: this.userState.self().name(),
      version: this.backupService.getDatabaseVersion(),
    };
  }

  /**
   * Gather needed data for the export and generates the history
   *
   * @param progressCallback called on every step of the export
   * @returns The promise that contains all the exported tables
   */
  public async generateHistory(progressCallback: (tableRows: number) => void): Promise<Blob> {
    this.isCanceled = false;

    try {
      const exportedData = await this._exportHistory(progressCallback);
      return await this.compressHistoryFiles(exportedData);
    } catch (error) {
      this.logger.error(`Could not export history: ${error.message}`, error);
      const isCancelError = error instanceof CancelError;
      throw isCancelError ? error : new ExportError();
    }
  }

  private async _exportHistory(progressCallback: (tableRows: number) => void): Promise<Record<string, any[]>> {
    const tables = this.backupService.getTables();
    const tableData: Record<string, any[]> = {};

    const conversationsData = await this.exportHistoryConversations(tables, progressCallback);
    tableData[StorageSchemata.OBJECT_STORE.CONVERSATIONS] = conversationsData;
    const eventsData = await this.exportHistoryEvents(tables, progressCallback);
    tableData[StorageSchemata.OBJECT_STORE.EVENTS] = eventsData;
    return tableData;
  }

  private exportHistoryConversations(
    tables: Dexie.Table<any, string>[],
    progressCallback: (chunkLength: number) => void,
  ): Promise<any[]> {
    const conversationsTable = tables.find(table => table.name === StorageSchemata.OBJECT_STORE.CONVERSATIONS);
    const onProgress = (tableRows: any[], exportedEntitiesCount: number) => {
      progressCallback(tableRows.length);
      this.logger.log(`Exported '${exportedEntitiesCount}' conversation states from history`);

      tableRows.forEach(conversation => delete conversation.verification_state);
    };

    return this.exportHistoryFromTable(conversationsTable, onProgress);
  }

  private exportHistoryEvents(
    tables: Dexie.Table<any, string>[],
    progressCallback: (chunkLength: number) => void,
  ): Promise<any[]> {
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

    return this.exportHistoryFromTable(eventsTable, onProgress);
  }

  private async exportHistoryFromTable(
    table: Dexie.Table<any, string>,
    onProgress: (tableRows: any[], exportedEntitiesCount: number) => void,
  ): Promise<any[]> {
    const tableData: any[] = [];
    let exportedEntitiesCount = 0;

    await this.backupService.exportTable(table, tableRows => {
      if (this.isCanceled) {
        throw new CancelError();
      }
      exportedEntitiesCount += tableRows.length;
      onProgress(tableRows, exportedEntitiesCount);
      tableData.push(tableRows);
    });
    return [].concat(...tableData);
  }

  private async compressHistoryFiles(exportedData: Record<string, any>): Promise<Blob> {
    const metaData = this.createMetaData();

    const files: Record<string, Uint8Array> = {};

    const stringifiedMetadata = JSON.stringify(metaData, null, 2);
    const encodedMetadata = new TextEncoder().encode(stringifiedMetadata);

    for (const tableName in exportedData) {
      const stringifiedData = JSON.stringify(exportedData[tableName]);
      const encodedData = new TextEncoder().encode(stringifiedData);
      const fileName = `${tableName}.json`;
      files[fileName] = encodedData;
    }

    files[BackupRepository.CONFIG.FILENAME.METADATA] = encodedMetadata;

    const worker = new WebWorker('worker/jszip-pack-worker.js');

    const array = await worker.post<Uint8Array>(files);
    return new Blob([array], {type: 'application/zip'});
  }

  public getBackupInitData(): Promise<number> {
    return this.backupService.getHistoryCount();
  }

  public async importHistory(
    files: Record<string, Uint8Array>,
    initCallback: (numberOfRecords: number) => void,
    progressCallback: (numberProcessed: number) => void,
  ): Promise<void> {
    this.isCanceled = false;
    if (!files[BackupRepository.CONFIG.FILENAME.METADATA]) {
      throw new InvalidMetaDataError();
    }

    try {
      await this.verifyMetadata(files);
      const fileDescriptors = Object.entries(files).map(([filename, content]) => ({
        content,
        filename,
      }));
      await this.importHistoryData(fileDescriptors, initCallback, progressCallback);
    } catch (error) {
      this.logger.error(`Could not export history: ${error.message}`, error);
      throw error;
    }
  }

  private async importHistoryData(
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

    const conversationFileContent = new TextDecoder().decode(conversationFileDescriptor.content);
    const conversationEntities = JSON.parse(conversationFileContent) as Conversation[];

    const eventFileContent = new TextDecoder().decode(eventFileDescriptor.content);
    const eventEntities = JSON.parse(eventFileContent);
    const entityCount = conversationEntities.length + eventEntities.length;
    initCallback(entityCount);

    const importedEntities = await this.importHistoryConversations(conversationEntities, progressCallback);
    await this.importHistoryEvents(eventEntities, progressCallback);
    this.conversationRepository.updateConversations(importedEntities);
    this.conversationRepository.map_connections(this.connectionRepository.connectionEntities());
    // doesn't need to be awaited
    this.conversationRepository.checkForDeletedConversations();
  }

  private async importHistoryConversations(
    conversationEntities: Conversation[],
    progressCallback: (chunkLength: number) => void,
  ): Promise<Conversation[]> {
    const entityCount = conversationEntities.length;
    let importedEntities: Conversation[] = [];

    const entityChunks = chunk(conversationEntities, BackupService.CONFIG.BATCH_SIZE);

    const importConversationChunk = async (conversationChunk: SerializedConversation[]): Promise<void> => {
      const importedConversationEntities = await this.conversationRepository.updateConversationStates(
        conversationChunk,
      );
      importedEntities = importedEntities.concat(importedConversationEntities);
      this.logger.log(`Imported '${importedEntities.length}' of '${entityCount}' conversation states from backup`);
      progressCallback(conversationChunk.length);
    };

    await this.chunkImport(importConversationChunk, entityChunks);
    return importedEntities;
  }

  private importHistoryEvents(eventEntities: any[], progressCallback: (chunkLength: number) => void): Promise<void> {
    const entityCount = eventEntities.length;
    let importedEntities = 0;

    const entities = eventEntities.map(entity => this.mapEntityDataType(entity));
    const entityChunks = chunk(entities, BackupService.CONFIG.BATCH_SIZE);

    const importEventChunk = async (eventChunk: any[]): Promise<void> => {
      await this.backupService.importEntities(StorageSchemata.OBJECT_STORE.EVENTS, eventChunk);
      importedEntities += eventChunk.length;
      this.logger.log(`Imported '${importedEntities}' of '${entityCount}' events from backup`);
      progressCallback(eventChunk.length);
    };

    return this.chunkImport(importEventChunk, entityChunks);
  }

  private async chunkImport(importFunction: (eventChunk: any[]) => Promise<void>, importChunks: any[]): Promise<void> {
    for (const importChunk of importChunks) {
      await importFunction(importChunk);
      if (this.isCanceled) {
        throw new CancelError();
      }
    }
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

  public async verifyMetadata(files: Record<string, Uint8Array>): Promise<void> {
    const rawData = files[BackupRepository.CONFIG.FILENAME.METADATA];
    const metaData = new TextDecoder().decode(rawData);
    const parsedMetaData = JSON.parse(metaData);
    this._verifyMetadata(parsedMetaData);
    this.logger.log('Validated metadata during history import', files);
  }

  private _verifyMetadata(archiveMetadata: Metadata): void {
    const localMetadata = this.createMetaData();
    const isExpectedUserId = archiveMetadata.user_id === localMetadata.user_id;
    if (!isExpectedUserId) {
      const fromUserId = archiveMetadata.user_id;
      const toUserId = localMetadata.user_id;
      const message = `History from user "${fromUserId}" cannot be restored for user "${toUserId}".`;
      throw new DifferentAccountError(message);
    }

    const isExpectedPlatform = archiveMetadata.platform === localMetadata.platform;
    if (!isExpectedPlatform) {
      const message = `History created from "${archiveMetadata.platform}" device cannot be imported`;
      throw new IncompatiblePlatformError(message);
    }

    const lowestDbVersion = Math.min(archiveMetadata.version, localMetadata.version);
    const involvesDatabaseMigration = StorageSchemata.SCHEMATA.reduce((involvesMigration, schemaData) => {
      if (schemaData.version > lowestDbVersion) {
        return involvesMigration || !!schemaData.upgrade;
      }
      return involvesMigration;
    }, false);

    if (involvesDatabaseMigration) {
      const message = 'History cannot be restored: Database version mismatch';
      throw new IncompatibleBackupError(message);
    }
  }
}
