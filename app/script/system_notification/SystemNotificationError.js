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
window.z.system_notification = z.system_notification || {};

z.system_notification.SystemNotificationError = class SystemNotificationError extends Error {
  constructor(type) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || z.cryptography.CryptographyError.TYPE.UNKNOWN;

    switch (this.type) {
      case z.system_notification.SystemNotificationError.TYPE.HIDE_NOTIFICATION:
        this.message = 'Do not show notification for this message';
        break;
      default:
        this.message = 'Unknown SystemNotificationError';
    }
  }

  static get TYPE() {
    return {
      HIDE_NOTIFICATION: 'z.system_notification.SystemNotificationError.TYPE.HIDE_NOTIFICATION',
      UNKNOWN: 'z.system_notification.SystemNotificationError.TYPE.UNKNOWN'
    };
  }
};
