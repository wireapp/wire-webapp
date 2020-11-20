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

import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {BackendError, BackendErrorLabel, SyntheticErrorLabel} from '../../http';

export class FeatureError extends BackendError {
  constructor(message: string, label: BackendErrorLabel | SyntheticErrorLabel, code: HTTP_STATUS) {
    super(message, label, code);
    Object.setPrototypeOf(this, FeatureError.prototype);
    this.name = 'FeatureError';
  }
}

export class InvalidAppLockTimeoutError extends FeatureError {
  constructor(message: string, label = BackendErrorLabel.APP_LOCK_INVALID_TIMEOUT, code = HTTP_STATUS.BAD_REQUEST) {
    super(message, label, code);
    Object.setPrototypeOf(this, InvalidAppLockTimeoutError.prototype);
    this.name = 'InvalidAppLockTimeoutError';
  }
}
