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

export const listStyles: CSSObject = {
  listStyle: 'none',
  padding: 0,
  margin: 0,
  overflowY: 'auto',
  height: '100%',
};

export const listItemStyles: CSSObject = {
  width: '100%',
};

export const buttonStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '16px',
  width: '100%',
  height: '48px',
  background: 'none',
  padding: '0 16px',
  border: 'none',
  borderBottom: '1px solid var(--border-color)',

  '&:hover': {
    background: 'var(--foreground-fade-8)',
  },
};

export const nameWrapperStyles: CSSObject = {
  display: 'flex',
  alignContent: 'center',
  justifyContent: 'center',
  gap: '16px',
};

export const nameStyles: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '3px',
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--font-weight-medium)',
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
};

export const arrowIconStyles: CSSObject = {
  full: 'var(--gray-70)',

  'body.theme-dark &': {
    full: 'var(--gray-40)',
  },
};
