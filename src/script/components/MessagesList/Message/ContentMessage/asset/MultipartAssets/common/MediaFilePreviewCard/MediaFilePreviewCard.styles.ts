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
  width: '76px',
  height: '76px',
  borderRadius: '10px',
  border: '1px solid var(--gray-40)',
  position: 'relative',

  'body.theme-dark &': {
    backgroundColor: 'var(--foreground-fade-8)',
    border: 'none',
  },
};

export const wrapperErrorStyles: CSSObject = {
  ...wrapperStyles,
  width: 268,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  flexDirection: 'column',
  backgroundColor: 'var(--app-bg-secondary)',
  padding: '8px 8px 6px',

  'body.theme-dark &': {
    backgroundColor: 'var(--foreground-fade-8)',
    border: 'none',
  },
};

export const loadingWrapperStyles: CSSObject = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: '0',
  margin: '0',
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const loadingIconStyles: CSSObject = {
  color: 'var(--gray-70)',
  fontSize: 'var(--font-size-medium)',

  'body.theme-dark &': {
    color: 'var(--gray-40)',
  },
};

export const errorIconStyles: CSSObject = {
  flexShrink: 0,
};

export const errorTextStyles: CSSObject = {
  fontSize: 'var(--font-size-medium)',
  fontWeight: 'var(--line-height-md)',
  lineHeight: 'var(--line-height-sm)',
  color: 'var(--gray-70)',
  textAlign: 'left',

  'body.dark &': {
    color: 'var(--gray-40)',
  },
};
