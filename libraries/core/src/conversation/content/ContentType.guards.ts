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

import {Connection} from '@wireapp/api-client/lib/connection/';

import {ClientActionType} from '..';

import {
  AssetContent,
  ClearedContent,
  ClientActionContent,
  ConfirmationContent,
  ConversationContent,
  DeletedContent,
  EditedTextContent,
  FileAssetAbortContent,
  FileAssetContent,
  FileAssetMetaDataContent,
  HiddenContent,
  ImageAssetContent,
  ImageContent,
  LocationContent,
  MultiPartContent,
  ReactionContent,
  TextContent,
} from '.';

export function isAbortedAssetContent(content: ConversationContent): content is AssetContent {
  return !!(content as AssetContent).abortReason;
}

export function isAssetContent(content: ConversationContent): content is AssetContent {
  return !!((content as AssetContent).uploaded || (content as AssetContent).preview);
}

export function isClearedContent(content: ConversationContent): content is ClearedContent {
  return !!(content as ClearedContent).clearedTimestamp;
}

export function isClientActionContent(content: ConversationContent): content is ClientActionContent {
  return !!(content as ClientActionContent).clientAction;
}

export function isClientActionType(content: ConversationContent): content is ClientActionType {
  return typeof content === 'number';
}

export function isConfirmationContent(content: ConversationContent): content is ConfirmationContent {
  return !!(content as ConfirmationContent).firstMessageId;
}

export function isConnection(content: ConversationContent): content is Connection {
  return !!(content as Connection).from && !!(content as Connection).to;
}

export function isDeletedContent(content: ConversationContent): content is DeletedContent {
  return !!(content as DeletedContent).messageId && !(content as any).text;
}

export function isEditedTextContent(content: ConversationContent): content is EditedTextContent {
  return !!(content as EditedTextContent).text && !!(content as EditedTextContent).originalMessageId;
}

export function isFileAssetAbortContent(content: ConversationContent): content is FileAssetAbortContent {
  return !!(content as FileAssetAbortContent).reason;
}

export function isFileAssetContent(content: ConversationContent): content is FileAssetContent {
  return !!(content as FileAssetContent).asset && !!(content as FileAssetContent).file;
}

export function isFileAssetMetaDataContent(content: ConversationContent): content is FileAssetMetaDataContent {
  return !!(content as FileAssetMetaDataContent).metaData;
}

export function isHiddenContent(content: ConversationContent): content is HiddenContent {
  return !!(content as HiddenContent).conversationId;
}

export function isImageAssetContent(content: ConversationContent): content is ImageAssetContent {
  return !!(content as ImageAssetContent).asset && !!(content as ImageAssetContent).image;
}

export function isImageContent(content: ConversationContent): content is ImageContent {
  return !!(content as ImageContent).data && !!(content as ImageContent).type;
}

export function isLocationContent(content: ConversationContent): content is LocationContent {
  return !!(content as LocationContent).latitude && !!(content as LocationContent).longitude;
}

export function isReactionContent(content: ConversationContent): content is ReactionContent {
  return !!(content as ReactionContent).type && !!(content as ReactionContent).originalMessageId;
}

export function isTextContent(content: ConversationContent): content is TextContent {
  return !!(content as TextContent).text;
}

export function isMultiPartContent(content: ConversationContent): content is MultiPartContent {
  return !!(content as MultiPartContent).text && !!(content as MultiPartContent).attachments;
}
