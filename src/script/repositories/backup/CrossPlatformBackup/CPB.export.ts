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

import {ConversationRecord, UserRecord, EventRecord} from 'Repositories/storage';

import {buildMetaData} from './AssetMetadata';
import {
  CPBackupExporter,
  BackupQualifiedId,
  BackupUser,
  BackUpConversation,
  BackupDateTime,
  BackupMessageContent,
  BackupMessage,
  BackupExportResult,
} from './CPB.library';
import {ExportHistoryFromDatabaseParams} from './CPB.types';
import {
  AssetContentSchema,
  ConversationTableEntrySchema,
  EventTableEntrySchema,
  LocationContentSchema,
  UserTableEntrySchema,
} from './data.schema';

import {CancelError, ExportError} from '../Error';
import {preprocessConversations, preprocessUsers, preprocessEvents} from '../recordPreprocessors';

import {CPBLogger, exportTable, isAssetAddEvent, isLocationAddEvent, isMessageAddEvent, isSupportedEventType} from '.';

const PROGRESSION_STEP = 10;
const PROGRESSION_COMPLETE = 100;

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
  password,
  checkCancelStatus,
}: ExportHistoryFromDatabaseParams): Promise<Uint8Array> => {
  const [conversationTable, eventsTable, usersTable] = backupService.getTables();
  const backupExporter = new CPBackupExporter(new BackupQualifiedId(user.id, user.domain));

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

  // Taking care of conversations
  const conversationRecords = await exportTable<ConversationRecord>({
    backupService,
    table: conversationTable,
    preprocessor: streamProgress(preprocessConversations),
  });
  conversationRecords.forEach((record, index) => {
    const {success, data, error} = ConversationTableEntrySchema.safeParse(record);

    if (success) {
      const qualifiedId = new BackupQualifiedId(data.id, data.domain);
      const name = data.name ?? '';
      const lastModifiedTime = new BackupDateTime(new Date(data.last_event_timestamp));

      backupExporter.addConversation(new BackUpConversation(qualifiedId, name, lastModifiedTime));
    } else {
      CPBLogger.error('Conversation data schema validation failed', error);
    }

    if (index % PROGRESSION_STEP === 0) {
      checkIfCancelled();
    }
  });
  // ------------------------------

  // Taking care of users
  const userRecords = await exportTable<UserRecord>({
    backupService,
    table: usersTable,
    preprocessor: streamProgress(preprocessUsers),
  });
  userRecords.forEach((record, index) => {
    const {success, data, error} = UserTableEntrySchema.safeParse(record);

    if (success) {
      backupExporter.addUser(
        new BackupUser(
          new BackupQualifiedId(data?.qualified_id?.id ?? data.id, data?.qualified_id?.domain ?? ''),
          data.name ?? '',
          data.handle ?? '',
        ),
      );
    } else {
      CPBLogger.error('User data schema validation failed', error);
    }

    if (index % PROGRESSION_STEP === 0) {
      checkIfCancelled();
    }
  });
  // ------------------------------

  // Taking care of events
  const eventRecords = await exportTable<EventRecord>({
    backupService,
    table: eventsTable,
    preprocessor: streamProgress(preprocessEvents),
  });

  eventRecords.forEach((record, index) => {
    if (record.ephemeral_expires) {
      // eslint-disable-next-line no-console
      CPBLogger.warn('Ephemeral events are not supported in backups');
      return;
    }
    const {success, data: eventData, error} = EventTableEntrySchema.safeParse(record);
    if (success) {
      const {from, from_client_id, id, qualified_conversation, qualified_from, primary_key, time, type} = eventData;
      if (!id) {
        // eslint-disable-next-line no-console
        CPBLogger.log('Event without id', eventData);
        return;
      }
      // ToDo: Add support for other types of messages and different types of content. Also figure out which fields are required.
      if (!isSupportedEventType(type)) {
        // eslint-disable-next-line no-console
        CPBLogger.log('Unsupported message type', type);
        return;
      }

      const conversationId = new BackupQualifiedId(qualified_conversation.id, qualified_conversation.domain ?? '');
      const senderUserId = new BackupQualifiedId(
        qualified_from?.id ?? from ?? user.id,
        qualified_from?.domain ?? user.domain,
      );
      const senderClientId = from_client_id ?? '';
      const creationDate = new BackupDateTime(new Date(time));
      // for debugging purposes
      const webPrimaryKey = primary_key;

      if (isAssetAddEvent(type)) {
        const {
          success: assetParseSuccess,
          error: assetParseError,
          data: assetParseData,
        } = AssetContentSchema.safeParse(eventData.data);
        if (!assetParseSuccess) {
          CPBLogger.error('Asset data schema validation failed', assetParseError);
          return;
        }

        const metaData = buildMetaData(assetParseData.content_type, assetParseData.info, assetParseData.meta);

        const asset = new BackupMessageContent.Asset(
          assetParseData.content_type,
          Number.parseInt(`${assetParseData.content_length}`),
          assetParseData.info?.name ?? '',
          transformObjectToArray(assetParseData.otr_key),
          transformObjectToArray(assetParseData.sha256),
          assetParseData.key,
          assetParseData.token,
          assetParseData.domain,
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

      if (isLocationAddEvent(type)) {
        const {
          success: locationParseSuccess,
          error: locationParseError,
          data: locationParseData,
        } = LocationContentSchema.safeParse(eventData.data);
        if (!locationParseSuccess) {
          CPBLogger.error('Location data schema validation failed', locationParseError);
          return;
        }
        const location = new BackupMessageContent.Location(
          locationParseData.location.latitude,
          locationParseData.location.longitude,
          locationParseData.location.name,
          locationParseData.location.zoom,
        );
        backupExporter.addMessage(
          new BackupMessage(id, conversationId, senderUserId, senderClientId, creationDate, location, webPrimaryKey),
        );
      }
    } else {
      CPBLogger.error('Event data schema validation failed', error);
    }

    if (index % PROGRESSION_COMPLETE === 0) {
      checkIfCancelled();
    }
  });

  // ------------------------------

  const result = await backupExporter.finalize(password);

  if (result instanceof BackupExportResult.Success) {
    return result.bytes;
  }

  if (result instanceof BackupExportResult.Failure) {
    CPBLogger.error(`Backup export failed: ${result.message}`);
    throw new ExportError(result.message);
  }

  CPBLogger.error(`Backup export failed.`);
  throw new ExportError('Backup export failed');
};
