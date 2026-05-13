/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

export const clearAllButtonStyles: CSSObject = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-small-plus)',
  letterSpacing: '0.25px',
  color: 'var(--accent-color-500)',
  padding: '0 4px',
  whiteSpace: 'nowrap',
  flexShrink: 0,
  '&:hover': {
    textDecoration: 'underline',
  },
};

export const filterGroupStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flexWrap: 'wrap',
};

export const toggleFilterButtonStyles = (isActive: boolean): CSSObject => ({
  display: 'inline-flex',
  alignItems: 'center',
  height: '32px',
  padding: '0 10px',
  borderRadius: '12px',
  border: `1px solid ${isActive ? 'var(--accent-color-500)' : 'var(--Border-Base-Primary, #DCE0E3)'}`,
  background: isActive ? 'var(--accent-color-highlight)' : 'var(--Background-Base-Primary, #FFF)',
  fontSize: 'var(--font-size-small)',
  fontWeight: 'var(--font-weight-semibold)',
  lineHeight: 'var(--line-height-small-plus)',
  letterSpacing: '0.25px',
  color: isActive ? 'var(--accent-color-500)' : 'var(--main-color)',
  cursor: 'pointer',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  '&:hover': {
    border: '1px solid var(--accent-color-500)',
  },
  'body.theme-dark &': {
    border: '1px solid var(--Border-Base-Primary, #34373D)',
    background: 'var(--Background-Base-Primary, #17181A)',
    color: 'var(--main-color)',
    '&:hover': {
      border: '1px solid var(--accent-color-500)',
    },
    ...(isActive && {
      border: '1px solid var(--accent-color-500)',
      background: 'var(--accent-color-highlight)',
      color: 'var(--accent-color-500)',
    }),
  },
});
