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

import {isNonEmptyString} from '@sindresorhus/is';

import {IMention, Mention} from '@wireapp/protocol-messaging';

import {QualifiedId} from '../apiClient/user/qualifiedId';
import {PROTO_MESSAGE_TYPE} from '../repositories/cryptography/ProtoMessageType';
import {matchQualifiedIds} from '../util/qualifiedId';
import {isUUID} from '../util/validationUtil';

/** The text value of the mention that targets everyone in a conversation (`@all`). It is wire text and never localized. */
export const EVERYONE_MENTION_VALUE = 'all';

export type MentionCheckOptions = {
  /** Whether a mention of everyone (`@all`) counts as mentioning the user. */
  includeEveryone?: boolean;
};

type MentionEntityJSON = {
  everyone?: true;
  length: number;
  startIndex: number;
  userId: string;
  userQualifiedId: QualifiedId | undefined;
};

enum ERROR {
  INVALID_LENGTH = 'Invalid mention: Invalid length',
  INVALID_START_CHAR = 'Invalid mention: Mention does not start with @',
  INVALID_START_INDEX = 'Invalid mention: Invalid startIndex',
  INVALID_USER_ID = 'Invalid mention: User ID is not a valid UUID',
  MISSING_LENGTH = 'Invalid mention: Missing length',
  MISSING_START_INDEX = 'Invalid mention: Missing startIndex',
  MISSING_USER_ID = 'Invalid mention: Missing user ID',
  OUT_OF_BOUNDS = 'Invalid mention: Length out of string boundary',
  OVERLAPPING = 'Invalid mention: Overlap with another mention',
}

export class MentionEntity {
  static ERROR = ERROR;
  startIndex: number;
  length: number;
  type: PROTO_MESSAGE_TYPE;
  userId: string;
  domain: string | undefined;
  /** `true` when the mention targets everyone in the conversation (`@all`) rather than a single user. */
  readonly isEveryone: boolean;

  constructor(startIndex: number, length: number, userId: string, domain?: string, isEveryone = false) {
    this.startIndex = startIndex;
    this.length = length;
    this.type = PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;
    this.domain = domain;
    this.userId = userId;
    this.isEveryone = isEveryone;
  }

  /**
   * Creates a mention that targets everyone in the conversation (`@all`). It carries no user id.
   */
  static everyone(startIndex: number, length: number): MentionEntity {
    return new MentionEntity(startIndex, length, '', undefined, true);
  }

  /**
   * Checks whether this mention explicitly targets the given user.
   * A mention of everyone never targets a single user. Use `isSelfMentioned` to apply the conversation rules for it.
   */
  targetsUser(userId: QualifiedId): boolean {
    const isTypeUserId = this.type === PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;
    return !this.isEveryone && isTypeUserId && matchQualifiedIds(this.userQualifiedId, userId);
  }

  get userQualifiedId(): QualifiedId {
    return {domain: this.domain ?? '', id: this.userId};
  }

  // Index of first char outside of mention
  get endIndex(): number {
    return this.startIndex + this.length;
  }

  validate(messageText = '', allMentions: MentionEntity[] = []): boolean {
    if (allMentions.includes(this)) {
      const mentionIndex = allMentions.indexOf(this);
      const otherMentions = allMentions.slice(0, mentionIndex);
      const isOverlapping = otherMentions.some(mention => {
        return this.endIndex > mention.startIndex && this.startIndex < mention.endIndex;
      });
      if (isOverlapping) {
        throw new Error(MentionEntity.ERROR.OVERLAPPING);
      }
    }

    const startIndexIsNumber = typeof this.startIndex === 'number';
    if (!startIndexIsNumber) {
      throw new Error(MentionEntity.ERROR.MISSING_START_INDEX);
    }

    const lengthIsNumber = typeof this.length === 'number';
    if (!lengthIsNumber) {
      throw new Error(MentionEntity.ERROR.MISSING_LENGTH);
    }

    const userIdIsString = typeof this.userId === 'string';
    if (!this.isEveryone && !userIdIsString) {
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

    const isValidEnd = isNonEmptyString(messageText) && this.endIndex <= messageText.length;
    if (!isValidEnd) {
      throw new Error(MentionEntity.ERROR.OUT_OF_BOUNDS);
    }

    const isValidUserId = this.isEveryone || isUUID(this.userId);
    if (!isValidUserId) {
      throw new Error(MentionEntity.ERROR.INVALID_USER_ID);
    }

    const isValidMention = messageText.charAt(this.startIndex) === '@';
    if (!isValidMention) {
      throw new Error(MentionEntity.ERROR.INVALID_START_CHAR);
    }

    return true;
  }

  toJSON(): MentionEntityJSON {
    return {
      ...(this.isEveryone ? {everyone: true as const} : {}),
      length: this.length,
      startIndex: this.startIndex,
      userId: this.userId,
      userQualifiedId: isNonEmptyString(this.domain) ? this.userQualifiedId : undefined,
    };
  }

  /**
   * Maps the mention to its protobuf content.
   * A mention of everyone sets `everyone` and carries no user id, as the protocol requires.
   */
  toContent(): IMention {
    const options: IMention = {length: this.length, start: this.startIndex};
    if (this.isEveryone) {
      options.everyone = true;
      return options;
    }
    const isUserIdMention = this.type === PROTO_MESSAGE_TYPE.MENTION_TYPE_USER_ID;
    if (isUserIdMention) {
      options.userId = this.userId;
      if (isNonEmptyString(this.domain)) {
        options.qualifiedUserId = this.userQualifiedId;
      }
    }
    return options;
  }

  toProto(): Mention {
    return new Mention(this.toContent());
  }
}
