/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

export const ReadIndicatorContainer: CSSObject = {
  display: 'inline-block',
  marginLeft: '12px',
  lineHeight: 1,

  '.message-asset &': {
    marginLeft: '12px',
  },
};

export const ReadReceiptText: CSSObject = {
  display: 'inline-flex',
  alignItems: 'center',
  verticalAlign: 'text-bottom',
};

export const ReadIndicatorStyles = (showIconOnly = false): CSSObject => ({
  color: 'var(--content-message-timestamp)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-regular)',
  lineHeight: 'var(--line-height-sm)',

  svg: {
    width: '10px',
    minHeight: '10px',
    marginRight: '4px',
    fill: 'currentColor',
  },

  ...(showIconOnly && {
    display: 'flex',
    alignItems: 'center',
    marginLeft: '8px',
  }),

  ...(!showIconOnly && {
    opacity: 0,
    '.message:hover &': {
      opacity: '1',
    },
  }),
});
