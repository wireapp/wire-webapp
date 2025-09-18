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

import {ConversationRecord, EventRecord, UserRecord} from 'Repositories/storage';

import {CPBackupImporter, BackupImportResult, BackupQualifiedId} from './CPB.library';
import {ImportHistoryToDatabaseParams} from './CPB.types';
import {mapConversationRecord, mapUserRecord} from './importMappers';
import {mapEventRecord} from './importMappers/mapEventRecord';

import {FileDescriptor, Filename} from '../Backup.types';
import {DifferentAccountError, IncompatibleBackupError, IncompatibleBackupFormatError, InvalidPassword} from '../Error';

import {CPBLogger, peekCrossPlatformData} from '.';

/**
 * Imports the history from a Multi-Platform backup to the Database
 */
export const importCPBHistoryToDatabase = async ({
  fileBytes,
  password,
  user,
}: ImportHistoryToDatabaseParams): Promise<{
  archiveVersion: number;
  fileDescriptors: FileDescriptor[];
}> => {
  const backupImporter = new CPBackupImporter();
  const backupData = new Uint8Array(fileBytes);
  const peekedData = await peekCrossPlatformData(fileBytes, new BackupQualifiedId(user.id, user.domain));
  const FileDescriptor: FileDescriptor[] = [];

  // Check if the backup was created by the same user
  if (!peekedData.isUserBackup) {
    CPBLogger.log('Backup is not created by the same user');
    throw new DifferentAccountError('Backup is not created by the same user');
  }

  // Import the backup

  const result = await backupImporter.importFromFileData(backupData, password);

  if (result instanceof BackupImportResult.Success) {
    const pager = result.pager;
    // import events
    const eventRecords: EventRecord[] = [];
    while (pager.messagesPager.hasMorePages()) {
      const messages = pager.messagesPager.nextPage();
      messages.forEach(message => {
        const eventRecord = mapEventRecord(message);
        if (eventRecord) {
          eventRecords.push(eventRecord);
        }
      });
    }
    FileDescriptor.push({entities: eventRecords, filename: Filename.EVENTS});
    CPBLogger.log(`IMPORTED ${eventRecords.length} EVENTS`);

    // import conversations
    const conversationRecords: ConversationRecord[] = [];
    while (pager.conversationsPager.hasMorePages()) {
      const conversations = pager.conversationsPager.nextPage();
      conversations.forEach(conversation => {
        const conversationRecord = mapConversationRecord(conversation);
        if (conversationRecord) {
          conversationRecords.push(conversationRecord);
        }
      });
    }
    FileDescriptor.push({entities: conversationRecords, filename: Filename.CONVERSATIONS});
    CPBLogger.log(`IMPORTED ${conversationRecords.length} CONVERSATIONS`);

    // import users
    const userRecords: UserRecord[] = [];
    while (pager.usersPager.hasMorePages()) {
      const users = pager.usersPager.nextPage();
      users.forEach(user => {
        const userRecord = mapUserRecord(user);
        if (userRecord) {
          userRecords.push(userRecord);
        }
      });
    }
    FileDescriptor.push({entities: userRecords, filename: Filename.USERS});
    CPBLogger.log(`IMPORTED ${userRecords.length} USERS`);
  }

  if (result instanceof BackupImportResult.Failure) {
    if (result === BackupImportResult.Failure.MissingOrWrongPassphrase) {
      CPBLogger.log(`Backup import failed: ${result}`);
      throw new InvalidPassword('Invalid password');
    }
    if (result === BackupImportResult.Failure.ParsingFailure) {
      CPBLogger.log(`Backup import failed: ${result}`);
      throw new IncompatibleBackupError('Incompatible cross-platform backup');
    }
    CPBLogger.log(`Backup import failed: ${result}`);
    throw new IncompatibleBackupFormatError('Incompatible format');
  }

  return {archiveVersion: parseInt(peekedData.archiveVersion), fileDescriptors: FileDescriptor};
};
