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

import {QuoteContent, TextContent} from '.';

export interface EditedTextContent extends TextContent {
  originalMessageId: string;
  /**
   * While this field exists in the Protobuf spec, it should be
   * ignored on the receiver side in an edited message.
   *
   * See https://github.com/wireapp/generic-message-proto/blob/v1.22.1/proto/messages.proto#L54
   */
  quote?: QuoteContent;
}
