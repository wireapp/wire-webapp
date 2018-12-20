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

window.z = window.z || {};
window.z.error = z.error || {};

z.error.ConversationError = class ConversationError extends z.error.BaseError {
  constructor(type, message) {
    super('ConversationError', type, message);
  }

  static get MESSAGE() {
    return {
      CONVERSATION_NOT_FOUND: 'Conversation not found',
      DEGRADED_CONVERSATION_CANCELLATION: 'Sending to degraded conversation was canceled by user',
      MESSAGE_NOT_FOUND: 'Message not found in conversation',
      NO_CHANGES: 'Missing changes to message',
      NO_CONVERSATION_ID: 'Conversation ID is not defined',
      NO_MESSAGE_CHANGES: 'Edited message equals original message',
      REQUEST_FAILURE: 'Conversation related backend request failed',
      WRONG_CHANGE: 'Attempted unsupported change on conversation',
      WRONG_CONVERSATION: 'Message was sent in the wrong conversation',
      WRONG_TYPE: 'Wrong message to for action',
      WRONG_USER: 'Wrong user tried to change or delete a message',
    };
  }

  static get TYPE() {
    return {
      CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
      DEGRADED_CONVERSATION_CANCELLATION: 'DEGRADED_CONVERSATION_CANCELLATION',
      MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
      NO_CHANGES: 'NO_CHANGES',
      NO_CONVERSATION_ID: 'NO_CONVERSATION_ID',
      NO_MESSAGE_CHANGES: 'NO_MESSAGE_CHANGES',
      REQUEST_FAILURE: 'REQUEST_FAILURE',
      WRONG_CHANGE: 'WRONG_CHANGE',
      WRONG_CONVERSATION: 'WRONG_CONVERSATION',
      WRONG_TYPE: 'WRONG_TYPE',
      WRONG_USER: 'WRONG_USER',
    };
  }
};
