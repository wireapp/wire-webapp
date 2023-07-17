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

import {BackUpHeader, ERROR_TYPES} from './BackUpHeader';
import {BackupService} from './BackupService';
import {
  CancelError,
  DifferentAccountError,
  ExportError,
  ImportError,
  IncompatibleBackupError,
  IncompatibleBackupFormatError,
  IncompatiblePlatformError,
  InvalidMetaDataError,
  InvalidPassword,
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
  public async generateHistory(
    user: User,
    clientId: string,
    progressCallback: ProgressCallback,
    password: string,
  ): Promise<Blob> {
    this.canceled = false;

    try {
      const exportedData = await this._exportHistory(progressCallback);
      return await this.compressHistoryFiles(user, clientId, exportedData, password);
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
  private async compressHistoryFiles(
    user: User,
    clientId: string,
    exportedData: Record<string, any>,
    password: string,
  ): Promise<Blob> {
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

    if (password) {
      return this.createEncryptedBackup(files, user, password);
    }

    // If no password, return the regular ZIP archive
    const array = await this.worker.post<Uint8Array>({type: 'zip', files});
    return new Blob([array], {type: 'application/zip'});
  }

  private async createEncryptedBackup(files: Record<string, Uint8Array>, user: User, password: string): Promise<Blob> {
    // encode header
    const backupCoder = new BackUpHeader(user.id, password);
    const backupHeader = await this.generateBackupHeader(user, password, backupCoder).catch(error => {
      throw new Error('Backup error:', error);
    });

    // Encrypt the ZIP archive using the provided password
    const {decodedHeader} = backupCoder.readBackupHeader(backupHeader);
    const chaCha20Key = await backupCoder.generateChaCha20Key(decodedHeader);
    const array = await this.worker.post<Uint8Array>({type: 'zip', files, encrytionKey: chaCha20Key});

    // Prepend the combinedBytes to the ZIP archive data
    const combinedArray = this.concatenateByteArrays([backupHeader, array]);
    return new Blob([combinedArray], {type: 'application/zip'});
  }

  private async generateBackupHeader(user: User, password: string, backupCoder: BackUpHeader) {
    const backupHeader = await backupCoder.encodeHeader();
    if (backupHeader.byteLength === 0) {
      throw new Error('Backup header is empty');
    }
    return backupHeader;
  }

  private concatenateByteArrays(arrays: Uint8Array[]): Uint8Array {
    // Calculate the total length of the concatenated array
    let totalLength = 0;
    for (const array of arrays) {
      totalLength += array.length;
    }

    // Create a new Uint8Array with the total length
    const concatenatedArray = new Uint8Array(totalLength);

    // Copy each array into the concatenated array
    let offset = 0;
    for (const array of arrays) {
      concatenatedArray.set(array, offset);
      offset += array.length;
    }

    return concatenatedArray;
  }
  public getBackupInitData(): Promise<number> {
    return this.backupService.getHistoryCount();
  }

  private async convertToUint8Array(data: ArrayBuffer | Blob): Promise<Uint8Array> {
    if (data instanceof ArrayBuffer) {
      return new Uint8Array(data);
    } else if (data instanceof Blob) {
      return await this.readBlobAsUint8Array(data);
    }
    throw new Error('Unsupported data type');
  }
  private async readBlobAsUint8Array(blob: Blob): Promise<Uint8Array> {
    return new Promise<Uint8Array>((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadend = () => {
        if (reader.result instanceof ArrayBuffer) {
          resolve(new Uint8Array(reader.result));
        } else {
          reject(new Error('Invalid Blob data'));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read Blob data'));
      };

      reader.readAsArrayBuffer(blob);
    });
  }

  public async importHistory(
    user: User,
    data: ArrayBuffer | Blob,
    initCallback: ProgressCallback,
    progressCallback: ProgressCallback,
    password?: string,
  ): Promise<void> {
    this.canceled = false;
    let files;

    if (password) {
      files = await this.createDecryptedBackup(data, user, password);
    } else {
      files = await this.worker.post<Record<string, Uint8Array>>({
        type: 'unzip',
        bytes: data,
      });
    }

    if (files.error) {
      const error = files.error.toString();
      if (error === 'WRONG_PASSWORD') {
        throw new InvalidPassword(error);
      }
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

  private async createDecryptedBackup(
    data: ArrayBuffer | Blob,
    user: User,
    password: string,
  ): Promise<Record<string, Uint8Array>> {
    const backupCoder = new BackUpHeader(user.id, password);

    // Convert data to Uint8Array
    const dataArray = await this.convertToUint8Array(data);
    const {decodingError, decodedHeader, headerSize} = await backupCoder.decodeHeader(dataArray);

    // error decoding the header
    if (decodingError) {
      this.mapDecodingError(decodingError);
    }
    // We need to read the ChaCha20 generated header prior to the encrypted backup file data to run some sanity checks
    const chaChaHeaderKey = await backupCoder.generateChaCha20Key(decodedHeader);

    // ChaCha20 header is needed to validate the encrypted data hasn't been tampered with different authentication
    return await this.worker.post<Record<string, Uint8Array>>({
      type: 'unzip',
      bytes: data,
      encrytionKey: chaChaHeaderKey,
      headerLength: headerSize,
    });
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
    let importedEntities: Conversation[] = [];

    const importConversationChunk = async (conversationChunk: ConversationRecord[]) => {
      const importedConversationEntities = await this.conversationRepository.updateConversationStates(
        conversationChunk,
      );
      importedEntities = importedEntities.concat(importedConversationEntities);
      progressCallback(conversationChunk.length);
      return importedEntities.length;
    };

    await this.chunkImport(importConversationChunk, conversations, Filename.CONVERSATIONS);
    return importedEntities;
  }

  private async importEvents(events: EventRecord[], progressCallback: ProgressCallback): Promise<void> {
    const entities = events.map(entity => this.prepareEvents(entity));
    const conversationCreationEvents = await this.backupService.getConversationCreationEvents();
    // We filter all the creation events that already exist in the database
    // since the IDs are generated by the webapp, the same conversation creation event could have a different ID, this is why we need to filter them manually
    const eventsToImport = entities.filter(
      event =>
        !conversationCreationEvents.some(
          creationEvent => creationEvent.type === event.type && creationEvent.conversation === event.conversation,
        ),
    );

    const importEventChunk = async (eventChunk: Omit<EventRecord, 'primary_key'>[]) => {
      const nbImported = await this.backupService.importEntities(StorageSchemata.OBJECT_STORE.EVENTS, eventChunk, {
        generateId: event => event.id,
      });
      progressCallback(eventChunk.length);
      return nbImported;
    };

    return this.chunkImport(importEventChunk, eventsToImport, Filename.EVENTS);
  }

  private async importUsers(users: UserRecord[], progressCallback: ProgressCallback) {
    /* we want to remove users that don't have qualified ids (has we cannot generate primary keys for them) */
    const qualifiedUsers = users.filter(user => !!user.qualified_id);

    const importEventChunk = async (usersChunk: UserRecord[]) => {
      const nbImported = await this.backupService.importEntities(StorageSchemata.OBJECT_STORE.USERS, usersChunk, {
        generatePrimaryKey: user => constructUserPrimaryKey(user.qualified_id),
      });
      progressCallback(usersChunk.length);
      return nbImported;
    };

    return this.chunkImport(importEventChunk, qualifiedUsers, Filename.USERS);
  }

  private async chunkImport<T>(
    importFunction: (eventChunk: T[]) => Promise<number>,
    entities: T[],
    type: string,
  ): Promise<void> {
    const stats = {
      imported: 0,
      total: entities.length,
      ignored: 0,
    };
    const chunks = chunk(entities, BackupService.CONFIG.BATCH_SIZE);
    for (const chunk of chunks) {
      const nbImported = await importFunction(chunk);
      stats.imported += nbImported;
      stats.ignored += chunk.length - nbImported;
      this.logger.info(`Imported entities from '${type}'`, JSON.stringify(stats));
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

  private mapDecodingError(decodingError: string) {
    let message = '';
    switch (decodingError) {
      case ERROR_TYPES.INVALID_USER_ID: {
        message = 'The user id in the backup file header does not match the expected one';
        this.logger.error(message);
        throw new DifferentAccountError(message);
        break;
      }
      case ERROR_TYPES.INVALID_FORMAT:
        message = 'The provided backup version is lower than the minimum supported version';
        this.logger.error(message);
        throw new IncompatibleBackupError(message);
        break;

      case ERROR_TYPES.INVALID_VERSION:
        message = 'The provided backup version is lower than the minimum supported version';
        this.logger.error('The provided backup format is not supported');
        throw new IncompatibleBackupFormatError(message);
        break;
    }
  }
}
