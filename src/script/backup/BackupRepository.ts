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
import {container} from 'tsyringe';
import {omit} from 'underscore';

import {chunk} from 'Util/ArrayUtil';
import {Logger, getLogger} from 'Util/Logger';
import {constructUserPrimaryKey} from 'Util/StorageUtil';
import {WebWorker} from 'Util/worker';

import {BackupService} from './BackupService';
import {
  CancelError,
  DifferentAccountError,
  ExportError,
  ImportError,
  IncompatibleBackupError,
  IncompatiblePlatformError,
  InvalidMetaDataError,
} from './Error';
import {preprocessConversations, preprocessEvents, preprocessUsers} from './recordPreprocessors';

import {ConnectionState} from '../connection/ConnectionState';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';
import {EventRecord, UserRecord} from '../storage';
import {ConversationRecord} from '../storage/record/ConversationRecord';
import {StorageSchemata} from '../storage/StorageSchemata';

interface Metadata {
  client_id: string;
  creation_time: string;
  platform: 'Web';
  user_handle: string;
  user_id: string;
  user_name: string;
  version: number;
}

type ProgressCallback = (done: number) => void;

export type FileDescriptor =
  | {
      entities: UserRecord[];
      filename: Filename.USERS;
    }
  | {
      entities: EventRecord[];
      filename: Filename.EVENTS;
    }
  | {
      entities: ConversationRecord[];
      filename: Filename.CONVERSATIONS;
    };

export enum Filename {
  CONVERSATIONS = 'conversations.json',
  EVENTS = 'events.json',
  USERS = 'users.json',
  METADATA = 'export.json',
}

const UINT8ARRAY_FIELDS = ['otr_key', 'sha256'];

export class BackupRepository {
  private readonly backupService: BackupService;
  private readonly conversationRepository: ConversationRepository;
  private readonly logger: Logger;
  private canceled: boolean = false;
  private worker: WebWorker;

  constructor(
    backupService: BackupService,
    conversationRepository: ConversationRepository,
    private readonly connectionState = container.resolve(ConnectionState),
  ) {
    this.logger = getLogger('BackupRepository');

    this.backupService = backupService;
    this.conversationRepository = conversationRepository;

    this.worker = new WebWorker(() => new Worker(new URL('./zipWorker.ts', import.meta.url)));
  }

  public cancelAction(): void {
    this.canceled = true;
  }

  public createMetaData(user: User, clientId: string): Metadata {
    return {
      client_id: clientId,
      creation_time: new Date().toISOString(),
      platform: 'Web',
      user_handle: user.username(),
      user_id: user.id,
      user_name: user.name(),
      version: this.backupService.getDatabaseVersion(),
    };
  }

  /**
   * Gather needed data for the export and generates the history
   *
   * @param progressCallback called on every step of the export
   * @returns The promise that contains all the exported tables
   */
  public async generateHistory(user: User, clientId: string, progressCallback: ProgressCallback): Promise<Blob> {
    this.canceled = false;

    try {
      const exportedData = await this._exportHistory(progressCallback);
      return await this.compressHistoryFiles(user, clientId, exportedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error;
      this.logger.error(`Could not export history: ${errorMessage}`, error);
      const isCancelError = error instanceof CancelError;
      throw isCancelError ? error : new ExportError();
    }
  }

  private async _exportHistory(progressCallback: ProgressCallback) {
    const [conversationTable, eventsTable, usersTable] = this.backupService.getTables();
    const tableData: Record<string, any[]> = {};

    function streamProgress<T>(dataProcessor: (data: T[]) => T[]) {
      return (data: T[]) => {
        progressCallback(data.length);
        return dataProcessor(data);
      };
    }

    const conversationsData = await this.exportTable(conversationTable, streamProgress(preprocessConversations));
    tableData[StorageSchemata.OBJECT_STORE.CONVERSATIONS] = conversationsData;

    const eventsData = await this.exportTable(eventsTable, streamProgress(preprocessEvents));
    tableData[StorageSchemata.OBJECT_STORE.EVENTS] = eventsData;

    const usersData = await this.exportTable(usersTable, streamProgress(preprocessUsers));
    tableData[StorageSchemata.OBJECT_STORE.USERS] = usersData;

    return tableData;
  }

  private async exportTable<T>(table: Dexie.Table<T, unknown>, preprocessor: (tableRows: T[]) => T[]): Promise<any[]> {
    const tableData: T[] = [];

    await this.backupService.exportTable(table, tableRows => {
      if (this.canceled) {
        throw new CancelError();
      }
      const processedData = preprocessor(tableRows);
      tableData.push(...processedData);
    });
    return tableData;
  }

  private async compressHistoryFiles(user: User, clientId: string, exportedData: Record<string, any>): Promise<Blob> {
    const metaData = this.createMetaData(user, clientId);

    const files: Record<string, Uint8Array> = {};

    const stringifiedMetadata = JSON.stringify(metaData, null, 2);
    const encodedMetadata = new TextEncoder().encode(stringifiedMetadata);

    for (const tableName in exportedData) {
      const stringifiedData = JSON.stringify(exportedData[tableName]);
      const encodedData = new TextEncoder().encode(stringifiedData);
      const fileName = `${tableName}.json`;
      files[fileName] = encodedData;
    }

    files[Filename.METADATA] = encodedMetadata;

    const array = await this.worker.post<Uint8Array>({type: 'zip', files});
    return new Blob([array], {type: 'application/zip'});
  }

  public getBackupInitData(): Promise<number> {
    return this.backupService.getHistoryCount();
  }

  public async importHistory(
    user: User,
    data: ArrayBuffer | Blob,
    initCallback: ProgressCallback,
    progressCallback: ProgressCallback,
  ): Promise<void> {
    this.canceled = false;

    const files = await this.worker.post<Record<string, Uint8Array>>({type: 'unzip', bytes: data});

    if (files.error) {
      throw new ImportError(files.error as unknown as string);
    }

    if (!files[Filename.METADATA]) {
      throw new InvalidMetaDataError();
    }

    await this.verifyMetadata(user, files);
    const fileDescriptors = Object.entries(files)
      .filter(([filename]) => filename !== Filename.METADATA)
      .map(([filename, content]) => {
        const data = new TextDecoder().decode(content);
        const entities = JSON.parse(data);
        return {
          entities,
          filename,
        } as FileDescriptor;
      });

    const nbEntities = fileDescriptors.reduce((acc, {entities}) => acc + entities.length, 0);
    initCallback(nbEntities);

    await this.importHistoryData(fileDescriptors, progressCallback);
  }

  private async importHistoryData(
    fileDescriptors: FileDescriptor[],
    progressCallback: ProgressCallback,
  ): Promise<void> {
    let importedConversations: Conversation[] = [];
    for (const {filename, entities} of fileDescriptors) {
      switch (filename) {
        case Filename.CONVERSATIONS: {
          importedConversations = await this.importConversations(entities, progressCallback);
          break;
        }
        case Filename.EVENTS:
          await this.importEvents(entities, progressCallback);
          break;

        case Filename.USERS:
          await this.importUsers(entities, progressCallback);
          break;
      }
    }

    await this.conversationRepository.updateConversations(importedConversations);
    await Promise.all(this.conversationRepository.mapConnections(this.connectionState.connections()));
    // doesn't need to be awaited
    void this.conversationRepository.checkForDeletedConversations();
  }

  private async importConversations(
    conversations: ConversationRecord[],
    progressCallback: ProgressCallback,
  ): Promise<Conversation[]> {
    const entityCount = conversations.length;
    let importedEntities: Conversation[] = [];

    const importConversationChunk = async (conversationChunk: ConversationRecord[]) => {
      const importedConversationEntities = await this.conversationRepository.updateConversationStates(
        conversationChunk,
      );
      importedEntities = importedEntities.concat(importedConversationEntities);
      this.logger.log(`Imported '${importedEntities.length}' of '${entityCount}' conversations`);
      progressCallback(conversationChunk.length);
    };

    await this.chunkImport(importConversationChunk, conversations);
    return importedEntities;
  }

  private async importEvents(events: EventRecord[], progressCallback: ProgressCallback): Promise<void> {
    const entityCount = events.length;
    let importedEntities = 0;

    const entities = events.map(entity => this.prepareEvents(entity));

    const importEventChunk = async (eventChunk: Omit<EventRecord, 'primary_key'>[]) => {
      await this.backupService.importEntities(StorageSchemata.OBJECT_STORE.EVENTS, eventChunk);
      importedEntities += eventChunk.length;
      this.logger.log(`Imported '${importedEntities}' of '${entityCount}' events`);
      progressCallback(eventChunk.length);
    };

    return this.chunkImport(importEventChunk, entities);
  }

  private async importUsers(users: UserRecord[], progressCallback: ProgressCallback) {
    let importedEntities = 0;
    let alreadyExistingEntities = 0;

    /* we want to remove users that don't have qualified ids (has we cannot generate primary keys for them) */
    const qualifiedUsers = users.filter(user => !!user.qualified_id);

    const importEventChunk = async (usersChunk: UserRecord[]) => {
      const successfulImports = await this.backupService.importEntities(
        StorageSchemata.OBJECT_STORE.USERS,
        usersChunk,
        user => constructUserPrimaryKey(user.qualified_id),
      );
      importedEntities += usersChunk.length;
      alreadyExistingEntities += usersChunk.length - successfulImports;
      this.logger.log(
        `Imported '${importedEntities}' of '${qualifiedUsers.length}' users (${alreadyExistingEntities} skipped))`,
      );
      progressCallback(usersChunk.length);
    };

    return this.chunkImport(importEventChunk, qualifiedUsers);
  }

  private async chunkImport<T>(importFunction: (eventChunk: T[]) => Promise<void>, entities: T[]): Promise<void> {
    const chunks = chunk(entities, BackupService.CONFIG.BATCH_SIZE);
    for (const chunk of chunks) {
      await importFunction(chunk);
      if (this.canceled) {
        throw new CancelError();
      }
    }
  }

  private prepareEvents(entity: EventRecord) {
    if (entity.data) {
      UINT8ARRAY_FIELDS.forEach(field => {
        const dataField = entity.data[field];
        if (dataField) {
          entity.data[field] = new Uint8Array(Object.values(dataField));
        }
      });
    }
    return omit(entity, 'primary_key');
  }

  private async verifyMetadata(user: User, files: Record<string, Uint8Array>): Promise<void> {
    const rawData = files[Filename.METADATA];
    const metaData = new TextDecoder().decode(rawData);
    const parsedMetaData = JSON.parse(metaData);
    this._verifyMetadata(user, parsedMetaData);
    this.logger.log('Validated metadata during history import', files);
  }

  private _verifyMetadata(user: User, archiveMetadata: Metadata): void {
    const localMetadata = this.createMetaData(user, '');
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
