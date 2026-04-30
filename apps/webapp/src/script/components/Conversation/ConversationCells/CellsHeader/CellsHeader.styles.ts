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

export const wrapperStyles: CSSObject = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  flexDirection: 'column',
  gap: '16px',
  marginBottom: '20px',
  padding: '0 16px',
  width: '100%',
};

export const contentStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '8px',
  width: '100%',
  minHeight: '32px',
};

export const breadcrumbsRowStyles: CSSObject = {
  display: 'flex',
  width: '100%',
  height: '24px',
  alignItems: 'center',
  gap: '10px',
};

export const rootHomeIconStyles: CSSObject = {
  width: '14px',
  height: '14px',
  flexShrink: 0,
};

export const actionsStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

export const searchInputStyles: CSSObject = {
  display: 'flex',
  width: '394px',
  height: '32px',
  padding: '7px 12px',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexShrink: 0,
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
  width: '11.706px',
  height: '12px',
};

export const searchNativeInputStyles: CSSObject = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: '14px',
  color: 'inherit',
  boxShadow: 'none',
  padding: 0,
  '&:hover, &:focus, &:active': {
    boxShadow: 'none',
    outline: 'none',
  },
};
