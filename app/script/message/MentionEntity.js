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

z.message.MentionEntity = class Mention {
  constructor(mention = {}) {
    this.startIndex = mention.start || 0;
    this.length = mention.length || 1;
    this.type = mention.mention_type || z.cryptography.PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;

    this.userId = mention.user_id || '';
    this.userEntity = ko.observable();

    this.isSelfMentioned = ko.pureComputed(() => {
      const isTypeUserId = this.type === z.cryptography.PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;
      return isTypeUserId && this.userEntity().is_me;
    });
  }

  // Index of first char outside of mention
  get endIndex() {
    return this.startIndex + this.length;
  }

  isValid(messageText = '') {
    if (!typeof this.startIndex === 'number' || !typeof this.length === 'number' || !typeof this.userId === 'string') {
      return false;
    }

    const isValidStartIndex = this.startIndex >= 0;
    const isValidLength = this.length >= 1;
    const isValidEnd = messageText.length && this.endIndex <= messageText.length;
    const isValidUserId = z.util.ValidationUtil.isUUID(this.userId);
    if (!isValidStartIndex || !isValidLength || !isValidEnd || !isValidUserId) {
      return false;
    }

    return true;
  }

  setUserIdMention(startIndex, length, userId) {
    this.type = z.cryptography.PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;
    this.startIndex = startIndex;
    this.length = length;
    this.userId = userId;
    return this;
  }

  toJSON() {
    return {
      length: this.length,
      startIndex: this.startIndex,
      userId: this.userId,
    };
  }

  toProto() {
    const protoMention = new z.proto.Mention(this.startIndex, this.length);
    const isUserIdMention = this.type === z.cryptography.PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;
    if (isUserIdMention) {
      protoMention.set(z.cryptography.PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID, this.userId);
    }
    return protoMention;
  }
};
