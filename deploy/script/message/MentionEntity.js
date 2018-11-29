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

z.message.MentionEntity = class MentionEntity {
  static get ERROR() {
    return {
      INVALID_LENGTH: 'Invalid mention: Invalid length',
      INVALID_START_CHAR: 'Invalid mention: Mention does not start with @',
      INVALID_START_INDEX: 'Invalid mention: Invalid startIndex',
      INVALID_USER_ID: 'Invalid mention: User ID is not a valid UUID',
      MISSING_LENGTH: 'Invalid mention: Missing length',
      MISSING_START_INDEX: 'Invalid mention: Missing startIndex',
      MISSING_USER_ID: 'Invalid mention: Missing user ID',
      OUT_OF_BOUNDS: 'Invalid mention: Length out of string boundary',
    };
  }

  constructor(startIndex, length, userId) {
    this.startIndex = startIndex;
    this.length = length;
    this.type = z.cryptography.PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;

    this.userId = userId;
  }

  targetsUser(userId) {
    const isTypeUserId = this.type === z.cryptography.PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;
    return isTypeUserId && this.userId === userId;
  }

  // Index of first char outside of mention
  get endIndex() {
    return this.startIndex + this.length;
  }

  validate(messageText = '') {
    const startIndexIsNumber = typeof this.startIndex === 'number';
    if (!startIndexIsNumber) {
      throw new Error(MentionEntity.ERROR.MISSING_START_INDEX);
    }

    const lengthIsNumber = typeof this.length === 'number';
    if (!lengthIsNumber) {
      throw new Error(MentionEntity.ERROR.MISSING_LENGTH);
    }

    const userIdIsString = typeof this.userId === 'string';
    if (!userIdIsString) {
      throw new Error(MentionEntity.ERROR.MISSING_USER_ID);
    }

    const isValidStartIndex = this.startIndex >= 0;
    if (!isValidStartIndex) {
      throw new Error(MentionEntity.ERROR.INVALID_START_INDEX);
    }

    const isValidLength = this.length >= 1;
    if (!isValidLength) {
      throw new Error(MentionEntity.ERROR.INVALID_LENGTH);
    }

    const isValidEnd = messageText.length && this.endIndex <= messageText.length;
    if (!isValidEnd) {
      throw new Error(MentionEntity.ERROR.OUT_OF_BOUNDS);
    }

    const isValidUserId = z.util.ValidationUtil.isUUID(this.userId);
    if (!isValidUserId) {
      throw new Error(MentionEntity.ERROR.INVALID_USER_ID);
    }

    const isValidMention = messageText.substr(this.startIndex, 1) === '@';
    if (!isValidMention) {
      throw new Error(MentionEntity.ERROR.INVALID_START_CHAR);
    }

    return true;
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
