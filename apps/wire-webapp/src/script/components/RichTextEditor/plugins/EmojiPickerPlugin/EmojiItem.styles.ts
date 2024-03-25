/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

export const symbolStyle: CSSObject = {
  fontSize: '1.1em',
  paddingRight: '12px',
};

export const nameStyle: CSSObject = {
  '&::first-letter': {
    textTransform: 'capitalize',
  },
};

export const itemStyle: CSSObject = {
  '&.selected': {
    backgroundColor: 'var(--foreground-fade-16)',
  },
  '&:first-of-type': {
    borderRadius: '4px 4px 0 0', // to match parent border-radius
  },
  '&:last-of-type': {
    borderRadius: '0 0 4px 4px', // to match parent border-radius
  },
  alignItems: 'flex-start',
  display: 'flex',
  flexDirection: 'row',
  padding: '10px 12px',
  width: '100%',
};
