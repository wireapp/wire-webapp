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
window.z.cryptography = z.cryptography || {};

z.cryptography.CryptographyError = class CryptographyError extends Error {
  constructor(type, message) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || z.cryptography.CryptographyError.TYPE.UNKNOWN;

    if (message) {
      this.message = message;
    } else {
      switch (this.type) {
        case z.cryptography.CryptographyError.TYPE.BROKEN_EXTERNAL:
          this.message = 'Failed to map external message';
          break;
        case z.cryptography.CryptographyError.TYPE.IGNORED_ASSET:
          this.message = 'Ignored asset preview';
          break;
        case z.cryptography.CryptographyError.TYPE.IGNORED_PREVIEW:
          this.message = 'Ignored image preview';
          break;
        case z.cryptography.CryptographyError.TYPE.NO_DATA_CONTENT:
          this.message = 'No message data content found';
          break;
        case z.cryptography.CryptographyError.TYPE.NO_GENERIC_MESSAGE:
          this.message = 'No GenericMessage found';
          break;
        case z.cryptography.CryptographyError.TYPE.PREVIOUSLY_STORED:
          this.message = 'Message was previously stored';
          break;
        case z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE:
          this.message = 'Unhandled event type';
          break;
        default:
          this.message = 'Unknown CryptographyError';
      }
    }
  }

  static get TYPE() {
    return {
      BROKEN_EXTERNAL: 'z.cryptography.CryptographyError.TYPE.BROKEN_EXTERNAL',
      IGNORED_ASSET: 'z.cryptography.CryptographyError.TYPE.IGNORED_ASSET',
      IGNORED_PREVIEW: 'z.cryptography.CryptographyError.TYPE.IGNORED_PREVIEW',
      NO_DATA_CONTENT: 'z.cryptography.CryptographyError.TYPE.NO_DATA_CONTENT',
      NO_GENERIC_MESSAGE: 'z.cryptography.CryptographyError.TYPE.NO_GENERIC_MESSAGE',
      PREVIOUSLY_STORED: 'z.cryptography.CryptographyError.TYPE.PREVIOUSLY_STORED',
      UNHANDLED_TYPE: 'z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE',
      UNKNOWN: 'z.cryptography.CryptographyError.TYPE.UNKNOWN',
    };
  }
};
