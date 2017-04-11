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
window.z.connect = z.connect || {};

z.connect.ConnectError = class ConnectError extends Error {
  constructor(type) {
    super();

    this.name = this.constructor.name;
    this.stack = (new Error()).stack;
    this.type = type || z.connect.ConnectError.TYPE.UNKNOWN;

    switch (this.type) {
      case z.connect.ConnectError.TYPE.GOOGLE_CLIENT:
        this.message = 'Google Auth Client for JavaScript not loaded';
        break;
      case z.connect.ConnectError.TYPE.GOOGLE_DOWNLOAD:
        this.message = 'Failed to download contacts from Google';
        break;
      case z.connect.ConnectError.TYPE.NO_CONTACTS:
        this.message = 'No contacts found for matching';
        break;
      case z.connect.ConnectError.TYPE.UPLOAD:
        this.message = 'Address book upload failed';
        break;
      default:
        this.message = 'Unknown ConnectError';
    }
  }

  static get TYPE() {
    return {
      GOOGLE_CLIENT: 'z.connect.ConnectError.TYPE.GOOGLE_CLIENT',
      GOOGLE_DOWNLOAD: 'z.connect.ConnectError.TYPE.GOOGLE_DOWNLOAD',
      NO_CONTACTS: 'z.connect.ConnectError.TYPE.NO_CONTACTS',
      UNKNOWN: 'z.connect.ConnectError.TYPE.UNKNOWN',
      UPLOAD: 'z.connect.ConnectError.TYPE.UPLOAD',
    };
  }
};
