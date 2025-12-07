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

import {omit} from 'underscore';

import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {isReadableConversation} from 'Repositories/conversation/ConversationSelectors';
import type {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {EventRecord, UserRecord} from 'Repositories/storage';
import {ConversationRecord} from 'Repositories/storage/record/ConversationRecord';
import {StorageSchemata} from 'Repositories/storage/StorageSchemata';
import {chunk} from 'Util/ArrayUtil';
import {Logger, getLogger} from 'Util/Logger';
import {constructUserPrimaryKey} from 'Util/StorageUtil';
import {WebWorker} from 'Util/worker';

import {ProgressCallback, Filename, FileDescriptor} from './Backup.types';
import {BackUpHeader, ERROR_TYPES} from './BackUpHeader';
import {BackupService} from './BackupService';
import {exportCPBHistoryFromDatabase, importCPBHistoryToDatabase, isCPBackup} from './CrossPlatformBackup';
import {
  CancelError,
  DifferentAccountError,
  ErrorType,
  ExportError,
  hasErrorProperty,
  ImportError,
  IncompatibleBackupError,
  IncompatibleBackupFormatError,
  InvalidPassword,
  isErrorOfType,
} from './Error';
import {createMetaData, exportHistory, importLegacyBackupToDatabase} from './LegacyBackup.helper';

import {Config} from '../../Config';

/* eslint-enable */

const UINT8ARRAY_FIELDS = ['otr_key', 'sha256'];

export class BackupRepository {
  private readonly backupService: BackupService;
  private readonly conversationRepository: ConversationRepository;
  private readonly logger: Logger;
  private canceled: boolean = false;
  private worker: WebWorker;

  constructor(backupService: BackupService, conversationRepository: ConversationRepository) {
    this.logger = getLogger('BackupRepository');

    this.backupService = backupService;
    this.conversationRepository = conversationRepository;

    this.worker = new WebWorker(() => new Worker(new URL('./zipWorker.ts', import.meta.url)));
  }

  public cancelAction(): void {
    this.canceled = true;
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

    const checkCancelStatus = () => this.canceled;

    const {
      FEATURE: {ENABLE_CROSS_PLATFORM_BACKUP_EXPORT},
    } = Config.getConfig();

    try {
      let exportedData = null;
      // If the feature flag is enabled, export the history as a cross-platform backup
      if (ENABLE_CROSS_PLATFORM_BACKUP_EXPORT) {
        exportedData = await exportCPBHistoryFromDatabase({
          progressCallback,
          user,
          backupService: this.backupService,
          password,
          checkCancelStatus,
        });
        // Compression and encryption are handled by the kalium-backup library
        return new Blob([exportedData], {type: 'application/zip'});
      }

      // If the feature flag is disabled, export the history as a legacy backup
      exportedData = await exportHistory(progressCallback, this.backupService, checkCancelStatus);

      if (exportedData === null) {
        throw new Error('Exported data is null');
      }

      return await this.compressHistoryFiles(user, clientId, exportedData, password);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : error;
      this.logger.error(`Could not export history: ${errorMessage}`, error);
      const isCancelError = isErrorOfType(error, ErrorType.CancelError);
      throw isCancelError ? error : new ExportError();
    }
  }

  private async compressHistoryFiles(
    user: User,
    clientId: string,
    exportedData: Record<string, any[]>,
    password: string,
  ): Promise<Blob> {
    const files: Record<string, Uint8Array> = {};

    if (this.canceled) {
      throw new CancelError();
    }

    const metaData = createMetaData(user, clientId, this.backupService);

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
    let fileDescriptors: FileDescriptor[];
    let archiveVersion: number;

    // Check for cross-platform backup
    if (data instanceof ArrayBuffer && (await isCPBackup(data))) {
      // Import cross-platform backup
      const cpbData = await importCPBHistoryToDatabase({
        backupService: this.backupService,
        progressCallback,
        fileBytes: data,
        password,
        user,
      });
      fileDescriptors = cpbData.fileDescriptors;
      archiveVersion = cpbData.archiveVersion;
    } else {
      // Decrypt and unzip the legacy backup
      if (password) {
        files = await this.createDecryptedBackup(data, user, password);
      } else {
        files = await this.worker.post<Record<string, Uint8Array>>({
          type: 'unzip',
          bytes: data,
        });
      }
      if (hasErrorProperty(files)) {
        const error = files.error;
        if (error === 'WRONG_PASSWORD') {
          throw new InvalidPassword(error);
        }
        throw new ImportError(error);
      }
      // Import legacy backup
      const legacyData = await importLegacyBackupToDatabase({
        backupService: this.backupService,
        fileData: files,
        progressCallback,
        user,
      });
      fileDescriptors = legacyData.fileDescriptors;
      archiveVersion = legacyData.archiveVersion;
    }

    const nbEntities = fileDescriptors.reduce((acc, {entities}) => acc + entities.length, 0);
    initCallback(nbEntities);

    await this.importHistoryData(archiveVersion, fileDescriptors, progressCallback);
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
    archiveVersion: number,
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

    // Run all the database migrations on the imported data
    progressCallback(0);
    await this.backupService.runDbSchemaUpdates(archiveVersion);

    const readableConversations = importedConversations.filter(isReadableConversation);

    await this.conversationRepository.updateConversations(readableConversations);
    await this.conversationRepository.initAllLocal1To1Conversations();
    // doesn't need to be awaited
    void this.conversationRepository.syncDeletedConversations();
  }

  private async importConversations(
    conversations: ConversationRecord[],
    progressCallback: ProgressCallback,
  ): Promise<Conversation[]> {
    let importedEntities: Conversation[] = [];

    const importConversationChunk = async (conversationChunk: ConversationRecord[]) => {
      const importedConversationEntities =
        await this.conversationRepository.updateConversationStates(conversationChunk);
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
    const data = entity.data as any;
    if (data) {
      UINT8ARRAY_FIELDS.forEach(field => {
        const dataField = data[field];
        if (dataField) {
          data[field] = new Uint8Array(Object.values(dataField));
        }
      });
    }
    return omit(entity, 'primary_key');
  }

  private mapDecodingError(decodingError: string) {
    let message = '';
    switch (decodingError) {
      case ERROR_TYPES.INVALID_USER_ID: {
        message = 'The user id in the backup file header does not match the expected one';
        this.logger.error(message);
        throw new DifferentAccountError(message);
      }
      case ERROR_TYPES.INVALID_FORMAT:
        message = 'The provided backup version is lower than the minimum supported version';
        this.logger.error(message);
        throw new IncompatibleBackupError(message);

      case ERROR_TYPES.INVALID_VERSION:
        message = 'The provided backup version is lower than the minimum supported version';
        this.logger.error('The provided backup format is not supported');
        throw new IncompatibleBackupFormatError(message);
    }
  }
}
