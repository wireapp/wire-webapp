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
window.z.links = z.links || {};

z.links.LinkPreviewError = class LinkPreviewError extends Error {
  constructor(type) {
    super();
    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || z.links.LinkPreviewError.TYPE.UNKNOWN;

    switch (this.type) {
      case z.links.LinkPreviewError.TYPE.NOT_SUPPORTED:
        this.message = 'Your client cannot render link previews using Open Graph data.';
        break;
      case z.links.LinkPreviewError.TYPE.UNSUPPORTED_TYPE:
        this.message = 'Open Graph data from the given link does not provide necessary attributes.';
        break;
      case z.links.LinkPreviewError.TYPE.NO_DATA_AVAILABLE:
        this.message = 'Link does not provide Open Graph data.';
        break;
      default:
        this.message = 'Unknown LinkPreviewError';
    }
  }

  static get TYPE() {
    return {
      BLACKLISTED: 'z.links.LinkPreviewError.TYPE.BLACKLISTED',
      NO_DATA_AVAILABLE: 'z.links.LinkPreviewError.TYPE.NO_DATA_AVAILABLE',
      NOT_SUPPORTED: 'z.links.LinkPreviewError.TYPE.NOT_SUPPORTED',
      UNKNOWN: 'z.links.LinkPreviewError.TYPE.UNKNOWN',
      UNSUPPORTED_TYPE: 'z.links.LinkPreviewError.TYPE.UNSUPPORTED_TYPE',
    };
  }
};
