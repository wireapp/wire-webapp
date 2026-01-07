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

import {BasePayloadBundle, PayloadBundleType} from './PayloadBundle';

import {
  AssetContent,
  ButtonActionContent,
  ButtonActionConfirmationContent,
  CallingContent,
  ClearedContent,
  ClientActionContent,
  CompositeContent,
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
  InCallEmojiContent,
  InCallHandRaiseContent,
  MultiPartContent,
} from '../content';

export interface MultiPartMessage extends BasePayloadBundle {
  content: MultiPartContent;
  type: PayloadBundleType.MULTIPART;
}

export interface EditedMultiPartMessage extends BasePayloadBundle {
  content: MultiPartContent;
  type: PayloadBundleType.MESSAGE_EDIT;
}

export interface TextMessage extends BasePayloadBundle {
  content: TextContent;
  type: PayloadBundleType.TEXT;
}

export interface ButtonActionMessage extends BasePayloadBundle {
  content: ButtonActionContent;
  type: PayloadBundleType.BUTTON_ACTION;
}

export interface ButtonActionConfirmationMessage extends BasePayloadBundle {
  content: ButtonActionConfirmationContent;
  type: PayloadBundleType.BUTTON_ACTION_CONFIRMATION;
}

export interface CallMessage extends BasePayloadBundle {
  content: CallingContent;
  type: PayloadBundleType.CALL;
}

export interface CompositeMessage extends BasePayloadBundle {
  content: CompositeContent;
  type: PayloadBundleType.COMPOSITE;
}

export interface EditedTextMessage extends BasePayloadBundle {
  content: EditedTextContent;
  type: PayloadBundleType.MESSAGE_EDIT;
}

export interface FileAssetMessage extends BasePayloadBundle {
  content: FileAssetContent;
  type: PayloadBundleType.ASSET;
}

export interface FileAssetMetaDataMessage extends BasePayloadBundle {
  content: FileAssetMetaDataContent;
  type: PayloadBundleType.ASSET_META;
}

export interface FileAssetAbortMessage extends BasePayloadBundle {
  content: FileAssetAbortContent;
  type: PayloadBundleType.ASSET_ABORT;
}

// TODO Merge ImageAssetMessageOutgoing & ImageAssetMessage
export interface ImageAssetMessageOutgoing extends BasePayloadBundle {
  content: ImageAssetContent;
  type: PayloadBundleType.ASSET_IMAGE;
}

export interface ImageAssetMessage extends BasePayloadBundle {
  content: AssetContent;
  type: PayloadBundleType.ASSET_IMAGE;
}

export interface LocationMessage extends BasePayloadBundle {
  content: LocationContent;
  type: PayloadBundleType.LOCATION;
}

export interface ReactionMessage extends BasePayloadBundle {
  content: ReactionContent;
  type: PayloadBundleType.REACTION;
}

export interface InCallEmojiMessage extends BasePayloadBundle {
  content: InCallEmojiContent;
  type: PayloadBundleType.IN_CALL_EMOJI;
}

export interface InCallHandRaiseMessage extends BasePayloadBundle {
  content: InCallHandRaiseContent;
  type: PayloadBundleType.IN_CALL_HAND_RAISE;
}

export interface ConfirmationMessage extends BasePayloadBundle {
  content: ConfirmationContent;
  type: PayloadBundleType.CONFIRMATION;
}

export interface PingMessage extends BasePayloadBundle {
  content: KnockContent;
  type: PayloadBundleType.PING;
}

export interface ResetSessionMessage extends BasePayloadBundle {
  content: ClientActionContent;
  type: PayloadBundleType.CLIENT_ACTION;
}

export interface ClearConversationMessage extends BasePayloadBundle {
  content: ClearedContent;
  type: PayloadBundleType.CONVERSATION_CLEAR;
}

export interface HideMessage extends BasePayloadBundle {
  content: HiddenContent;
  type: PayloadBundleType.MESSAGE_HIDE;
}

export interface DeleteMessage extends BasePayloadBundle {
  content: DeletedContent;
  type: PayloadBundleType.MESSAGE_DELETE;
}

export type OtrMessage =
  | ButtonActionMessage
  | ButtonActionConfirmationMessage
  | CallMessage
  | ClearConversationMessage
  | CompositeMessage
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
  | TextMessage
  | MultiPartMessage;

export type QuotableMessage = EditedTextMessage | ImageAssetMessage | LocationMessage | TextMessage | MultiPartMessage;
