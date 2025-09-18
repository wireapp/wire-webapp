/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {User} from 'Repositories/entity/User';
import {StorageSchemata} from 'Repositories/storage/StorageSchemata';
import {getLogger} from 'Util/Logger';

import {ProgressCallback, FileData, Filename, FileDescriptor, Metadata} from './Backup.types';
import {BackupService} from './BackupService';
import {exportTable} from './CrossPlatformBackup';
import {CancelError, DifferentAccountError, IncompatiblePlatformError, InvalidMetaDataError} from './Error';
import {preprocessConversations, preprocessEvents, preprocessUsers} from './recordPreprocessors';

const logger = getLogger('wire:backup:LegacyBackup');

export const createMetaData = (user: User, clientId: string, backupService: BackupService): Metadata => {
  return {
    client_id: clientId,
    creation_time: new Date().toISOString(),
    platform: 'Web',
    user_handle: user.username(),
    user_id: user.id,
    user_name: user.name(),
    version: backupService.getDatabaseVersion(),
  };
};

interface VerifyMetaDataParams {
  user: User;
  fileData: FileData;
  backupService: BackupService;
}
const verifyMetadata = async ({backupService, fileData, user}: VerifyMetaDataParams): Promise<number> => {
  const _verifyMetadata = (user: User, archiveMetadata: Metadata): number => {
    const localMetadata = createMetaData(user, '', backupService);
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

    return archiveMetadata.version;
  };
  const rawData = fileData[Filename.METADATA];
  const metaData = new TextDecoder().decode(rawData);
  const parsedMetaData = JSON.parse(metaData);
  const archiveVersion = _verifyMetadata(user, parsedMetaData);
  logger.debug('Validated metadata during history import');
  return archiveVersion;
};

interface ImportLegacyBackupToDatabaseParams {
  progressCallback: ProgressCallback;
  user: User;
  fileData: FileData;
  backupService: BackupService;
}
export const importLegacyBackupToDatabase = async ({
  progressCallback,
  user,
  fileData,
  backupService,
}: ImportLegacyBackupToDatabaseParams): Promise<{
  archiveVersion: number;
  fileDescriptors: FileDescriptor[];
}> => {
  // Import legacy backup
  if (!fileData[Filename.METADATA]) {
    throw new InvalidMetaDataError();
  }

  const archiveVersion = await verifyMetadata({user, backupService, fileData});
  const fileDescriptors = Object.entries(fileData)
    .filter(([filename]) => filename !== Filename.METADATA)
    .map(([filename, content]) => {
      const data = new TextDecoder().decode(content);
      const entities = JSON.parse(data);
      return {
        entities,
        filename,
      } as FileDescriptor;
    });

  return {archiveVersion, fileDescriptors};
};

export const exportHistory = async (
  progressCallback: ProgressCallback,
  backupService: BackupService,
  checkCancelStatus: () => boolean,
) => {
  const [conversationTable, eventsTable, usersTable] = backupService.getTables();
  const tableData: Record<string, any[]> = {};

  const checkIfCancelled = () => {
    if (checkCancelStatus()) {
      throw new CancelError();
    }
  };

  function streamProgress<T>(dataProcessor: (data: T[]) => T[]) {
    return (data: T[]) => {
      progressCallback(data.length);
      return dataProcessor(data);
    };
  }
  checkIfCancelled();

  const conversationsData = await exportTable({
    table: conversationTable,
    preprocessor: streamProgress(preprocessConversations),
    backupService,
  });
  tableData[StorageSchemata.OBJECT_STORE.CONVERSATIONS] = conversationsData;
  checkIfCancelled();

  const eventsData = await exportTable({
    table: eventsTable,
    preprocessor: streamProgress(preprocessEvents),
    backupService,
  });
  tableData[StorageSchemata.OBJECT_STORE.EVENTS] = eventsData;
  checkIfCancelled();

  const usersData = await exportTable({
    table: usersTable,
    preprocessor: streamProgress(preprocessUsers),
    backupService,
  });
  tableData[StorageSchemata.OBJECT_STORE.USERS] = usersData;
  checkIfCancelled();

  return tableData;
};
