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
    this.end = mention.end || 0;
    this.start = mention.start || 0;
    this.type = mention.mention_type || z.cryptography.PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;

    this.userId = mention.user_id || '';
  }

  getLength() {
    return this.end - this.start;
  }

  isValid(messageText = '') {
    if (!typeof this.end === 'number' || !typeof this.start === 'number' || !typeof this.userId === 'string') {
      return false;
    }

    const isValidStart = this.start >= 0 && this.start < this.end;
    const isValidLength = this.getLength() >= 3;
    const isValidEnd = this.end <= messageText.length - 1;
    const isValidUserId = z.util.ValidationUtil.isUUID(this.userId);
    if (!isValidStart || !isValidLength || !isValidEnd || !isValidUserId) {
      return false;
    }

    return true;
  }

  setUserIdMention(start, end, userId) {
    this.type = z.cryptography.PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;
    this.start = start;
    this.end = end;
    this.userId = userId;
    return this;
  }

  toJSON() {
    return {
      end: this.end,
      start: this.start,
      userId: this.userId,
    };
  }

  toProto() {
    const mention = new z.proto.Mention(this.start, this.end);
    const isUserIdMention = this.type === z.cryptography.PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;
    if (isUserIdMention) {
      mention.set(z.cryptography.PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID, this.userId);
    }
    return mention;
  }
};
