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

export const searchFieldStyles: CSSObject = {
  display: 'flex',
  height: '32px',
  padding: '0 12px',
  alignItems: 'center',
  gap: '8px',
  borderRadius: '12px',
  border: '1px solid var(--Border-Base-Primary, #DCE0E3)',
  background: 'var(--Background-Base-Primary, #FFF)',
  boxSizing: 'border-box',
  '&:focus-within': {
    border: '1px solid var(--Border-Accent-Color-Primary, #0667C8)',
  },
  'body.theme-dark &': {
    border: '1px solid var(--Border-Base-Primary, #34373D)',
    background: 'var(--Background-Base-Primary, #17181A)',
    '&:focus-within': {
      border: '1px solid var(--Border-Accent-Color-Primary, #54A6FF)',
    },
  },
};

export const searchIconStyles: CSSObject = {
  flexShrink: 0,
  width: '12px',
  height: '12px',
  opacity: 0.5,
};

export const searchNativeInputStyles: CSSObject = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: 'var(--font-size-medium)',
  color: 'inherit',
  boxShadow: 'none',
  padding: 0,
  '&:hover, &:focus, &:active': {
    boxShadow: 'none',
  },
  '&::placeholder': {
    color: 'var(--foreground-secondary, #71767B)',
  },
};

export const clearButtonStyles: CSSObject = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  margin: 0,
  lineHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--main-color)',
  flexShrink: 0,
};
