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

import {BaseError} from '../../../error/BaseError';

enum LINK_PREVIEW_ERROR_TYPE {
  BLACKLISTED = 'BLACKLISTED',
  NO_DATA_AVAILABLE = 'NO_DATA_AVAILABLE',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
}

export class LinkPreviewError extends BaseError {
  constructor(type: LINK_PREVIEW_ERROR_TYPE, message: string) {
    super(type, message);
  }

  static get MESSAGE(): Record<LINK_PREVIEW_ERROR_TYPE, string> {
    return {
      BLACKLISTED: 'Skipped preview for blacklisted link',
      NOT_SUPPORTED: 'Your client cannot render link previews using Open Graph data.',
      NO_DATA_AVAILABLE: 'Link does not provide Open Graph data.',
      UNSUPPORTED_TYPE: 'Open Graph data from the given link does not provide necessary attributes.',
    };
  }

  static get TYPE(): Record<LINK_PREVIEW_ERROR_TYPE, LINK_PREVIEW_ERROR_TYPE> {
    return {
      BLACKLISTED: LINK_PREVIEW_ERROR_TYPE.BLACKLISTED,
      NOT_SUPPORTED: LINK_PREVIEW_ERROR_TYPE.NOT_SUPPORTED,
      NO_DATA_AVAILABLE: LINK_PREVIEW_ERROR_TYPE.NO_DATA_AVAILABLE,
      UNSUPPORTED_TYPE: LINK_PREVIEW_ERROR_TYPE.UNSUPPORTED_TYPE,
    };
  }
}
