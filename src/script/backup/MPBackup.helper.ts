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

/* eslint-disable */
import {com} from 'kalium-backup';
import MPBackupImporter = com.wire.backup.ingest.MPBackupImporter;
import MPBackup = com.wire.backup.MPBackup;
import BackupImportResult = com.wire.backup.ingest.BackupImportResult;
import MPBackupExporter = com.wire.backup.dump.MPBackupExporter;
import BackupQualifiedId = com.wire.backup.data.BackupQualifiedId;
import BackupMessage = com.wire.backup.data.BackupMessage;
import BackupUser = com.wire.backup.data.BackupUser;
import BackUpConversation = com.wire.backup.data.BackupConversation;
import BackupMessageContent = com.wire.backup.data.BackupMessageContent;
import BackupDateTime = com.wire.backup.data.BackupDateTime;

import {FileData, FileDescriptor, Filename, ProgressCallback} from './Backup.types';
import {preprocessConversations, preprocessUsers, preprocessEvents} from './recordPreprocessors';
import {ConversationTableSchema, UserTableSchema, EventTableSchema} from './TableData.schema';

import {User} from '../entity/User';
import { BackupService } from './BackupService';
import Dexie from 'dexie';
import { ConversationRecord, EventRecord, UserRecord } from '../storage';
import { IncompatibleBackupError } from './Error';
import { getLogger } from 'Util/Logger';

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event/';

export {MPBackup}

const logger = getLogger('wire:backup:MPBackup');

/**
 * Check if the data is a Multi-Platform backup
 * @param data 
 * @returns 
 */
export const isMPBackup = (data: FileData): boolean => !!data[MPBackup.ZIP_ENTRY_DATA];

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
  }

interface ExportHistoryFromDatabaseParams {
    backupService: BackupService;
    progressCallback: ProgressCallback;
    user: User;
}
/**
 * Export the history from the database to a Multi-Platform backup
 */  
export const exportMPBHistoryFromDatabase = async ({backupService, progressCallback, user}: ExportHistoryFromDatabaseParams): Promise<Int8Array> => {
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
    await exportTable<ConversationRecord>({backupService, table: conversationTable, preprocessor: streamProgress(preprocessConversations)}),
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
  const usersData = UserTableSchema.parse(await exportTable<UserRecord>({backupService, table: usersTable, preprocessor: streamProgress(preprocessUsers)}));
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
  const eventsData = EventTableSchema.parse(await exportTable<EventRecord>({backupService, table: eventsTable, preprocessor: streamProgress(preprocessEvents)}));
  eventsData.forEach(eventData => {
    // ToDo: Add support for other types of messages and different types of content. Also figure out which fields are required.
    if (!eventData.id) {
      // eslint-disable-next-line no-console
      logger.log('Event without id', eventData);
      return;
    }
    if (!eventData.qualified_conversation.id) {
      // eslint-disable-next-line no-console
      logger.log('Event without conversation id', eventData);
      return;
    }
    if (!eventData?.data?.content) {
      // eslint-disable-next-line no-console
      logger.log('Event without content', eventData);
      return;
    }
    if(eventData.type !== 'conversation.message-add') {
      // eslint-disable-next-line no-console
      logger.log('Only exporting conversation.message-add events for now', eventData);
      return;
    }

    backupExporter.addMessage(
      new BackupMessage(
        eventData.id,
        new BackupQualifiedId(eventData.qualified_conversation.id, eventData.qualified_conversation.domain ?? ''),
        // this needs to be optional for message type 16 (self messages)
        new BackupQualifiedId(eventData.qualified_from?.id ?? '', eventData.qualified_from?.domain ?? ''),
        eventData.from_client_id ?? '',
        new BackupDateTime(new Date(eventData.time)),
        new BackupMessageContent.Text(eventData.data.content),
      ),
    );
  });

  return backupExporter.serialize();
};

interface ImportHistoryToDatabaseParams {
    user: User;
    backupService: BackupService;
     fileData: FileData;
    progressCallback: ProgressCallback;
}
/**
 * Imports the history from a Multi-Platform backup to the Database
 */  
export const importMPBHistoryToDatabase = async ({backupService, fileData, progressCallback, user}: ImportHistoryToDatabaseParams): Promise<{
  archiveVersion: number;
  fileDescriptors: FileDescriptor[];
}> => {
      const backupImporter = new MPBackupImporter(user.domain);
      const backupRawData = fileData[MPBackup.ZIP_ENTRY_DATA];
      const FileDescriptor: FileDescriptor[] = [];

      const result = backupImporter.import(new Int8Array(backupRawData.buffer));
      if (result instanceof BackupImportResult.Success) {
        logger.log(`SUCCESSFUL BACKUP IMPORT: ${result.backupData}`); // eslint-disable-line
        const eventRecords: EventRecord[] = [];
        result.backupData.messages.forEach(message => {
          logger.log(`IMPORTED MESSAGE: ${message.toString()}`); // eslint-disable-line
          const eventRecord = mapEventRecord(message);
          if(eventRecord) {
            eventRecords.push(eventRecord);
          }
        });
        result.backupData.conversations.forEach(conversation => {
          logger.log(`IMPORTED CONVERSATION: ${conversation.toString()}`); // eslint-disable-line
          // TODO: Import conversations
        });
        result.backupData.users.forEach(user => {
          logger.log(`IMPORTED USER: ${user.toString()}`); // eslint-disable-line
          // TODO: Import users
        });

        logger.log(`IMPORTED ${eventRecords.length} EVENTS`); // eslint-disable-line
        FileDescriptor.push({entities: eventRecords, filename: Filename.EVENTS});
      } else {
        logger.log(`ERROR DURING BACKUP IMPORT: ${result}`); // eslint-disable-line
        throw new IncompatibleBackupError('Incompatible Multiplatform backup');
      }

      return {archiveVersion: 0, fileDescriptors: FileDescriptor};
};

/**
 * Example Entry:
{
    "access": [
        "invite",
        "code"
    ],
    "access_role": [
        "team_member",
        "non_team_member",
        "guest"
    ],
    "archived_state": false,
    "readonly_state": null,
    "archived_timestamp": 0,
    "cleared_timestamp": 0,
    "creator": "0281c0d1-a37b-490e-ab89-4846f12069ed",
    "domain": "wire.com",
    "ephemeral_timer": null,
    "epoch": -1,
    "global_message_timer": null,
    "initial_protocol": "proteus",
    "id": "006ceffb-59d9-4a4e-b731-6b6d61c07cad",
    "is_guest": false,
    "last_event_timestamp": 1731594996768,
    "last_read_timestamp": 1731594996768,
    "last_server_timestamp": 1731669594238,
    "legal_hold_status": 1,
    "muted_state": 0,
    "muted_timestamp": 0,
    "name": "Product & Tech Monthly",
    "others": [
        "0281c0d1-a37b-490e-ab89-4846f12069ed",
        "033a62f6-5add-4a68-a4a8-846f8fa423a9",
    ],
    "protocol": "proteus",
    "qualified_others": [
        {
            "domain": "wire.com",
            "id": "0281c0d1-a37b-490e-ab89-4846f12069ed"
        },
        {
            "domain": "wire.com",
            "id": "033a62f6-5add-4a68-a4a8-846f8fa423a9"
        },
    ],
    "receipt_mode": 1,
    "roles": {    
        "0281c0d1-a37b-490e-ab89-4846f12069ed": "wire_admin",
        "033a62f6-5add-4a68-a4a8-846f8fa423a9": "wire_admin",
    },
    "status": 0,
    "team_id": "e1684e2f-39d8-4caf-8e11-0da24a46280b",
    "type": 0,
    "mlsVerificationState": 0,
    "accessModes": [
        "invite",
        "code"
    ],
    "accessRole": [
        "team_member",
        "non_team_member",
        "guest"
    ],
    "message_timer": null
}
 */
const mapConversationRecord = ({id, name}: BackUpConversation): ConversationRecord => {
 
}

/**
 * Example Entry:
{
  "accent_id": 6,
  "assets": [
    {
      "key": "3-1-fb78d125-b5af-4668-9465-3fc298aaae56",
      "size": "preview",
      "type": "image"
    },
    {
      "key": "3-1-73af0597-611a-48f9-aa38-2dcf0b05ad06",
      "size": "complete",
      "type": "image"
    }
  ],
  "email": "christoph.aldrian@wire.com",
  "handle": "caldrian_wire",
  "id": "00073b81-1be2-482c-beb4-ee130e4f4e30",
  "legalhold_status": "no_consent",
  "name": "Christoph Aldrian",
  "picture": [],
  "qualified_id": {
    "domain": "wire.com",
    "id": "00073b81-1be2-482c-beb4-ee130e4f4e30"
  },
  "supported_protocols": [
    "proteus"
  ],
  "team": "e1684e2f-39d8-4caf-8e11-0da24a46280b"
}
 */
const mapUserRecord = ({id, name, handle}: BackupUser): UserRecord => {}


/**       
 * Example Entry:        
{
  "conversation": "b38da255-dbe9-4898-9be8-c4d9a70b853d",
  "from": "033a62f6-5add-4a68-a4a8-846f8fa423a9",
  "from_client_id": "fb8dc90b6491142d",
  "id": "be91e020-8d99-4283-81e3-eb72debada45",
  "qualified_conversation": {
      "domain": "wire.com",
      "id": "b38da255-dbe9-4898-9be8-c4d9a70b853d"
  },
  "qualified_from": {
      "domain": "wire.com",
      "id": "033a62f6-5add-4a68-a4a8-846f8fa423a9"
  },
  "time": "2024-07-31T09:28:50.110Z",
  "data": {
      "content": "the hamas leader was killed in tehran yesterday",
      "mentions": [],
      "previews": [],
      "expects_read_confirmation": true,
      "legal_hold_status": 1
  },
  "type": "conversation.message-add",
  "category": 16,
  "primary_key": 50126         
}
*/
const isTextContent = (content: BackupMessageContent): content is BackupMessageContent.Text => content instanceof BackupMessageContent.Text;

const mapEventRecord = (message: BackupMessage): EventRecord | null => {

  if(isTextContent(message.content)) {
    return mapMessageAddEventRecord(message);
  }
  
  return null;
}

const mapMessageAddEventRecord = ({id, content, conversationId, creationDate, senderClientId, senderUserId }: BackupMessage): EventRecord => ({
  "conversation": conversationId.id,
  "from": senderUserId.id,
  "from_client_id": senderClientId,
  "id": id,
  "qualified_conversation": {
      "domain": conversationId.domain,
      "id": conversationId.id
  },
  "qualified_from": {
      "domain": senderUserId.domain,
      "id": senderUserId.id
  },
  "time": creationDate.date.toISOString(),
  "data": {
      "content": isTextContent(content) ? content.text : '',
      "mentions": [],
      "previews": [],
      "expects_read_confirmation": true,
      "legal_hold_status": 1
  },
  "type": 'conversation.message-add',
  // What is this?
  "category": 16,
  // What is this?
  "primary_key": undefined
})