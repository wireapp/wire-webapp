/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.conversation = z.conversation || {};

z.conversation.ConversationError = class ConversationError extends Error {
  constructor(type) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || z.client.ConversationError.TYPE.UNKNOWN;

    switch (this.type) {
      case ConversationError.TYPE.CONVERSATION_NOT_FOUND:
        this.message = 'Conversation not found';
        break;
      case ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION:
        this.message = 'Sending to degraded conversation was canceled by user';
        break;
      case ConversationError.TYPE.MESSAGE_NOT_FOUND:
        this.message = 'Message not found';
        break;
      case ConversationError.TYPE.NO_CHANGES:
        this.message = 'Missing changes to message';
        break;
      case ConversationError.TYPE.NO_CONVERSATION_ID:
        this.message = 'Conversation ID is not defined';
        break;
      case ConversationError.TYPE.NOT_FOUND:
        this.message = 'Conversation not found';
        break;
      case ConversationError.TYPE.REQUEST_FAILED:
        this.message = 'Conversation related backend request failed';
        break;
      case ConversationError.TYPE.WRONG_TYPE:
        this.message = 'Wrong message to for action';
        break;
      case ConversationError.TYPE.WRONG_USER:
        this.message = 'Wrong user tried to change or delete a message';
        break;
      default:
        this.message = 'Unknown ConversationError';
    }
  }

  static get TYPE() {
    return {
      CONVERSATION_NOT_FOUND: 'z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND',
      DEGRADED_CONVERSATION_CANCELLATION: 'z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION',
      MESSAGE_NOT_FOUND: 'z.conversation.ConversationError.TYPE.MESSAGE_NOT_FOUND',
      NO_CHANGES: 'z.conversation.ConversationError.TYPE.NO_CHANGES',
      NO_CONVERSATION_ID: 'z.conversation.ConversationError.TYPE.NO_CONVERSATION_ID',
      NOT_FOUND: 'z.conversation.ConversationError.TYPE.NOT_FOUND',
      REQUEST_FAILURE: 'z.conversation.ConversationError.TYPE.REQUEST_FAILURE',
      UNKNOWN: 'z.conversation.ConversationError.TYPE.UNKNOWN',
      WRONG_CONVERSATION: 'z.conversation.ConversationError.TYPE.WRONG_CONVERSATION',
      WRONG_TYPE: 'z.conversation.ConversationError.TYPE.WRONG_TYPE',
      WRONG_USER: 'z.conversation.ConversationError.TYPE.WRONG_USER',
    };
  }
};
