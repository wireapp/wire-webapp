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
  FileAssetAbortContent,
  FileAssetContent,
  FileAssetMetaDataContent,
  ImageAssetContent,
} from './assetContent';
import {ButtonActionConfirmationContent} from './buttonActionConfirmationContent';
import {ButtonActionContent} from './buttonActionContent';
import {CallingContent} from './callingContent';
import {ClearedContent} from './clearedContent';
import {ClientActionContent} from './clientActionContent';
import {ClientAddContent} from './clientAddContent';
import {ClientRemoveContent} from './clientRemoveContent';
import {CompositeContent} from './compositeContent';
import {ConfirmationContent} from './confirmationContent';
import {DeletedContent} from './deletedContent';
import {EditedTextContent} from './editedTextContent';
import {HiddenContent} from './hiddenContent';
import {ImageContent} from './imageContent';
import {InCallEmojiContent} from './inCallEmojiContent';
import {InCallHandRaiseContent} from './inCallHandRaiseContent';
import {KnockContent} from './knockContent';
import {LocationContent} from './locationContent';
import {MultiPartContent} from './multipartContent';
import {ReactionContent} from './reactionContent';
import {TextContent} from './textContent';

import {Connection as ConnectionContent} from '../../../apiClient/connection/connection';
import {ClientActionType} from '../clientActionType';

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
