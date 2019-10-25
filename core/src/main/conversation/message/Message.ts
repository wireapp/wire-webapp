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

import {
  AssetContent,
  CallingContent,
  ClearedContent,
  ClientActionContent,
  ConfirmationContent,
  DeletedContent,
  EditedTextContent,
  FileAssetAbortContent,
  FileAssetContent,
  FileAssetMetaDataContent,
  HiddenContent,
  ImageAssetContent,
  KnockContent,
  LocationContent,
  ReactionContent,
  TextContent,
} from '../content';
import {PayloadBundle, PayloadBundleType} from './PayloadBundle';

export interface TextMessage extends PayloadBundle {
  content: TextContent;
  type: PayloadBundleType.TEXT;
}

export interface CallMessage extends PayloadBundle {
  content: CallingContent;
  type: PayloadBundleType.CALL;
}

export interface EditedTextMessage extends PayloadBundle {
  content: EditedTextContent;
  type: PayloadBundleType.MESSAGE_EDIT;
}

export interface FileAssetMessage extends PayloadBundle {
  content: FileAssetContent;
  type: PayloadBundleType.ASSET;
}

export interface FileAssetMetaDataMessage extends PayloadBundle {
  content: FileAssetMetaDataContent;
  type: PayloadBundleType.ASSET_META;
}

export interface FileAssetAbortMessage extends PayloadBundle {
  content: FileAssetAbortContent;
  type: PayloadBundleType.ASSET_ABORT;
}

// TODO Merge ImageAssetMessageOutgoing & ImageAssetMessage
export interface ImageAssetMessageOutgoing extends PayloadBundle {
  content: ImageAssetContent;
  type: PayloadBundleType.ASSET_IMAGE;
}

export interface ImageAssetMessage extends PayloadBundle {
  content: AssetContent;
  type: PayloadBundleType.ASSET_IMAGE;
}

export interface LocationMessage extends PayloadBundle {
  content: LocationContent;
  type: PayloadBundleType.LOCATION;
}

export interface ReactionMessage extends PayloadBundle {
  content: ReactionContent;
  type: PayloadBundleType.REACTION;
}

export interface ConfirmationMessage extends PayloadBundle {
  content: ConfirmationContent;
  type: PayloadBundleType.CONFIRMATION;
}

export interface PingMessage extends PayloadBundle {
  content: KnockContent;
  type: PayloadBundleType.PING;
}

export interface ResetSessionMessage extends PayloadBundle {
  content: ClientActionContent;
  type: PayloadBundleType.CLIENT_ACTION;
}

export interface ClearConversationMessage extends PayloadBundle {
  content: ClearedContent;
  type: PayloadBundleType.CONVERSATION_CLEAR;
}

export interface HideMessage extends PayloadBundle {
  content: HiddenContent;
  type: PayloadBundleType.MESSAGE_HIDE;
}

export interface DeleteMessage extends PayloadBundle {
  content: DeletedContent;
  type: PayloadBundleType.MESSAGE_DELETE;
}

export type Message =
  | CallMessage
  | ClearConversationMessage
  | ConfirmationMessage
  | DeleteMessage
  | EditedTextMessage
  | FileAssetAbortMessage
  | FileAssetMessage
  | FileAssetMetaDataMessage
  | HideMessage
  | ImageAssetMessage
  | ImageAssetMessageOutgoing
  | LocationMessage
  | PingMessage
  | ReactionMessage
  | ResetSessionMessage
  | TextMessage;
