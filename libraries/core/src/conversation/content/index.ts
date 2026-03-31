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

import * as ContentType from './contentType.guards';
export {ContentType};

export * from './assetContent';
export * from './buttonActionContent';
export * from './buttonActionConfirmationContent';
export * from './callingContent';
export * from './clearedContent';
export * from './clientActionContent';
export * from './clientAddContent';
export * from './clientRemoveContent';
export * from './compositeContent';
export * from './confirmationContent';
export * from './conversationContent';
export * from './deletedContent';
export * from './editedTextContent';
export * from './fileContent';
export * from './hiddenContent';
export * from './imageContent';
export * from './knockContent';
export * from './linkPreviewContent';
export * from './locationContent';
export * from './mentionContent';
export * from './quoteContent';
export * from './reactionContent';
export * from './textContent';
export * from './tweetContent';
export * from './inCallEmojiContent';
export * from './inCallHandRaiseContent';
export * from './multipartContent';
