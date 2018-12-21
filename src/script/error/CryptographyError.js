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

z.error.CryptographyError = class CryptographyError extends z.error.BaseError {
  constructor(type, message) {
    super('CryptographyError', type, message);
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
    };
  }
};
