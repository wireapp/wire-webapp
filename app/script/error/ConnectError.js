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

z.error.ConnectError = class ConnectError extends z.error.BaseError {
  constructor(type, message) {
    super('ConnectError', type, message);
  }

  static get MESSAGE() {
    return {
      NO_CONTACTS: 'No contacts found for matching',
      NOT_SUPPORTED: 'Source not supported',
      UPLOAD: 'Address book upload failed',
    };
  }

  static get TYPE() {
    return {
      NO_CONTACTS: 'NO_CONTACTS',
      NOT_SUPPORTED: 'NOT_SUPPORTED',
      UPLOAD: 'UPLOAD',
    };
  }
};
