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

interface TextMessage extends PayloadBundle {
  content: TextContent;
  type: PayloadBundleType.TEXT;
}

interface EditedTextMessage extends PayloadBundle {
  content: EditedTextContent;
  type: PayloadBundleType.MESSAGE_EDIT;
}

interface FileAssetMessage extends PayloadBundle {
  content: FileAssetContent;
  type: PayloadBundleType.ASSET;
}

interface FileAssetMetaDataMessage extends PayloadBundle {
  content: FileAssetMetaDataContent;
  type: PayloadBundleType.ASSET_META;
}

interface FileAssetAbortMessage extends PayloadBundle {
  content: FileAssetAbortContent;
  type: PayloadBundleType.ASSET_ABORT;
}

// TODO Merge ImageAssetMessageOutgoing & ImageAssetMessage
interface ImageAssetMessageOutgoing extends PayloadBundle {
  content: ImageAssetContent;
  type: PayloadBundleType.ASSET_IMAGE;
}

interface ImageAssetMessage extends PayloadBundle {
  content: AssetContent;
  type: PayloadBundleType.ASSET_IMAGE;
}

interface LocationMessage extends PayloadBundle {
  content: LocationContent;
  type: PayloadBundleType.LOCATION;
}

interface ReactionMessage extends PayloadBundle {
  content: ReactionContent;
  type: PayloadBundleType.REACTION;
}

interface ConfirmationMessage extends PayloadBundle {
  content: ConfirmationContent;
  type: PayloadBundleType.CONFIRMATION;
}

interface PingMessage extends PayloadBundle {
  content: KnockContent;
  type: PayloadBundleType.PING;
}

interface ResetSessionMessage extends PayloadBundle {
  content: ClientActionContent;
  type: PayloadBundleType.CLIENT_ACTION;
}

interface ClearConversationMessage extends PayloadBundle {
  content: ClearedContent;
  type: PayloadBundleType.CLEARED;
}

interface HideMessage extends PayloadBundle {
  content: HiddenContent;
  type: PayloadBundleType.MESSAGE_HIDE;
}

interface DeleteMessage extends PayloadBundle {
  content: DeletedContent;
  type: PayloadBundleType.MESSAGE_DELETE;
}

type Message =
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

export {
  Message,
  ClearConversationMessage,
  ConfirmationMessage,
  DeleteMessage,
  EditedTextMessage,
  FileAssetAbortMessage,
  FileAssetMessage,
  FileAssetMetaDataMessage,
  HideMessage,
  ImageAssetMessage,
  ImageAssetMessageOutgoing,
  LocationMessage,
  PingMessage,
  ReactionMessage,
  ResetSessionMessage,
  TextMessage,
};
