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

import Dexie from 'dexie';

import {ConversationRecord, UserRecord, EventRecord} from 'src/script/storage';

import {
  MPBackupExporter,
  BackupQualifiedId,
  BackUpConversation,
  BackupUser,
  BackupMessage,
  BackupDateTime,
  BackupMessageContent,
} from './CPB.library';
import {ExportHistoryFromDatabaseParams} from './CPB.types';
import {ConversationTableSchema, UserTableSchema, EventTableSchema, AssetContentSchema} from './data.schema';

import {BackupService} from '../BackupService';
import {preprocessConversations, preprocessUsers, preprocessEvents} from '../recordPreprocessors';

import {CPBLogger, isAssetAddEvent, isMessageAddEvent, isSupportedEventType} from '.';

// Helper function to transform an Int8Array to an object
const transformObjectToArray = (array: {[key: number]: number}): Int8Array => {
  const result = new Int8Array(Object.keys(array).length);
  for (const key in array) {
    result[parseInt(key, 10)] = array[key];
  }
  return result;
};

interface ExportTableParams<T> {
  backupService: BackupService;
  table: Dexie.Table<T>;
  preprocessor: (tableRows: any[]) => any[];
}
const exportTable = async <T>({backupService, preprocessor, table}: ExportTableParams<T>) => {
  const tableData: T[] = [];

  await backupService.exportTable(table, tableRows => {
    const processedData = preprocessor(tableRows);
    tableData.push(...processedData);
  });

  return tableData;
};

/**
 * Export the history from the database to a Multi-Platform backup
 */
export const exportMPBHistoryFromDatabase = async ({
  backupService,
  progressCallback,
  user,
}: ExportHistoryFromDatabaseParams): Promise<Int8Array> => {
  const [conversationTable, eventsTable, usersTable] = backupService.getTables();
  const backupExporter = new MPBackupExporter(new BackupQualifiedId(user.id, user.domain));
  function streamProgress<T>(dataProcessor: (data: T[]) => T[]) {
    return (data: T[]) => {
      progressCallback(data.length);
      return dataProcessor(data);
    };
  }

  // Taking care of conversations
  const conversationsData = ConversationTableSchema.parse(
    await exportTable<ConversationRecord>({
      backupService,
      table: conversationTable,
      preprocessor: streamProgress(preprocessConversations),
    }),
  );
  conversationsData.forEach(conversationData =>
    backupExporter.addConversation(
      new BackUpConversation(
        new BackupQualifiedId(conversationData.id, conversationData.domain),
        conversationData.name ?? '',
      ),
    ),
  );

  // Taking care of users
  const usersData = UserTableSchema.parse(
    await exportTable<UserRecord>({backupService, table: usersTable, preprocessor: streamProgress(preprocessUsers)}),
  );
  usersData.forEach(userData =>
    backupExporter.addUser(
      new BackupUser(
        new BackupQualifiedId(userData.qualified_id.id, userData.qualified_id.domain),
        userData.name,
        userData.handle ?? '',
      ),
    ),
  );

  // Taking care of events
  const eventsData = EventTableSchema.parse(
    await exportTable<EventRecord>({backupService, table: eventsTable, preprocessor: streamProgress(preprocessEvents)}),
  );
  eventsData.forEach(eventData => {
    const {type} = eventData;
    // ToDo: Add support for other types of messages and different types of content. Also figure out which fields are required.
    if (!isSupportedEventType(type)) {
      // eslint-disable-next-line no-console
      CPBLogger.log('Unsupported message type', type);
      return;
    }
    if (!eventData.id) {
      // eslint-disable-next-line no-console
      CPBLogger.log('Event without id', eventData);
      return;
    }
    if (!eventData.qualified_conversation.id) {
      // eslint-disable-next-line no-console
      CPBLogger.log('Event without conversation id', eventData);
      return;
    }

    const id = eventData.id;
    const conversationId = new BackupQualifiedId(
      eventData.qualified_conversation.id,
      eventData.qualified_conversation.domain ?? '',
    );
    const senderUserId = new BackupQualifiedId(
      eventData.qualified_from?.id ?? '',
      eventData.qualified_from?.domain ?? '',
    );
    const senderClientId = eventData.from_client_id ?? '';
    const creationDate = new BackupDateTime(new Date(eventData.time));

    if (isAssetAddEvent(type)) {
      const {success, error, data} = AssetContentSchema.safeParse(eventData.data);
      if (!success) {
        CPBLogger.log('Asset data schema validation failed', error);
        return;
      }

      const asset = new BackupMessageContent.Asset(
        data.content_type,
        data.content_length,
        data.info.name,
        transformObjectToArray(data.otr_key),
        transformObjectToArray(data.sha256),
        data.key,
        data.token,
        data.domain,
        null,
      );
      backupExporter.addMessage(
        new BackupMessage(id, conversationId, senderUserId, senderClientId, creationDate, asset),
      );
    }

    if (isMessageAddEvent(type) && eventData.data?.content) {
      const text = new BackupMessageContent.Text(eventData.data.content);
      backupExporter.addMessage(
        new BackupMessage(id, conversationId, senderUserId, senderClientId, creationDate, text),
      );
    }
  });

  return backupExporter.serialize();
};
