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

z.error.LinkPreviewError = class LinkPreviewError extends z.error.BaseError {
  constructor(type, message) {
    super('LinkPreviewError', type, message);
  }

  static get MESSAGE() {
    return {
      BLACKLISTED: 'Skipped preview for blacklisted link',
      NO_DATA_AVAILABLE: 'Link does not provide Open Graph data.',
      NOT_SUPPORTED: 'Your client cannot render link previews using Open Graph data.',
      UNSUPPORTED_TYPE: 'Open Graph data from the given link does not provide necessary attributes.',
    };
  }

  static get TYPE() {
    return {
      BLACKLISTED: 'BLACKLISTED',
      NO_DATA_AVAILABLE: 'NO_DATA_AVAILABLE',
      NOT_SUPPORTED: 'NOT_SUPPORTED',
      UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
    };
  }
};
