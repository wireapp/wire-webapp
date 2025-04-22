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

import {CPBackup, CPBackupImporter, BackupImportResult} from './CPB.library';
import {ImportHistoryToDatabaseParams} from './CPB.types';
import {mapConversationRecord, mapUserRecord} from './importMappers';
import {mapEventRecord} from './importMappers/mapEventRecord';

import {ConversationRecord, EventRecord, UserRecord} from '../../storage';
import {FileDescriptor, Filename} from '../Backup.types';
import {IncompatibleBackupError} from '../Error';

import {CPBLogger} from '.';

/**
 * Imports the history from a Multi-Platform backup to the Database
 */
export const importCPBHistoryToDatabase = async ({
  fileData,
}: ImportHistoryToDatabaseParams): Promise<{
  archiveVersion: number;
  fileDescriptors: FileDescriptor[];
}> => {
  const backupImporter = new CPBackupImporter();
  const backupRawData = fileData[CPBackup.ZIP_ENTRY_DATA];
  const FileDescriptor: FileDescriptor[] = [];

  // Import the backup
  const result = backupImporter.importBackup(new Int8Array(backupRawData.buffer));

  if (result instanceof BackupImportResult.Success) {
    // import events
    const eventRecords: EventRecord[] = [];
    result.backupData.messages.forEach(message => {
      const eventRecord = mapEventRecord(message);
      if (eventRecord) {
        eventRecords.push(eventRecord);
      }
    });
    FileDescriptor.push({entities: eventRecords, filename: Filename.EVENTS});
    CPBLogger.log(`IMPORTED ${eventRecords.length} EVENTS`);

    // import conversations
    const conversationRecords: ConversationRecord[] = [];
    result.backupData.conversations.forEach(conversation => {
      const conversationRecord = mapConversationRecord(conversation);
      if (conversationRecord) {
        conversationRecords.push(conversationRecord);
      }
    });
    FileDescriptor.push({entities: conversationRecords, filename: Filename.CONVERSATIONS});
    CPBLogger.log(`IMPORTED ${conversationRecords.length} CONVERSATIONS`);

    // import users
    const userRecords: UserRecord[] = [];
    result.backupData.users.forEach(user => {
      const userRecord = mapUserRecord(user);
      if (userRecord) {
        userRecords.push(userRecord);
      }
    });
    FileDescriptor.push({entities: userRecords, filename: Filename.USERS});
    CPBLogger.log(`IMPORTED ${userRecords.length} USERS`);
  } else {
    CPBLogger.log(`ERROR DURING BACKUP IMPORT: ${result}`);
    throw new IncompatibleBackupError('Incompatible cross-platform backup');
  }

  return {archiveVersion: 0, fileDescriptors: FileDescriptor};
};
