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

export {LegalHoldStatus} from '@wireapp/protocol-messaging';
export {Connection as ConnectionContent} from '@wireapp/api-client/lib/connection/';

import * as ContentType from './ContentType.guards';
export {ContentType};

export * from './AssetContent';
export * from './ButtonActionContent';
export * from './ButtonActionConfirmationContent';
export * from './CallingContent';
export * from './ClearedContent';
export * from './ClientActionContent';
export * from './ClientAddContent';
export * from './ClientRemoveContent';
export * from './CompositeContent';
export * from './ConfirmationContent';
export * from './ConversationContent';
export * from './DeletedContent';
export * from './EditedTextContent';
export * from './FileContent';
export * from './HiddenContent';
export * from './ImageContent';
export * from './KnockContent';
export * from './LinkPreviewContent';
export * from './LocationContent';
export * from './MentionContent';
export * from './QuoteContent';
export * from './ReactionContent';
export * from './TextContent';
export * from './TweetContent';
export * from './InCallEmojiContent';
export * from './InCallHandRaiseContent';
export * from './MultipartContent';
