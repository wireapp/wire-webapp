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

import {BackendError, BackendErrorLabel, StatusCode} from '../http/';

export class ConversationError extends BackendError {
  constructor(message: string, label: BackendErrorLabel, code: StatusCode) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ConversationError';
  }
}

export class ConversationIsUnknownError extends ConversationError {
  constructor(
    message: string,
    label: BackendErrorLabel = BackendErrorLabel.CLIENT_ERROR,
    code: StatusCode = StatusCode.BAD_REQUEST,
  ) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ConversationIsUnknownError';
  }
}

export class ConversationOperationError extends ConversationError {
  constructor(
    message: string,
    label: BackendErrorLabel = BackendErrorLabel.INVALID_OPERATION,
    code: StatusCode = StatusCode.FORBIDDEN,
  ) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ConversationOperationError';
  }
}

export class ConversationLegalholdMissingConsentError extends ConversationError {
  constructor(
    message: string,
    label: BackendErrorLabel = BackendErrorLabel.LEGAL_HOLD_MISSING_CONSENT,
    code: StatusCode = StatusCode.PRECONDITION_FAILED,
  ) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ConversationLegalholdConsentNeededError';
  }
}

export class ConversationCodeNotFoundError extends ConversationError {
  constructor(
    message: string,
    label: BackendErrorLabel = BackendErrorLabel.NO_CONVERSATION_CODE,
    code: StatusCode = StatusCode.NOT_FOUND,
  ) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ConversationCodeNotFoundError';
  }
}

export class ConversationFullError extends ConversationError {
  constructor(
    message: string,
    label: BackendErrorLabel = BackendErrorLabel.TOO_MANY_MEMBERS,
    code: StatusCode = StatusCode.NOT_FOUND,
  ) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'ConversationFullError';
  }
}

export class MLSInvalidLeafNodeSignatureError extends ConversationError {
  constructor(
    message: string,
    label: BackendErrorLabel = BackendErrorLabel.MLS_INVALID_LEAF_NODE_SIGNATURE,
    code: StatusCode = StatusCode.BAD_REQUEST,
  ) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'MLSInvalidLeafNodeSignatureError';
  }
}

export class MLSInvalidLeafNodeIndexError extends ConversationError {
  constructor(
    message: string,
    label: BackendErrorLabel = BackendErrorLabel.MLS_INVALID_LEAF_NODE_INDEX,
    code: StatusCode = StatusCode.BAD_REQUEST,
  ) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'MLSInvalidLeafNodeIndexError';
  }
}
