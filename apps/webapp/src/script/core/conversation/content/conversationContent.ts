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

import {ClientActionType} from '..';

import {
  AssetContent,
  ButtonActionContent,
  ButtonActionConfirmationContent,
  CallingContent,
  ClearedContent,
  ClientActionContent,
  ClientAddContent,
  ClientRemoveContent,
  CompositeContent,
  ConfirmationContent,
  ConnectionContent,
  DeletedContent,
  EditedTextContent,
  FileAssetAbortContent,
  FileAssetContent,
  FileAssetMetaDataContent,
  HiddenContent,
  ImageAssetContent,
  ImageContent,
  KnockContent,
  LocationContent,
  ReactionContent,
  TextContent,
  InCallEmojiContent,
  InCallHandRaiseContent,
  MultiPartContent,
} from '.';

export type ConversationContent =
  | AssetContent
  | ButtonActionContent
  | ButtonActionConfirmationContent
  | CallingContent
  | ClearedContent
  | ClientActionContent
  | ClientActionType
  | ClientAddContent
  | ClientRemoveContent
  | CompositeContent
  | ConfirmationContent
  | ConnectionContent
  | DeletedContent
  | EditedTextContent
  | FileAssetAbortContent
  | FileAssetContent
  | FileAssetMetaDataContent
  | HiddenContent
  | ImageAssetContent
  | ImageContent
  | KnockContent
  | LocationContent
  | ReactionContent
  | InCallEmojiContent
  | InCallHandRaiseContent
  | TextContent
  | MultiPartContent;
