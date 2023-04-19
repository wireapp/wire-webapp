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

export interface ConversationCode {
  /** Conversation code (random) */
  code: string;
  /** Stable conversation identifier */
  key: string;
  /** Full URI (containing key/code) to join a conversation */
  uri?: string;
  /** If the conversation/code has a password */
  has_password?: boolean;
}

/**
 * Request body for joining a conversation by code
 */
export interface JoinConversationByCodePayload extends Omit<ConversationCode, 'has_password'> {
  /**
   * password for the conversation/code invite
   * can be optional because a converation/code may or may not have a password
   * minLength: 8
   * maxLength: 1024
   */
  password?: string;
}
