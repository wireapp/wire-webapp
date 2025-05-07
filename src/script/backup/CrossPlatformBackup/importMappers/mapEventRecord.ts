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

import {ClientEvent} from 'src/script/event/Client';
import {EventRecord} from 'src/script/storage';

import {CPBLogger} from '..';
import {BackupMessageContent, BackupMessage} from '../CPB.library';

// Type definition for common message fields
type CommonMessageFields = Required<
  Pick<EventRecord, 'conversation' | 'id' | 'qualified_conversation' | 'time' | 'primary_key'>
> & {
  from_client_id: string;
  from: string;
  qualified_from: {
    domain: string;
    id: string;
  };
};

// Helper function to map common message fields
const mapCommonMessageFields = ({
  id,
  conversationId,
  creationDate,
  senderClientId,
  senderUserId,
  webPrimaryKey,
}: BackupMessage): CommonMessageFields => {
  const common = {
    conversation: conversationId.id.toString(),
    id: id.toString() as string,
    from_client_id: senderClientId.toString(),
    qualified_conversation: {
      domain: conversationId.domain.toString(),
      id: conversationId.id.toString(),
    },
    from: senderUserId.id.toString(),
    qualified_from: {
      domain: senderUserId.domain.toString(),
      id: senderUserId.id.toString(),
    },
    time: creationDate.date.toISOString(),
    primary_key: webPrimaryKey?.toString() ?? '',
  };
  return common;
};

// Helper function to transform an Int8Array to an object
const transformArrayToObject = (array: Int8Array): {[key: number]: number} => {
  const object: {[key: number]: number} = {};
  for (let i = 0; i < array.length; i++) {
    object[i] = array[i];
  }
  return object;
};

// Type guards for BackupMessageContent
const isTextContent = (content: BackupMessageContent): content is BackupMessageContent.Text =>
  content instanceof BackupMessageContent.Text;
const isAssetContent = (content: BackupMessageContent): content is BackupMessageContent.Asset =>
  content instanceof BackupMessageContent.Asset;

type TextBackupMessage = BackupMessage & {content: BackupMessageContent.Text};
const mapTextMessageToEventRecord = (message: TextBackupMessage): EventRecord => ({
  ...mapCommonMessageFields(message),
  data: {
    content: isTextContent(message.content) ? message.content.text : '',
    /*
    mentions: [],
    previews: [],
    expects_read_confirmation: true,
    legal_hold_status: 1,
    */
  },
  // there is a type mismatch here, but it is not relevant for the import
  type: ClientEvent.CONVERSATION.MESSAGE_ADD as any,
  category: 16,
});

type AssetBackupMessage = BackupMessage & {content: BackupMessageContent.Asset};
// Maps an AssetBackupMessage to an EventRecord
const mapAssetMessageToEventRecord = (message: AssetBackupMessage): EventRecord => ({
  ...mapCommonMessageFields(message),
  data: {
    content_length: message.content.size.toString(),
    content_type: message.content.mimeType.toString(),
    info: message.content.metaData,
    domain: message.content.assetDomain?.toString(),
    key: message.content.assetId?.toString(),
    otr_key: transformArrayToObject(message.content.otrKey),
    sha256: transformArrayToObject(message.content.sha256),
    status: 'uploaded',
    token: message.content.assetToken?.toString(),
  },
  // there is a type mismatch here, but it is not relevant for the import
  type: ClientEvent.CONVERSATION.ASSET_ADD as any,
  category: 128,
});

/**
 * Maps a BackupMessage to an EventRecord
 * @param message
 * @returns EventRecord or undefined
 */
export const mapEventRecord = (message: BackupMessage): EventRecord | undefined => {
  if (isAssetContent(message.content)) {
    return mapAssetMessageToEventRecord(message as AssetBackupMessage);
  }

  if (isTextContent(message.content)) {
    return mapTextMessageToEventRecord(message as TextBackupMessage);
  }

  CPBLogger.error('Unknown message type', message);
  return undefined;
};
