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
      INVALID_HASH: 'Invalid quote: Invalid SHA256 hash',
      INVALID_HASH_LENGTH: 'Invalid quote: Invalid SHA256 hash length',
      NO_HASH: 'Invalid quote: No SHA256 hash',
    };
  }

  constructor(messageId, hash, userId) {
    this.messageId = messageId;
    this.hash = hash;

    this.userId = userId;
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

  toProto(messageEntity) {
    const messageHash = ''; //create hash from message entity
    return new z.proto.Quote(this.messageId, messageHash);
  }

  validate(textEntity, assetType) {
    if (!this.hash) {
      throw new Error(QuoteEntity.ERROR.NO_HASH);
    }

    switch (assetType) {
      case z.assets.AssetType.TEXT: {
        const messageHash = z.message.MessageHashing.getTextMessageHash(textEntity);
        if (messageHash.length !== this.hash.length) {
          throw new Error(QuoteEntity.ERROR.INVALID_HASH_LENGTH);
        }
        if (messageHash !== this.hash) {
          throw new Error(QuoteEntity.ERROR.INVALID_HASH);
        }
      }
    }
  }
};
