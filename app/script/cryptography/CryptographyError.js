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

'use strict';

window.z = window.z || {};
window.z.cryptography = z.cryptography || {};

z.cryptography.CryptographyError = class CryptographyError extends Error {
  constructor(type, message) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || CryptographyError.TYPE.UNKNOWN;

    this.message = message || CryptographyError.MESSAGE[this.type] || CryptographyError.MESSAGE.UNKNOWN;
  }

  static get MESSAGE() {
    return {
      BROKEN_EXTERNAL: 'Failed to map external message',
      IGNORED_ASSET: 'Ignored asset preview',
      IGNORED_PREVIEW: 'Ignored image preview',
      NO_DATA_CONTENT: 'No message data content found',
      NO_GENERIC_MESSAGE: 'No GenericMessage found',
      PREVIOUSLY_STORED: 'Message was previously stored',
      UNHANDLED_TYPE: 'Unhandled event type',
      UNKNOWN: 'Unknown CryptographyError',
    };
  }

  static get TYPE() {
    return {
      BROKEN_EXTERNAL: 'BROKEN_EXTERNAL',
      IGNORED_ASSET: 'IGNORED_ASSET',
      IGNORED_PREVIEW: 'IGNORED_PREVIEW',
      NO_DATA_CONTENT: 'NO_DATA_CONTENT',
      NO_GENERIC_MESSAGE: 'NO_GENERIC_MESSAGE',
      PREVIOUSLY_STORED: 'PREVIOUSLY_STORED',
      UNHANDLED_TYPE: 'UNHANDLED_TYPE',
      UNKNOWN: 'UNKNOWN',
    };
  }
};
