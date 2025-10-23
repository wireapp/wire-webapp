/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/react';

export const textStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  lineHeight: 'var(--line-height-md)',
  margin: 0,
  display: '-webkit-box',
  WebkitLineClamp: 'var(--truncate-after-lines)',
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  marginTop: '4px',

  '[data-file-card="header"] &': {
    marginTop: '0',
  },
};

export const primaryStyles: CSSObject = {
  fontWeight: 'var(--font-weight-medium)',
};

export const secondaryStyles: CSSObject = {
  fontWeight: 'var(--font-weight-regular)',
  color: 'var(--gray-70)',

  'body.dark &': {
    color: 'var(--gray-40)',
  },
};
