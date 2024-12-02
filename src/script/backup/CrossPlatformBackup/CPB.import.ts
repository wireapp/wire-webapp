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

import {MPBackup, MPBackupImporter, BackupImportResult} from './CPB.library';
import {ImportHistoryToDatabaseParams} from './CPB.types';
import {mapEventRecord} from './importMappers/mapEventRecord';

import {EventRecord} from '../../storage';
import {FileDescriptor, Filename} from '../Backup.types';
import {IncompatibleBackupError} from '../Error';

import {CPBLogger} from '.';

/**
 * Imports the history from a Multi-Platform backup to the Database
 */
export const importMPBHistoryToDatabase = async ({
  fileData,
}: ImportHistoryToDatabaseParams): Promise<{
  archiveVersion: number;
  fileDescriptors: FileDescriptor[];
}> => {
  const backupImporter = new MPBackupImporter();
  const backupRawData = fileData[MPBackup.ZIP_ENTRY_DATA];
  const FileDescriptor: FileDescriptor[] = [];

  // Import the backup
  const result = backupImporter.importBackup(new Int8Array(backupRawData.buffer));

  if (result instanceof BackupImportResult.Success) {
    CPBLogger.log(`SUCCESSFUL BACKUP IMPORT: ${result.backupData}`);
    const eventRecords: EventRecord[] = [];
    result.backupData.messages.forEach(message => {
      const eventRecord = mapEventRecord(message);
      if (eventRecord) {
        eventRecords.push(eventRecord);
      }
    });
    result.backupData.conversations.forEach(conversation => {
      // TODO: Import conversations
    });
    result.backupData.users.forEach(user => {
      // TODO: Import users
    });

    CPBLogger.log(`IMPORTED ${eventRecords.length} EVENTS`);
    FileDescriptor.push({entities: eventRecords, filename: Filename.EVENTS});
  } else {
    CPBLogger.log(`ERROR DURING BACKUP IMPORT: ${result}`);
    throw new IncompatibleBackupError('Incompatible Multiplatform backup');
  }

  return {archiveVersion: 0, fileDescriptors: FileDescriptor};
};
