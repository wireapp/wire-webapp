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

import {BaseError, BASE_ERROR_TYPE} from './BaseError';

enum CONVERSATION_ERROR_TYPE {
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  LEGAL_HOLD_CONVERSATION_CANCELLATION = 'LEGAL_HOLD_CONVERSATION_CANCELLATION',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  NO_CHANGES = 'NO_CHANGES',
  NO_CONVERSATION_ID = 'NO_CONVERSATION_ID',
  NO_MESSAGE_CHANGES = 'NO_MESSAGE_CHANGES',
  REQUEST_FAILURE = 'REQUEST_FAILURE',
  UNKNOWN_ACTIVITY = 'UNKNOWN_ACTIVITY',
  WRONG_CHANGE = 'WRONG_CHANGE',
  WRONG_CONVERSATION = 'WRONG_CONVERSATION',
  WRONG_TYPE = 'WRONG_TYPE',
  WRONG_USER = 'WRONG_USER',
  NOT_CREATED = 'NOT_CREATED',
}

export class ConversationError extends BaseError {
  constructor(type: CONVERSATION_ERROR_TYPE | BASE_ERROR_TYPE, message: string, error?: Error) {
    super(type, message);
    if (error) {
      this.stack = `${this.stack}\n${error.stack}`;
    }
  }

  static get MESSAGE(): Record<CONVERSATION_ERROR_TYPE | string, string> {
    return {
      CONVERSATION_NOT_FOUND: 'Conversation not found',
      INVALID_PARAMETER: 'Invalid parameter passed',
      LEGAL_HOLD_CONVERSATION_CANCELLATION: 'Sending to legal hold conversation was canceled by user',
      MESSAGE_NOT_FOUND: 'Message not found in conversation',
      NO_CHANGES: 'Missing changes to message',
      NO_CONVERSATION_ID: 'Conversation ID is not defined',
      NO_MESSAGE_CHANGES: 'Edited message equals original message',
      REQUEST_FAILURE: 'Conversation related backend request failed',
      UNKNOWN_ACTIVITY: 'Unknown activity',
      WRONG_CHANGE: 'Attempted unsupported change on conversation',
      WRONG_CONVERSATION: 'Message was sent in the wrong conversation',
      WRONG_TYPE: 'Wrong message to for action',
      WRONG_USER: 'Wrong user tried to change or delete a message',
      NOT_CREATED: 'Conversation was not created',
    };
  }

  static get TYPE(): Record<CONVERSATION_ERROR_TYPE, CONVERSATION_ERROR_TYPE> {
    return {
      CONVERSATION_NOT_FOUND: CONVERSATION_ERROR_TYPE.CONVERSATION_NOT_FOUND,
      INVALID_PARAMETER: CONVERSATION_ERROR_TYPE.INVALID_PARAMETER,
      LEGAL_HOLD_CONVERSATION_CANCELLATION: CONVERSATION_ERROR_TYPE.LEGAL_HOLD_CONVERSATION_CANCELLATION,
      MESSAGE_NOT_FOUND: CONVERSATION_ERROR_TYPE.MESSAGE_NOT_FOUND,
      NO_CHANGES: CONVERSATION_ERROR_TYPE.NO_CHANGES,
      NO_CONVERSATION_ID: CONVERSATION_ERROR_TYPE.NO_CONVERSATION_ID,
      NO_MESSAGE_CHANGES: CONVERSATION_ERROR_TYPE.NO_MESSAGE_CHANGES,
      REQUEST_FAILURE: CONVERSATION_ERROR_TYPE.REQUEST_FAILURE,
      UNKNOWN_ACTIVITY: CONVERSATION_ERROR_TYPE.UNKNOWN_ACTIVITY,
      WRONG_CHANGE: CONVERSATION_ERROR_TYPE.WRONG_CHANGE,
      WRONG_CONVERSATION: CONVERSATION_ERROR_TYPE.WRONG_CONVERSATION,
      WRONG_TYPE: CONVERSATION_ERROR_TYPE.WRONG_TYPE,
      WRONG_USER: CONVERSATION_ERROR_TYPE.WRONG_USER,
      NOT_CREATED: CONVERSATION_ERROR_TYPE.NOT_CREATED,
    };
  }
}
