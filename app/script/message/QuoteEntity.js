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

'use strict';

window.z = window.z || {};
window.z.message = z.message || {};

z.message.QuoteEntity = class QuoteEntity {
  static get ERROR() {
    return {
      INVALID_HASH: 'INVALID_HASH',
      MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
    };
  }

  constructor({error, hash, messageId, userId}) {
    this.messageId = messageId;
    this.hash = hash;
    this.userId = userId;
    this.error = error;
  }

  isQuoteFromUser(userId) {
    return this.userId === userId;
  }

  toJSON() {
    return {
      messageId: this.messageId,
      userId: this.userId,
    };
  }

  toProto() {
    return new z.proto.Quote(this.messageId, new Uint8Array(this.hash));
  }
};
