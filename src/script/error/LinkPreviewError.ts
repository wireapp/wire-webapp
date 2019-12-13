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

export enum LinkPreviewErrorType {
  BLACKLISTED = 'BLACKLISTED',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  NO_DATA_AVAILABLE = 'NO_DATA_AVAILABLE',
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
}

export class LinkPreviewError extends Error {
  static readonly TYPE = LinkPreviewErrorType;
  static readonly MESSAGE: Record<LinkPreviewErrorType, string> = {
    BLACKLISTED: 'Skipped preview for blacklisted link',
    NOT_SUPPORTED: 'Your client cannot render link previews using Open Graph data.',
    NO_DATA_AVAILABLE: 'Link does not provide Open Graph data.',
    UNSUPPORTED_TYPE: 'Open Graph data from the given link does not provide necessary attributes.',
  };
  readonly type: LinkPreviewErrorType;

  constructor(type: LinkPreviewErrorType, message?: string) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type;
    this.message = message || LinkPreviewError.MESSAGE[type];
  }
}
