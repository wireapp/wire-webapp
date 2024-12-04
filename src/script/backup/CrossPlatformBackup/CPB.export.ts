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

import {ConversationRecord, UserRecord, EventRecord} from 'src/script/storage';

import {buildMetaData} from './AssetMetadata';
import {
  CPBackupExporter,
  BackupQualifiedId,
  BackUpConversation,
  BackupUser,
  BackupMessage,
  BackupDateTime,
  BackupMessageContent,
} from './CPB.library';
import {ExportHistoryFromDatabaseParams} from './CPB.types';
import {ConversationTableSchema, UserTableSchema, EventTableSchema, AssetContentSchema} from './data.schema';

import {preprocessConversations, preprocessUsers, preprocessEvents} from '../recordPreprocessors';

import {CPBLogger, exportTable, isAssetAddEvent, isMessageAddEvent, isSupportedEventType} from '.';

// Helper function to transform an Int8Array to an object
const transformObjectToArray = (array: {[key: number]: number}): Int8Array => {
  const result = new Int8Array(Object.keys(array).length);
  for (const key in array) {
    result[parseInt(key, 10)] = array[key];
  }
  return result;
};

/**
 * Export the history from the database to a Cross-Platform backup
 */
export const exportCPBHistoryFromDatabase = async ({
  backupService,
  progressCallback,
  user,
}: ExportHistoryFromDatabaseParams): Promise<Int8Array> => {
  const [conversationTable, eventsTable, usersTable] = backupService.getTables();
  const backupExporter = new CPBackupExporter(new BackupQualifiedId(user.id, user.domain));
  function streamProgress<T>(dataProcessor: (data: T[]) => T[]) {
    return (data: T[]) => {
      progressCallback(data.length);
      return dataProcessor(data);
    };
  }

  // Taking care of conversations
  const {
    success: conversationsSuccess,
    data: conversationsData,
    error: conversationsError,
  } = ConversationTableSchema.safeParse(
    await exportTable<ConversationRecord>({
      backupService,
      table: conversationTable,
      preprocessor: streamProgress(preprocessConversations),
    }),
  );
  if (conversationsSuccess) {
    conversationsData.forEach(conversationData =>
      backupExporter.addConversation(
        new BackUpConversation(
          new BackupQualifiedId(conversationData.id, conversationData.domain),
          conversationData.name ?? '',
        ),
      ),
    );
  } else {
    CPBLogger.log('Conversation data schema validation failed', conversationsError);
  }

  // Taking care of users
  const {
    success: usersSuccess,
    data: usersData,
    error: usersError,
  } = UserTableSchema.safeParse(
    await exportTable<UserRecord>({backupService, table: usersTable, preprocessor: streamProgress(preprocessUsers)}),
  );
  if (usersSuccess) {
    usersData.forEach(userData =>
      backupExporter.addUser(
        new BackupUser(
          new BackupQualifiedId(userData?.qualified_id?.id ?? userData.id, userData?.qualified_id?.domain ?? ''),
          userData.name,
          userData.handle ?? '',
        ),
      ),
    );
  } else {
    CPBLogger.log('User data schema validation failed', usersError);
  }

  // Taking care of events
  const {
    success: eventsSuccess,
    data: eventsData,
    error: eventsError,
  } = EventTableSchema.safeParse(
    await exportTable<EventRecord>({backupService, table: eventsTable, preprocessor: streamProgress(preprocessEvents)}),
  );
  if (eventsSuccess) {
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

      const id = eventData.id;
      const conversationId = new BackupQualifiedId(
        eventData.qualified_conversation.id,
        eventData.qualified_conversation.domain ?? '',
      );
      const senderUserId = new BackupQualifiedId(
        eventData.qualified_from?.id ?? eventData.from ?? '',
        eventData.qualified_from?.domain ?? '',
      );
      const senderClientId = eventData.from_client_id ?? '';
      const creationDate = new BackupDateTime(new Date(eventData.time));
      // for debugging purposes
      const webPrimaryKey = eventData.primary_key;

      if (isAssetAddEvent(type)) {
        const {success, error, data} = AssetContentSchema.safeParse(eventData.data);
        if (!success) {
          CPBLogger.log('Asset data schema validation failed', error);
          return;
        }

        const metaData = buildMetaData(data.content_type, data.info);

        CPBLogger.log('metaData', metaData, data.content_type);

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
          metaData,
        );
        backupExporter.addMessage(
          new BackupMessage(id, conversationId, senderUserId, senderClientId, creationDate, asset, webPrimaryKey),
        );
      }

      if (isMessageAddEvent(type) && eventData.data?.content) {
        const text = new BackupMessageContent.Text(eventData.data.content);
        backupExporter.addMessage(
          new BackupMessage(id, conversationId, senderUserId, senderClientId, creationDate, text, webPrimaryKey),
        );
      }
    });
  } else {
    CPBLogger.log('Event data schema validation failed', eventsError);
  }

  return backupExporter.serialize();
};
