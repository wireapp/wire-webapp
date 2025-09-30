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

import {Quote} from '@wireapp/protocol-messaging';

interface QuoteEntityOptions {
  error?: Error;
  hash?: ArrayBuffer;
  messageId: string;
  userId: string;
}

export class QuoteEntity {
  error?: Error;
  hash?: ArrayBuffer;
  messageId: string;
  userId: string;

  static ERROR = {
    MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
  };

  constructor(options: QuoteEntityOptions) {
    this.messageId = options.messageId;
    this.hash = options.hash;
    this.userId = options.userId;
    this.error = options.error;
  }

  isQuoteFromUser(userId: string): boolean {
    return this.userId === userId;
  }

  toJSON(): {messageId: string; userId: string} {
    return {
      messageId: this.messageId,
      userId: this.userId,
    };
  }

  toProto(): Quote {
    return new Quote({
      quotedMessageId: this.messageId,
      quotedMessageSha256: new Uint8Array(this.hash),
    });
  }
}
