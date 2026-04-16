/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {BackendError, BackendErrorLabel, StatusCode, SyntheticErrorLabel} from '../../http';

export class InvitationError extends BackendError {
  constructor(message: string, label: BackendErrorLabel | SyntheticErrorLabel, code: StatusCode) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'InvitationError';
  }
}

export class InvitationInvalidEmailError extends InvitationError {
  constructor(message: string, label = BackendErrorLabel.INVALID_EMAIL, code = StatusCode.BAD_REQUEST) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'InvitationInvalidEmailError';
  }
}

export class InvitationEmailExistsError extends InvitationError {
  constructor(message: string, label = BackendErrorLabel.INVITE_EMAIL_EXISTS, code = StatusCode.BAD_REQUEST) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'InvitationEmailExistsError';
  }
}

export class InvitationNotFoundError extends InvitationError {
  constructor(message: string, label = SyntheticErrorLabel.INVITATION_NOT_FOUND, code = StatusCode.NOT_FOUND) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'InvitationNotFoundError';
  }
}

export class InvitationMultipleError extends InvitationError {
  constructor(message: string, label = SyntheticErrorLabel.INVITATION_MULTIPLE_FOUND, code = StatusCode.CONFLICT) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'InvitationMultipleError';
  }
}
