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

import {isLegalHoldCancellation} from '../error/isLegalHoldCancellation';
import {getLogger, Logger} from '../util/logger';

export class WindowHandler {
  logger: Logger;

  constructor() {
    this.logger = getLogger('WindowHandler');

    this._listenToUnhandledPromiseRejection();
  }

  private _listenToUnhandledPromiseRejection(): void {
    window.addEventListener('unhandledrejection', (promiseRejectionEvent: PromiseRejectionEvent): void | false => {
      if (isLegalHoldCancellation(promiseRejectionEvent.reason)) {
        this.logger.info('User has canceled sending a message to a conversation under legal hold.');
        promiseRejectionEvent.preventDefault();
        promiseRejectionEvent.stopPropagation();
        return false;
      }
    });
  }
}
